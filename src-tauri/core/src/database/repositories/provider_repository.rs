use crate::database::Database;
use rusqlite::{params, OptionalExtension};

#[derive(Debug, Clone)]
pub struct ProviderRow {
    pub id: String,
    pub name: String,
    pub base_url: String,
    pub model: String,
    pub models_path: String,
    pub credential_id: String,
}

pub fn insert(db: &Database, row: &ProviderRow) -> rusqlite::Result<()> {
    db.conn.execute(
        "INSERT INTO provider_profiles
            (id, name, base_url, model, supports_structured_output, supports_json_mode, models_path, credential_id)
         VALUES (?1, ?2, ?3, ?4, 0, 0, ?5, ?6)
         ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            base_url = excluded.base_url,
            model = excluded.model,
            models_path = excluded.models_path",
        params![
            row.id,
            row.name,
            row.base_url,
            row.model,
            row.models_path,
            row.credential_id,
        ],
    )?;
    Ok(())
}

pub fn get(db: &Database, id: &str) -> rusqlite::Result<Option<ProviderRow>> {
    let row = db
        .conn
        .query_row(
            "SELECT id, name, base_url, model, models_path, credential_id FROM provider_profiles WHERE id = ?1",
            params![id],
            |r| {
                Ok(ProviderRow {
                    id: r.get(0)?,
                    name: r.get(1)?,
                    base_url: r.get(2)?,
                    model: r.get(3)?,
                    models_path: r.get(4)?,
                    credential_id: r.get(5)?,
                })
            },
        )
        .optional()?;
    Ok(row)
}

/// Returns the most recently saved provider (there is typically only one).
pub fn active(db: &Database) -> rusqlite::Result<Option<ProviderRow>> {
    let row = db
        .conn
        .query_row(
            "SELECT id, name, base_url, model, models_path, credential_id FROM provider_profiles
             ORDER BY rowid DESC LIMIT 1",
            [],
            |r| {
                Ok(ProviderRow {
                    id: r.get(0)?,
                    name: r.get(1)?,
                    base_url: r.get(2)?,
                    model: r.get(3)?,
                    models_path: r.get(4)?,
                    credential_id: r.get(5)?,
                })
            },
        )
        .optional()?;
    Ok(row)
}

pub fn delete(db: &Database, id: &str) -> rusqlite::Result<()> {
    db.conn.execute("DELETE FROM provider_profiles WHERE id = ?1", params![id])?;
    Ok(())
}
