use crate::database::Database;
use crate::models::PartOfSpeech;
use rusqlite::{params, OptionalExtension};

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

#[derive(serde::Serialize)]
pub struct VocabularySource {
    pub song_id: String,
    pub song_title: String,
    pub line_text: String,
    pub surface: String,
}

pub struct VocabularyFilter {
    pub language: Option<String>,
    pub pos: Option<String>,
    pub mastered: Option<bool>,
    pub search: Option<String>,
}

impl Default for VocabularyFilter {
    fn default() -> Self {
        Self {
            language: None,
            pos: None,
            mastered: None,
            search: None,
        }
    }
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

pub fn list(db: &Database, filter: &VocabularyFilter) -> rusqlite::Result<Vec<VocabularyRow>> {
    let mut sql = String::from(
        "SELECT id, language, base_form, base_reading, meaning, pos, favorite, mastered, tags, note, created_at
         FROM vocabulary_entries WHERE 1=1",
    );
    let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
    if let Some(lang) = &filter.language {
        sql.push_str(" AND language = ?");
        params.push(Box::new(lang.clone()));
    }
    if let Some(p) = &filter.pos {
        sql.push_str(" AND pos = ?");
        params.push(Box::new(p.clone()));
    }
    if let Some(m) = filter.mastered {
        sql.push_str(" AND mastered = ?");
        params.push(Box::new(if m { 1 } else { 0 }));
    }
    if let Some(s) = &filter.search {
        sql.push_str(" AND (base_form LIKE ? OR meaning LIKE ?)");
        let like = format!("%{}%", s);
        params.push(Box::new(like.clone()));
        params.push(Box::new(like));
    }
    sql.push_str(" ORDER BY created_at DESC");

    let mut stmt = db.conn.prepare(&sql)?;
    let param_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    let rows = stmt.query_map(param_refs.as_slice(), |r| {
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

pub fn get(db: &Database, id: &str) -> rusqlite::Result<Option<VocabularyRow>> {
    let row = db
        .conn
        .query_row(
            "SELECT id, language, base_form, base_reading, meaning, pos, favorite, mastered, tags, note, created_at
             FROM vocabulary_entries WHERE id = ?1",
            params![id],
            |r| {
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
            },
        )
        .optional()?;
    Ok(row)
}

pub fn list_sources(db: &Database, vocabulary_id: &str) -> rusqlite::Result<Vec<VocabularySource>> {
    let mut stmt = db.conn.prepare(
        "SELECT vs.song_id, s.title, l.text, vs.surface
         FROM vocabulary_sources vs
         JOIN songs s ON s.id = vs.song_id
         JOIN lyric_lines l ON l.id = vs.line_id
         WHERE vs.vocabulary_id = ?1
         ORDER BY vs.song_id",
    )?;
    let rows = stmt.query_map(params![vocabulary_id], |r| {
        Ok(VocabularySource {
            song_id: r.get(0)?,
            song_title: r.get(1)?,
            line_text: r.get(2)?,
            surface: r.get(3)?,
        })
    })?;
    rows.collect()
}

pub fn set_mastered(db: &Database, id: &str, mastered: bool) -> rusqlite::Result<()> {
    db.conn.execute(
        "UPDATE vocabulary_entries SET mastered = ?1 WHERE id = ?2",
        params![if mastered { 1 } else { 0 }, id],
    )?;
    Ok(())
}

pub fn set_note(db: &Database, id: &str, note: Option<&str>) -> rusqlite::Result<()> {
    db.conn.execute(
        "UPDATE vocabulary_entries SET note = ?1 WHERE id = ?2",
        params![note, id],
    )?;
    Ok(())
}
