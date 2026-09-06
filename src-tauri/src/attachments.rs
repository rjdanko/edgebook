use crate::db::AppState;
use base64::{engine::general_purpose::STANDARD, Engine};
use rusqlite::params;
use serde::Serialize;
use std::fs;
use std::path::PathBuf;
use tauri::State;

#[derive(Serialize)]
pub struct Attachment {
    pub id: String,
    pub filename: String,
}

#[derive(Serialize)]
pub struct AttachmentData {
    pub id: String,
    /// Ready-to-use `data:` URL - simpler than wiring the asset protocol's
    /// scope to a data folder the user can relocate at any time (Phase 5).
    pub data_url: String,
}

fn owner_dir(state: &AppState, owner_type: &str, owner_id: &str) -> PathBuf {
    state.data_root.join("attachments").join(owner_type).join(owner_id)
}

fn mime_for_ext(ext: &str) -> &'static str {
    match ext.to_lowercase().as_str() {
        "png" => "image/png",
        "gif" => "image/gif",
        "webp" => "image/webp",
        _ => "image/jpeg",
    }
}

#[tauri::command]
pub fn save_attachment(
    state: State<AppState>,
    owner_type: String,
    owner_id: String,
    data_base64: String,
    ext: String,
) -> Result<Attachment, String> {
    let bytes = STANDARD.decode(&data_base64).map_err(|e| e.to_string())?;
    let dir = owner_dir(&state, &owner_type, &owner_id);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;

    let id = uuid::Uuid::new_v4().to_string();
    let filename = format!("{id}.{ext}");
    fs::write(dir.join(&filename), &bytes).map_err(|e| e.to_string())?;

    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let next_order: i64 = conn
        .query_row(
            "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM attachments WHERE owner_type = ?1 AND owner_id = ?2",
            params![owner_type, owner_id],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO attachments (id, owner_type, owner_id, filename, sort_order) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![id, owner_type, owner_id, filename, next_order],
    )
    .map_err(|e| e.to_string())?;

    Ok(Attachment { id, filename })
}

#[tauri::command]
pub fn list_attachments(
    state: State<AppState>,
    owner_type: String,
    owner_id: String,
) -> Result<Vec<AttachmentData>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, filename FROM attachments WHERE owner_type = ?1 AND owner_id = ?2 ORDER BY sort_order")
        .map_err(|e| e.to_string())?;
    let rows: Vec<(String, String)> = stmt
        .query_map(params![owner_type, owner_id], |r| Ok((r.get(0)?, r.get(1)?)))
        .map_err(|e| e.to_string())?
        .collect::<Result<_, _>>()
        .map_err(|e| e.to_string())?;

    let dir = owner_dir(&state, &owner_type, &owner_id);
    let mut out = Vec::with_capacity(rows.len());
    for (id, filename) in rows {
        let bytes = fs::read(dir.join(&filename)).map_err(|e| e.to_string())?;
        let ext = filename.rsplit('.').next().unwrap_or("jpg");
        let data_url = format!("data:{};base64,{}", mime_for_ext(ext), STANDARD.encode(&bytes));
        out.push(AttachmentData { id, data_url });
    }
    Ok(out)
}

#[tauri::command]
pub fn delete_attachment(state: State<AppState>, id: String) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let (owner_type, owner_id, filename): (String, String, String) = conn
        .query_row(
            "SELECT owner_type, owner_id, filename FROM attachments WHERE id = ?1",
            params![id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
        )
        .map_err(|e| e.to_string())?;
    let path = owner_dir(&state, &owner_type, &owner_id).join(&filename);
    let _ = fs::remove_file(path);
    conn.execute("DELETE FROM attachments WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// Removes every attachment file + row for an owner, and the now-empty directory.
/// Used when a trade or journal entry is deleted.
pub fn delete_all_for_owner(state: &AppState, owner_type: &str, owner_id: &str) -> Result<(), String> {
    let dir = owner_dir(state, owner_type, owner_id);
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "DELETE FROM attachments WHERE owner_type = ?1 AND owner_id = ?2",
        params![owner_type, owner_id],
    )
    .map_err(|e| e.to_string())?;
    let _ = fs::remove_dir_all(dir);
    Ok(())
}
