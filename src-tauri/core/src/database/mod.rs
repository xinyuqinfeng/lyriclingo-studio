use rusqlite::Connection;
use std::path::Path;

pub mod repositories;
pub mod schema;

pub struct Database {
    pub conn: Connection,
}

impl Database {
    pub fn open(path: &Path) -> rusqlite::Result<Self> {
        if let Some(dir) = path.parent() {
            std::fs::create_dir_all(dir).ok();
        }
        let conn = Connection::open(path)?;
        conn.pragma_update(None, "journal_mode", "WAL")?;
        conn.pragma_update(None, "foreign_keys", "ON")?;
        Ok(Self { conn })
    }

    pub fn migrate(&self) -> rusqlite::Result<()> {
        self.conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS schema_migrations (
                version INTEGER PRIMARY KEY,
                applied_at TEXT NOT NULL DEFAULT (datetime('now'))
            );",
        )?;
        let applied: i64 = self
            .conn
            .query_row("SELECT COALESCE(MAX(version), 0) FROM schema_migrations", [], |r| {
                r.get(0)
            })?;

        if applied < 1 {
            self.conn.execute_batch(schema::MIGRATION_001)?;
            self.conn.execute(
                "INSERT INTO schema_migrations (version) VALUES (1)",
                [],
            )?;
        }
        Ok(())
    }

    pub fn begin(&self) -> rusqlite::Result<rusqlite::Transaction<'_>> {
        self.conn.unchecked_transaction()
    }
}

#[cfg(test)]
pub mod tests {
    use super::*;
    use crate::database::repositories::{
        lyric_line_repository, song_repository, token_repository, vocabulary_repository,
    };
    use crate::models::{LyricLine, PartOfSpeech, Song, SourceLanguage, Token};

    pub fn test_db() -> Database {
        let db = Database::open(Path::new(":memory:")).expect("open memory db");
        db.migrate().expect("migrate");
        db
    }

    #[test]
    fn create_song_and_read_back() {
        let db = test_db();
        let song = Song {
            id: "s1".into(),
            title: "夜空".into(),
            artist: "某人".into(),
            language: SourceLanguage::Ja,
            lyrics: "星が降る夜\n".into(),
            created_at: "2026-08-05T00:00:00Z".into(),
        };
        song_repository::insert(&db, &song).expect("insert song");
        let got = song_repository::get(&db, "s1").expect("get song");
        assert_eq!(got.title, "夜空");
        assert_eq!(got.language, SourceLanguage::Ja);
    }

    #[test]
    fn save_line_analysis_and_read_tokens() {
        let db = test_db();
        let song = Song {
            id: "s1".into(),
            title: "t".into(),
            artist: String::new(),
            language: SourceLanguage::Ja,
            lyrics: "食べました。\n".into(),
            created_at: "2026-08-05T00:00:00Z".into(),
        };
        song_repository::insert(&db, &song).expect("insert song");

        let line = LyricLine {
            id: "l1".into(),
            song_id: "s1".into(),
            seq: 0,
            text: "食べました。".into(),
            is_section_break: false,
        };
        lyric_line_repository::insert(&db, &line).expect("insert line");

        let token = Token {
            surface: "食べました".into(),
            start: 0,
            end: 6,
            pos: PartOfSpeech::Verb,
            base_form: "食べる".into(),
            base_reading: Some("たべる".into()),
            reading: Some("たべました".into()),
            meaning: "吃".into(),
            contextual_meaning: None,
            conjugation: Some("過去・丁寧".into()),
            confirmed: true,
        };
        token_repository::upsert_tokens(&db, "l1", "s1", vec![token]).expect("save tokens");

        let tokens = token_repository::get_by_line(&db, "l1").expect("get tokens");
        assert_eq!(tokens.len(), 1);
        assert_eq!(tokens[0].base_form, "食べる");
    }

