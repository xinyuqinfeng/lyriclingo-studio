use crate::commands::DbState;
use serde::Serialize;
use tauri::{Manager, State};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupResult {
    pub path: String,
    pub bytes: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MaintenanceStats {
    pub songs: i64,
    pub vocabulary: i64,
    pub reviews: i64,
}

/// Copies the current SQLite database to a timestamped backup file.
#[tauri::command]
pub fn backup_database(app: tauri::AppHandle, state: State<'_, DbState>) -> Result<BackupResult, String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("data dir: {e}"))?;
    let db_path = data_dir.join("lyriclingo.db");
    if !db_path.exists() {
        return Err("数据库不存在".into());
    }
    let ts = chrono::Utc::now().format("%Y%m%d_%H%M%S");
    let backup_path = data_dir.join(format!("lyriclingo_backup_{ts}.db"));

    // Ensure the DB is flushed before copying (WAL checkpoint).
    {
        let guard = state.0.lock().map_err(|_| "db lock poisoned".to_string())?;
        guard.conn.pragma_update(None, "wal_checkpoint", "FULL").ok();
    }

    std::fs::copy(&db_path, &backup_path).map_err(|e| format!("备份失败: {e}"))?;
    let bytes = std::fs::metadata(&backup_path).map_err(|e| e.to_string())?.len() as i64;
    Ok(BackupResult {
        path: backup_path.to_string_lossy().to_string(),
        bytes,
    })
}

/// Returns counts used by the data-management UI.
#[tauri::command]
pub fn maintenance_stats(state: State<'_, DbState>) -> Result<MaintenanceStats, String> {
    let guard = state.0.lock().map_err(|_| "db lock poisoned".to_string())?;
    let q = |sql: &str| -> i64 {
        guard
            .conn
            .query_row(sql, [], |r| r.get::<_, i64>(0))
            .unwrap_or(0)
    };
    Ok(MaintenanceStats {
        songs: q("SELECT COUNT(*) FROM songs"),
        vocabulary: q("SELECT COUNT(*) FROM vocabulary_entries"),
        reviews: q("SELECT COUNT(*) FROM review_cards"),
    })
}

/// Deletes all song/analysis/vocabulary/review data (not provider keys).
#[tauri::command]
pub fn delete_all_data(state: State<'_, DbState>) -> Result<(), String> {
    let guard = state.0.lock().map_err(|_| "db lock poisoned".to_string())?;
    let tx = guard.begin().map_err(|e| e.to_string())?;
    for table in [
        "review_logs",
        "review_cards",
        "vocabulary_sources",
        "vocabulary_entries",
        "tokens",
        "line_analyses",
        "lyric_lines",
        "songs",
    ] {
        tx.execute(&format!("DELETE FROM {table}"), [])
            .map_err(|e| format!("清理 {table} 失败: {e}"))?;
    }
    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

/// Opens the app data directory in the file explorer.
#[tauri::command]
pub fn open_data_dir(app: tauri::AppHandle) -> Result<(), String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("data dir: {e}"))?;
    let path = data_dir.to_string_lossy().to_string();
    tauri_plugin_opener::open_path(path, None::<String>).map_err(|e| format!("打开目录失败: {e}"))?;
    Ok(())
}
