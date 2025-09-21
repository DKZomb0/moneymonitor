const db = require('../db');

function mapRow(row) {
  return {
    id: row.id,
    accountId: row.account_id,
    accountName: row.account_name,
    symbol: row.symbol,
    quantity: row.quantity,
    price: row.price,
    value: row.value,
    date: row.date,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function listInvestments({ accountId } = {}) {
  let query = `SELECT i.*, a.name AS account_name
               FROM investments i
               INNER JOIN accounts a ON a.id = i.account_id`;
  const params = [];
  if (accountId != null) {
    query += ' WHERE i.account_id = ?';
    params.push(accountId);
  }
  query += ' ORDER BY i.date DESC, i.id DESC';

  const rows = db.prepare(query).all(...params);
  return rows.map(mapRow);
}

function getInvestmentById(id) {
  const row = db
    .prepare(
      `SELECT i.*, a.name AS account_name
       FROM investments i
       INNER JOIN accounts a ON a.id = i.account_id
       WHERE i.id = ?`
    )
    .get(id);
  return row ? mapRow(row) : null;
}

function createInvestment({ accountId, symbol, quantity = null, price = null, value = null, date, notes = null }) {
  const computedValue = value != null ? value : quantity != null && price != null ? quantity * price : null;
  const insert = db.prepare(
    `INSERT INTO investments (account_id, symbol, quantity, price, value, date, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  const info = insert.run(accountId, symbol, quantity, price, computedValue, date, notes);
  return getInvestmentById(info.lastInsertRowid);
}

function getInvestmentSummary() {
  const perAccount = db
    .prepare(
      `SELECT
          a.id AS accountId,
          a.name AS accountName,
          COALESCE(SUM(i.value), 0) AS totalValue
       FROM accounts a
       LEFT JOIN investments i ON i.account_id = a.id
       GROUP BY a.id
       ORDER BY totalValue DESC`
    )
    .all();

  const totals = db.prepare('SELECT COALESCE(SUM(value), 0) AS totalValue FROM investments').get();

  return {
    accounts: perAccount,
    totalValue: totals ? totals.totalValue : 0
  };
}

module.exports = {
  listInvestments,
  createInvestment,
  getInvestmentById,
  getInvestmentSummary
};
