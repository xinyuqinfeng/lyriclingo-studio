use crate::models::SourceLanguage;

pub struct AnalysisContext {
    pub language: SourceLanguage,
    pub song_title: String,
    pub artist: String,
}

/// Builds the system prompt for full-song lyric analysis.
pub fn system_prompt(context: &AnalysisContext) -> String {
    let lang_label = match context.language {
        SourceLanguage::Ja => "日语",
        SourceLanguage::En => "英语",
        SourceLanguage::Ko => "韩语",
        SourceLanguage::Auto => "源语言",
    };
    format!(
        "你是歌词翻译和语言教学助手。把{lang_label}歌词逐句翻成自然优美、可演唱的中文，\
并逐词标注词性、原型、中文意思（日语词给读音）。\
译文不要逐字硬译。输出严格 JSON。",
        lang_label = lang_label,
    )
}

/// Builds the user prompt containing all (source, optional reference) pairs.
pub fn user_prompt_pairs(pairs: &[(String, Option<String>)]) -> String {
    let mut numbered = String::new();
    for (i, (source, reference)) in pairs.iter().enumerate() {
        numbered.push_str(&format!("{}. {}\n", i + 1, source));
        if let Some(r) = reference {
            numbered.push_str(&format!("   （参考译文：{r}）\n"));
        }
    }
    format!(
        "分析下面 {} 行歌词，输出一个数组，每行一个元素，顺序一一对应：\n{numbered}\n\
每个元素格式：{{\"originalLine\":\"该行原文\",\"translation\":\"中文译文\",\"tokens\":[{{\"surface\":\"表层词\",\
\"pos\":\"词性\",\"baseForm\":\"原型\",\"meaning\":\"中文意思\",\"reading\":\"该词的整词读音(日语，如 眩しく→まぶしく)\",\"conjugation\":\"活用(动词)\"}}]}}\n\
词性用 noun/verb/adjective/adverb/particle/pronoun/article/conjunction/interjection/other。\
\n日语词的 reading 必须给出该词的完整假名读音，供歌词上方标注注音。\
\n标注的参考译文仅作参考，请判断是否采用或优化。尽量精简，不要多余字段。",
        pairs.len()
    )
}

/// The JSON Schema for a single line analysis.
pub fn line_analysis_json_schema() -> serde_json::Value {
    serde_json::json!({
        "type": "object",
        "properties": {
            "originalLine": { "type": "string" },
            "translation": { "type": "string" },
            "tokens": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "surface": { "type": "string" },
                        "pos": { "type": "string", "enum": ["noun","verb","adjective","adverb","particle","pronoun","article","conjunction","interjection","other"] },
                        "baseForm": { "type": "string" },
                        "meaning": { "type": "string" },
                        "reading": { "type": "string" },
                        "conjugation": { "type": "string" }
                    },
                    "required": ["surface","pos","baseForm","meaning"]
                }
            }
        },
        "required": ["originalLine","translation","tokens"]
    })
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
        assert_eq!(schema["items"]["required"][0], "originalLine");
        assert_eq!(schema["items"]["required"][2], "tokens");
    }

    #[test]
    fn system_prompt_is_compact_and_mentions_translation() {
        let ctx = AnalysisContext {
            language: SourceLanguage::Ja,
            song_title: "夜空".into(),
            artist: "歌手".into(),
        };
        let p = system_prompt(&ctx);
        assert!(p.contains("日语"));
        assert!(p.contains("不要逐字硬译"));
        assert!(p.contains("JSON"));
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
