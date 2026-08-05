// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
pub mod commands;
pub use lyriclingo_core::models;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            commands::test_connection,
            commands::list_models,
            commands::save_provider,
            commands::remove_provider_key,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
