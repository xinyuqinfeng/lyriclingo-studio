// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
pub mod analysis_cmd;
pub mod commands;
pub mod db;
pub mod review_cmd;
pub mod vocabulary_cmd;
pub mod workspace_cmd;
pub use lyriclingo_core::models;

use std::sync::Mutex;
use tauri::Manager;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let data_dir = app.path().app_data_dir().expect("app data dir");
            let database = db::init_db(data_dir);
            app.manage(commands::DbState(Mutex::new(database)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            commands::test_connection,
            commands::list_models,
            commands::save_provider,
            commands::remove_provider_key,
            commands::create_song,
            commands::list_songs,
            commands::get_song,
            commands::delete_song,
            analysis_cmd::analyze_song,
            workspace_cmd::get_song_analysis,
            vocabulary_cmd::list_vocabulary,
            vocabulary_cmd::get_vocabulary,
            vocabulary_cmd::favorite_token,
            vocabulary_cmd::unfavorite_vocabulary,
            vocabulary_cmd::set_vocabulary_mastered,
            review_cmd::get_due_cards,
            review_cmd::review_stats,
            review_cmd::rate_card,
            review_cmd::enqueue_review,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
