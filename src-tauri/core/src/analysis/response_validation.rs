use crate::models::{LineAnalysis, PartOfSpeech, Token};

/// Validates and normalizes a raw LLM response into a LineAnalysis.
/// Returns a human-readable error on invalid output.
pub fn validate_line_analysis(raw: &serde_json::Value) -> Result<LineAnalysis, String> {
    // If the model wrapped the JSON in markdown fences, extract the code block.
    let value = strip_markdown_fence(raw)?;

    let line_index = value
        .get("lineIndex")
        .and_then(|v| v.as_u64())
        .ok_or("lineIndex 缺失或非法")? as u32;

    let translation = value
        .get("translation")
        .and_then(|v| v.as_str())
        .filter(|s| !s.trim().is_empty())
        .ok_or("translation 缺失或为空")?
        .to_string();

    let reading_text = value
        .get("readingText")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let original_line = value
        .get("originalLine")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let tokens = parse_tokens(value.get("tokens"))?;

    let grammar_notes = value
        .get("grammarNotes")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|x| x.as_str().map(|s| s.to_string()))
                .collect()
        });

    let uncertainty = value
        .get("uncertainty")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|x| x.as_str().map(|s| s.to_string()))
                .collect()
        });

    Ok(LineAnalysis {
        line_index,
        translation,
        reading_text,
        original_line,
        tokens,
        grammar_notes,
        uncertainty,
    })
}

/// Validates and normalizes a full-song response that is an array of line analyses.
/// Handles markdown-wrapped arrays and arrays in a string.
pub fn validate_line_analysis_array(raw: &serde_json::Value) -> Result<Vec<LineAnalysis>, String> {
    let value = strip_markdown_fence(raw)?;
    let arr = value
        .as_array()
        .ok_or("响应必须是 JSON 数组（整首歌词分析）")?;
    if arr.is_empty() {
        return Err("歌词分析数组为空".into());
    }
    let mut out = Vec::with_capacity(arr.len());
    for item in arr {
        out.push(validate_line_analysis(item)?);
    }
    // Reindex sequentially so the UI has a stable order.
    for (i, a) in out.iter_mut().enumerate() {
        a.line_index = i as u32;
    }
    Ok(out)
}

/// If `raw` is a string containing a markdown JSON block, parse that.
fn strip_markdown_fence(raw: &serde_json::Value) -> Result<serde_json::Value, String> {
    if let Some(s) = raw.as_str() {
        let text = s.trim();
        // Extract a top-level JSON object or array from the text (handles
        // markdown code fences / prose around the JSON).
        if let Some(start) = text.find(['{', '[']) {
            let open = text.as_bytes()[start];
            let close = if open == b'{' { '}' } else { ']' };
            if let Some(end) = text.rfind(close) {
                if end > start {
                    let candidate = &text[start..=end];
                    return serde_json::from_str(candidate)
                        .map_err(|e| format!("解析 JSON 失败: {e}"));
                }
            }
        }
        return serde_json::from_str(text).map_err(|e| format!("解析 JSON 失败: {e}"));
    }
    Ok(raw.clone())
}

