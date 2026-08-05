use crate::database::Database;
use crate::models::PartOfSpeech;
use rusqlite::params;

pub struct VocabularyRow {
    pub id: String,
    pub language: String,
    pub base_form: String,
    pub base_reading: Option<String>,
    pub meaning: String,
    pub pos: String,
    pub favorite: bool,
    pub mastered: bool,
    pub tags: String,
    pub note: Option<String>,
    pub created_at: String,
}

pub fn upsert_favorite(
    db: &Database,
    language: &str,
    base_form: &str,
    base_reading: Option<&str>,
    meaning: &str,
    pos: PartOfSpeech,
    song_id: &str,
    line_id: &str,
    token_id: &str,
    surface: &str,
) -> rusqlite::Result<()> {
    let tx = db.begin()?;
    tx.execute(
        "INSERT INTO vocabulary_entries
            (id, language, base_form, base_reading, meaning, pos, favorite, tags, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1, '[]', ?7)
         ON CONFLICT(language, base_form) DO UPDATE SET favorite = 1",
        params![
            format!("vocab-{language}-{base_form}"),
            language,
            base_form,
            base_reading,
            meaning,
            pos.to_string(),
            chrono::Utc::now().to_rfc3339(),
        ],
    )?;
    tx.execute(
        "INSERT OR IGNORE INTO vocabulary_sources (vocabulary_id, song_id, line_id, token_id, surface)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![
            format!("vocab-{language}-{base_form}"),
            song_id,
            line_id,
            token_id,
            surface,
        ],
    )?;
    tx.commit()?;
    Ok(())
}

pub fn unfavorite(
    db: &Database,
    vocabulary_id: &str,
) -> rusqlite::Result<()> {
    let tx = db.begin()?;
    tx.execute(
        "DELETE FROM vocabulary_sources WHERE vocabulary_id = ?1",
        params![vocabulary_id],
    )?;
    let source_count: i64 = tx.query_row(
        "SELECT COUNT(*) FROM vocabulary_sources WHERE vocabulary_id = ?1",
        params![vocabulary_id],
        |r| r.get(0),
    )?;
    let review_count: i64 = tx.query_row(
        "SELECT COUNT(*) FROM review_cards WHERE vocabulary_id = ?1",
        params![vocabulary_id],
        |r| r.get(0),
    )?;
    if source_count == 0 && review_count == 0 {
        tx.execute(
            "DELETE FROM vocabulary_entries WHERE id = ?1",
            params![vocabulary_id],
        )?;
    } else {
        tx.execute(
            "UPDATE vocabulary_entries SET favorite = 0 WHERE id = ?1",
            params![vocabulary_id],
        )?;
    }
    tx.commit()?;
    Ok(())
}

pub fn list(db: &Database) -> rusqlite::Result<Vec<VocabularyRow>> {
    let mut stmt = db.conn.prepare(
        "SELECT id, language, base_form, base_reading, meaning, pos, favorite, mastered, tags, note, created_at
         FROM vocabulary_entries ORDER BY created_at DESC",
    )?;
    let rows = stmt.query_map([], |r| {
        Ok(VocabularyRow {
            id: r.get(0)?,
            language: r.get(1)?,
            base_form: r.get(2)?,
            base_reading: r.get(3)?,
            meaning: r.get(4)?,
            pos: r.get(5)?,
            favorite: r.get::<_, i64>(6)? != 0,
            mastered: r.get::<_, i64>(7)? != 0,
            tags: r.get(8)?,
            note: r.get(9)?,
            created_at: r.get(10)?,
        })
    })?;
    rows.collect()
}
