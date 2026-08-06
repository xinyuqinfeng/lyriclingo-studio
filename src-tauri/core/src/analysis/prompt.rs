use crate::models::SourceLanguage;

pub struct AnalysisContext {
    pub language: SourceLanguage,
    pub song_title: String,
    pub artist: String,
}

/// Builds the system prompt for full-song lyric analysis.
/// The model receives the whole pasted lyrics (which may be pure source-language,
/// or a bilingual mix where each source line is followed by a Chinese translation).
/// It must:
///   - identify the source-language lyric lines
///   - ignore metadata lines (作词/作曲/编曲...) and non-source translation lines
///   - translate each source line naturally, optionally using the given translation as a reference
///   - analyze each source line's tokens
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
\n你的任务：分析用户粘贴的歌词，把它翻译成自然、优美、可演唱的中文，并逐词切分、标注词性、原型、读音与中文释义。\
\n\n输入格式说明：\
\n用户粘贴的歌词可能是以下情况之一，你需要自行识别，不要假设：\
\n(a) 纯{lang_label}原文：所有非空行都是歌词行；\
\n(b) 混合格式（如网易云）：每一行{lang_label}歌词下方紧跟一行中文翻译；\
\n(c) 可能包含作词、作曲、编曲、制作等元信息行。\
\n\n处理规则：\
\n1. 只分析源语言（{lang_label}）歌词行。忽略元信息行（如“作词 : X”）和翻译行（中文行）。\
\n2. 若输入包含中文翻译行，可将其作为参考译文提升翻译质量，但请基于原文独立判断并给出最优译文。\
\n3. 译文要优美自然，符合中文歌词/诗歌语感，不要逐字硬译。\
\n4. 每个源语言歌词行都要准确切分 token（词），动词的活用变形（如过去式、て形、敬体、时态）要给出原型和活用说明。\
\n5. 日语：每个汉字词给出读音（reading）；整句给 readingText（汉字上方标注平假名的可读文本）。\
\n6. 英语/韩语：同样给出词性、原型、释义。\
\n7. 词义区分“常规释义(meaning)”和“歌词语境义(contextualMeaning)”。\
\n8. 无法确定的读音或词义，在 uncertainty 中说明，不要编造。\
\n9. 输出严格 JSON 数组。",
        title = context.song_title,
        artist = context.artist,
        lang_label = lang_label,
    )
}

/// Builds the user prompt containing all (source, optional reference) pairs.
/// Asks the model to analyze ALL source lines in ONE response array.
pub fn user_prompt_pairs(pairs: &[(String, Option<String>)]) -> String {
    let mut numbered = String::new();
    for (i, (source, reference)) in pairs.iter().enumerate() {
        numbered.push_str(&format!("{}. {}\n", i + 1, source));
        if let Some(r) = reference {
            numbered.push_str(&format!("   （参考译文：{r}）\n"));
        }
    }
    format!(
        "请分析下面所有源语言歌词行，按 JSON Schema 输出**一个数组**。\
数组的每个元素对应一行歌词，**数组长度必须与下面的歌词行数完全一致（{} 行），顺序一一对应**。\
\n\n歌词：\n{numbered}\n\
每个元素字段：lineIndex(从0开始)、originalLine(该行原文)、translation(自然中文)、\
readingText(带注音的显示文本)、tokens(数组，每项含 surface/start/end/pos/baseForm/\
baseReading/reading/meaning/contextualMeaning/conjugation/confirmed)、grammarNotes、uncertainty。\
\n词性 pos 取值为: noun, verb, adjective, adverb, particle, pronoun, article, conjunction, interjection, other。\
\n标注的参考译文仅作参考，请判断是否采用或优化。",
        pairs.len()
    )
}

/// The JSON Schema for a single line analysis (also used by structured outputs).
pub fn line_analysis_json_schema() -> serde_json::Value {
    serde_json::json!({
        "type": "object",
        "properties": {
            "lineIndex": { "type": "integer", "minimum": 0 },
            "originalLine": { "type": "string" },
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
        "required": ["lineIndex","originalLine","translation","tokens"],
        "additionalProperties": false
    })
}

/// Builds the user prompt for a single source line, with an optional reference
/// translation (from the pasted bilingual lyrics) that the model may use.
pub fn user_prompt_pair(source: &str, reference_translation: Option<&str>) -> String {
    let ref_part = match reference_translation {
        Some(t) => format!(
            "\n\n参考译文（用户粘贴的中文翻译，仅作参考，请判断是否采用或优化）：{t}"
        ),
        None => String::new(),
    };
    format!(
        "请分析这一句源语言歌词：\n\"{source}\"{ref_part}\n\n\
按 JSON Schema 输出一个数组，数组包含**一个元素**，字段：lineIndex(0)、\
originalLine(该句原文，必须与输入完全一致)、translation(自然中文)、\
readingText(带注音的显示文本)、tokens(数组，每项含 surface/start/end/pos/baseForm/\
baseReading/reading/meaning/contextualMeaning/conjugation/confirmed)、grammarNotes、uncertainty。\
\n词性 pos 取值为: noun, verb, adjective, adverb, particle, pronoun, article, conjunction, interjection, other。"
    )
}

/// The JSON Schema for the full-song analysis (array of line analyses).
pub fn analysis_json_schema() -> serde_json::Value {
    serde_json::json!({
        "type": "array",
        "items": line_analysis_json_schema()
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn schema_is_array_of_lines() {
        let schema = analysis_json_schema();
        assert_eq!(schema["type"], "array");
        assert_eq!(schema["items"]["required"][0], "lineIndex");
    }

    #[test]
    fn system_prompt_mentions_bilingual_format() {
        let ctx = AnalysisContext {
            language: SourceLanguage::Ja,
            song_title: "夜空".into(),
            artist: "歌手".into(),
        };
        let p = system_prompt(&ctx);
        assert!(p.contains("混合格式"));
        assert!(p.contains("作词"));
        assert!(p.contains("不要逐字硬译"));
    }

    #[test]
    fn user_prompt_includes_pairs_and_mentions_one_array() {
        let pairs = vec![
            ("星が降る夜に".to_string(), Some("在星星坠落的夜晚".to_string())),
            ("走り出そう".to_string(), None),
        ];
        let p = user_prompt_pairs(&pairs);
        assert!(p.contains("星が降る夜に"));
        assert!(p.contains("在星星坠落的夜晚"));
        assert!(p.contains("参考译文"));
        assert!(p.contains("一个数组"));
        assert!(p.contains("2 行"));
    }
}
