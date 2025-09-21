const db = require('../db');

function mapRowToAccount(row, summary = {}) {
  const netChange = summary?.netChange ?? 0;
  const totalExpenses = summary?.totalExpenses ?? 0;
  const totalIncome = summary?.totalIncome ?? 0;
  const currentBalance = row.start_balance + netChange;
  const allocationGap = row.target_allocation != null ? row.target_allocation - currentBalance : null;

  return {
    id: row.id,
    name: row.name,
    type: row.type,
    startBalance: row.start_balance,
    targetAllocation: row.target_allocation,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    currentBalance,
    totalExpenses,
    totalIncome,
    netChange,
    allocationGap
  };
}

function listAccounts() {
  const accounts = db.prepare('SELECT * FROM accounts ORDER BY name ASC').all();
  const summaries = db
    .prepare(
      `SELECT
          account_id AS accountId,
          COALESCE(SUM(amount), 0) AS netChange,
          COALESCE(SUM(CASE WHEN amount < 0 THEN -amount ELSE 0 END), 0) AS totalExpenses,
          COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) AS totalIncome
        FROM transactions
        GROUP BY account_id`
    )
    .all();

  const summaryByAccount = new Map();
  summaries.forEach((row) => {
    summaryByAccount.set(row.accountId, {
      netChange: row.netChange,
      totalExpenses: row.totalExpenses,
      totalIncome: row.totalIncome
    });
  });

  return accounts.map((account) => mapRowToAccount(account, summaryByAccount.get(account.id)));
}

function getAccountById(id) {
  const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(id);
  if (!account) {
    return null;
  }

  const summary = db
    .prepare(
      `SELECT
          COALESCE(SUM(amount), 0) AS netChange,
          COALESCE(SUM(CASE WHEN amount < 0 THEN -amount ELSE 0 END), 0) AS totalExpenses,
          COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) AS totalIncome
        FROM transactions
        WHERE account_id = ?`
    )
    .get(id);

  return mapRowToAccount(account, summary);
}

function createAccount({ name, type, startBalance = 0, targetAllocation = null, notes = null }) {
  const insert = db.prepare(
    `INSERT INTO accounts (name, type, start_balance, target_allocation, notes)
     VALUES (?, ?, ?, ?, ?)`
  );
  const info = insert.run(name, type, startBalance, targetAllocation, notes);
  return getAccountById(info.lastInsertRowid);
}

function updateAccount(id, fields) {
  const existing = db.prepare('SELECT id FROM accounts WHERE id = ?').get(id);
  if (!existing) {
    return null;
  }

  const updates = [];
  const params = [];

  if (fields.name !== undefined) {
    updates.push('name = ?');
    params.push(fields.name);
  }

  if (fields.type !== undefined) {
    updates.push('type = ?');
    params.push(fields.type);
  }

  if (fields.startBalance !== undefined) {
    updates.push('start_balance = ?');
    params.push(fields.startBalance);
  }

  if (fields.targetAllocation !== undefined) {
    updates.push('target_allocation = ?');
    params.push(fields.targetAllocation);
  }

  if (fields.notes !== undefined) {
    updates.push('notes = ?');
    params.push(fields.notes);
  }

  updates.push("updated_at = datetime('now')");
  const query = `UPDATE accounts SET ${updates.join(', ')} WHERE id = ?`;
  params.push(id);

  db.prepare(query).run(...params);
  return getAccountById(id);
}

function getExpectedBalance(accountId) {
  const row = db
    .prepare(
      `SELECT start_balance + COALESCE((SELECT SUM(amount) FROM transactions WHERE account_id = ?), 0) AS expected
       FROM accounts
       WHERE id = ?`
    )
    .get(accountId, accountId);

  return row ? row.expected : null;
}

function summarizeAllExpectedBalances() {
  const rows = db
    .prepare(
      `SELECT
          a.id,
          a.name,
          a.type,
          a.start_balance + COALESCE(SUM(t.amount), 0) AS expected_balance
        FROM accounts a
        LEFT JOIN transactions t ON t.account_id = a.id
        GROUP BY a.id`
    )
    .all();

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    type: row.type,
    expectedBalance: row.expected_balance
  }));
}

module.exports = {
  listAccounts,
  getAccountById,
  createAccount,
  updateAccount,
  getExpectedBalance,
  summarizeAllExpectedBalances
};
