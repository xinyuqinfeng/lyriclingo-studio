use crate::commands::DbState;
use crate::db;
use lyriclingo_core::analysis::executor::AnalysisExecutor;
use lyriclingo_core::analysis::prompt::AnalysisContext;
use lyriclingo_core::database::repositories::line_analysis_repository;
use lyriclingo_core::database::repositories::token_repository;
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
    let analyses = executor.analyze_pairs(&pair_input).await?;

    // Map each analysis back to a DB line by its seq.
    let mut progress: Vec<LineProgress> = Vec::new();
    for (i, analysis) in analyses.iter().enumerate() {
        let seq = pairs.get(i).map(|p| p.seq);
        let matched_line = seq.and_then(|s| lines.iter().find(|l| l.seq == s as u32));

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
            progress.push(LineProgress {
                index: i,
                status: "failed".into(),
                error: Some("未能匹配到歌词行".into()),
            });
        }
    }

    Ok(progress)
}
