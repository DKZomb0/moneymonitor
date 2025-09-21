const db = require('../db');

function getYearFilterClause(year) {
  if (!year) {
    return { clause: '', params: [] };
  }
  return { clause: "WHERE strftime('%Y', date) = ?", params: [String(year)] };
}

function getOverview(year) {
  const { clause, params } = getYearFilterClause(year);

  const totalsByYear = db
    .prepare(
      `SELECT
          strftime('%Y', date) AS year,
          COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) AS income,
          COALESCE(SUM(CASE WHEN amount < 0 THEN -amount ELSE 0 END), 0) AS expenses,
          COALESCE(SUM(amount), 0) AS net
        FROM transactions
        GROUP BY year
        ORDER BY year`
    )
    .all();

  const totalsByMonth = db
    .prepare(
      `SELECT
          strftime('%Y-%m', date) AS period,
          COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) AS income,
          COALESCE(SUM(CASE WHEN amount < 0 THEN -amount ELSE 0 END), 0) AS expenses,
          COALESCE(SUM(amount), 0) AS net
        FROM transactions
        ${clause}
        GROUP BY period
        ORDER BY period DESC`
    )
    .all(...params);

  const totalsByCategory = db
    .prepare(
      `SELECT
          COALESCE(c.name, 'Uncategorized') AS category,
          COALESCE(SUM(CASE WHEN t.amount > 0 THEN t.amount ELSE 0 END), 0) AS income,
          COALESCE(SUM(CASE WHEN t.amount < 0 THEN -t.amount ELSE 0 END), 0) AS expenses,
          COALESCE(SUM(t.amount), 0) AS net
        FROM transactions t
        LEFT JOIN categories c ON c.id = t.category_id
        ${clause}
        GROUP BY category
        ORDER BY expenses DESC`
    )
    .all(...params);

  const recentTransactions = db
    .prepare(
      `SELECT
          t.id,
          t.date,
          t.description,
          t.amount,
          a.name AS accountName,
          c.name AS categoryName
        FROM transactions t
        INNER JOIN accounts a ON a.id = t.account_id
        LEFT JOIN categories c ON c.id = t.category_id
        ORDER BY t.date DESC, t.id DESC
        LIMIT 20`
    )
    .all();

  return {
    totalsByYear,
    totalsByMonth,
    totalsByCategory,
    recentTransactions
  };
}

module.exports = {
  getOverview
};
