use crate::attachments;
use crate::db::AppState;
use chrono::Utc;
use rusqlite::{params, Row};
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Serialize)]
pub struct Trade {
    pub id: String,
    pub date: String,
    pub symbol: String,
    pub position: String,
    pub session: String,
    pub net_pl: f64,
    pub lots: f64,
    pub is_breakeven: bool,
    pub confluences: String,
    pub narrative: String,
    pub emotions: String,
    pub custom_fields: serde_json::Value,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Deserialize)]
pub struct TradeInput {
    pub date: String,
    pub symbol: String,
    pub position: String,
    pub session: String,
    pub net_pl: f64,
    pub lots: f64,
    pub is_breakeven: bool,
    pub confluences: String,
    pub narrative: String,
    pub emotions: String,
    #[serde(default = "default_custom_fields")]
    pub custom_fields: serde_json::Value,
}

fn default_custom_fields() -> serde_json::Value {
    serde_json::json!({})
}

fn row_to_trade(row: &Row) -> rusqlite::Result<Trade> {
    let custom_fields_str: String = row.get(11)?;
    Ok(Trade {
        id: row.get(0)?,
        date: row.get(1)?,
        symbol: row.get(2)?,
        position: row.get(3)?,
        session: row.get(4)?,
        net_pl: row.get(5)?,
        lots: row.get(6)?,
        is_breakeven: row.get::<_, i64>(7)? != 0,
        confluences: row.get(8)?,
        narrative: row.get(9)?,
        emotions: row.get(10)?,
        custom_fields: serde_json::from_str(&custom_fields_str).unwrap_or_else(|_| default_custom_fields()),
        created_at: row.get(12)?,
        updated_at: row.get(13)?,
    })
}

const SELECT_COLUMNS: &str =
    "id, date, symbol, position, session, net_pl, lots, is_breakeven, confluences, narrative, emotions, custom_fields, created_at, updated_at";

#[tauri::command]
pub fn list_trades(state: State<AppState>) -> Result<Vec<Trade>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(&format!("SELECT {SELECT_COLUMNS} FROM trades ORDER BY date DESC, created_at DESC"))
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], row_to_trade)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(rows)
}

#[tauri::command]
pub fn create_trade(state: State<AppState>, input: TradeInput) -> Result<Trade, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO trades (id, date, symbol, position, session, net_pl, lots, is_breakeven, confluences, narrative, emotions, custom_fields, created_at, updated_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?13)",
        params![
            id,
            input.date,
            input.symbol,
            input.position,
            input.session,
            input.net_pl,
            input.lots,
            input.is_breakeven as i64,
            input.confluences,
            input.narrative,
            input.emotions,
            input.custom_fields.to_string(),
            now,
        ],
    )
    .map_err(|e| e.to_string())?;

    conn.query_row(&format!("SELECT {SELECT_COLUMNS} FROM trades WHERE id = ?1"), params![id], row_to_trade)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_trade(state: State<AppState>, id: String, input: TradeInput) -> Result<Trade, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE trades SET date=?1, symbol=?2, position=?3, session=?4, net_pl=?5, lots=?6, is_breakeven=?7,
         confluences=?8, narrative=?9, emotions=?10, custom_fields=?11, updated_at=?12 WHERE id=?13",
        params![
            input.date,
            input.symbol,
            input.position,
            input.session,
            input.net_pl,
            input.lots,
            input.is_breakeven as i64,
            input.confluences,
            input.narrative,
            input.emotions,
            input.custom_fields.to_string(),
            now,
            id,
        ],
    )
    .map_err(|e| e.to_string())?;

    conn.query_row(&format!("SELECT {SELECT_COLUMNS} FROM trades WHERE id = ?1"), params![id], row_to_trade)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_trade(state: State<AppState>, id: String) -> Result<(), String> {
    {
        let conn = state.conn.lock().map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM trades WHERE id = ?1", params![id]).map_err(|e| e.to_string())?;
    }
    attachments::delete_all_for_owner(&state, "trade", &id)
}
