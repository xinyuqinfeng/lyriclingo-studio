use crate::analysis::prompt::{
    analysis_json_schema, system_prompt, user_prompt_pairs, AnalysisContext,
};
use crate::analysis::response_validation::validate_line_analysis_array;
use crate::models::LineAnalysis;
use crate::providers::openai_compatible::OpenAiCompatibleClient;
use serde_json::json;
use std::time::Duration;

pub struct AnalysisExecutor {
    client: OpenAiCompatibleClient,
    http: reqwest::Client,
    model: String,
    context: AnalysisContext,
    max_retries: u32,
}

impl Clone for AnalysisExecutor {
    fn clone(&self) -> Self {
        Self {
            client: self.client.clone(),
            http: self.http.clone(),
            model: self.model.clone(),
            context: AnalysisContext {
                language: self.context.language,
                song_title: self.context.song_title.clone(),
                artist: self.context.artist.clone(),
            },
            max_retries: self.max_retries,
        }
    }
}

impl AnalysisExecutor {
    pub fn new(
        base_url: impl Into<String>,
        api_key: impl Into<String>,
        model: impl Into<String>,
        context: AnalysisContext,
    ) -> Self {
        let http = reqwest::Client::builder()
            .timeout(Duration::from_secs(300))
            .pool_idle_timeout(Duration::from_secs(90))
            .build()
            .expect("http client");
        Self {
            client: OpenAiCompatibleClient::new(base_url, api_key),
            http,
            model: model.into(),
            context,
            max_retries: 2,
        }
    }

    /// Analyzes all (source, optional reference) lines in a SINGLE request.
    /// The model returns an array of LineAnalysis, one per source line.
    /// This is much faster than one request per line.
    pub async fn analyze_full(
        &self,
        pairs: &[(String, Option<String>)],
    ) -> Result<Vec<LineAnalysis>, String> {
        let sys = system_prompt(&self.context);
        let usr = user_prompt_pairs(pairs, self.context.language);
        let schema = analysis_json_schema();

        let mut use_response_format = false;
        let mut attempt = 0;
        loop {
            attempt += 1;
            let body = self.client.chat_completion_body(
                &self.model,
                vec![("system", &sys), ("user", &usr)],
                schema.clone(),
                use_response_format,
            );
            match self.call_chat(body).await {
                Ok(raw) => match validate_line_analysis_array(&raw) {
                    Ok(list) if list.len() == pairs.len() => {
                        // Match each analysis to its source line position by order.
                        return Ok(list);
                    }
                    Ok(list) => {
                        return Err(format!(
                            "模型返回 {} 行分析，期望 {} 行（可能遗漏了部分歌词）",
                            list.len(),
                            pairs.len()
                        ));
                    }
                    Err(e) if attempt > self.max_retries => return Err(e),
                    Err(_) => {
                        tokio::time::sleep(Duration::from_millis(500 * attempt as u64)).await;
                    }
                },
                Err(e) if use_response_format && should_disable_response_format(&e) => {
                    use_response_format = false;
                }
                Err(e) if attempt > self.max_retries => return Err(e),
                Err(_) => {
                    let wait = Duration::from_millis(1000 * (2_u64.pow(attempt - 1)));
                    tokio::time::sleep(wait).await;
                }
            }
        }
    }

    async fn call_chat(&self, body: serde_json::Value) -> Result<serde_json::Value, String> {
        let base = self.client.normalized_base();
        let url = format!("{base}/chat/completions");

        let resp = self
            .http
            .post(&url)
            .bearer_auth(&self.client_api_key())
            .json(&body)
            .send()
            .await
            .map_err(|e| sanitize(&e.to_string()))?;

        if !resp.status().is_success() {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();
            return Err(sanitize(&format!("http {status}: {text}")));
        }

        let json_body: serde_json::Value = resp
            .json()
            .await
            .map_err(|e| format!("非 JSON 响应: {e}"))?;

        let content = json_body
            .pointer("/choices/0/message/content")
            .and_then(|v| v.as_str())
            .ok_or("响应缺少 choices[0].message.content")?
            .to_string();

        // The content may itself be JSON, or a JSON string.
        match serde_json::from_str::<serde_json::Value>(&content) {
            Ok(v) => Ok(v),
            Err(_) => Ok(json!(content)),
        }
    }

    fn client_api_key(&self) -> &str {
        // Expose key for request auth; never logged.
        self.client.api_key()
    }
}

/// Strips auth material before surfacing to the UI/logs.
fn sanitize(s: &str) -> String {
    crate::logging::redact(s)
}

/// Whether an error indicates the provider cannot accept response_format.
/// Matches both explicit 400 "response_format" errors and the TLS connection
/// reset that some providers (e.g. deepseek-flash via a gateway) return when
/// given an unsupported response_format.
fn should_disable_response_format(e: &str) -> bool {
    e.contains("response_format")
        || e.contains("peer closed connection")
        || e.contains("connection error")
        || e.contains("connection reset")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sanitize_hides_keys() {
        let out = sanitize("401 sk-test-1234567890abcdef");
        assert!(!out.contains("sk-test-1234567890abcdef"));
        assert!(out.contains("[REDACTED]"));
        assert_eq!(sanitize("connection reset"), "connection reset");
    }
}
