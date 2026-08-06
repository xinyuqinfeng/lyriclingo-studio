use crate::database::Database;
use crate::models::Token;
use rusqlite::params;

pub fn upsert_tokens(
    db: &Database,
    line_id: &str,
    song_id: &str,
    tokens: Vec<Token>,
) -> rusqlite::Result<()> {
    let tx = db.begin()?;
    tx.execute("DELETE FROM tokens WHERE line_id = ?1", params![line_id])?;
    for (i, t) in tokens.iter().enumerate() {
        let readings_json = t
            .readings
            .as_ref()
            .map(|r| serde_json::to_string(r).unwrap_or_else(|_| "[]".into()));
        tx.execute(
            "INSERT INTO tokens
                (id, line_id, song_id, surface, start, end, pos, base_form,
                 base_reading, reading, readings, meaning, contextual_meaning, conjugation, confirmed)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)",
            params![
                format!("{line_id}-{i}"),
                line_id,
                song_id,
                t.surface,
                t.start,
                t.end,
                t.pos.to_string(),
                t.base_form,
                t.base_reading,
                t.reading,
                readings_json,
                t.meaning,
                t.contextual_meaning,
                t.conjugation,
                if t.confirmed { 1 } else { 0 }
            ],
        )?;
    }
    tx.commit()?;
    Ok(())
}

pub fn get_by_line(db: &Database, line_id: &str) -> rusqlite::Result<Vec<Token>> {
    let mut stmt = db.conn.prepare(
        "SELECT surface, start, end, pos, base_form, base_reading, reading, readings, meaning,
                contextual_meaning, conjugation, confirmed
         FROM tokens WHERE line_id = ?1 ORDER BY start",
    )?;
    let rows = stmt.query_map(params![line_id], |r| {
        let pos: String = r.get(3)?;
        let readings_raw: Option<String> = r.get(7)?;
        let readings = readings_raw
            .and_then(|s| serde_json::from_str::<Vec<String>>(&s).ok());
        Ok(Token {
            surface: r.get(0)?,
            start: r.get(1)?,
            end: r.get(2)?,
            pos: pos.parse().expect("valid pos"),
            base_form: r.get(4)?,
            base_reading: r.get(5)?,
            reading: r.get(6)?,
            readings,
            meaning: r.get(8)?,
            contextual_meaning: r.get(9)?,
            conjugation: r.get(10)?,
            confirmed: r.get::<_, i64>(11)? != 0,
        })
    })?;
    rows.collect()
}
