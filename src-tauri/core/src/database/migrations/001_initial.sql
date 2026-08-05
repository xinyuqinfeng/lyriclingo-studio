CREATE TABLE IF NOT EXISTS songs (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    artist TEXT NOT NULL DEFAULT '',
    language TEXT NOT NULL,
    lyrics TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS lyric_lines (
    id TEXT PRIMARY KEY,
    song_id TEXT NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    seq INTEGER NOT NULL,
    text TEXT NOT NULL,
    is_section_break INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_lyric_lines_song_seq ON lyric_lines(song_id, seq);

CREATE TABLE IF NOT EXISTS line_analyses (
    id TEXT PRIMARY KEY,
    line_id TEXT NOT NULL REFERENCES lyric_lines(id) ON DELETE CASCADE,
    song_id TEXT NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    model TEXT NOT NULL,
    prompt_version TEXT NOT NULL,
    generated_at TEXT NOT NULL,
    validated INTEGER NOT NULL DEFAULT 0,
    human_edited INTEGER NOT NULL DEFAULT 0,
    raw_json TEXT NOT NULL,
    line_index INTEGER NOT NULL,
    translation TEXT NOT NULL,
    reading_text TEXT,
    grammar_notes TEXT,
    uncertainty TEXT
);

CREATE INDEX IF NOT EXISTS idx_line_analyses_line ON line_analyses(line_id);

CREATE TABLE IF NOT EXISTS tokens (
    id TEXT PRIMARY KEY,
    line_id TEXT NOT NULL REFERENCES lyric_lines(id) ON DELETE CASCADE,
    song_id TEXT NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    surface TEXT NOT NULL,
    start INTEGER NOT NULL,
    end INTEGER NOT NULL,
    pos TEXT NOT NULL,
    base_form TEXT NOT NULL,
    base_reading TEXT,
    reading TEXT,
    meaning TEXT NOT NULL,
    contextual_meaning TEXT,
    conjugation TEXT,
    confirmed INTEGER NOT NULL DEFAULT 1,
    favorite INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_tokens_line ON tokens(line_id);
CREATE INDEX IF NOT EXISTS idx_tokens_song ON tokens(song_id);
CREATE INDEX IF NOT EXISTS idx_tokens_base_form ON tokens(base_form);

CREATE TABLE IF NOT EXISTS vocabulary_entries (
    id TEXT PRIMARY KEY,
    language TEXT NOT NULL,
    base_form TEXT NOT NULL,
    base_reading TEXT,
    meaning TEXT NOT NULL,
    pos TEXT NOT NULL,
    favorite INTEGER NOT NULL DEFAULT 0,
    mastered INTEGER NOT NULL DEFAULT 0,
    tags TEXT NOT NULL DEFAULT '[]',
    note TEXT,
    created_at TEXT NOT NULL,
    UNIQUE(language, base_form)
);

CREATE INDEX IF NOT EXISTS idx_vocab_lang ON vocabulary_entries(language);

CREATE TABLE IF NOT EXISTS vocabulary_sources (
    vocabulary_id TEXT NOT NULL REFERENCES vocabulary_entries(id) ON DELETE CASCADE,
    song_id TEXT NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    line_id TEXT NOT NULL REFERENCES lyric_lines(id) ON DELETE CASCADE,
    token_id TEXT NOT NULL REFERENCES tokens(id) ON DELETE CASCADE,
    surface TEXT NOT NULL,
    PRIMARY KEY (vocabulary_id, token_id)
);

CREATE TABLE IF NOT EXISTS review_cards (
    id TEXT PRIMARY KEY,
    vocabulary_id TEXT NOT NULL REFERENCES vocabulary_entries(id) ON DELETE CASCADE,
    card_type TEXT NOT NULL,
    due_at TEXT NOT NULL,
    interval INTEGER NOT NULL DEFAULT 0,
    ease REAL NOT NULL DEFAULT 2.5,
    step INTEGER NOT NULL DEFAULT 0,
    last_rating TEXT,
    created_at TEXT NOT NULL,
    UNIQUE(vocabulary_id, card_type)
);

CREATE INDEX IF NOT EXISTS idx_review_cards_due ON review_cards(due_at);

CREATE TABLE IF NOT EXISTS review_logs (
    id TEXT PRIMARY KEY,
    card_id TEXT NOT NULL REFERENCES review_cards(id) ON DELETE CASCADE,
    rated_at TEXT NOT NULL,
    rating TEXT NOT NULL,
    interval INTEGER NOT NULL,
    ease REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS provider_profiles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    base_url TEXT NOT NULL,
    model TEXT NOT NULL,
    supports_structured_output INTEGER NOT NULL DEFAULT 0,
    supports_json_mode INTEGER NOT NULL DEFAULT 0,
    models_path TEXT NOT NULL DEFAULT '',
    credential_id TEXT NOT NULL
);
