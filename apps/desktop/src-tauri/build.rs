use std::path::PathBuf;

fn main() {
    let env_path = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../.env");
    if env_path.exists() {
        let _ = dotenvy::from_path(&env_path);
        println!("cargo:rerun-if-changed={}", env_path.display());
    }

    for key in ["ORBIT_GOOGLE_CLIENT_ID", "ORBIT_GOOGLE_CLIENT_SECRET"] {
        println!("cargo:rerun-if-env-changed={key}");
        if let Ok(value) = std::env::var(key) {
            if !value.trim().is_empty() {
                println!("cargo:rustc-env={key}={}", value.trim());
            }
        }
    }

    tauri_build::build();
}
