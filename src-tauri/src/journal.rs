use crate::attachments;
use crate::db::AppState;
use chrono::Utc;
use rusqlite::{params, Row};
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Serialize)]
pub struct JournalEntry {
    pub id: String,
    pub title: String,
    pub date: String,
    pub r#type: String,
    pub content: String,
    pub custom_fields: serde_json::Value,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Deserialize)]
pub struct JournalEntryInput {
    pub title: String,
    pub date: String,
    pub r#type: String,
    pub content: String,
    #[serde(default = "default_custom_fields")]
    pub custom_fields: serde_json::Value,
}

fn default_custom_fields() -> serde_json::Value {
    serde_json::json!({})
}

fn row_to_entry(row: &Row) -> rusqlite::Result<JournalEntry> {
    let custom_fields_str: String = row.get(5)?;
    Ok(JournalEntry {
        id: row.get(0)?,
        title: row.get(1)?,
        date: row.get(2)?,
        r#type: row.get(3)?,
        content: row.get(4)?,
        custom_fields: serde_json::from_str(&custom_fields_str).unwrap_or_else(|_| default_custom_fields()),
        created_at: row.get(6)?,
        updated_at: row.get(7)?,
    })
}

const SELECT_COLUMNS: &str = "id, title, date, type, content, custom_fields, created_at, updated_at";

#[tauri::command]
pub fn list_journal_entries(state: State<AppState>) -> Result<Vec<JournalEntry>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(&format!("SELECT {SELECT_COLUMNS} FROM journal_entries ORDER BY date DESC, created_at DESC"))
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], row_to_entry)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(rows)
}

#[tauri::command]
pub fn create_journal_entry(state: State<AppState>, input: JournalEntryInput) -> Result<JournalEntry, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO journal_entries (id, title, date, type, content, custom_fields, created_at, updated_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?7)",
        params![id, input.title, input.date, input.r#type, input.content, input.custom_fields.to_string(), now],
    )
    .map_err(|e| e.to_string())?;

    conn.query_row(&format!("SELECT {SELECT_COLUMNS} FROM journal_entries WHERE id = ?1"), params![id], row_to_entry)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_journal_entry(state: State<AppState>, id: String, input: JournalEntryInput) -> Result<JournalEntry, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE journal_entries SET title=?1, date=?2, type=?3, content=?4, custom_fields=?5, updated_at=?6 WHERE id=?7",
        params![input.title, input.date, input.r#type, input.content, input.custom_fields.to_string(), now, id],
    )
    .map_err(|e| e.to_string())?;

    conn.query_row(&format!("SELECT {SELECT_COLUMNS} FROM journal_entries WHERE id = ?1"), params![id], row_to_entry)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_journal_entry(state: State<AppState>, id: String) -> Result<(), String> {
    {
        let conn = state.conn.lock().map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM journal_entries WHERE id = ?1", params![id]).map_err(|e| e.to_string())?;
    }
    attachments::delete_all_for_owner(&state, "journal", &id)
}
