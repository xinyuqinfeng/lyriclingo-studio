use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum SourceLanguage {
    Ja,
    En,
    Ko,
    Auto,
}

impl SourceLanguage {
    pub fn to_str(&self) -> &'static str {
        match self {
            SourceLanguage::Ja => "ja",
            SourceLanguage::En => "en",
            SourceLanguage::Ko => "ko",
            SourceLanguage::Auto => "auto",
        }
    }
}

impl std::fmt::Display for SourceLanguage {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.to_str())
    }
}

impl std::str::FromStr for SourceLanguage {
    type Err = String;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "ja" => Ok(SourceLanguage::Ja),
            "en" => Ok(SourceLanguage::En),
            "ko" => Ok(SourceLanguage::Ko),
            "auto" => Ok(SourceLanguage::Auto),
            other => Err(format!("unknown source language: {other}")),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum PartOfSpeech {
    Noun,
    Verb,
    Adjective,
    Adverb,
    Particle,
    Pronoun,
    Article,
    Conjunction,
    Interjection,
    Preposition,
    Determiner,
    Auxiliary,
    Other,
}

impl PartOfSpeech {
    pub fn to_str(&self) -> &'static str {
        match self {
            PartOfSpeech::Noun => "noun",
            PartOfSpeech::Verb => "verb",
            PartOfSpeech::Adjective => "adjective",
            PartOfSpeech::Adverb => "adverb",
            PartOfSpeech::Particle => "particle",
            PartOfSpeech::Pronoun => "pronoun",
            PartOfSpeech::Article => "article",
            PartOfSpeech::Conjunction => "conjunction",
            PartOfSpeech::Interjection => "interjection",
            PartOfSpeech::Preposition => "preposition",
            PartOfSpeech::Determiner => "determiner",
            PartOfSpeech::Auxiliary => "auxiliary",
            PartOfSpeech::Other => "other",
        }
    }
}

impl std::fmt::Display for PartOfSpeech {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.to_str())
    }
}

impl std::str::FromStr for PartOfSpeech {
    type Err = String;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "noun" => Ok(PartOfSpeech::Noun),
            "verb" => Ok(PartOfSpeech::Verb),
            "adjective" => Ok(PartOfSpeech::Adjective),
            "adverb" => Ok(PartOfSpeech::Adverb),
            "particle" => Ok(PartOfSpeech::Particle),
            "pronoun" => Ok(PartOfSpeech::Pronoun),
            "article" => Ok(PartOfSpeech::Article),
            "conjunction" => Ok(PartOfSpeech::Conjunction),
            "interjection" => Ok(PartOfSpeech::Interjection),
            "preposition" => Ok(PartOfSpeech::Preposition),
            "determiner" => Ok(PartOfSpeech::Determiner),
            "auxiliary" => Ok(PartOfSpeech::Auxiliary),
            "other" => Ok(PartOfSpeech::Other),
            other => Err(format!("unknown part of speech: {other}")),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Token {
    pub surface: String,
    pub start: u32,
    pub end: u32,
    pub pos: PartOfSpeech,
    pub base_form: String,
    #[serde(default)]
    pub base_reading: Option<String>,
    #[serde(default)]
    pub reading: Option<String>,
    /// Per-character readings (one per char of `surface`) for per-kanji furigana.
    #[serde(default)]
    pub readings: Option<Vec<String>>,
    pub meaning: String,
    #[serde(default)]
    pub contextual_meaning: Option<String>,
    #[serde(default)]
    pub conjugation: Option<String>,
    #[serde(default = "default_true")]
    pub confirmed: bool,
}

fn default_true() -> bool {
    true
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct LineAnalysis {
    pub line_index: u32,
    #[serde(default)]
    pub original_line: Option<String>,
    pub translation: String,
    #[serde(default)]
    pub reading_text: Option<String>,
    #[serde(default)]
    pub tokens: Vec<Token>,
    #[serde(default)]
    pub grammar_notes: Option<Vec<String>>,
    #[serde(default)]
    pub uncertainty: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Song {
    pub id: String,
    pub title: String,
    pub artist: String,
    pub language: SourceLanguage,
    pub lyrics: String,
    #[serde(default)]
    pub lyrics_raw: Option<String>,
    #[serde(default)]
    pub analysis_status: Option<String>,
    #[serde(default)]
    pub analysis_error: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct LyricLine {
    pub id: String,
    pub song_id: String,
    pub seq: u32,
    pub text: String,
    pub is_section_break: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ProviderProfile {
    pub id: String,
    pub name: String,
    pub base_url: String,
    pub model: String,
    pub supports_structured_output: bool,
    pub supports_json_mode: bool,
    pub models_path: String,
    pub credential_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ProviderModel {
    pub id: String,
    #[serde(default)]
    pub owned_by: Option<String>,
    #[serde(default)]
    pub created: Option<u64>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn token_round_trips_camel_case() {
        let json = r#"{
            "surface": "降る",
            "start": 3,
            "end": 6,
            "pos": "verb",
            "baseForm": "降る",
            "baseReading": "ふる",
            "meaning": "下（雨/雪）",
            "conjugation": "連体形",
            "confirmed": true
        }"#;
        let token: Token = serde_json::from_str(json).expect("should parse");
        assert_eq!(token.pos, PartOfSpeech::Verb);
        assert_eq!(token.base_form, "降る");
        assert_eq!(token.conjugation.as_deref(), Some("連体形"));
    }

    #[test]
    fn token_defaults_confirmed_to_true() {
        let json = r#"{
            "surface": "星",
            "start": 0,
            "end": 1,
            "pos": "noun",
            "baseForm": "星",
            "meaning": "星星"
        }"#;
        let token: Token = serde_json::from_str(json).expect("should parse");
        assert!(token.confirmed);
        assert_eq!(token.reading, None);
    }

    #[test]
    fn line_analysis_parses_with_optional_fields() {
        let json = r#"{
            "lineIndex": 0,
            "translation": "测试",
            "tokens": [],
            "grammarNotes": ["a"],
            "uncertainty": ["b"]
        }"#;
        let analysis: LineAnalysis = serde_json::from_str(json).expect("should parse");
        assert_eq!(analysis.line_index, 0);
        assert_eq!(analysis.grammar_notes.as_ref().map(Vec::len), Some(1));
    }

    #[test]
    fn source_language_round_trips() {
        let json = r#""auto""#;
        let lang: SourceLanguage = serde_json::from_str(json).expect("should parse");
        assert_eq!(lang, SourceLanguage::Auto);
    }
}
