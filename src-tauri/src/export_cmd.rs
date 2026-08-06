use base64::Engine;
use tauri_plugin_dialog::DialogExt;

/// Shows a save-file dialog and writes the given bytes to the chosen path.
/// Returns the absolute path that was saved, or null if the user cancelled.
#[tauri::command]
pub async fn save_export_file(
    app: tauri::AppHandle,
    default_name: String,
    content_b64: String,
) -> Result<Option<String>, String> {
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(content_b64)
        .map_err(|e| format!("base64 解码失败: {e}"))?;

    let file_path = app
        .dialog()
        .file()
        .set_file_name(default_name)
        .blocking_save_file();

    match file_path {
        Some(fp) => {
            let path = fp.into_path().map_err(|e| format!("路径解析失败: {e}"))?;
            std::fs::write(&path, &bytes).map_err(|e| format!("写入文件失败: {e}"))?;
            Ok(Some(path.to_string_lossy().to_string()))
        }
        None => Ok(None),
    }
}
