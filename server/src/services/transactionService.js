const path = require('path');
const crypto = require('crypto');
const { parseDirectory, parseCsvText } = require('../parsers/csvParser');
const { categorize } = require('./categoryService');
const { isInternalTransfer, loadIbans } = require('./ibanService');

const INPUT_DIR = path.join(__dirname, '..', '..', '..', 'input');

/**
 * Generate a stable ID for a transaction based on its key fields.
 */
function makeId(t) {
  const key = [t.date, t.ownIban, t.counterpartyIban, t.amount, t.description].join('|');
  return crypto.createHash('md5').update(key).digest('hex').slice(0, 16);
}

/**
 * Enrich a raw parsed transaction with derived fields.
 */
function enrich(raw) {
  const internal = isInternalTransfer(raw);
  const category = internal ? '__internal__' : categorize(raw);
  const type = internal ? 'internal' : (raw.amount >= 0 ? 'income' : 'expense');
  return {
    id: makeId(raw),
    date: raw.date,
    year: raw.date ? raw.date.slice(0, 4) : null,
    month: raw.date ? raw.date.slice(0, 7) : null,
    amount: raw.amount,
    description: raw.description,
    ownIban: raw.ownIban,
    counterpartyName: raw.counterpartyName,
    counterpartyIban: raw.counterpartyIban,
    balance: isNaN(raw.balance) ? null : raw.balance,
    category,
    type,
    isInternal: internal,
    sourceFile: raw.sourceFile,
    sourceFormat: raw.sourceFormat
  };
}

/**
 * Deduplicate transactions by id, keeping the first occurrence.
 */
function deduplicate(transactions) {
  const seen = new Set();
  return transactions.filter(t => {
    if (seen.has(t.id)) return false;
    seen.add(t.id);
    return true;
  });
}

/**
 * Load, parse, and enrich all transactions from the input directory.
 */
function loadAllTransactions() {
  const raw = parseDirectory(INPUT_DIR);
  const enriched = raw.map(enrich);
  const deduped = deduplicate(enriched);
  return deduped.sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : 0);
}

/**
 * Parse and enrich a CSV text (for drag-and-drop uploads from the UI).
 */
function processUploadedCsv(text, filename) {
  const raw = parseCsvText(text, filename);
  return raw.map(enrich);
}

/**
 * Build a yearly summary from a list of transactions.
 * Returns per-month and per-category aggregates.
 */
function buildYearlySummary(transactions, year) {
  const yearStr = String(year);
  const filtered = transactions.filter(t => t.year === yearStr && !t.isInternal);

  const byMonth = {};
  const byCategory = {};

  for (const t of filtered) {
    const m = t.month;
    if (!byMonth[m]) byMonth[m] = { income: 0, expense: 0, net: 0 };
    if (t.type === 'income') {
      byMonth[m].income += t.amount;
    } else if (t.type === 'expense') {
      byMonth[m].expense += Math.abs(t.amount);
    }
    byMonth[m].net += t.amount;

    const cat = t.category || 'Onbekend';
    if (!byCategory[cat]) byCategory[cat] = { income: 0, expense: 0, net: 0, count: 0 };
    if (t.type === 'income') byCategory[cat].income += t.amount;
    else if (t.type === 'expense') byCategory[cat].expense += Math.abs(t.amount);
    byCategory[cat].net += t.amount;
    byCategory[cat].count++;
  }

  const totalIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + Math.abs(t.amount), 0);

  return {
    year: yearStr,
    totalIncome,
    totalExpense,
    totalNet: totalIncome - totalExpense,
    byMonth: Object.entries(byMonth)
      .map(([month, v]) => ({ month, ...v }))
      .sort((a, b) => a.month < b.month ? -1 : 1),
    byCategory: Object.entries(byCategory)
      .map(([category, v]) => ({ category, ...v }))
      .sort((a, b) => b.expense - a.expense)
  };
}

/**
 * Build a monthly detail view.
 */
function buildMonthlyDetail(transactions, yearMonth) {
  const filtered = transactions
    .filter(t => t.month === yearMonth && !t.isInternal)
    .sort((a, b) => a.date < b.date ? 1 : -1);

  const byCategory = {};
  for (const t of filtered) {
    const cat = t.category || 'Onbekend';
    if (!byCategory[cat]) byCategory[cat] = { income: 0, expense: 0, transactions: [] };
    if (t.type === 'income') byCategory[cat].income += t.amount;
    else if (t.type === 'expense') byCategory[cat].expense += Math.abs(t.amount);
    byCategory[cat].transactions.push(t);
  }

  return {
    yearMonth,
    transactions: filtered,
    byCategory: Object.entries(byCategory)
      .map(([category, v]) => ({ category, ...v }))
      .sort((a, b) => b.expense - a.expense)
  };
}

/**
 * Get all internal transfers for the control view.
 */
function getInternalTransfers(transactions) {
  return transactions.filter(t => t.isInternal)
    .sort((a, b) => a.date < b.date ? 1 : -1);
}

/**
 * Get available years from transactions.
 */
function getAvailableYears(transactions) {
  const years = new Set(transactions.map(t => t.year).filter(Boolean));
  return Array.from(years).sort().reverse();
}

module.exports = {
  loadAllTransactions,
  processUploadedCsv,
  buildYearlySummary,
  buildMonthlyDetail,
  getInternalTransfers,
  getAvailableYears,
  enrich
};
