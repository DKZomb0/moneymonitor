const fs = require('fs');
const path = require('path');
const db = require('../db');

const CONFIG_PATH = path.join(__dirname, '..', '..', '..', 'config', 'accounts.json');

// ── Account metadata (from config file + DB) ──────────────────────────────────

function loadAccountsConfig() {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    const config = JSON.parse(raw);
    return config.accounts || [];
  } catch {
    return [];
  }
}

function saveAccountsConfig(accounts) {
  const existing = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  existing.accounts = accounts;
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(existing, null, 2), 'utf-8');
}

/**
 * Sync config accounts into DB metadata table so we can store extra fields.
 */
function syncAccountsToDb() {
  const configAccounts = loadAccountsConfig();
  const upsert = db.prepare(`
    INSERT INTO accounts_meta (id, name, type, iban, start_balance, currency, sort_order)
    VALUES (@id, @name, @type, @iban, @start_balance, @currency, @sort_order)
    ON CONFLICT(id) DO UPDATE SET
      name         = excluded.name,
      iban         = excluded.iban,
      start_balance = excluded.start_balance,
      currency     = excluded.currency,
      updated_at   = datetime('now')
  `);
  const tx = db.transaction(() => {
    configAccounts.forEach((a, i) => {
      upsert.run({
        id: a.id,
        name: a.name,
        type: a.type || 'checking',
        iban: a.iban || null,
        start_balance: a.startBalance || 0,
        currency: a.currency || 'EUR',
        sort_order: i
      });
    });
  });
  tx();
}

function getAllAccounts() {
  syncAccountsToDb();
  const rows = db.prepare(`
    SELECT id, name, type, iban, start_balance AS startBalance, currency, color, sort_order AS sortOrder
    FROM accounts_meta ORDER BY sort_order, name
  `).all();
  return rows;
}

function upsertAccount(account) {
  db.prepare(`
    INSERT INTO accounts_meta (id, name, type, iban, start_balance, currency, color, sort_order, updated_at)
    VALUES (@id, @name, @type, @iban, @startBalance, @currency, @color, @sortOrder, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      name         = excluded.name,
      type         = excluded.type,
      iban         = excluded.iban,
      start_balance = excluded.start_balance,
      currency     = excluded.currency,
      color        = excluded.color,
      sort_order   = excluded.sort_order,
      updated_at   = datetime('now')
  `).run({
    id: account.id,
    name: account.name,
    type: account.type || 'checking',
    iban: account.iban || null,
    startBalance: account.startBalance || 0,
    currency: account.currency || 'EUR',
    color: account.color || null,
    sortOrder: account.sortOrder || 0
  });

  // Also persist to config file
  const configAccounts = loadAccountsConfig();
  const idx = configAccounts.findIndex(a => a.id === account.id);
  const configEntry = {
    id: account.id,
    name: account.name,
    type: account.type || 'checking',
    iban: account.iban || '',
    startBalance: account.startBalance || 0,
    currency: account.currency || 'EUR'
  };
  if (idx >= 0) configAccounts[idx] = configEntry;
  else configAccounts.push(configEntry);
  saveAccountsConfig(configAccounts);

  return getAccountById(account.id);
}

function deleteAccount(id) {
  db.prepare('DELETE FROM accounts_meta WHERE id = ?').run(id);
  // Remove from config too
  const configAccounts = loadAccountsConfig().filter(a => a.id !== id);
  saveAccountsConfig(configAccounts);
}

function getAccountById(id) {
  return db.prepare(`
    SELECT id, name, type, iban, start_balance AS startBalance, currency, color, sort_order AS sortOrder
    FROM accounts_meta WHERE id = ?
  `).get(id);
}

// ── Account snapshots (manual balance entries for the controle tab) ────────────

function getLatestSnapshot(accountId) {
  return db.prepare(`
    SELECT id, account_id AS accountId, date, value, notes
    FROM account_snapshots
    WHERE account_id = ?
    ORDER BY date DESC, id DESC
    LIMIT 1
  `).get(accountId);
}

function getSnapshotsForAccount(accountId, limit = 12) {
  return db.prepare(`
    SELECT id, account_id AS accountId, date, value, notes
    FROM account_snapshots
    WHERE account_id = ?
    ORDER BY date DESC, id DESC
    LIMIT ?
  `).all(accountId, limit);
}

function upsertSnapshot(accountId, date, value, notes = null) {
  db.prepare(`
    INSERT INTO account_snapshots (account_id, date, value, notes)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(account_id, date) DO UPDATE SET value = excluded.value, notes = excluded.notes
  `).run(accountId, date, value, notes);
  return getLatestSnapshot(accountId);
}

function deleteSnapshot(id) {
  db.prepare('DELETE FROM account_snapshots WHERE id = ?').run(id);
}

/**
 * Build the controle view: all accounts with their latest snapshot value
 * and for checking accounts, the calculated balance from transactions.
 */
function buildControleView(transactions) {
  const accounts = getAllAccounts();

  return accounts.map(account => {
    const snapshot = getLatestSnapshot(account.id);
    const snapshots = getSnapshotsForAccount(account.id, 3);

    let calculatedBalance = null;
    let transactionCount = 0;

    if (account.type === 'checking' && account.iban) {
      const normalizedIban = account.iban.toUpperCase().replace(/\s/g, '');
      const accountTxs = transactions.filter(t =>
        t.ownIban?.toUpperCase().replace(/\s/g, '') === normalizedIban
      );
      transactionCount = accountTxs.length;
      const txSum = accountTxs.reduce((s, t) => s + t.amount, 0);
      calculatedBalance = account.startBalance + txSum;
    }

    return {
      ...account,
      currentValue: snapshot?.value ?? null,
      snapshotDate: snapshot?.date ?? null,
      snapshotNotes: snapshot?.notes ?? null,
      recentSnapshots: snapshots,
      calculatedBalance,
      transactionCount,
      difference: snapshot?.value != null && calculatedBalance != null
        ? snapshot.value - calculatedBalance
        : null
    };
  });
}

// ── Transaction overrides (manual category assignments) ───────────────────────

function getOverride(transactionId) {
  return db.prepare('SELECT * FROM transaction_overrides WHERE transaction_id = ?').get(transactionId);
}

function setOverride(transactionId, category, notes) {
  db.prepare(`
    INSERT INTO transaction_overrides (transaction_id, category, notes, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(transaction_id) DO UPDATE SET
      category   = excluded.category,
      notes      = excluded.notes,
      updated_at = datetime('now')
  `).run(transactionId, category || null, notes || null);
}

function getAllOverrides() {
  return db.prepare('SELECT transaction_id AS transactionId, category, notes FROM transaction_overrides').all();
}

module.exports = {
  getAllAccounts,
  upsertAccount,
  deleteAccount,
  getAccountById,
  getLatestSnapshot,
  getSnapshotsForAccount,
  upsertSnapshot,
  deleteSnapshot,
  buildControleView,
  getOverride,
  setOverride,
  getAllOverrides
};
