-- Default fields stay real columns so stats/calendar can aggregate in SQL.
-- Only user-added fields go into custom_fields (JSON).
CREATE TABLE trades (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    symbol TEXT NOT NULL DEFAULT '',
    position TEXT NOT NULL DEFAULT '',
    session TEXT NOT NULL DEFAULT '',
    net_pl REAL NOT NULL DEFAULT 0,
    lots REAL NOT NULL DEFAULT 0,
    is_breakeven INTEGER NOT NULL DEFAULT 0,
    confluences TEXT NOT NULL DEFAULT '',
    narrative TEXT NOT NULL DEFAULT '',
    emotions TEXT NOT NULL DEFAULT '',
    custom_fields TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX idx_trades_date ON trades(date);

CREATE TABLE journal_entries (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL DEFAULT '',
    date TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    custom_fields TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX idx_journal_date ON journal_entries(date);

CREATE TABLE objectives (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    target_value REAL NOT NULL,
    comparison TEXT NOT NULL, -- 'min' | 'max' | 'exact'
    metric TEXT NOT NULL,     -- which computed value this checks, e.g. 'trading_days', 'max_daily_loss'
    active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0
);

-- Metadata only for default fields (label/order/hidden); schema columns never change.
-- Real column definitions for user-added custom fields.
CREATE TABLE field_defs (
    id TEXT PRIMARY KEY,
    entity TEXT NOT NULL,   -- 'trade' | 'journal'
    key TEXT NOT NULL,      -- column name for defaults, custom_fields key for user fields
    label TEXT NOT NULL,
    kind TEXT NOT NULL,     -- 'text' | 'long_text' | 'number' | 'boolean' | 'enum' | 'tag' | 'date'
    is_default INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    hidden INTEGER NOT NULL DEFAULT 0,
    options TEXT NOT NULL DEFAULT '[]' -- JSON array of {value, color} for enum/tag kinds
);

CREATE TABLE attachments (
    id TEXT PRIMARY KEY,
    owner_type TEXT NOT NULL, -- 'trade' | 'journal'
    owner_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_attachments_owner ON attachments(owner_type, owner_id);

CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
