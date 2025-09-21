const db = require('./db');

function initializeDatabase() {
  const statements = [
    `CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        start_balance REAL NOT NULL DEFAULT 0,
        target_allocation REAL,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
    `CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL DEFAULT 'expense',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
    `CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id INTEGER NOT NULL,
        category_id INTEGER,
        date TEXT NOT NULL,
        description TEXT,
        amount REAL NOT NULL,
        external_id TEXT,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE,
        FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE SET NULL,
        UNIQUE(account_id, external_id) ON CONFLICT IGNORE
      )`,
    `CREATE INDEX IF NOT EXISTS idx_transactions_account_date ON transactions(account_id, date)`,
    `CREATE INDEX IF NOT EXISTS idx_transactions_category_date ON transactions(category_id, date)`,
    `CREATE TABLE IF NOT EXISTS investments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id INTEGER NOT NULL,
        symbol TEXT,
        quantity REAL,
        price REAL,
        value REAL,
        date TEXT NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE
      )`,
    `CREATE INDEX IF NOT EXISTS idx_investments_account_date ON investments(account_id, date)`,
    `CREATE TABLE IF NOT EXISTS reconciliations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
        notes TEXT,
        recommended_checking_balance REAL,
        expected_net_worth REAL,
        actual_net_worth REAL,
        difference REAL
      )`,
    `CREATE TABLE IF NOT EXISTS reconciliation_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reconciliation_id INTEGER NOT NULL,
        account_id INTEGER NOT NULL,
        expected_balance REAL NOT NULL,
        actual_balance REAL NOT NULL,
        difference REAL NOT NULL,
        FOREIGN KEY(reconciliation_id) REFERENCES reconciliations(id) ON DELETE CASCADE,
        FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE
      )`
  ];

  const insertDefaultCategories = db.prepare(
    `INSERT OR IGNORE INTO categories (name, type) VALUES
      ('Income', 'income'),
      ('Rent', 'expense'),
      ('Groceries', 'expense'),
      ('Investments', 'transfer'),
      ('Utilities', 'expense'),
      ('Insurance', 'expense'),
      ('Entertainment', 'expense')`
  );

  const transaction = db.transaction(() => {
    statements.forEach((sql) => db.prepare(sql).run());
    insertDefaultCategories.run();
  });

  transaction();
}

if (require.main === module) {
  initializeDatabase();
  console.log('Database initialized');
}

module.exports = initializeDatabase;
