use super::{ConnectionTestResult, ModelListApiModel, ModelListResponse, ModelListResult, ProviderModel};
use serde_json::json;
use std::time::Duration;
use url::Url;

/// A minimal OpenAI-compatible client.
#[derive(Clone)]
pub struct OpenAiCompatibleClient {
    base_url: String,
    api_key: String,
    timeout: Duration,
}

impl OpenAiCompatibleClient {
    pub fn new(base_url: impl Into<String>, api_key: impl Into<String>) -> Self {
        Self {
            base_url: base_url.into(),
            api_key: api_key.into(),
            timeout: Duration::from_secs(30),
        }
    }

    pub fn with_timeout(mut self, timeout: Duration) -> Self {
        self.timeout = timeout;
        self
    }

    fn client(&self) -> Result<reqwest::Client, String> {
        reqwest::Client::builder()
            .timeout(self.timeout)
            .build()
            .map_err(|e| format!("http client: {e}"))
    }

    /// Accessor for the API key used in request auth. Callers must never log this.
    pub fn api_key(&self) -> &str {
        &self.api_key
    }

    pub fn normalized_base(&self) -> String {
        let mut base = self.base_url.trim().trim_end_matches('/').to_string();
        if !base.starts_with("http://") && !base.starts_with("https://") {
            base = format!("https://{base}");
        }
        base
    }

    /// Fetches the model list, trying "/v1/models" first then "/models".
    pub async fn list_models(&self) -> Result<ModelListResult, String> {
        let base = self.normalized_base();
        let candidates = [
            format!("{base}/v1/models"),
            format!("{base}/models"),
        ];

        let mut last_err: Option<String> = None;
        for url in candidates {
            let parsed = Url::parse(&url).map_err(|e| format!("invalid base url: {e}"))?;
            let last_path = parsed.path().to_string();
            let client = self.client()?;
            let resp = match client
                .get(parsed)
                .bearer_auth(&self.api_key)
                .send()
                .await
            {
                Ok(r) => r,
                Err(e) => {
                    last_err = Some(sanitize_error(&e));
                    continue;
                }
            };
            if resp.status().is_success() {
                let parsed_body: ModelListResponse = match resp.json().await {
                    Ok(b) => b,
                    Err(e) => {
                        last_err = Some(format!("non-json response: {e}"));
                        continue;
                    }
                };
                let models: Vec<ProviderModel> = parsed_body
                    .data
                    .into_iter()
                    .map(|m: ModelListApiModel| ProviderModel {
                        id: m.id,
                        owned_by: m.owned_by,
                        created: m.created,
                    })
                    .collect();
                return Ok(ModelListResult {
                    models,
                    models_path: last_path,
                });
            }
            last_err = Some(format!("http status {}", resp.status()));
        }

        Err(last_err.unwrap_or_else(|| "all model endpoints failed".into()))
    }

    /// Tests connectivity and returns a concise summary.
    pub async fn test_connection(&self) -> ConnectionTestResult {
        match self.list_models().await {
            Ok(result) => ConnectionTestResult {
                ok: true,
                model_count: result.models.len(),
                models_path: result.models_path,
                error: None,
            },
            Err(e) => ConnectionTestResult {
                ok: false,
                model_count: 0,
                models_path: String::new(),
                error: Some(e),
            },
        }
    }

    /// Builds a chat completion request body for structured JSON output.
    pub fn chat_completion_body(
        &self,
        model: &str,
        messages: Vec<(&str, &str)>,
        schema: serde_json::Value,
    ) -> serde_json::Value {
        let msgs: Vec<serde_json::Value> = messages
            .into_iter()
            .map(|(role, content)| json!({ "role": role, "content": content }))
            .collect();
        json!({
            "model": model,
            "messages": msgs,
            "response_format": {
                "type": "json_schema",
                "json_schema": {
                    "name": "lyric_analysis",
                    "strict": true,
                    "schema": schema
                }
            }
        })
    }
}

/// Strips any auth material from an error message before surfacing it.
fn sanitize_error(e: &reqwest::Error) -> String {
    let s = e.to_string();
    if s.contains("sk-") {
        return "network error (details hidden)".into();
    }
    s
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[tokio::test]
    async fn parses_standard_v1_models_response() {
        // Verify response parsing shapes without hitting the network.
        let body = json!({
            "object": "list",
            "data": [
                { "id": "gpt-4o", "owned_by": "openai", "created": 123 },
                { "id": "gpt-4o-mini" }
            ]
        });
        let parsed: ModelListResponse = serde_json::from_value(body).expect("parse");
        assert_eq!(parsed.data.len(), 2);
        assert_eq!(parsed.data[0].id, "gpt-4o");
    }

    #[test]
    fn chat_completion_body_has_json_schema() {
        let client = OpenAiCompatibleClient::new("http://example.test", "sk-test");
        let schema = json!({ "type": "object" });
        let body = client.chat_completion_body(
            "gpt-4o",
            vec![("system", "translate"), ("user", "hello")],
            schema,
        );
        assert_eq!(body["model"], "gpt-4o");
        assert_eq!(body["messages"][0]["role"], "system");
        assert_eq!(body["response_format"]["type"], "json_schema");
    }

    #[test]
    fn normalized_base_adds_https() {
        let client = OpenAiCompatibleClient::new("api.example.com", "k");
        assert_eq!(client.normalized_base(), "https://api.example.com");
    }

    #[test]
    fn normalized_base_trims_trailing_slash() {
        let client = OpenAiCompatibleClient::new("https://api.example.com/v1/", "k");
        assert_eq!(client.normalized_base(), "https://api.example.com/v1");
    }

    #[test]
    fn credential_id_is_deterministic() {
        assert_eq!(crate::secrets::credential_id("p1"), "provider-p1");
    }
}
