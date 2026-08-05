use crate::database::Database;
use crate::models::LineAnalysis;
use rusqlite::params;

pub struct LineAnalysisRecord {
    pub id: String,
    pub line_id: String,
    pub song_id: String,
    pub model: String,
    pub prompt_version: String,
    pub generated_at: String,
    pub validated: bool,
    pub human_edited: bool,
    pub line_index: u32,
    pub translation: String,
    pub reading_text: Option<String>,
    pub grammar_notes: Option<String>,
    pub uncertainty: Option<String>,
}

pub fn save(
    db: &Database,
    line_id: &str,
    song_id: &str,
    model: &str,
    prompt_version: &str,
    analysis: &LineAnalysis,
) -> rusqlite::Result<()> {
    db.conn.execute(
        "INSERT INTO line_analyses
            (id, line_id, song_id, model, prompt_version, generated_at, validated, human_edited,
             raw_json, line_index, translation, reading_text, grammar_notes, uncertainty)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1, 0, ?7, ?8, ?9, ?10, ?11, ?12)
         ON CONFLICT(id) DO UPDATE SET
             translation = excluded.translation,
             reading_text = excluded.reading_text,
             grammar_notes = excluded.grammar_notes,
             uncertainty = excluded.uncertainty,
             raw_json = excluded.raw_json,
             validated = 1",
        params![
            format!("analysis-{line_id}"),
            line_id,
            song_id,
            model,
            prompt_version,
            chrono::Utc::now().to_rfc3339(),
            serde_json::to_string(analysis).unwrap_or_else(|_| "{}".into()),
            analysis.line_index,
            analysis.translation,
            analysis.reading_text,
            serde_json::to_string(&analysis.grammar_notes).unwrap_or_else(|_| "[]".into()),
            serde_json::to_string(&analysis.uncertainty).unwrap_or_else(|_| "[]".into()),
        ],
    )?;
    Ok(())
}

pub fn get_by_line(db: &Database, line_id: &str) -> rusqlite::Result<Option<LineAnalysisRecord>> {
    let mut stmt = db.conn.prepare(
        "SELECT id, line_id, song_id, model, prompt_version, generated_at, validated, human_edited,
                line_index, translation, reading_text, grammar_notes, uncertainty
         FROM line_analyses WHERE line_id = ?1 ORDER BY generated_at DESC LIMIT 1",
    )?;
    let mut rows = stmt.query(params![line_id])?;
    if let Some(r) = rows.next()? {
        Ok(Some(LineAnalysisRecord {
            id: r.get(0)?,
            line_id: r.get(1)?,
            song_id: r.get(2)?,
            model: r.get(3)?,
            prompt_version: r.get(4)?,
            generated_at: r.get(5)?,
            validated: r.get::<_, i64>(6)? != 0,
            human_edited: r.get::<_, i64>(7)? != 0,
            line_index: r.get(8)?,
            translation: r.get(9)?,
            reading_text: r.get(10)?,
            grammar_notes: r.get(11)?,
            uncertainty: r.get(12)?,
        }))
    } else {
        Ok(None)
    }
}

pub fn list_by_song(db: &Database, song_id: &str) -> rusqlite::Result<Vec<LineAnalysisRecord>> {
    let mut stmt = db.conn.prepare(
        "SELECT id, line_id, song_id, model, prompt_version, generated_at, validated, human_edited,
                line_index, translation, reading_text, grammar_notes, uncertainty
         FROM line_analyses WHERE song_id = ?1 ORDER BY line_index",
    )?;
    let rows = stmt.query_map(params![song_id], |r| {
        Ok(LineAnalysisRecord {
            id: r.get(0)?,
            line_id: r.get(1)?,
            song_id: r.get(2)?,
            model: r.get(3)?,
            prompt_version: r.get(4)?,
            generated_at: r.get(5)?,
            validated: r.get::<_, i64>(6)? != 0,
            human_edited: r.get::<_, i64>(7)? != 0,
            line_index: r.get(8)?,
            translation: r.get(9)?,
            reading_text: r.get(10)?,
            grammar_notes: r.get(11)?,
            uncertainty: r.get(12)?,
        })
    })?;
    rows.collect()
}
