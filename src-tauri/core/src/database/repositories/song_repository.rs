use crate::database::Database;
use crate::models::Song;
use rusqlite::{params, Transaction};

pub fn insert(db: &Database, song: &Song) -> rusqlite::Result<()> {
    db.conn.execute(
        "INSERT INTO songs (id, title, artist, language, lyrics, lyrics_raw, analysis_status, analysis_error, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![
            song.id,
            song.title,
            song.artist,
            song.language.to_string(),
            song.lyrics,
            song.lyrics_raw.as_deref().unwrap_or(""),
            song.analysis_status.as_deref().unwrap_or("idle"),
            song.analysis_error.as_deref().unwrap_or(""),
            song.created_at
        ],
    )?;
    Ok(())
}

pub fn insert_tx(tx: &Transaction<'_>, song: &Song) -> rusqlite::Result<()> {
    tx.execute(
        "INSERT INTO songs (id, title, artist, language, lyrics, lyrics_raw, analysis_status, analysis_error, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![
            song.id,
            song.title,
            song.artist,
            song.language.to_string(),
            song.lyrics,
            song.lyrics_raw.as_deref().unwrap_or(""),
            song.analysis_status.as_deref().unwrap_or("idle"),
            song.analysis_error.as_deref().unwrap_or(""),
            song.created_at
        ],
    )?;
    Ok(())
}

/// Updates the persistent analysis status for a song.
pub fn set_analysis_status(db: &Database, id: &str, status: &str, error: Option<&str>) -> rusqlite::Result<()> {
    db.conn.execute(
        "UPDATE songs SET analysis_status = ?1, analysis_error = ?2 WHERE id = ?3",
        params![status, error.unwrap_or(""), id],
    )?;
    Ok(())
}

pub fn get(db: &Database, id: &str) -> rusqlite::Result<Song> {
    db.conn
        .query_row(
            "SELECT id, title, artist, language, lyrics, lyrics_raw, analysis_status, analysis_error, created_at FROM songs WHERE id = ?1",
            params![id],
            |r| {
                let language: String = r.get(3)?;
                let raw: Option<String> = r.get(5)?;
                let status: Option<String> = r.get(6)?;
                let err: Option<String> = r.get(7)?;
                Ok(Song {
                    id: r.get(0)?,
                    title: r.get(1)?,
                    artist: r.get(2)?,
                    language: language.parse().expect("valid language"),
                    lyrics: r.get(4)?,
                    lyrics_raw: raw.filter(|s| !s.is_empty()),
                    analysis_status: status.filter(|s| !s.is_empty() && s != "idle"),
                    analysis_error: err.filter(|s| !s.is_empty()),
                    created_at: r.get(8)?,
                })
            },
        )
}

pub fn list(db: &Database) -> rusqlite::Result<Vec<Song>> {
    let mut stmt = db
        .conn
        .prepare("SELECT id, title, artist, language, lyrics, lyrics_raw, analysis_status, analysis_error, created_at FROM songs ORDER BY created_at DESC")?;
    let rows = stmt.query_map([], |r| {
        let language: String = r.get(3)?;
        let raw: Option<String> = r.get(5)?;
        let status: Option<String> = r.get(6)?;
        let err: Option<String> = r.get(7)?;
        Ok(Song {
            id: r.get(0)?,
            title: r.get(1)?,
            artist: r.get(2)?,
            language: language.parse().expect("valid language"),
            lyrics: r.get(4)?,
            lyrics_raw: raw.filter(|s| !s.is_empty()),
            analysis_status: status.filter(|s| !s.is_empty() && s != "idle"),
            analysis_error: err.filter(|s| !s.is_empty()),
            created_at: r.get(8)?,
        })
    })?;
    rows.collect()
}

pub fn delete(db: &Database, id: &str) -> rusqlite::Result<()> {
    db.conn
        .execute("DELETE FROM songs WHERE id = ?1", params![id])?;
    Ok(())
}
