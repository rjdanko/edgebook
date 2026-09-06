use crate::db::AppState;
use rusqlite::Row;
use serde::Serialize;
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
        .prepare("SELECT id, label, target_value, comparison, metric, active, sort_order FROM objectives ORDER BY sort_order")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], row_to_objective)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(rows)
}
