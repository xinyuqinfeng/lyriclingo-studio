use crate::commands::DbState;
use lyriclingo_core::database::repositories::vocabulary_repository;
use lyriclingo_core::database::repositories::vocabulary_repository::{
    VocabularyFilter, VocabularyRow, VocabularySource,
};
use lyriclingo_core::models::PartOfSpeech;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VocabularyListEntry {
    pub id: String,
    pub language: String,
    pub base_form: String,
    pub base_reading: Option<String>,
    pub meaning: String,
    pub pos: String,
    pub favorite: bool,
    pub mastered: bool,
    pub tags: Vec<String>,
    pub note: Option<String>,
    pub created_at: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VocabularyListInput {
    pub language: Option<String>,
    pub pos: Option<String>,
    pub mastered: Option<bool>,
    pub search: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VocabularyDetail {
    pub entry: VocabularyListEntry,
    pub sources: Vec<VocabularySource>,
}

fn to_entry(r: VocabularyRow) -> VocabularyListEntry {
    let tags: Vec<String> = serde_json::from_str(&r.tags).unwrap_or_default();
    VocabularyListEntry {
        id: r.id,
        language: r.language,
        base_form: r.base_form,
        base_reading: r.base_reading,
        meaning: r.meaning,
        pos: r.pos,
        favorite: r.favorite,
        mastered: r.mastered,
        tags,
        note: r.note,
        created_at: r.created_at,
    }
}

/// Lists vocabulary entries with optional filters.
#[tauri::command]
pub fn list_vocabulary(
    input: VocabularyListInput,
    state: State<'_, DbState>,
) -> Result<Vec<VocabularyListEntry>, String> {
    let guard = state
        .0
        .lock()
        .map_err(|_| "db lock poisoned".to_string())?;
    let filter = VocabularyFilter {
        language: input.language,
        pos: input.pos,
        mastered: input.mastered,
        search: input.search,
    };
    let rows = vocabulary_repository::list(&guard, &filter).map_err(|e| e.to_string())?;
    Ok(rows.into_iter().map(to_entry).collect())
}

/// Returns one vocabulary entry with all its source song lines.
#[tauri::command]
pub fn get_vocabulary(
    id: String,
    state: State<'_, DbState>,
) -> Result<VocabularyDetail, String> {
    let guard = state
        .0
        .lock()
        .map_err(|_| "db lock poisoned".to_string())?;
    let entry = vocabulary_repository::get(&guard, &id)
        .map_err(|e| e.to_string())?
        .ok_or("词条不存在")?;
    let sources = vocabulary_repository::list_sources(&guard, &id).map_err(|e| e.to_string())?;
    Ok(VocabularyDetail {
        entry: to_entry(entry),
        sources,
    })
}

/// Favorites a token by its id and upserts a vocabulary entry.
#[tauri::command]
pub fn favorite_token(
    song_id: String,
    line_id: String,
    token_id: String,
    language: String,
    base_form: String,
    base_reading: Option<String>,
    meaning: String,
    pos: String,
    surface: String,
    state: State<'_, DbState>,
) -> Result<(), String> {
    let guard = state
        .0
        .lock()
        .map_err(|_| "db lock poisoned".to_string())?;
    let pos_enum: PartOfSpeech = pos.parse().map_err(|e: String| e)?;
    vocabulary_repository::upsert_favorite(
        &guard,
        &language,
        &base_form,
        base_reading.as_deref(),
        &meaning,
        pos_enum,
        &song_id,
        &line_id,
        &token_id,
        &surface,
    )
    .map_err(|e| e.to_string())?;
    // Auto-enqueue the vocabulary for review.
    let vocab_id = format!("vocab-{language}-{base_form}");
    lyriclingo_core::database::repositories::review_repository::ensure_card(
        &guard,
        &vocab_id,
        "zh-to-word",
    )
    .map_err(|e| e.to_string())
}

/// Unfavorites (removes source links; entry removed if no sources remain).
#[tauri::command]
pub fn unfavorite_vocabulary(
    id: String,
    state: State<'_, DbState>,
) -> Result<(), String> {
    let guard = state
        .0
        .lock()
        .map_err(|_| "db lock poisoned".to_string())?;
    vocabulary_repository::unfavorite(&guard, &id).map_err(|e| e.to_string())
}

/// Marks a vocabulary entry as mastered.
#[tauri::command]
pub fn set_vocabulary_mastered(
    id: String,
    mastered: bool,
    state: State<'_, DbState>,
) -> Result<(), String> {
    let guard = state
        .0
        .lock()
        .map_err(|_| "db lock poisoned".to_string())?;
    vocabulary_repository::set_mastered(&guard, &id, mastered).map_err(|e| e.to_string())
}
