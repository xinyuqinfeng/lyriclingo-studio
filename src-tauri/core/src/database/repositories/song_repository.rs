use crate::database::Database;
use crate::models::Song;
use rusqlite::{params, Transaction};

pub fn insert(db: &Database, song: &Song) -> rusqlite::Result<()> {
    db.conn.execute(
        "INSERT INTO songs (id, title, artist, language, lyrics, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            song.id,
            song.title,
            song.artist,
            song.language.to_string(),
            song.lyrics,
            song.created_at
        ],
    )?;
    Ok(())
}

pub fn insert_tx(tx: &Transaction<'_>, song: &Song) -> rusqlite::Result<()> {
    tx.execute(
        "INSERT INTO songs (id, title, artist, language, lyrics, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            song.id,
            song.title,
            song.artist,
            song.language.to_string(),
            song.lyrics,
            song.created_at
        ],
    )?;
    Ok(())
}

pub fn get(db: &Database, id: &str) -> rusqlite::Result<Song> {
    db.conn
        .query_row(
            "SELECT id, title, artist, language, lyrics, created_at FROM songs WHERE id = ?1",
            params![id],
            |r| {
                let language: String = r.get(3)?;
                Ok(Song {
                    id: r.get(0)?,
                    title: r.get(1)?,
                    artist: r.get(2)?,
                    language: language.parse().expect("valid language"),
                    lyrics: r.get(4)?,
                    created_at: r.get(5)?,
                })
            },
        )
}

pub fn list(db: &Database) -> rusqlite::Result<Vec<Song>> {
    let mut stmt = db
        .conn
        .prepare("SELECT id, title, artist, language, lyrics, created_at FROM songs ORDER BY created_at DESC")?;
    let rows = stmt.query_map([], |r| {
        let language: String = r.get(3)?;
        Ok(Song {
            id: r.get(0)?,
            title: r.get(1)?,
            artist: r.get(2)?,
            language: language.parse().expect("valid language"),
            lyrics: r.get(4)?,
            created_at: r.get(5)?,
        })
    })?;
    rows.collect()
}

pub fn delete(db: &Database, id: &str) -> rusqlite::Result<()> {
    db.conn
        .execute("DELETE FROM songs WHERE id = ?1", params![id])?;
    Ok(())
}
