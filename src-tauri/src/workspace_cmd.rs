use crate::commands::DbState;
use crate::db;
use lyriclingo_core::database::repositories::line_analysis_repository;
use lyriclingo_core::database::repositories::line_analysis_repository::LineAnalysisRecord;
use lyriclingo_core::database::repositories::token_repository;
use lyriclingo_core::models::{LyricLine, SourceLanguage, Token};
use serde::Serialize;
use tauri::State;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceLine {
    pub line: LyricLine,
    pub translation: Option<String>,
    pub reading_text: Option<String>,
    pub grammar_notes: Option<Vec<String>>,
    pub uncertainty: Option<Vec<String>>,
    pub model: Option<String>,
    pub generated_at: Option<String>,
    pub tokens: Vec<Token>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceData {
    pub song_id: String,
    pub song_title: String,
    pub artist: String,
    pub language: SourceLanguage,
    pub lines: Vec<WorkspaceLine>,
}

fn parse_json_array(value: Option<String>) -> Option<Vec<String>> {
    value.and_then(|v| serde_json::from_str::<Vec<String>>(&v).ok())
}

/// Loads a song with its line analyses and tokens for the workspace UI.
#[tauri::command]
pub fn get_song_analysis(song_id: String, state: State<'_, DbState>) -> Result<WorkspaceData, String> {
    let guard = state
        .0
        .lock()
        .map_err(|_| "db lock poisoned".to_string())?;
    let db = &*guard;

    let song = db::get_song(db, &song_id)?;
    let lines = lyriclingo_core::database::repositories::lyric_line_repository::list_by_song(db, &song_id)
        .map_err(|e| e.to_string())?;

    let analyses = line_analysis_repository::list_by_song(db, &song_id).map_err(|e| e.to_string())?;
    let mut analysis_by_line: std::collections::HashMap<String, LineAnalysisRecord> =
        std::collections::HashMap::new();
    for a in analyses {
        analysis_by_line.insert(a.line_id.clone(), a);
    }

    let mut workspace_lines = Vec::with_capacity(lines.len());
    for line in lines {
        let record = analysis_by_line.get(&line.id);
        let tokens = match record {
            Some(_) => token_repository::get_by_line(db, &line.id).unwrap_or_default(),
            None => Vec::new(),
        };
        workspace_lines.push(WorkspaceLine {
            translation: record.map(|r| r.translation.clone()),
            reading_text: record.and_then(|r| r.reading_text.clone()),
            grammar_notes: record.and_then(|r| parse_json_array(r.grammar_notes.clone())),
            uncertainty: record.and_then(|r| parse_json_array(r.uncertainty.clone())),
            model: record.map(|r| r.model.clone()),
            generated_at: record.map(|r| r.generated_at.clone()),
            line,
            tokens,
        });
    }

    Ok(WorkspaceData {
        song_id: song.id,
        song_title: song.title,
        artist: song.artist,
        language: song.language,
        lines: workspace_lines,
    })
}
