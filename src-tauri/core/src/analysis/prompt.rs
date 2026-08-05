use crate::models::{SourceLanguage};

pub struct AnalysisContext {
    pub language: SourceLanguage,
    pub song_title: String,
    pub artist: String,
}

/// Builds the system prompt for lyric analysis.
/// Emphasizes natural, beautiful translation (not word-for-word) and
/// accurate part-of-speech / base form / reading for each token.
pub fn system_prompt(context: &AnalysisContext) -> String {
    let lang_label = match context.language {
        SourceLanguage::Ja => "日语",
        SourceLanguage::En => "英语",
        SourceLanguage::Ko => "韩语",
        SourceLanguage::Auto => "检测到的语言",
    };
    format!(
        "你是一位精通{lang_label}歌词翻译与语言教学的专家。\
\n歌曲：{title} - {artist}\
\n你的任务：把歌词逐句翻译成自然、优美、可演唱的中文，并逐词切分、标注词性、原型、读音与中文释义。\
\n\n规则：\
\n1. 译文要优美自然，符合中文歌词/诗歌语感，不要逐字硬译。\
\n2. 每一句歌词都要准确切分 token（词），动词的活用变形（如过去式、て形、敬体、时态）要给出原型和活用说明。\
\n3. 日语：每个汉字词给出读音（reading）；整句给 readingText（汉字上方标注平假名的可读文本）。\
\n4. 英语/韩语：同样给出词性、原型、释义；韩语给出罗马音或读音可选。\
\n5. 词义区分“常规释义(meaning)”和“歌词语境义(contextualMeaning)”。\
\n6. 无法确定的读音或词义，在 uncertainty 中说明，不要编造。\
\n7. 输出严格 JSON。",
        title = context.song_title,
        artist = context.artist,
        lang_label = lang_label,
    )
}

/// Builds the user prompt for a single line of lyrics.
pub fn user_prompt(line: &str) -> String {
    format!(
        "请分析下面这一句歌词，按 JSON Schema 输出：\n\n\"{line}\"\n\n\
输出字段：lineIndex(从0开始)、translation(自然中文)、readingText(带注音的显示文本)、\
tokens(数组，每项含 surface/start/end/pos/baseForm/baseReading/reading/meaning/\
contextualMeaning/conjugation/confirmed)、grammarNotes、uncertainty。\
\n词性 pos 取值为: noun, verb, adjective, adverb, particle, pronoun, article, conjunction, interjection, other。"
    )
}

/// The JSON Schema sent to the model (as part of structured outputs).
pub fn analysis_json_schema() -> serde_json::Value {
    serde_json::json!({
        "type": "object",
        "properties": {
            "lineIndex": { "type": "integer", "minimum": 0 },
            "translation": { "type": "string", "minLength": 1 },
            "readingText": { "type": "string" },
            "tokens": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "surface": { "type": "string" },
                        "start": { "type": "integer", "minimum": 0 },
                        "end": { "type": "integer", "minimum": 1 },
                        "pos": { "type": "string", "enum": ["noun","verb","adjective","adverb","particle","pronoun","article","conjunction","interjection","other"] },
                        "baseForm": { "type": "string" },
                        "baseReading": { "type": "string" },
                        "reading": { "type": "string" },
                        "meaning": { "type": "string" },
                        "contextualMeaning": { "type": "string" },
                        "conjugation": { "type": "string" },
                        "confirmed": { "type": "boolean" }
                    },
                    "required": ["surface","start","end","pos","baseForm","meaning"],
                    "additionalProperties": false
                }
            },
            "grammarNotes": { "type": "array", "items": { "type": "string" } },
            "uncertainty": { "type": "array", "items": { "type": "string" } }
        },
        "required": ["lineIndex","translation","tokens"],
        "additionalProperties": false
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn schema_includes_required_fields() {
        let schema = analysis_json_schema();
        let required = schema["required"].as_array().unwrap();
        let reqs: Vec<&str> = required.iter().map(|v| v.as_str().unwrap()).collect();
        assert!(reqs.contains(&"lineIndex"));
        assert!(reqs.contains(&"translation"));
        assert!(reqs.contains(&"tokens"));
    }

    #[test]
    fn system_prompt_mentions_quality_rules() {
        let ctx = AnalysisContext {
            language: SourceLanguage::Ja,
            song_title: "夜空".into(),
            artist: "歌手".into(),
        };
        let p = system_prompt(&ctx);
        assert!(p.contains("不要逐字硬译"));
        assert!(p.contains("夜空"));
    }

    #[test]
    fn user_prompt_passes_line_text() {
        let p = user_prompt("星が降る夜に");
        assert!(p.contains("星が降る夜に"));
        assert!(p.contains("lineIndex"));
    }
}
