use crate::analysis::prompt::{analysis_json_schema, system_prompt, user_prompt, AnalysisContext};
use crate::analysis::response_validation::validate_line_analysis;
use crate::analysis::queue::{AnalysisQueue, LineStatus};
use crate::models::LineAnalysis;
use crate::providers::openai_compatible::OpenAiCompatibleClient;
use serde_json::json;
use std::time::Duration;

pub struct AnalysisExecutor {
    client: OpenAiCompatibleClient,
    model: String,
    context: AnalysisContext,
    max_retries: u32,
}

impl Clone for AnalysisExecutor {
    fn clone(&self) -> Self {
        Self {
            client: self.client.clone(),
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
        Self {
            client: OpenAiCompatibleClient::new(base_url, api_key),
            model: model.into(),
            context,
            max_retries: 2,
        }
    }

    /// Analyzes a single line, calling the model (with retry on transient errors).
    pub async fn analyze_line(&self, line: &str, line_index: usize) -> Result<LineAnalysis, String> {
        let sys = system_prompt(&self.context);
        let usr = user_prompt(line);
        let schema = analysis_json_schema();
        let body = self
            .client
            .chat_completion_body(&self.model, vec![("system", &sys), ("user", &usr)], schema);

        let mut attempt = 0;
        loop {
            attempt += 1;
            match self.call_chat(body.clone()).await {
                Ok(raw) => match validate_line_analysis(&raw) {
                    Ok(analysis) if analysis.line_index == line_index as u32 => return Ok(analysis),
                    Ok(_) => return Err(format!("lineIndex 不匹配，期望 {line_index}")),
                    Err(e) if attempt > self.max_retries => return Err(e),
                    Err(_) => {
                        tokio::time::sleep(Duration::from_millis(500 * attempt as u64)).await;
                    }
                },
                Err(e) => {
                    if attempt > self.max_retries {
                        return Err(e);
                    }
                    let wait = Duration::from_millis(1000 * (2_u64.pow(attempt - 1)));
                    tokio::time::sleep(wait).await;
                }
            }
        }
    }

    async fn call_chat(&self, body: serde_json::Value) -> Result<serde_json::Value, String> {
        let base = self.client.normalized_base();
        let url = format!("{base}/chat/completions");
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(120))
            .build()
            .map_err(|e| format!("http client: {e}"))?;

        let resp = client
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

/// Processes the whole queue with limited concurrency.
/// Completed analyses are delivered through the returned receiver.
pub async fn run_queue(
    executor: &AnalysisExecutor,
    queue: &AnalysisQueue,
    concurrency: usize,
) -> tokio::sync::mpsc::UnboundedReceiver<(usize, LineAnalysis)> {
    let (tx, rx) = tokio::sync::mpsc::unbounded_channel::<(usize, LineAnalysis)>();
    let queue = queue.clone();
    let concurrency = concurrency.max(1);
    let mut handles = Vec::new();
    for _ in 0..concurrency {
        let queue = queue.clone();
        let worker = executor.clone();
        let tx = tx.clone();
        handles.push(tokio::spawn(async move {
            loop {
                if queue.is_cancelled() {
                    break;
                }
                let task = match queue.claim_next() {
                    Some(t) => t,
                    None => break,
                };
                match worker.analyze_line(&task.line, task.index).await {
                    Ok(analysis) => {
                        let _ = tx.send((task.index, analysis));
                        queue.mark_success(task.index);
                    }
                    Err(e) => {
                        queue.mark_failed(task.index, e);
                    }
                }
            }
        }));
    }
    drop(tx);
    for h in handles {
        h.await.ok();
    }
    rx
}

/// Strips auth material before surfacing to the UI/logs.
fn sanitize(s: &str) -> String {
    if s.contains("sk-") {
        return "网络错误（细节已隐藏）".into();
    }
    s.to_string()
}

#[allow(dead_code)]
fn _status_check(status: &LineStatus) -> bool {
    matches!(status, LineStatus::Succeeded)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::analysis::queue::AnalysisQueue;

    #[test]
    fn sanitize_hides_keys() {
        assert_eq!(sanitize("401 sk-test-123"), "网络错误（细节已隐藏）");
        assert_eq!(sanitize("connection reset"), "connection reset");
    }

    #[test]
    fn queue_runs_with_concurrency_semantics() {
        // The executor requires a live HTTP client; unit-test the queue only here.
        let q = AnalysisQueue::new(vec![(0, "a".into()), (1, "b".into()), (2, "c".into())]);
        assert_eq!(q.pending_count(), 3);
        q.cancel();
        assert!(q.claim_next().is_none());
    }
}
