use std::collections::HashMap;
use std::fs;
use std::io::{Read, Write};
use std::net::TcpListener;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::{Duration, Instant};

use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use base64::Engine;
use rand::Rng;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use tauri::Manager;
use tauri_plugin_opener::OpenerExt;
use url::Url;

fn client_id() -> &'static str {
    option_env!("ORBIT_GOOGLE_CLIENT_ID").unwrap_or("")
}

fn client_secret() -> &'static str {
    option_env!("ORBIT_GOOGLE_CLIENT_SECRET").unwrap_or("")
}
const AUTH_FILE: &str = "google_auth.json";
const SCOPE: &str = "openid email";
const TIMEOUT: Duration = Duration::from_secs(180);

static LOGIN_BUSY: AtomicBool = AtomicBool::new(false);

struct BusyGuard;
impl Drop for BusyGuard {
    fn drop(&mut self) {
        LOGIN_BUSY.store(false, Ordering::SeqCst);
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
struct StoredAuth {
    refresh_token: Option<String>,
    access_token: Option<String>,
    email: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct GoogleAuthStatus {
    pub configured: bool,
    pub connected: bool,
    pub email: Option<String>,
}

#[derive(Debug, Deserialize)]
struct TokenResponse {
    access_token: Option<String>,
    refresh_token: Option<String>,
    error: Option<String>,
    error_description: Option<String>,
}

#[tauri::command]
pub fn get_google_auth_status(app: tauri::AppHandle) -> GoogleAuthStatus {
    status(&app)
}

#[tauri::command]
pub async fn google_login(app: tauri::AppHandle) -> Result<GoogleAuthStatus, String> {
    if LOGIN_BUSY.swap(true, Ordering::SeqCst) {
        return Err("이미 로그인을 진행 중입니다.".into());
    }
    let _busy = BusyGuard;
    tauri::async_runtime::spawn_blocking(move || login(&app))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn google_logout(app: tauri::AppHandle) -> Result<GoogleAuthStatus, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let stored = read_auth(&app);
        if let Some(token) = stored.refresh_token.or(stored.access_token) {
            let _ = http()?
                .post("https://oauth2.googleapis.com/revoke")
                .form(&[("token", token)])
                .send();
        }
        let path = auth_path(&app)?;
        if path.exists() {
            fs::remove_file(path).map_err(|e| e.to_string())?;
        }
        Ok(status(&app))
    })
    .await
    .map_err(|e| e.to_string())?
}

fn login(app: &tauri::AppHandle) -> Result<GoogleAuthStatus, String> {
    if client_id().is_empty() {
        return Err(
            "빌드에 구글 클라이언트 ID가 없습니다. apps/desktop/.env 를 채운 뒤 다시 실행하세요."
                .into(),
        );
    }

    let listener = TcpListener::bind("127.0.0.1:0").map_err(|e| e.to_string())?;
    listener.set_nonblocking(true).map_err(|e| e.to_string())?;
    let port = listener.local_addr().map_err(|e| e.to_string())?.port();
    let redirect = format!("http://127.0.0.1:{port}");
    let verifier = random_urlsafe(64);
    let state = random_urlsafe(32);

    let mut auth = Url::parse("https://accounts.google.com/o/oauth2/v2/auth").unwrap();
    auth.query_pairs_mut()
        .append_pair("client_id", client_id())
        .append_pair("redirect_uri", &redirect)
        .append_pair("response_type", "code")
        .append_pair("scope", SCOPE)
        .append_pair("access_type", "offline")
        .append_pair("prompt", "consent")
        .append_pair("code_challenge", &pkce(&verifier))
        .append_pair("code_challenge_method", "S256")
        .append_pair("state", &state);

    app.opener()
        .open_url(auth.as_str(), None::<&str>)
        .map_err(|e| format!("브라우저를 열 수 없습니다. ({e})"))?;

    let code = wait_code(&listener, &state)?;
    let tokens = exchange(&code, &verifier, &redirect)?;
    let email = user_email(tokens.access_token.as_deref());
    write_auth(
        app,
        &StoredAuth {
            refresh_token: tokens.refresh_token,
            access_token: tokens.access_token,
            email,
        },
    )?;
    Ok(status(app))
}

fn wait_code(listener: &TcpListener, expected_state: &str) -> Result<String, String> {
    let started = Instant::now();
    loop {
        if started.elapsed() > TIMEOUT {
            return Err("로그인 시간이 초과되었습니다.".into());
        }
        match listener.accept() {
            Ok((mut stream, _)) => {
                let _ = stream.set_nonblocking(false);
                let _ = stream.set_read_timeout(Some(Duration::from_secs(5)));
                let mut buf = [0u8; 8192];
                let n = stream.read(&mut buf).unwrap_or(0);
                let req = String::from_utf8_lossy(&buf[..n]);
                match parse_code(&req, expected_state) {
                    Ok(code) => {
                        reply(
                            &mut stream,
                            "연결되었습니다. 이 창을 닫고 앱으로 돌아오세요.",
                        );
                        return Ok(code);
                    }
                    Err(_) if is_noise(&req) => reply(&mut stream, ""),
                    Err(err) => {
                        reply(&mut stream, &err);
                        return Err(err);
                    }
                }
            }
            Err(err) if err.kind() == std::io::ErrorKind::WouldBlock => {
                std::thread::sleep(Duration::from_millis(80));
            }
            Err(err) => return Err(format!("로그인 응답을 받지 못했습니다. ({err})")),
        }
    }
}

fn is_noise(req: &str) -> bool {
    let path = req
        .lines()
        .next()
        .and_then(|l| l.split_whitespace().nth(1))
        .unwrap_or("");
    path.starts_with("/favicon") || !path.contains('?')
}

fn parse_code(req: &str, expected_state: &str) -> Result<String, String> {
    let path = req
        .lines()
        .next()
        .and_then(|l| l.split_whitespace().nth(1))
        .ok_or("로그인 응답이 올바르지 않습니다.")?;
    let url = Url::parse(&format!("http://127.0.0.1{path}"))
        .map_err(|_| "로그인 응답이 올바르지 않습니다.")?;
    let q: HashMap<_, _> = url.query_pairs().into_owned().collect();
    if let Some(err) = q.get("error") {
        return Err(if err == "access_denied" {
            "로그인이 취소되었습니다.".into()
        } else {
            format!("로그인에 실패했습니다. ({err})")
        });
    }
    if q.get("state").map(String::as_str) != Some(expected_state) {
        return Err("로그인 상태가 올바르지 않습니다.".into());
    }
    q.get("code")
        .cloned()
        .ok_or_else(|| "인가 코드를 받지 못했습니다.".into())
}

fn reply(stream: &mut std::net::TcpStream, message: &str) {
    let body = format!(
        "<!doctype html><meta charset=utf-8><title>Orbit</title><body style=font-family:sans-serif;padding:2rem><p>{}</p>",
        message.replace('<', "&lt;")
    );
    let _ = stream.write_all(
        format!(
            "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
            body.len()
        )
        .as_bytes(),
    );
}

fn exchange(code: &str, verifier: &str, redirect: &str) -> Result<TokenResponse, String> {
    let mut form = vec![
        ("client_id", client_id().to_string()),
        ("code", code.to_string()),
        ("code_verifier", verifier.to_string()),
        ("grant_type", "authorization_code".into()),
        ("redirect_uri", redirect.to_string()),
    ];
    if !client_secret().is_empty() {
        form.push(("client_secret", client_secret().into()));
    }
    let tokens: TokenResponse = http()?
        .post("https://oauth2.googleapis.com/token")
        .form(&form)
        .send()
        .map_err(|e| format!("토큰을 받지 못했습니다. ({e})"))?
        .json()
        .map_err(|_| "토큰 응답을 읽지 못했습니다.".to_string())?;
    if let Some(err) = tokens.error.as_deref() {
        let detail = tokens.error_description.as_deref().unwrap_or(err);
        return Err(match err {
            "redirect_uri_mismatch" => {
                "리다이렉트 주소가 맞지 않습니다. 데스크톱 클라이언트를 사용하세요.".into()
            }
            "invalid_client" => "구글 클라이언트 ID 또는 비밀번호가 올바르지 않습니다.".into(),
            _ => format!("토큰 교환에 실패했습니다. ({detail})"),
        });
    }
    if tokens.access_token.is_none() {
        return Err("액세스 토큰을 받지 못했습니다.".into());
    }
    Ok(tokens)
}

fn user_email(token: Option<&str>) -> Option<String> {
    let token = token?;
    let ok = http().ok()?;
    let res = ok
        .get("https://openidconnect.googleapis.com/v1/userinfo")
        .bearer_auth(token)
        .send()
        .ok()?;
    if !res.status().is_success() {
        return None;
    }
    res.json::<serde_json::Value>()
        .ok()?
        .get("email")?
        .as_str()
        .map(|s| s.to_string())
}

fn http() -> Result<reqwest::blocking::Client, String> {
    reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|e| e.to_string())
}

fn status(app: &tauri::AppHandle) -> GoogleAuthStatus {
    let stored = read_auth(app);
    GoogleAuthStatus {
        configured: !client_id().is_empty(),
        connected: stored.refresh_token.is_some() || stored.access_token.is_some(),
        email: stored.email,
    }
}

fn auth_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join(AUTH_FILE))
}

fn read_auth(app: &tauri::AppHandle) -> StoredAuth {
    auth_path(app)
        .ok()
        .and_then(|p| fs::read_to_string(p).ok())
        .and_then(|raw| serde_json::from_str(&raw).ok())
        .unwrap_or_default()
}

fn write_auth(app: &tauri::AppHandle, stored: &StoredAuth) -> Result<(), String> {
    let json = serde_json::to_string_pretty(stored).map_err(|e| e.to_string())?;
    fs::write(auth_path(app)?, json).map_err(|e| e.to_string())
}

fn random_urlsafe(len: usize) -> String {
    const CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
    let mut rng = rand::thread_rng();
    (0..len)
        .map(|_| CHARS[rng.gen_range(0..CHARS.len())] as char)
        .collect()
}

fn pkce(verifier: &str) -> String {
    URL_SAFE_NO_PAD.encode(Sha256::digest(verifier.as_bytes()))
}
