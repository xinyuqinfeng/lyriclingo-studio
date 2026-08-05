use crate::database::Database;
use crate::models::LyricLine;
use rusqlite::params;

pub fn insert(db: &Database, line: &LyricLine) -> rusqlite::Result<()> {
    db.conn.execute(
        "INSERT INTO lyric_lines (id, song_id, seq, text, is_section_break)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![
            line.id,
            line.song_id,
            line.seq,
            line.text,
            if line.is_section_break { 1 } else { 0 }
        ],
    )?;
    Ok(())
}

pub fn list_by_song(db: &Database, song_id: &str) -> rusqlite::Result<Vec<LyricLine>> {
    let mut stmt = db.conn.prepare(
        "SELECT id, song_id, seq, text, is_section_break
         FROM lyric_lines WHERE song_id = ?1 ORDER BY seq",
    )?;
    let rows = stmt.query_map(params![song_id], |r| {
        Ok(LyricLine {
            id: r.get(0)?,
            song_id: r.get(1)?,
            seq: r.get(2)?,
            text: r.get(3)?,
            is_section_break: r.get::<_, i64>(4)? != 0,
        })
    })?;
    rows.collect()
}
