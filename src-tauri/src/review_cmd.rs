use crate::commands::DbState;
use lyriclingo_core::database::repositories::review_repository;
use lyriclingo_core::database::repositories::review_repository::{DueCard, ReviewCard};
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DueCardDto {
    pub card_id: String,
    pub vocabulary_id: String,
    pub card_type: String,
    pub base_form: String,
    pub meaning: String,
    pub base_reading: Option<String>,
    pub language: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReviewStats {
    pub today_due: i64,
    pub mastered: i64,
}

/// Lists review cards due today (with an optional limit for new cards).
#[tauri::command]
pub fn get_due_cards(
    limit: Option<i64>,
    state: State<'_, DbState>,
) -> Result<Vec<DueCardDto>, String> {
    let guard = state
        .0
        .lock()
        .map_err(|_| "db lock poisoned".to_string())?;
    let cards = review_repository::due_cards(&guard, limit).map_err(|e| e.to_string())?;
    Ok(cards
        .into_iter()
        .map(|c: DueCard| DueCardDto {
            card_id: c.card_id,
            vocabulary_id: c.vocabulary_id,
            card_type: c.card_type,
            base_form: c.base_form,
            meaning: c.meaning,
            base_reading: c.base_reading,
            language: c.language,
        })
        .collect())
}

/// Returns review statistics.
#[tauri::command]
pub fn review_stats(state: State<'_, DbState>) -> Result<ReviewStats, String> {
    let guard = state
        .0
        .lock()
        .map_err(|_| "db lock poisoned".to_string())?;
    let today_due = review_repository::today_due_count(&guard).map_err(|e| e.to_string())?;
    let mastered = review_repository::mastered_count(&guard).map_err(|e| e.to_string())?;
    Ok(ReviewStats { today_due, mastered })
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RateCardInput {
    pub card_id: String,
    pub vocabulary_id: String,
    pub card_type: String,
    pub rating: String, // again | hard | good | easy
    pub interval: i64,
    pub ease: f64,
    pub step: i64,
    pub due_at: String,
}

/// Records a rating for a review card and updates its schedule.
#[tauri::command]
pub fn rate_card(input: RateCardInput, state: State<'_, DbState>) -> Result<(), String> {
    let guard = state
        .0
        .lock()
        .map_err(|_| "db lock poisoned".to_string())?;

    let card = ReviewCard {
        id: input.card_id.clone(),
        vocabulary_id: input.vocabulary_id,
        card_type: input.card_type,
        due_at: input.due_at,
        interval: input.interval,
        ease: input.ease,
        step: input.step,
        last_rating: Some(input.rating.clone()),
    };
    review_repository::upsert_card(
        &guard,
        &card.vocabulary_id,
        &card.card_type,
        &card,
    )
    .map_err(|e| e.to_string())?;
    review_repository::log_rating(
        &guard,
        &input.card_id,
        &input.rating,
        input.interval,
        input.ease,
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

/// Adds a vocabulary entry to the review queue (creates its first card).
#[tauri::command]
pub fn enqueue_review(
    vocabulary_id: String,
    state: State<'_, DbState>,
) -> Result<(), String> {
    let guard = state
        .0
        .lock()
        .map_err(|_| "db lock poisoned".to_string())?;
    review_repository::ensure_card(&guard, &vocabulary_id, "zh-to-word").map_err(|e| e.to_string())
}
