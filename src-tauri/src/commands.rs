use crate::db::{self, CreateSongInput, CreateSongResult, SongListEntry};
use lyriclingo_core::database::Database;
use lyriclingo_core::database::repositories::provider_repository::{self, ProviderRow};
use lyriclingo_core::models::Song;
use lyriclingo_core::providers::openai_compatible::OpenAiCompatibleClient;
use lyriclingo_core::providers::ModelListResult;
use lyriclingo_core::secrets;
use serde::Serialize;
use std::sync::Mutex;
use std::time::Duration;
use tauri::State;

pub struct DbState(pub Mutex<Database>);

#[tauri::command]
pub fn create_song(
    input: CreateSongInput,
    state: State<'_, DbState>,
) -> Result<CreateSongResult, String> {
    let guard = state.0.lock().map_err(|_| "db lock poisoned".to_string())?;
    db::create_song(&guard, input)
}

#[tauri::command]
pub fn list_songs(state: State<'_, DbState>) -> Result<Vec<SongListEntry>, String> {
    let guard = state.0.lock().map_err(|_| "db lock poisoned".to_string())?;
    db::list_songs(&guard)
}

#[tauri::command]
pub fn get_song(id: String, state: State<'_, DbState>) -> Result<Song, String> {
    let guard = state.0.lock().map_err(|_| "db lock poisoned".to_string())?;
    db::get_song(&guard, &id)
}

#[tauri::command]
pub fn delete_song(id: String, state: State<'_, DbState>) -> Result<(), String> {
    let guard = state.0.lock().map_err(|_| "db lock poisoned".to_string())?;
    db::delete_song(&guard, &id)
}

#[derive(Serialize)]
pub struct ConnectionTest {
    pub ok: bool,
    pub models_path: String,
    pub model_count: usize,
    pub error: Option<String>,
}

#[derive(Serialize)]
pub struct SaveProviderResult {
    pub provider_id: String,
    pub credential_id: String,
}

/// Tests connectivity to an OpenAI-compatible endpoint with the given key.
/// The key is sent to the provider but never persisted here.
#[tauri::command]
pub async fn test_connection(base_url: String, api_key: String) -> Result<ConnectionTest, String> {
    if api_key.trim().is_empty() {
        return Err("API key is empty".into());
    }
    if base_url.trim().is_empty() {
        return Err("Base URL is empty".into());
    }
    let client = OpenAiCompatibleClient::new(base_url, api_key).with_timeout(Duration::from_secs(30));
    let result = client.test_connection().await;
    Ok(ConnectionTest {
        ok: result.ok,
        models_path: result.models_path,
        model_count: result.model_count,
        error: result.error,
    })
}

/// Lists models available from the provider.
#[tauri::command]
pub async fn list_models(base_url: String, api_key: String) -> Result<ModelListResult, String> {
    if api_key.trim().is_empty() {
        return Err("API key is empty".into());
    }
    let client = OpenAiCompatibleClient::new(base_url, api_key).with_timeout(Duration::from_secs(30));
    client.list_models().await
}

/// Stores a provider profile and its API key in the OS credential manager.
/// The key is never written to the database; only a credential id is stored.
#[tauri::command]
pub async fn save_provider(
    base_url: String,
    api_key: String,
    model: String,
    name: Option<String>,
    state: State<'_, DbState>,
) -> Result<SaveProviderResult, String> {
    if api_key.trim().is_empty() {
        return Err("API key is empty".into());
    }
    let provider_id = uuid::Uuid::new_v4().to_string();
    secrets::save_api_key(&provider_id, &api_key)?;
    let credential_id = secrets::credential_id(&provider_id);
    let row = ProviderRow {
        id: provider_id.clone(),
        name: name.unwrap_or_else(|| "default".into()),
        base_url,
        model,
        models_path: String::new(),
        credential_id: credential_id.clone(),
    };
    {
        let guard = state
            .0
            .lock()
            .map_err(|_| "db lock poisoned".to_string())?;
        provider_repository::insert(&guard, &row).map_err(|e| e.to_string())?;
    }
    Ok(SaveProviderResult {
        provider_id,
        credential_id,
    })
}

/// Returns the active (most recently saved) provider's non-secret fields.
/// Used by the analysis flow so the user does not re-enter base_url/model.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActiveProvider {
    pub provider_id: String,
    pub base_url: String,
    pub model: String,
}

#[tauri::command]
pub fn get_active_provider(state: State<'_, DbState>) -> Result<Option<ActiveProvider>, String> {
    let guard = state
        .0
        .lock()
        .map_err(|_| "db lock poisoned".to_string())?;
    let row = provider_repository::active(&guard).map_err(|e| e.to_string())?;
    Ok(row.map(|r| ActiveProvider {
        provider_id: r.id,
        base_url: r.base_url,
        model: r.model,
    }))
}

/// Removes the stored API key for a provider.
#[tauri::command]
pub async fn remove_provider_key(provider_id: String, state: State<'_, DbState>) -> Result<(), String> {
    secrets::delete_api_key(&provider_id)?;
    let guard = state
        .0
        .lock()
        .map_err(|_| "db lock poisoned".to_string())?;
    provider_repository::delete(&guard, &provider_id).map_err(|e| e.to_string())
}
