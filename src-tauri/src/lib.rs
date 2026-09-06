mod attachments;
mod db;
mod journal;
mod trades;

use db::AppState;
use tauri::Manager;

#[tauri::command]
fn get_settings(state: tauri::State<AppState>) -> Result<std::collections::HashMap<String, String>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT key, value FROM settings").map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?)))
        .map_err(|e| e.to_string())?;
    let mut map = std::collections::HashMap::new();
    for row in rows {
        let (k, v) = row.map_err(|e| e.to_string())?;
        map.insert(k, v);
    }
    Ok(map)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let config_dir = app.path().app_config_dir().expect("no app config dir");
            let data_root = db::resolve_data_root(&config_dir);
            let conn = db::open(&data_root).expect("failed to open database");
            app.manage(AppState { conn: std::sync::Mutex::new(conn), data_root });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_settings,
            trades::list_trades,
            trades::create_trade,
            trades::update_trade,
            trades::delete_trade,
            journal::list_journal_entries,
            journal::create_journal_entry,
            journal::update_journal_entry,
            journal::delete_journal_entry,
            attachments::save_attachment,
            attachments::list_attachments,
            attachments::delete_attachment,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
