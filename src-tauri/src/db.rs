use lyriclingo_core::database::repositories::{lyric_line_repository, song_repository};
use lyriclingo_core::database::Database;
use lyriclingo_core::models::{LyricLine, Song, SourceLanguage};
use std::path::PathBuf;

pub struct DbState(pub Database);

pub fn init_db(app_data_dir: PathBuf) -> Database {
    let db_path = app_data_dir.join("lyriclingo.db");
    let db = Database::open(&db_path).expect("open database");
    db.migrate().expect("run migrations");
    db
}

#[derive(serde::Serialize)]
pub struct SongListEntry {
    pub id: String,
    pub title: String,
    pub artist: String,
    pub language: String,
    pub analysis_status: Option<String>,
    pub analysis_error: Option<String>,
    pub created_at: String,
}

#[derive(serde::Deserialize)]
pub struct CreateSongInput {
    pub title: String,
    pub artist: String,
    pub language: String,
    pub lyrics: String,
    #[serde(default)]
    pub lyrics_raw: Option<String>,
}

#[derive(serde::Serialize)]
pub struct CreateSongResult {
    pub song: Song,
    pub lines: Vec<LyricLine>,
}

pub fn create_song(db: &Database, input: CreateSongInput) -> Result<CreateSongResult, String> {
    if input.title.trim().is_empty() {
        return Err("歌名不能为空".into());
    }
    let language: SourceLanguage = input
        .language
        .parse()
        .map_err(|e: String| format!("语言无效: {e}"))?;

    let song_id = uuid::Uuid::new_v4().to_string();
    let created_at = chrono::Utc::now().to_rfc3339();
    let song = Song {
        id: song_id.clone(),
        title: input.title.trim().to_string(),
        artist: input.artist.trim().to_string(),
        language,
        lyrics: input.lyrics.clone(),
        lyrics_raw: input.lyrics_raw,
        analysis_status: Some("idle".into()),
        analysis_error: None,
        created_at,
    };
    song_repository::insert(db, &song).map_err(|e| e.to_string())?;

    let raw_lines: Vec<&str> = input.lyrics.lines().collect();
    let mut lines: Vec<LyricLine> = Vec::new();
    for (i, raw) in raw_lines.iter().enumerate() {
        let is_break = raw.trim().is_empty();
        let line = LyricLine {
            id: uuid::Uuid::new_v4().to_string(),
            song_id: song_id.clone(),
            seq: i as u32,
            text: raw.to_string(),
            is_section_break: is_break,
        };
        lyric_line_repository::insert(db, &line).map_err(|e| e.to_string())?;
        lines.push(line);
    }
    Ok(CreateSongResult { song, lines })
}

pub fn list_songs(db: &Database) -> Result<Vec<SongListEntry>, String> {
    let songs = song_repository::list(db).map_err(|e| e.to_string())?;
    Ok(songs
        .into_iter()
        .map(|s| SongListEntry {
            id: s.id,
            title: s.title,
            artist: s.artist,
            language: s.language.to_string(),
            analysis_status: s.analysis_status,
            analysis_error: s.analysis_error,
            created_at: s.created_at,
        })
        .collect())
}

pub fn delete_song(db: &Database, id: &str) -> Result<(), String> {
    song_repository::delete(db, id).map_err(|e| e.to_string())
}

pub fn get_song(db: &Database, id: &str) -> Result<Song, String> {
    song_repository::get(db, id).map_err(|e| e.to_string())
}
