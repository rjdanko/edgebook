use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

const MIGRATION_001: &str = include_str!("../migrations/001_init.sql");

pub struct AppState {
    pub conn: Mutex<Connection>,
    pub data_root: PathBuf,
}

#[derive(Serialize, Deserialize)]
struct AppConfig {
    data_root: PathBuf,
}

/// Where the app remembers the user's chosen EdgeBook data folder.
/// Must be readable before the database itself can be opened.
fn config_path(app_config_dir: &Path) -> PathBuf {
    app_config_dir.join("config.json")
}

fn default_data_root() -> PathBuf {
    dirs_documents().join("EdgeBook")
}

fn dirs_documents() -> PathBuf {
    std::env::var("USERPROFILE")
        .map(|p| PathBuf::from(p).join("Documents"))
        .unwrap_or_else(|_| PathBuf::from("."))
}

pub fn resolve_data_root(app_config_dir: &Path) -> PathBuf {
    let cfg_path = config_path(app_config_dir);
    if let Ok(bytes) = fs::read(&cfg_path) {
        if let Ok(cfg) = serde_json::from_slice::<AppConfig>(&bytes) {
            return cfg.data_root;
        }
    }
    let root = default_data_root();
    let _ = fs::create_dir_all(app_config_dir);
    let _ = fs::write(&cfg_path, serde_json::to_vec(&AppConfig { data_root: root.clone() }).unwrap());
    root
}

// Used by the Phase 5 Settings screen to relocate the data folder.
#[allow(dead_code)]
pub fn set_data_root(app_config_dir: &Path, new_root: &Path) -> std::io::Result<()> {
    fs::create_dir_all(app_config_dir)?;
    fs::write(
        config_path(app_config_dir),
        serde_json::to_vec(&AppConfig { data_root: new_root.to_path_buf() }).unwrap(),
    )
}

/// Creates attachments/ and exports/ under the data root, opens edgebook.db,
/// runs pending migrations, and seeds defaults on first launch.
/// Per-owner attachment subfolders (attachments/{trade,journal}/{id}/) are
/// created on demand by attachments::save_attachment.
pub fn open(data_root: &Path) -> rusqlite::Result<Connection> {
    fs::create_dir_all(data_root.join("attachments")).ok();
    fs::create_dir_all(data_root.join("exports")).ok();

    let conn = Connection::open(data_root.join("edgebook.db"))?;
    conn.pragma_update(None, "foreign_keys", true)?;
    migrate(&conn)?;
    Ok(conn)
}

fn migrate(conn: &Connection) -> rusqlite::Result<()> {
    let version: i64 = conn.query_row("PRAGMA user_version", [], |r| r.get(0))?;
    if version < 1 {
        conn.execute_batch(MIGRATION_001)?;
        seed_defaults(conn)?;
        conn.pragma_update(None, "user_version", 1)?;
    }
    Ok(())
}

fn seed_defaults(conn: &Connection) -> rusqlite::Result<()> {
    let trade_fields = [
        ("date", "Date", "date"),
        ("symbol", "Symbol", "tag"),
        ("position", "Position", "enum"),
        ("session", "Session", "tag"),
        ("net_pl", "Net P/L", "number"),
        ("lots", "Lots", "number"),
        ("confluences", "Confluences", "long_text"),
        ("narrative", "Narrative", "long_text"),
        ("emotions", "Emotions", "long_text"),
    ];
    for (i, (key, label, kind)) in trade_fields.iter().enumerate() {
        conn.execute(
            "INSERT INTO field_defs (id, entity, key, label, kind, is_default, sort_order) VALUES (?1, 'trade', ?2, ?3, ?4, 1, ?5)",
            rusqlite::params![uuid::Uuid::new_v4().to_string(), key, label, kind, i as i64],
        )?;
    }

    let journal_fields = [
        ("title", "Title", "text"),
        ("date", "Date", "date"),
        ("type", "Type", "tag"),
        ("content", "Content", "long_text"),
    ];
    for (i, (key, label, kind)) in journal_fields.iter().enumerate() {
        conn.execute(
            "INSERT INTO field_defs (id, entity, key, label, kind, is_default, sort_order) VALUES (?1, 'journal', ?2, ?3, ?4, 1, ?5)",
            rusqlite::params![uuid::Uuid::new_v4().to_string(), key, label, kind, i as i64],
        )?;
    }

    let objectives = [
        ("Minimum 4 trading days", 4.0, "min", "trading_days"),
        ("Max daily loss", -500.0, "min", "max_daily_loss"),
    ];
    for (i, (label, target, comparison, metric)) in objectives.iter().enumerate() {
        conn.execute(
            "INSERT INTO objectives (id, label, target_value, comparison, metric, active, sort_order) VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6)",
            rusqlite::params![uuid::Uuid::new_v4().to_string(), label, target, comparison, metric, i as i64],
        )?;
    }

    let settings = [
        ("theme", "system"),
        ("accent", "#2A9D8F"),
        ("starting_balance", "0"),
    ];
    for (key, value) in settings {
        conn.execute(
            "INSERT INTO settings (key, value) VALUES (?1, ?2)",
            rusqlite::params![key, value],
        )?;
    }

    Ok(())
}
