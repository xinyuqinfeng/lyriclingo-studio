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
        tx.execute(
            "INSERT INTO tokens
                (id, line_id, song_id, surface, start, end, pos, base_form,
                 base_reading, reading, meaning, contextual_meaning, conjugation, confirmed)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
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
        "SELECT surface, start, end, pos, base_form, base_reading, reading, meaning,
                contextual_meaning, conjugation, confirmed
         FROM tokens WHERE line_id = ?1 ORDER BY start",
    )?;
    let rows = stmt.query_map(params![line_id], |r| {
        let pos: String = r.get(3)?;
        Ok(Token {
            surface: r.get(0)?,
            start: r.get(1)?,
            end: r.get(2)?,
            pos: pos.parse().expect("valid pos"),
            base_form: r.get(4)?,
            base_reading: r.get(5)?,
            reading: r.get(6)?,
            meaning: r.get(7)?,
            contextual_meaning: r.get(8)?,
            conjugation: r.get(9)?,
            confirmed: r.get::<_, i64>(10)? != 0,
        })
    })?;
    rows.collect()
}