fn parse_tokens(value: Option<&serde_json::Value>) -> Result<Vec<Token>, String> {
    let arr = value.ok_or("tokens 缺失")?.as_array().ok_or("tokens 必须是数组")?;
    if arr.is_empty() {
        return Err("tokens 为空数组".into());
    }
    let mut tokens = Vec::with_capacity(arr.len());
    for t in arr {
        let surface = t
            .get("surface")
            .and_then(|v| v.as_str())
            .filter(|s| !s.trim().is_empty())
            .ok_or("token 缺少 surface")?
            .to_string();
        let start = t
            .get("start")
            .and_then(|v| v.as_u64())
            .ok_or("token 缺少 start")? as u32;
        let end = t
            .get("end")
            .and_then(|v| v.as_u64())
            .ok_or("token 缺少 end")? as u32;
        if end <= start {
            return Err(format!("token \"{surface}\" 的 end 必须大于 start"));
        }
        let pos: PartOfSpeech = match t
            .get("pos")
            .and_then(|v| v.as_str())
        {
            Some(p) => p.parse().map_err(|e: String| format!("非法词性: {e}"))?,
            None => return Err(format!("token \"{surface}\" 缺少 pos")),
        };
        let base_form = t
            .get("baseForm")
            .and_then(|v| v.as_str())
            .filter(|s| !s.trim().is_empty())
            .ok_or(format!("token \"{surface}\" 缺少 baseForm"))?
            .to_string();
        let meaning = t
            .get("meaning")
            .and_then(|v| v.as_str())
            .filter(|s| !s.trim().is_empty())
            .ok_or(format!("token \"{surface}\" 缺少 meaning"))?
            .to_string();

        tokens.push(Token {
            surface,
            start,
            end,
            pos,
            base_form,
            base_reading: t.get("baseReading").and_then(|v| v.as_str()).map(String::from),
            reading: t.get("reading").and_then(|v| v.as_str()).map(String::from),
            meaning,
            contextual_meaning: t
                .get("contextualMeaning")
                .and_then(|v| v.as_str())
                .map(String::from),
            conjugation: t.get("conjugation").and_then(|v| v.as_str()).map(String::from),
            confirmed: t.get("confirmed").and_then(|v| v.as_bool()).unwrap_or(true),
        });
    }
    Ok(tokens)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn valid_raw() -> serde_json::Value {
        json!({
            "lineIndex": 0,
            "originalLine": "星が降る夜に",
            "translation": "在繁星落下的夜里",
            "readingText": "星(ほし)が降(ふ)る夜(よる)に",
            "tokens": [
                {
                    "surface": "星が",
                    "start": 0,
                    "end": 3,
                    "pos": "noun",
                    "baseForm": "星",
                    "baseReading": "ほし",
                    "reading": "ほし",
                    "meaning": "星星",
                    "contextualMeaning": "星星",
                    "confirmed": true
                }
            ],
            "grammarNotes": ["「〜に」表示时间点"],
            "uncertainty": []
        })
    }

    #[test]
    fn validates_legal_output() {
        let result = validate_line_analysis(&valid_raw()).expect("should validate");
        assert_eq!(result.line_index, 0);
        assert_eq!(result.tokens.len(), 1);
        assert_eq!(result.tokens[0].base_form, "星");
        assert_eq!(result.original_line.as_deref(), Some("星が降る夜に"));
    }

    #[test]
    fn validates_array_and_reindexes() {
        let mut second = valid_raw();
        second["lineIndex"] = json!(5);
        second["originalLine"] = json!("どこまでも");
        let arr = json!([valid_raw(), second]);
        let list = validate_line_analysis_array(&arr).expect("should validate");
        assert_eq!(list.len(), 2);
        assert_eq!(list[0].line_index, 0);
        assert_eq!(list[1].line_index, 1);
        assert_eq!(list[1].original_line.as_deref(), Some("どこまでも"));
    }

    #[test]
    fn rejects_non_array_for_array_validator() {
        assert!(validate_line_analysis_array(&json!({"lineIndex": 0})).is_err());
    }

    #[test]
    fn extracts_markdown_wrapped_array() {
        let raw = json!(format!("```json\n[{}]\n```", valid_raw()));
        let list = validate_line_analysis_array(&raw).expect("should extract array from fence");
        assert_eq!(list.len(), 1);
    }

    #[test]
    fn extracts_array_from_prose_string() {
        let raw = json!(format!("好的，这是分析结果：\n[{}]", valid_raw()));
        let list = validate_line_analysis_array(&raw).expect("should extract array from prose");
        assert_eq!(list.len(), 1);
    }

    #[test]
    fn extracts_markdown_wrapped_json() {
        let raw = json!(format!("```json\n{}\n```", valid_raw()));
        let result = validate_line_analysis(&raw).expect("should extract");
        assert_eq!(result.translation, "在繁星落下的夜里");
    }

    #[test]
    fn rejects_empty_translation() {
        let mut raw = valid_raw();
        raw["translation"] = json!("");
        assert!(validate_line_analysis(&raw).is_err());
    }

    #[test]
    fn rejects_invalid_pos() {
        let mut raw = valid_raw();
        raw["tokens"][0]["pos"] = json!("verbified");
        assert!(validate_line_analysis(&raw).is_err());
    }

    #[test]
    fn rejects_token_with_bad_range() {
        let mut raw = valid_raw();
        raw["tokens"][0]["end"] = json!(0);
        assert!(validate_line_analysis(&raw).is_err());
    }

    #[test]
    fn rejects_empty_tokens_array() {
        let mut raw = valid_raw();
        raw["tokens"] = json!([]);
        assert!(validate_line_analysis(&raw).is_err());
    }

    #[test]
    fn rejects_missing_base_form() {
        let mut raw = valid_raw();
        let obj = raw["tokens"][0].as_object_mut().unwrap();
        obj.remove("baseForm");
        assert!(validate_line_analysis(&raw).is_err());
    }

    #[test]
    fn defaults_confirmed_true() {
        let mut raw = valid_raw();
        raw["tokens"][0].as_object_mut().unwrap().remove("confirmed");
        let result = validate_line_analysis(&raw).expect("should validate");
        assert!(result.tokens[0].confirmed);
    }
}
