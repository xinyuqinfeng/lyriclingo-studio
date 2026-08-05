use crate::commands::DbState;
use crate::db;
use lyriclingo_core::analysis::executor::AnalysisExecutor;
use lyriclingo_core::analysis::prompt::AnalysisContext;
use lyriclingo_core::analysis::queue::AnalysisQueue;
use lyriclingo_core::secrets;
use serde::Serialize;
use tauri::State;

/// Represents the analysis progress for one line.
#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LineProgress {
    pub index: usize,
    pub status: String, // pending | in_progress | succeeded | failed | cancelled
    pub error: Option<String>,
}

/// Runs analysis for a song. Requires provider settings (base_url, model) and
/// an API key (read from the OS credential store by provider_id).
#[tauri::command]
pub async fn analyze_song(
    song_id: String,
    base_url: String,
    model: String,
    provider_id: Option<String>,
    state: State<'_, DbState>,
) -> Result<Vec<LineProgress>, String> {
    // Collect everything we need under a short lock, then drop the guard
    // before any .await so the future stays Send.
    let (song_title, artist, language, lyrics) = {
        let guard = state
            .0
            .lock()
            .map_err(|_| "db lock poisoned".to_string())?;
        let db = &*guard;
        let song = db::get_song(db, &song_id)?;
        let lines =
            lyriclingo_core::database::repositories::lyric_line_repository::list_by_song(db, &song_id)
                .map_err(|e| e.to_string())?;
        let lyrics: Vec<(usize, String)> = lines
            .iter()
            .filter(|l| !l.is_section_break && !l.text.trim().is_empty())
            .enumerate()
            .map(|(i, l)| (i, l.text.clone()))
            .collect();
        (
            song.title.clone(),
            song.artist.clone(),
            song.language,
            lyrics,
        )
    };

    let api_key = match provider_id {
        Some(pid) => secrets::get_api_key(&pid)?,
        None => return Err("未找到已保存的 API Key，请先在设置中保存".into()),
    };

    let context = AnalysisContext {
        language,
        song_title,
        artist,
    };

    let executor = AnalysisExecutor::new(base_url, api_key, model, context);
    let queue = AnalysisQueue::new(lyrics);

    lyriclingo_core::analysis::executor::run_queue(&executor, &queue, 2).await;

    let statuses = queue.statuses();
    Ok(statuses
        .into_iter()
        .map(|t| {
            let status = match &t.status {
                lyriclingo_core::analysis::queue::LineStatus::Pending => "pending",
                lyriclingo_core::analysis::queue::LineStatus::InProgress => "in_progress",
                lyriclingo_core::analysis::queue::LineStatus::Succeeded => "succeeded",
                lyriclingo_core::analysis::queue::LineStatus::Failed(_) => "failed",
                lyriclingo_core::analysis::queue::LineStatus::Cancelled => "cancelled",
            };
            let error = match &t.status {
                lyriclingo_core::analysis::queue::LineStatus::Failed(e) => Some(e.clone()),
                _ => None,
            };
            LineProgress {
                index: t.index,
                status: status.to_string(),
                error,
            }
        })
        .collect())
}
