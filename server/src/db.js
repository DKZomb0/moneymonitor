const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'moneymonitor.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS account_snapshots (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id  TEXT    NOT NULL,
    date        TEXT    NOT NULL,
    value       REAL    NOT NULL,
    notes       TEXT,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(account_id, date)
  );

  CREATE TABLE IF NOT EXISTS accounts_meta (
    id            TEXT    PRIMARY KEY,
    name          TEXT    NOT NULL,
    type          TEXT    NOT NULL DEFAULT 'checking',
    iban          TEXT,
    start_balance REAL    NOT NULL DEFAULT 0,
    currency      TEXT    NOT NULL DEFAULT 'EUR',
    color         TEXT,
    sort_order    INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS transaction_overrides (
    transaction_id  TEXT PRIMARY KEY,
    category        TEXT,
    notes           TEXT,
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

module.exports = db;
