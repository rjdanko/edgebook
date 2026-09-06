use crate::db::AppState;
use rusqlite::{params, Row};
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Serialize)]
pub struct FieldDef {
    pub id: String,
    pub entity: String,
    pub key: String,
    pub label: String,
    pub kind: String,
    pub is_default: bool,
    pub sort_order: i64,
    pub hidden: bool,
    pub options: serde_json::Value,
}

#[derive(Deserialize)]
pub struct FieldDefInput {
    pub entity: String,
    pub label: String,
    pub kind: String,
    #[serde(default)]
    pub options: serde_json::Value,
}

fn row_to_field_def(row: &Row) -> rusqlite::Result<FieldDef> {
    let options_str: String = row.get(8)?;
    Ok(FieldDef {
        id: row.get(0)?,
        entity: row.get(1)?,
        key: row.get(2)?,
        label: row.get(3)?,
        kind: row.get(4)?,
        is_default: row.get::<_, i64>(5)? != 0,
        sort_order: row.get(6)?,
        hidden: row.get::<_, i64>(7)? != 0,
        options: serde_json::from_str(&options_str).unwrap_or_else(|_| serde_json::json!([])),
    })
}

const SELECT_COLUMNS: &str = "id, entity, key, label, kind, is_default, sort_order, hidden, options";

#[tauri::command]
pub fn list_field_defs(state: State<AppState>, entity: String) -> Result<Vec<FieldDef>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(&format!("SELECT {SELECT_COLUMNS} FROM field_defs WHERE entity = ?1 ORDER BY sort_order"))
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![entity], row_to_field_def)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(rows)
}

/// Custom fields only - default fields have their key fixed to the underlying column.
#[tauri::command]
pub fn create_field_def(state: State<AppState>, input: FieldDefInput) -> Result<FieldDef, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let key = format!("custom_{}", &id[..8]);
    let next_order: i64 = conn
        .query_row(
            "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM field_defs WHERE entity = ?1",
            params![input.entity],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;
    let options = if input.options.is_null() { serde_json::json!([]) } else { input.options };
    conn.execute(
        "INSERT INTO field_defs (id, entity, key, label, kind, is_default, sort_order, hidden, options)
         VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6, 0, ?7)",
        params![id, input.entity, key, input.label, input.kind, next_order, options.to_string()],
    )
    .map_err(|e| e.to_string())?;

    conn.query_row(&format!("SELECT {SELECT_COLUMNS} FROM field_defs WHERE id = ?1"), params![id], row_to_field_def)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_field_def(
    state: State<AppState>,
    id: String,
    label: String,
    hidden: bool,
    sort_order: i64,
    options: serde_json::Value,
) -> Result<FieldDef, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE field_defs SET label=?1, hidden=?2, sort_order=?3, options=?4 WHERE id=?5",
        params![label, hidden as i64, sort_order, options.to_string(), id],
    )
    .map_err(|e| e.to_string())?;

    conn.query_row(&format!("SELECT {SELECT_COLUMNS} FROM field_defs WHERE id = ?1"), params![id], row_to_field_def)
        .map_err(|e| e.to_string())
}

/// Refuses to delete default fields - they map to fixed columns, not custom_fields keys.
#[tauri::command]
pub fn delete_field_def(state: State<AppState>, id: String) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let is_default: i64 = conn
        .query_row("SELECT is_default FROM field_defs WHERE id = ?1", params![id], |r| r.get(0))
        .map_err(|e| e.to_string())?;
    if is_default != 0 {
        return Err("cannot delete a default field".into());
    }
    conn.execute("DELETE FROM field_defs WHERE id = ?1", params![id]).map_err(|e| e.to_string())?;
    Ok(())
}
