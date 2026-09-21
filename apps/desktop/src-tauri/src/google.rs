use std::collections::HashMap;
use std::fs;
use std::io::{Read, Write};
use std::net::TcpListener;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use base64::Engine;
use rand::Rng;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use tauri::{Emitter, Manager};
use tauri_plugin_opener::OpenerExt;
use url::Url;

fn client_id() -> &'static str {
    option_env!("ORBIT_GOOGLE_CLIENT_ID").unwrap_or("")
}

fn client_secret() -> &'static str {
    option_env!("ORBIT_GOOGLE_CLIENT_SECRET").unwrap_or("")
}
const AUTH_FILE: &str = "google_auth.json";
const DRIVE_FOLDER_NAME: &str = "Orbit";
const DRIVE_FILE_NAME: &str = "orbit-todos.json";
const DRIVE_BACKUP_NAME: &str = "orbit-todos.backup.json";
const DRIVE_README_NAME: &str = "README.md";
const DRIVE_README: &str = "\
# Orbit

이 폴더는 Orbit 앱이 만든 동기화 폴더입니다.
할 일과 메모를 이 Google 계정 드라이브에 맞춰 두기 위해 사용합니다.

- orbit-todos.json : 현재 동기화 데이터
- orbit-todos.backup.json : 직전 동기화본 (1개만 유지합니다)
- README.md : 이 안내 파일

이 폴더나 안의 파일을 지우거나 이름을 바꾸면 동기화가 끊기거나 데이터가 맞지 않을 수 있습니다.
앱에서 로그아웃해도 이 폴더는 그대로 남습니다.
";
const SCOPE: &str = "openid email https://www.googleapis.com/auth/drive.file";
const TIMEOUT: Duration = Duration::from_secs(180);

static LOGIN_BUSY: AtomicBool = AtomicBool::new(false);
static SYNC_BUSY: AtomicBool = AtomicBool::new(false);
static LOGIN_CANCEL: AtomicBool = AtomicBool::new(false);

