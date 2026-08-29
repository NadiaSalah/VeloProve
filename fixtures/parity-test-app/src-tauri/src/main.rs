
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub enum SupportedExt {
    Jpg,
    Png,
}

#[tauri::command]
fn recover_files(extensions: Vec<SupportedExt>) -> Result<usize, String> {
    for ext in extensions {
        match ext {
            SupportedExt::Jpg => { /* recover jpg */ },
            SupportedExt::Png => { /* recover png */ },
        }
    }
    Ok(42)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![recover_files])
        .run(tauri::generate_context!())
        .expect("error");
}
