use crate::database::Database;
use rusqlite::params;

pub struct ReviewCard {
    pub id: String,
    pub vocabulary_id: String,
    pub card_type: String,
    pub due_at: String,
    pub interval: i64,
    pub ease: f64,
    pub step: i64,
    pub last_rating: Option<String>,
}

pub struct ReviewLog {
    pub id: String,
    pub card_id: String,
    pub rated_at: String,
    pub rating: String,
    pub interval: i64,
    pub ease: f64,
}

pub fn upsert_card(
    db: &Database,
    vocabulary_id: &str,
    card_type: &str,
    card: &ReviewCard,
) -> rusqlite::Result<()> {
    db.conn.execute(
        "INSERT INTO review_cards
            (id, vocabulary_id, card_type, due_at, interval, ease, step, last_rating, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
         ON CONFLICT(vocabulary_id, card_type) DO UPDATE SET
            due_at = excluded.due_at,
            interval = excluded.interval,
            ease = excluded.ease,
            step = excluded.step,
            last_rating = excluded.last_rating",
        params![
            card.id,
            vocabulary_id,
            card_type,
            card.due_at,
            card.interval,
            card.ease,
            card.step,
            card.last_rating,
            chrono::Utc::now().to_rfc3339(),
        ],
    )?;
    Ok(())
}

pub fn get_card(
    db: &Database,
    vocabulary_id: &str,
    card_type: &str,
) -> rusqlite::Result<Option<ReviewCard>> {
    let mut stmt = db.conn.prepare(
        "SELECT id, vocabulary_id, card_type, due_at, interval, ease, step, last_rating
         FROM review_cards WHERE vocabulary_id = ?1 AND card_type = ?2",
    )?;
    let mut rows = stmt.query(params![vocabulary_id, card_type])?;
    if let Some(r) = rows.next()? {
        Ok(Some(ReviewCard {
            id: r.get(0)?,
            vocabulary_id: r.get(1)?,
            card_type: r.get(2)?,
            due_at: r.get(3)?,
            interval: r.get(4)?,
            ease: r.get(5)?,
            step: r.get(6)?,
            last_rating: r.get(7)?,
        }))
    } else {
        Ok(None)
    }
}

/// Returns cards due today (or earlier), joining vocabulary details.
pub struct DueCard {
    pub card_id: String,
    pub vocabulary_id: String,
    pub card_type: String,
    pub base_form: String,
    pub meaning: String,
    pub base_reading: Option<String>,
    pub language: String,
}

pub fn due_cards(db: &Database, limit: Option<i64>) -> rusqlite::Result<Vec<DueCard>> {
    let mut sql = String::from(
        "SELECT rc.id, rc.vocabulary_id, rc.card_type, ve.base_form, ve.meaning, ve.base_reading, ve.language
         FROM review_cards rc
         JOIN vocabulary_entries ve ON ve.id = rc.vocabulary_id
         WHERE rc.due_at <= ?1
         ORDER BY rc.due_at ASC",
    );
    if let Some(l) = limit {
        sql.push_str(&format!(" LIMIT {l}"));
    }
    let mut stmt = db.conn.prepare(&sql)?;
    let now = chrono::Utc::now().to_rfc3339();
    let rows = stmt.query_map(params![now], |r| {
        Ok(DueCard {
            card_id: r.get(0)?,
            vocabulary_id: r.get(1)?,
            card_type: r.get(2)?,
            base_form: r.get(3)?,
            meaning: r.get(4)?,
            base_reading: r.get(5)?,
            language: r.get(6)?,
        })
    })?;
    rows.collect()
}

pub fn log_rating(
    db: &Database,
    card_id: &str,
    rating: &str,
    interval: i64,
    ease: f64,
) -> rusqlite::Result<()> {
    db.conn.execute(
        "INSERT INTO review_logs (id, card_id, rated_at, rating, interval, ease)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            uuid::Uuid::new_v4().to_string(),
            card_id,
            chrono::Utc::now().to_rfc3339(),
            rating,
            interval,
            ease,
        ],
    )?;
    Ok(())
}

/// Ensures a card exists for the given vocabulary/card_type, creating it if needed.
pub fn ensure_card(db: &Database, vocabulary_id: &str, card_type: &str) -> rusqlite::Result<()> {
    if let Some(_) = get_card(db, vocabulary_id, card_type)? {
        return Ok(());
    }
    let card = ReviewCard {
        id: uuid::Uuid::new_v4().to_string(),
        vocabulary_id: vocabulary_id.to_string(),
        card_type: card_type.to_string(),
        due_at: chrono::Utc::now().to_rfc3339(),
        interval: 1,
        ease: 2.5,
        step: 0,
        last_rating: None,
    };
    upsert_card(db, vocabulary_id, card_type, &card)
}

pub fn today_due_count(db: &Database) -> rusqlite::Result<i64> {
    let now = chrono::Utc::now().to_rfc3339();
    db.conn
        .query_row(
            "SELECT COUNT(*) FROM review_cards WHERE due_at <= ?1",
            params![now],
            |r| r.get(0),
        )
}

pub fn mastered_count(db: &Database) -> rusqlite::Result<i64> {
    db.conn
        .query_row("SELECT COUNT(*) FROM vocabulary_entries WHERE mastered = 1", [], |r| r.get(0))
}
