use crate::db::AppState;
use rusqlite::{params, Row};
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Serialize)]
pub struct Objective {
    pub id: String,
    pub label: String,
    pub target_value: f64,
    pub comparison: String,
    pub metric: String,
    pub active: bool,
    pub sort_order: i64,
}

#[derive(Deserialize)]
pub struct ObjectiveInput {
    pub label: String,
    pub target_value: f64,
    pub comparison: String,
    pub metric: String,
}

const SELECT_COLUMNS: &str = "id, label, target_value, comparison, metric, active, sort_order";

fn row_to_objective(row: &Row) -> rusqlite::Result<Objective> {
    Ok(Objective {
        id: row.get(0)?,
        label: row.get(1)?,
        target_value: row.get(2)?,
        comparison: row.get(3)?,
        metric: row.get(4)?,
        active: row.get::<_, i64>(5)? != 0,
        sort_order: row.get(6)?,
    })
}

#[tauri::command]
pub fn list_objectives(state: State<AppState>) -> Result<Vec<Objective>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(&format!("SELECT {SELECT_COLUMNS} FROM objectives ORDER BY sort_order"))
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], row_to_objective)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(rows)
}

#[tauri::command]
pub fn create_objective(state: State<AppState>, input: ObjectiveInput) -> Result<Objective, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let next_order: i64 = conn
        .query_row("SELECT COALESCE(MAX(sort_order), -1) + 1 FROM objectives", [], |r| r.get(0))
        .map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO objectives (id, label, target_value, comparison, metric, active, sort_order) VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6)",
        params![id, input.label, input.target_value, input.comparison, input.metric, next_order],
    )
    .map_err(|e| e.to_string())?;

    conn.query_row(&format!("SELECT {SELECT_COLUMNS} FROM objectives WHERE id = ?1"), params![id], row_to_objective)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_objective(
    state: State<AppState>,
    id: String,
    label: String,
    target_value: f64,
    comparison: String,
    metric: String,
    active: bool,
) -> Result<Objective, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE objectives SET label=?1, target_value=?2, comparison=?3, metric=?4, active=?5 WHERE id=?6",
        params![label, target_value, comparison, metric, active as i64, id],
    )
    .map_err(|e| e.to_string())?;

    conn.query_row(&format!("SELECT {SELECT_COLUMNS} FROM objectives WHERE id = ?1"), params![id], row_to_objective)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_objective(state: State<AppState>, id: String) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM objectives WHERE id = ?1", params![id]).map_err(|e| e.to_string())?;
    Ok(())
}