    #[test]
    fn vocabulary_dedupes_by_language_and_base_form() {
        let db = test_db();
        for (sid, lid) in [("s1", "l1"), ("s2", "l2")] {
            song_repository::insert(
                &db,
                &Song {
                    id: sid.into(),
                    title: "t".into(),
                    artist: String::new(),
                    language: SourceLanguage::Ja,
                    lyrics: String::new(),
                    created_at: String::new(),
                },
            )
            .expect("insert song");
            lyric_line_repository::insert(
                &db,
                &LyricLine {
                    id: lid.into(),
                    song_id: sid.into(),
                    seq: 0,
                    text: "x".into(),
                    is_section_break: false,
                },
            )
            .expect("insert line");
            token_repository::upsert_tokens(
                &db,
                lid,
                sid,
                vec![Token {
                    surface: "食べました".into(),
                    start: 0,
                    end: 6,
                    pos: PartOfSpeech::Verb,
                    base_form: "食べる".into(),
                    base_reading: Some("たべる".into()),
                    reading: None,
                    meaning: "吃".into(),
                    contextual_meaning: None,
                    conjugation: Some("過去".into()),
                    confirmed: true,
                }],
            )
            .expect("insert token");
        }
        vocabulary_repository::upsert_favorite(
            &db,
            "ja",
            "食べる",
            Some("たべる"),
            "吃",
            PartOfSpeech::Verb,
            "s1",
            "l1",
            "l1-0",
            "食べました",
        )
        .expect("fav1");
        vocabulary_repository::upsert_favorite(
            &db,
            "ja",
            "食べる",
            Some("たべる"),
            "吃",
            PartOfSpeech::Verb,
            "s2",
            "l2",
            "l2-0",
            "食べます",
        )
        .expect("fav2");

        let entries = vocabulary_repository::list(&db).expect("list");
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].base_form, "食べる");
    }

    #[test]
    fn delete_song_keeps_favorited_vocabulary() {
        let db = test_db();
        song_repository::insert(
            &db,
            &Song {
                id: "s1".into(),
                title: "t".into(),
                artist: String::new(),
                language: SourceLanguage::Ja,
                lyrics: String::new(),
                created_at: String::new(),
            },
        )
        .expect("insert song");
        lyric_line_repository::insert(
            &db,
            &LyricLine {
                id: "l1".into(),
                song_id: "s1".into(),
                seq: 0,
                text: "空".into(),
                is_section_break: false,
            },
        )
        .expect("insert line");
        token_repository::upsert_tokens(
            &db,
            "l1",
            "s1",
            vec![Token {
                surface: "空".into(),
                start: 0,
                end: 1,
                pos: PartOfSpeech::Noun,
                base_form: "空".into(),
                base_reading: Some("そら".into()),
                reading: None,
                meaning: "天空".into(),
                contextual_meaning: None,
                conjugation: None,
                confirmed: true,
            }],
        )
        .expect("insert token");
        vocabulary_repository::upsert_favorite(
            &db,
            "ja",
            "空",
            Some("そら"),
            "天空",
            PartOfSpeech::Noun,
            "s1",
            "l1",
            "l1-0",
            "空",
        )
        .expect("fav");

        song_repository::delete(&db, "s1").expect("delete song");

        let entries = vocabulary_repository::list(&db).expect("list");
        assert_eq!(entries.len(), 1, "favorited vocab survives song deletion");
    }

    #[test]
    fn transaction_rolls_back_on_failure() {
        let db = test_db();
        let tx = db.begin().expect("begin");
        song_repository::insert_tx(
            &tx,
            &Song {
                id: "s_rollback".into(),
                title: "t".into(),
                artist: String::new(),
                language: SourceLanguage::En,
                lyrics: String::new(),
                created_at: String::new(),
            },
        )
        .expect("insert in tx");
        let res = tx.execute("INSERT INTO no_such_table (x) VALUES (1)", []);
        assert!(res.is_err(), "invalid SQL should fail");
        tx.rollback().expect("rollback");

        let count: i64 = db
            .conn
            .query_row("SELECT COUNT(*) FROM songs", [], |r| r.get(0))
            .expect("count");
        assert_eq!(count, 0, "rolled back insert must not persist");
    }
}
