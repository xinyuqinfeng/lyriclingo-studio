use crate::commands::DbState;
use crate::db;
use lyriclingo_core::analysis::executor::AnalysisExecutor;
use lyriclingo_core::analysis::prompt::AnalysisContext;
use lyriclingo_core::database::repositories::line_analysis_repository;
use lyriclingo_core::database::repositories::song_repository;
use lyriclingo_core::database::repositories::token_repository;
use lyriclingo_core::models::LyricLine;
use lyriclingo_core::secrets;
use serde::{Deserialize, Serialize};
use tauri::State;

/// Represents the analysis progress for one line.
#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LineProgress {
    pub index: usize,
    pub status: String, // pending | in_progress | succeeded | failed | cancelled
    pub error: Option<String>,
}

/// A source-language lyric line with an optional reference translation.
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PairInput {
    pub seq: usize,
    pub source: String,
    pub reference_translation: Option<String>,
}

/// Marks a song's analysis status (used to persist failure when the command throws).
#[tauri::command]
pub fn set_song_status(
    song_id: String,
    status: String,
    error: Option<String>,
    state: State<'_, DbState>,
) -> Result<(), String> {
    let guard = state
        .0
        .lock()
        .map_err(|_| "db lock poisoned".to_string())?;
    song_repository::set_analysis_status(&guard, &song_id, &status, error.as_deref())
        .map_err(|e| e.to_string())
}

/// Runs analysis for a song. The frontend sends source lines (paired with their
/// pasted reference translations) plus the provider settings.
#[tauri::command]
pub async fn analyze_song(
    song_id: String,
    base_url: String,
    model: String,
    provider_id: Option<String>,
    pairs: Vec<PairInput>,
    state: State<'_, DbState>,
) -> Result<Vec<LineProgress>, String> {
    // Collect song metadata under a short lock, then drop the guard.
    let (song_title, artist, language, lines) = {
        let guard = state
            .0
            .lock()
            .map_err(|_| "db lock poisoned".to_string())?;
        let db = &*guard;
        let song = db::get_song(db, &song_id)?;
        let lyric_lines =
            lyriclingo_core::database::repositories::lyric_line_repository::list_by_song(db, &song_id)
                .map_err(|e| e.to_string())?;
        (song.title.clone(), song.artist.clone(), song.language, lyric_lines)
    };

    let api_key = match provider_id {
        Some(pid) => secrets::get_api_key(&pid)?,
        None => return Err("未找到已保存的 API Key，请先在设置中保存".into()),
    };

    // Mark the song as analyzing.
    {
        let guard = state
            .0
            .lock()
            .map_err(|_| "db lock poisoned".to_string())?;
        lyriclingo_core::database::repositories::song_repository::set_analysis_status(
            &guard, &song_id, "in_progress", None,
        )
        .map_err(|e| e.to_string())?;
    }

    let context = AnalysisContext {
        language,
        song_title,
        artist,
    };

    let executor = AnalysisExecutor::new(base_url, api_key, model.clone(), context);
    let pair_input: Vec<(String, Option<String>)> = pairs
        .iter()
        .map(|p| (p.source.clone(), p.reference_translation.clone()))
        .collect();
    let analyses = executor.analyze_full(&pair_input).await?;

    // Map each analysis back to a DB line by ORDER (pairs order == the order of
    // non-empty lyric lines, since create_song stored the cleaned lyrics).
    let non_empty_lines: Vec<&LyricLine> = lines
        .iter()
        .filter(|l| !l.is_section_break && !l.text.trim().is_empty())
        .collect();
    let mut progress: Vec<LineProgress> = Vec::new();
    let mut all_succeeded = true;
    for (i, analysis) in analyses.iter().enumerate() {
        let matched_line = non_empty_lines.get(i);

        if let Some(l) = matched_line {
            let guard = state
                .0
                .lock()
                .map_err(|_| "db lock poisoned".to_string())?;
            let _ = line_analysis_repository::save(
                &guard,
                &l.id,
                &song_id,
                &model,
                "v1-pair",
                analysis,
            );
            let _ = token_repository::upsert_tokens(&guard, &l.id, &song_id, analysis.tokens.clone());
            drop(guard);
            progress.push(LineProgress {
                index: i,
                status: "succeeded".into(),
                error: None,
            });
        } else {
            all_succeeded = false;
            progress.push(LineProgress {
                index: i,
                status: "failed".into(),
                error: Some("未能匹配到歌词行".into()),
            });
        }
    }

    // Persist final status.
    {
        let guard = state
            .0
            .lock()
            .map_err(|_| "db lock poisoned".to_string())?;
        if all_succeeded {
            song_repository::set_analysis_status(&guard, &song_id, "succeeded", None)
                .map_err(|e| e.to_string())?;
        } else {
            song_repository::set_analysis_status(&guard, &song_id, "failed", Some("部分歌词行分析失败"))
                .map_err(|e| e.to_string())?;
        }
    }

    Ok(progress)
}
