use keyring::{Entry, Error as KeyringError};

const SERVICE: &str = "lyriclingo-studio";

/// Stores an API key in the Windows Credential Manager (keyring).
/// The key is never written to the database, logs, or export files.
pub fn save_api_key(provider_id: &str, key: &str) -> Result<(), String> {
    let entry = Entry::new(SERVICE, provider_id).map_err(|e| format!("keyring create: {e}"))?;
    entry
        .set_password(key)
        .map_err(|e| format!("keyring set: {e}"))
}

pub fn get_api_key(provider_id: &str) -> Result<String, String> {
    let entry = Entry::new(SERVICE, provider_id).map_err(|e| format!("keyring create: {e}"))?;
    match entry.get_password() {
        Ok(k) => Ok(k),
        Err(KeyringError::NoEntry) => Err("no stored key".into()),
        Err(e) => Err(format!("keyring get: {e}")),
    }
}

pub fn delete_api_key(provider_id: &str) -> Result<(), String> {
    let entry = Entry::new(SERVICE, provider_id).map_err(|e| format!("keyring create: {e}"))?;
    match entry.delete_credential() {
        Ok(_) => Ok(()),
        Err(KeyringError::NoEntry) => Ok(()),
        Err(e) => Err(format!("keyring delete: {e}")),
    }
}

/// The credential id stored in the database is derived from the provider id.
/// It never contains the secret itself.
pub fn credential_id(provider_id: &str) -> String {
    format!("provider-{provider_id}")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn credential_id_is_deterministic_and_does_not_contain_key() {
        let id = credential_id("p1");
        assert_eq!(id, "provider-p1");
        assert!(!id.contains("sk-"));
    }
}
