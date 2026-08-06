/// Redacts API keys and authorization material from any string before it is
/// logged or surfaced to the UI. Prevents secrets from leaking via error
/// messages, request bodies, or response payloads.
pub fn redact(input: &str) -> String {
    let mut out = input.to_string();
    // OpenAI-style keys: sk-<hex>
    out = replace_pattern(&out, "sk-[A-Za-z0-9]{8,}");
    // Bearer tokens in HTTP headers
    out = replace_pattern(&out, "(?i)bearer\\s+[A-Za-z0-9._-]{8,}");
    // Generic long token-like strings (>= 24 chars of hex/base64)
    out = replace_pattern(&out, "[A-Za-z0-9_-]{24,}");
    out
}

fn replace_pattern(input: &str, pattern: &str) -> String {
    let re = match regex::Regex::new(pattern) {
        Ok(r) => r,
        Err(_) => return input.to_string(),
    };
    re.replace_all(input, "[REDACTED]").to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn redacts_openai_style_keys() {
        let s = "error: 401 sk-abcdef1234567890abcdef1234567890abcdef1234567890 failed";
        let out = redact(s);
        assert!(!out.contains("sk-abcdef1234567890abcdef1234567890abcdef1234567890"));
        assert!(out.contains("[REDACTED]"));
    }

    #[test]
    fn redacts_bearer_tokens() {
        let s = "Authorization: Bearer abcdef1234567890abcdef1234567890";
        let out = redact(s);
        assert!(!out.contains("abcdef1234567890"));
        assert!(out.contains("[REDACTED]"));
    }

    #[test]
    fn keeps_normal_text_intact() {
        let s = "翻译完成，共 12 句，耗时 3.5 秒";
        assert_eq!(redact(s), s);
    }

    #[test]
    fn redacts_long_tokens_in_requests() {
        let s = "request body: model=gpt-4o&token=a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4";
        let out = redact(s);
        assert!(!out.contains("a1b2c3d4e5f6a1b2c3d4e5f6"));
    }
}