struct FlagGuard(&'static AtomicBool);
impl Drop for FlagGuard {
    fn drop(&mut self) {
        self.0.store(false, Ordering::SeqCst);
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct StoredAuth {
    refresh_token: Option<String>,
    access_token: Option<String>,
    #[serde(default)]
    expires_at: Option<i64>,
    email: Option<String>,
    #[serde(default)]
    drive_folder_id: Option<String>,
    #[serde(default)]
    drive_file_id: Option<String>,
    #[serde(default)]
    drive_backup_id: Option<String>,
    #[serde(default)]
    last_synced_at: Option<i64>,
    #[serde(default = "default_true")]
    drive_granted: bool,
}

fn default_true() -> bool {
    true
}

impl Default for StoredAuth {
    fn default() -> Self {
        Self {
            refresh_token: None,
            access_token: None,
            expires_at: None,
            email: None,
            drive_folder_id: None,
            drive_file_id: None,
            drive_backup_id: None,
            last_synced_at: None,
            drive_granted: true,
        }
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct GoogleAuthStatus {
    pub configured: bool,
    pub connected: bool,
    pub email: Option<String>,
    pub last_synced_at: Option<i64>,
    pub logging_in: bool,
    pub syncing: bool,
    pub drive_granted: bool,
}

#[derive(Debug, Deserialize)]
struct TokenResponse {
    access_token: Option<String>,
    refresh_token: Option<String>,
    expires_in: Option<i64>,
    #[serde(default)]
    scope: Option<String>,
    error: Option<String>,
    error_description: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct GoogleSyncResult {
    pub added: usize,
    pub updated: usize,
    pub deleted: usize,
    pub last_synced_at: i64,
}

#[tauri::command]
pub fn get_google_auth_status(app: tauri::AppHandle) -> GoogleAuthStatus {
    status(&app)
}

#[tauri::command]
pub async fn google_login(app: tauri::AppHandle) -> Result<GoogleAuthStatus, String> {
    if SYNC_BUSY.load(Ordering::SeqCst) {
        return Err("동기화가 끝나길 기다려 주세요.".into());
    }
    if LOGIN_BUSY.swap(true, Ordering::SeqCst) {
        return Err("이미 로그인을 진행 중입니다.".into());
    }
    LOGIN_CANCEL.store(false, Ordering::SeqCst);
    let emit_app = app.clone();
    let result = async {
        let _busy = FlagGuard(&LOGIN_BUSY);
        tauri::async_runtime::spawn_blocking(move || login(&app))
            .await
            .map_err(|e| e.to_string())?
    }
    .await;
    emit_status(&emit_app);
    result
}

#[tauri::command]
pub fn google_cancel_login() {
    LOGIN_CANCEL.store(true, Ordering::SeqCst);
}

#[tauri::command]
pub async fn google_logout(app: tauri::AppHandle) -> Result<GoogleAuthStatus, String> {
    let emit_app = app.clone();
    let result = tauri::async_runtime::spawn_blocking(move || {
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
    .map_err(|e| e.to_string())?;
    emit_status(&emit_app);
    result
}

#[tauri::command]
pub async fn google_sync(app: tauri::AppHandle) -> Result<GoogleSyncResult, String> {
    if LOGIN_BUSY.load(Ordering::SeqCst) {
        return Err("로그인이 끝나길 기다려 주세요.".into());
    }
    if SYNC_BUSY.swap(true, Ordering::SeqCst) {
        return Err("이미 진행 중입니다.".into());
    }
    let emit_app = app.clone();
    let result = async {
        let _busy = FlagGuard(&SYNC_BUSY);
        tauri::async_runtime::spawn_blocking(move || sync_drive(&app))
            .await
            .map_err(|e| e.to_string())?
    }
    .await;
    emit_status(&emit_app);
    result
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
    let prev = read_auth(app);
    let drive_granted = scope_has_drive(tokens.scope.as_deref());
    write_auth(
        app,
        &StoredAuth {
            refresh_token: tokens.refresh_token,
            access_token: tokens.access_token,
            expires_at: tokens.expires_in.map(|secs| now_ms() + secs * 1000),
            email,
            drive_folder_id: prev.drive_folder_id,
            drive_file_id: prev.drive_file_id,
            drive_backup_id: prev.drive_backup_id,
            last_synced_at: prev.last_synced_at,
            drive_granted,
        },
    )?;
    Ok(status(app))
}

fn wait_code(listener: &TcpListener, expected_state: &str) -> Result<String, String> {
    let started = Instant::now();
    loop {
        if LOGIN_CANCEL.load(Ordering::SeqCst) {
            return Err("로그인이 취소되었습니다.".into());
        }
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
                        reply(&mut stream, true, "Google 계정이 연결되었습니다.");
                        return Ok(code);
                    }
                    Err(_) if is_noise(&req) => {}
                    Err(err) => {
                        reply(&mut stream, false, &err);
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

fn reply(stream: &mut std::net::TcpStream, ok: bool, message: &str) {
    let title = if ok { "연결됨" } else { "연결 실패" };
    let hint = if ok {
        "이 창을 닫고 앱으로 돌아가세요."
    } else {
        "이 창을 닫고 앱에서 다시 시도하세요."
    };
    let accent = if ok { "#45ada5" } else { "#dc2626" };
    let accent_dark = if ok { "#2dd4bf" } else { "#f87171" };
    let safe = html_escape(message);
    let body = format!(
        "<!doctype html><html lang=ko><head><meta charset=utf-8><meta name=viewport content=\"width=device-width,initial-scale=1\"><title>Orbit</title>\
<style>\
html,body{{margin:0;min-height:100%;background:#ebe8e1;color:#1c1917;font-family:Segoe UI,system-ui,sans-serif}}\
main{{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}}\
.card{{width:min(22rem,100%);background:#f5f2ec;border-radius:8px;padding:28px 24px;text-align:center}}\
.mark{{width:10px;height:10px;border-radius:99px;background:{accent};margin:0 auto 16px}}\
h1{{margin:0 0 8px;font-size:1.125rem;font-weight:600}}\
p{{margin:0;font-size:.875rem;color:#57534e;line-height:1.5}}\
@media (prefers-color-scheme:dark){{\
html,body{{background:#121212;color:#ececec}}\
.card{{background:#1a1a1a}}\
.mark{{background:{accent_dark}}}\
p{{color:#a3a3a3}}\
}}\
</style></head><body><main><div class=card><div class=mark></div><h1>{title}</h1><p>{safe}</p><p style=margin-top:8px>{hint}</p></div></main>\
<script>setTimeout(function(){{window.close()}},1500)</script></body></html>"
    );
    let _ = stream.write_all(
        format!(
            "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
            body.len()
        )
        .as_bytes(),
    );
}

fn html_escape(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
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
        last_synced_at: stored.last_synced_at,
        logging_in: LOGIN_BUSY.load(Ordering::SeqCst),
        syncing: SYNC_BUSY.load(Ordering::SeqCst),
        drive_granted: stored.drive_granted,
    }
}

fn emit_status(app: &tauri::AppHandle) {
    let _ = app.emit("google-auth", status(app));
}

fn scope_has_drive(scope: Option<&str>) -> bool {
    match scope {
        Some(scope) => scope.split_whitespace().any(|item| item.contains("drive.file")),
        None => true,
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

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}

fn sync_drive(app: &tauri::AppHandle) -> Result<GoogleSyncResult, String> {
    let mut stored = read_auth(app);
    if stored.refresh_token.is_none() && stored.access_token.is_none() {
        return Err("먼저 Google 계정으로 로그인해 주세요.".into());
    }

    let token = access_token(app, &mut stored)?;
    if !stored.drive_granted {
        return Err("드라이브 권한이 없습니다. Drive 권한을 다시 허용해 주세요.".into());
    }
    let result = sync_drive_inner(app, &token, &mut stored);
    if let Err(err) = &result {
        if err.contains("드라이브 권한이 없습니다") {
            stored.drive_granted = false;
            write_auth(app, &stored)?;
        }
    }
    result
}

fn sync_drive_inner(
    app: &tauri::AppHandle,
    token: &str,
    stored: &mut StoredAuth,
) -> Result<GoogleSyncResult, String> {
    let folder_id = ensure_folder(token, stored.drive_folder_id.as_deref())?;
    ensure_readme(&token, &folder_id)?;
    let file_id = resolve_data_file(&token, &folder_id, stored.drive_file_id.as_deref())?;
    let (incoming, previous_raw) = match &file_id {
        Some(id) => {
            let raw = download_drive_text(&token, id)?;
            let incoming = if raw.trim().is_empty() {
                crate::models::TodoDatabase::default()
            } else {
                crate::memo::parse_database(&raw)
                    .map_err(|_| "드라이브 파일이 올바르지 않습니다.".to_string())?
            };
            (incoming, Some(raw))
        }
        None => (crate::models::TodoDatabase::default(), None),
    };

    crate::storage::backup_store_file(app);
    let local = crate::storage::read_store(app);
    let (mut merged, summary) = crate::merge::merge_database(local, incoming);
    crate::memo::ensure_memo_schema(&mut merged);
    crate::storage::write_store(app, &merged);

    if let Some(raw) = previous_raw.filter(|raw| !raw.trim().is_empty()) {
        stored.drive_backup_id = Some(upsert_file(
            &token,
            &folder_id,
            stored.drive_backup_id.as_deref(),
            DRIVE_BACKUP_NAME,
            "application/json",
            &raw,
        )?);
    }

    let json = serde_json::to_string_pretty(&merged).map_err(|e| e.to_string())?;
    let file_id = upsert_file(
        &token,
        &folder_id,
        file_id.as_deref(),
        DRIVE_FILE_NAME,
        "application/json",
        &json,
    )?;

    let last_synced_at = now_ms();
    stored.drive_folder_id = Some(folder_id);
    stored.drive_file_id = Some(file_id);
    stored.last_synced_at = Some(last_synced_at);
    write_auth(app, &stored)?;

    Ok(GoogleSyncResult {
        added: summary.added,
        updated: summary.updated,
        deleted: summary.deleted,
        last_synced_at,
    })
}

fn access_token(app: &tauri::AppHandle, stored: &mut StoredAuth) -> Result<String, String> {
    let fresh = stored.expires_at.map(|at| at > now_ms() + 60_000).unwrap_or(false);
    if fresh {
        if let Some(token) = stored.access_token.clone() {
            return Ok(token);
        }
    }

    let refresh = stored
        .refresh_token
        .as_deref()
        .ok_or("로그인이 만료되었습니다. 다시 로그인해 주세요.")?;
    let tokens = refresh_tokens(refresh)?;
    stored.access_token = tokens.access_token.clone();
    stored.expires_at = tokens.expires_in.map(|secs| now_ms() + secs * 1000);
    if let Some(next) = tokens.refresh_token {
        stored.refresh_token = Some(next);
    }
    write_auth(app, stored)?;
    stored
        .access_token
        .clone()
        .ok_or_else(|| "액세스 토큰을 받지 못했습니다.".into())
}

fn refresh_tokens(refresh_token: &str) -> Result<TokenResponse, String> {
    let mut form = vec![
        ("client_id", client_id().to_string()),
        ("grant_type", "refresh_token".into()),
        ("refresh_token", refresh_token.to_string()),
    ];
    if !client_secret().is_empty() {
        form.push(("client_secret", client_secret().into()));
    }
    let tokens: TokenResponse = http()?
        .post("https://oauth2.googleapis.com/token")
        .form(&form)
        .send()
        .map_err(|e| format!("토큰을 갱신하지 못했습니다. ({e})"))?
        .json()
        .map_err(|_| "토큰 응답을 읽지 못했습니다.".to_string())?;
    if let Some(err) = tokens.error.as_deref() {
        let detail = tokens.error_description.as_deref().unwrap_or(err);
        return Err(if err == "invalid_grant" {
            "로그인이 만료되었습니다. 다시 로그인해 주세요.".into()
        } else {
            format!("토큰 갱신에 실패했습니다. ({detail})")
        });
    }
    if tokens.access_token.is_none() {
        return Err("액세스 토큰을 받지 못했습니다.".into());
    }
    Ok(tokens)
}

#[derive(Debug, Deserialize)]
struct DriveFileList {
    files: Option<Vec<DriveFile>>,
}

#[derive(Debug, Deserialize)]
struct DriveFile {
    id: Option<String>,
    #[serde(default)]
    trashed: Option<bool>,
    #[serde(default)]
    parents: Option<Vec<String>>,
}

fn ensure_folder(token: &str, known_id: Option<&str>) -> Result<String, String> {
    if let Some(id) = alive_id(token, known_id)? {
        return Ok(id);
    }
    if let Some(id) = find_file(
        token,
        "mimeType = 'application/vnd.google-apps.folder' and name = 'Orbit' and trashed = false and appProperties has { key='orbit' and value='1' }",
    )? {
        return Ok(id);
    }

    let res = http()?
        .post("https://www.googleapis.com/drive/v3/files")
        .bearer_auth(token)
        .json(&serde_json::json!({
            "name": DRIVE_FOLDER_NAME,
            "mimeType": "application/vnd.google-apps.folder",
            "description": "Orbit 앱 동기화 폴더입니다. 지우지 마세요.",
            "appProperties": { "orbit": "1" }
        }))
        .send()
        .map_err(|e| format!("드라이브 폴더를 만들지 못했습니다. ({e})"))?;
    if !res.status().is_success() {
        return Err(drive_error(res));
    }
    let file: DriveFile = res
        .json()
        .map_err(|_| "드라이브 폴더 정보를 읽지 못했습니다.".to_string())?;
    file.id
        .ok_or_else(|| "드라이브 폴더 ID를 받지 못했습니다.".into())
}

fn ensure_readme(token: &str, folder_id: &str) -> Result<(), String> {
    if find_in_folder(token, folder_id, DRIVE_README_NAME)?.is_some() {
        return Ok(());
    }
    create_media_file(
        token,
        folder_id,
        DRIVE_README_NAME,
        "text/markdown",
        DRIVE_README,
    )?;
    Ok(())
}

fn resolve_data_file(
    token: &str,
    folder_id: &str,
    known_id: Option<&str>,
) -> Result<Option<String>, String> {
    if let Some(id) = alive_id(token, known_id)? {
        move_into_folder(token, &id, folder_id)?;
        return Ok(Some(id));
    }
    if let Some(id) = find_in_folder(token, folder_id, DRIVE_FILE_NAME)? {
        return Ok(Some(id));
    }
    if let Some(id) = find_file(
        token,
        "name = 'orbit-todos.json' and trashed = false and appProperties has { key='orbit' and value='1' }",
    )? {
        move_into_folder(token, &id, folder_id)?;
        return Ok(Some(id));
    }
    Ok(None)
}

fn upsert_file(
    token: &str,
    folder_id: &str,
    known_id: Option<&str>,
    name: &str,
    mime: &str,
    body: &str,
) -> Result<String, String> {
    if let Some(id) = alive_id(token, known_id)? {
        move_into_folder(token, &id, folder_id)?;
        upload_drive_file(token, &id, mime, body)?;
        return Ok(id);
    }
    if let Some(id) = find_in_folder(token, folder_id, name)? {
        upload_drive_file(token, &id, mime, body)?;
        return Ok(id);
    }
    create_media_file(token, folder_id, name, mime, body)
}

fn alive_id(token: &str, known_id: Option<&str>) -> Result<Option<String>, String> {
    let Some(id) = known_id.filter(|id| !id.is_empty()) else {
        return Ok(None);
    };
    let res = http()?
        .get(format!("https://www.googleapis.com/drive/v3/files/{id}"))
        .query(&[("fields", "id,trashed,parents")])
        .bearer_auth(token)
        .send()
        .map_err(|e| format!("드라이브 파일을 찾지 못했습니다. ({e})"))?;
    if res.status().as_u16() == 404 {
        return Ok(None);
    }
    if !res.status().is_success() {
        return Err(drive_error(res));
    }
    let file: DriveFile = res
        .json()
        .map_err(|_| "드라이브 파일 정보를 읽지 못했습니다.".to_string())?;
    if file.trashed == Some(true) {
        return Ok(None);
    }
    Ok(file.id.or_else(|| Some(id.to_string())))
}

fn find_in_folder(token: &str, folder_id: &str, name: &str) -> Result<Option<String>, String> {
    let folder_id = escape_query(folder_id);
    let name = escape_query(name);
    find_file(
        token,
        &format!("'{folder_id}' in parents and name = '{name}' and trashed = false"),
    )
}

fn find_file(token: &str, query: &str) -> Result<Option<String>, String> {
    let res = http()?
        .get("https://www.googleapis.com/drive/v3/files")
        .query(&[
            ("q", query),
            ("spaces", "drive"),
            ("fields", "files(id,name)"),
            ("pageSize", "10"),
        ])
        .bearer_auth(token)
        .send()
        .map_err(|e| format!("드라이브 파일을 찾지 못했습니다. ({e})"))?;
    if !res.status().is_success() {
        return Err(drive_error(res));
    }
    let list: DriveFileList = res
        .json()
        .map_err(|_| "드라이브 파일 목록을 읽지 못했습니다.".to_string())?;
    Ok(list
        .files
        .unwrap_or_default()
        .into_iter()
        .find_map(|file| file.id))
}

fn move_into_folder(token: &str, file_id: &str, folder_id: &str) -> Result<(), String> {
    let res = http()?
        .get(format!("https://www.googleapis.com/drive/v3/files/{file_id}"))
        .query(&[("fields", "parents")])
        .bearer_auth(token)
        .send()
        .map_err(|e| format!("드라이브 파일을 찾지 못했습니다. ({e})"))?;
    if !res.status().is_success() {
        return Err(drive_error(res));
    }
    let file: DriveFile = res
        .json()
        .map_err(|_| "드라이브 파일 정보를 읽지 못했습니다.".to_string())?;
    let parents = file.parents.unwrap_or_default();
    if parents.iter().any(|parent| parent == folder_id) {
        return Ok(());
    }
    let remove = parents.join(",");
    let mut req = http()?
        .patch(format!("https://www.googleapis.com/drive/v3/files/{file_id}"))
        .query(&[("addParents", folder_id), ("fields", "id,parents")])
        .bearer_auth(token)
        .json(&serde_json::json!({}));
    if !remove.is_empty() {
        req = req.query(&[("removeParents", remove.as_str())]);
    }
    let res = req
        .send()
        .map_err(|e| format!("드라이브 폴더로 옮기지 못했습니다. ({e})"))?;
    if !res.status().is_success() {
        return Err(drive_error(res));
    }
    Ok(())
}

fn download_drive_text(token: &str, file_id: &str) -> Result<String, String> {
    let res = http()?
        .get(format!("https://www.googleapis.com/drive/v3/files/{file_id}"))
        .query(&[("alt", "media")])
        .bearer_auth(token)
        .send()
        .map_err(|e| format!("드라이브 파일을 받지 못했습니다. ({e})"))?;
    if !res.status().is_success() {
        return Err(drive_error(res));
    }
    res.text()
        .map_err(|_| "드라이브 파일을 읽지 못했습니다.".to_string())
}

fn create_media_file(
    token: &str,
    folder_id: &str,
    name: &str,
    mime: &str,
    body: &str,
) -> Result<String, String> {
    let boundary = "orbit_sync_boundary";
    let metadata = serde_json::json!({
        "name": name,
        "mimeType": mime,
        "parents": [folder_id],
        "appProperties": { "orbit": "1" }
    });
    let payload = format!(
        "--{boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n{metadata}\r\n--{boundary}\r\nContent-Type: {mime}\r\n\r\n{body}\r\n--{boundary}--\r\n"
    );
    let res = http()?
        .post("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart")
        .bearer_auth(token)
        .header(
            "Content-Type",
            format!("multipart/related; boundary={boundary}"),
        )
        .body(payload)
        .send()
        .map_err(|e| format!("드라이브에 올리지 못했습니다. ({e})"))?;
    if !res.status().is_success() {
        return Err(drive_error(res));
    }
    let file: DriveFile = res
        .json()
        .map_err(|_| "드라이브 파일 정보를 읽지 못했습니다.".to_string())?;
    file.id
        .ok_or_else(|| "드라이브 파일 ID를 받지 못했습니다.".into())
}

fn upload_drive_file(token: &str, file_id: &str, mime: &str, body: &str) -> Result<(), String> {
    let res = http()?
        .patch(format!(
            "https://www.googleapis.com/upload/drive/v3/files/{file_id}?uploadType=media"
        ))
        .bearer_auth(token)
        .header("Content-Type", mime)
        .body(body.to_string())
        .send()
        .map_err(|e| format!("드라이브에 올리지 못했습니다. ({e})"))?;
    if !res.status().is_success() {
        return Err(drive_error(res));
    }
    Ok(())
}

fn escape_query(value: &str) -> String {
    value.replace('\\', "\\\\").replace('\'', "\\'")
}

fn drive_error(res: reqwest::blocking::Response) -> String {
    let status = res.status();
    let body = res.text().unwrap_or_default();
    if status.as_u16() == 401 {
        return "로그인이 만료되었습니다. 다시 로그인해 주세요.".into();
    }
    if status.as_u16() == 403
        && (body.contains("insufficient")
            || body.contains("ACCESS_TOKEN_SCOPE")
            || body.contains("insufficientPermissions"))
    {
        return "드라이브 권한이 없습니다. 로그아웃 후 다시 로그인해 주세요.".into();
    }
    format!("드라이브 요청에 실패했습니다. ({status})")
}
