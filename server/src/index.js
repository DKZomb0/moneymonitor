const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');

const {
  loadAllTransactions,
  processUploadedCsv,
  buildYearlySummary,
  buildMonthlyDetail,
  getInternalTransfers,
  getAvailableYears,
  enrich
} = require('./services/transactionService');

const {
  loadCategories,
  saveCategories,
  reloadCategories,
  generateMappingSuggestions
} = require('./services/categoryService');

const {
  loadIbans,
  saveIbans,
  reloadIbans,
  isOwnIban
} = require('./services/ibanService');

const {
  getAllAccounts,
  upsertAccount,
  deleteAccount,
  upsertSnapshot,
  deleteSnapshot,
  getSnapshotsForAccount,
  buildControleView,
  setOverride,
  getAllOverrides
} = require('./services/accountService');

const { parseCsvText } = require('./parsers/csvParser');

const app = express();
const PORT = process.env.PORT || 4000;
const FRONTEND_DIST = path.join(__dirname, '..', '..', 'frontend', 'dist');
const INPUT_DIR = path.join(__dirname, '..', '..', 'input');

app.use(cors());
app.use(express.json({ limit: '20mb' }));

// ── Transaction cache (reload on each request for dev simplicity) ─────────────
function getTransactions() {
  return loadAllTransactions();
}

// ── Health ─────────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  const transactions = getTransactions();
  res.json({
    status: 'ok',
    transactionCount: transactions.length,
    inputDir: INPUT_DIR,
    inputFiles: fs.existsSync(INPUT_DIR)
      ? fs.readdirSync(INPUT_DIR).filter(f => /\.(csv|CSV|txt|TXT)$/.test(f))
      : []
  });
});

// ── Yearly summary ─────────────────────────────────────────────────────────────
app.get('/api/summary/:year', (req, res) => {
  const transactions = getTransactions();
  const year = req.params.year;
  const summary = buildYearlySummary(transactions, year);
  res.json(summary);
});

// ── Available years ────────────────────────────────────────────────────────────
app.get('/api/years', (req, res) => {
  const transactions = getTransactions();
  const years = getAvailableYears(transactions);
  res.json({ years });
});

// ── Monthly detail ─────────────────────────────────────────────────────────────
app.get('/api/months/:yearMonth', (req, res) => {
  const transactions = getTransactions();
  const { yearMonth } = req.params;
  if (!/^\d{4}-\d{2}$/.test(yearMonth)) {
    return res.status(400).json({ error: 'yearMonth must be in YYYY-MM format' });
  }
  const detail = buildMonthlyDetail(transactions, yearMonth);
  res.json(detail);
});

// ── All transactions (with optional filters) ───────────────────────────────────
app.get('/api/transactions', (req, res) => {
  let transactions = getTransactions();
  const { year, month, category, includeInternal, search } = req.query;

  if (year) transactions = transactions.filter(t => t.year === year);
  if (month) transactions = transactions.filter(t => t.month === month);
  if (category) transactions = transactions.filter(t => t.category === category);
  if (includeInternal !== 'true') transactions = transactions.filter(t => !t.isInternal);
  if (search) {
    const q = search.toLowerCase();
    transactions = transactions.filter(t =>
      t.description?.toLowerCase().includes(q) ||
      t.counterpartyName?.toLowerCase().includes(q)
    );
  }

  // Apply overrides
  const overrides = getAllOverrides();
  const overrideMap = Object.fromEntries(overrides.map(o => [o.transactionId, o]));
  transactions = transactions.map(t => {
    const ov = overrideMap[t.id];
    if (ov) {
      return { ...t, category: ov.category || t.category, notes: ov.notes, hasOverride: true };
    }
    return t;
  });

  res.json({ data: transactions, total: transactions.length });
});

// ── Internal transfers ─────────────────────────────────────────────────────────
app.get('/api/transfers', (req, res) => {
  const transactions = getTransactions();
  const transfers = getInternalTransfers(transactions);
  const { year } = req.query;
  const filtered = year ? transfers.filter(t => t.year === year) : transfers;
  res.json({ data: filtered });
});

// ── Override category for a transaction ───────────────────────────────────────
app.put('/api/transactions/:id/category', (req, res) => {
  const { id } = req.params;
  const { category, notes } = req.body || {};
  setOverride(id, category, notes);
  res.json({ success: true });
});

// ── Upload CSV file ────────────────────────────────────────────────────────────
app.post('/api/upload', (req, res) => {
  const { filename, content } = req.body || {};
  if (!content) return res.status(400).json({ error: 'content is required' });

  // Save to input directory
  const safeName = (filename || 'upload.csv').replace(/[^a-zA-Z0-9._\-]/g, '_');
  const targetPath = path.join(INPUT_DIR, safeName);
  fs.writeFileSync(targetPath, content, 'utf-8');

  // Parse for preview
  const transactions = processUploadedCsv(content, safeName);
  res.json({
    saved: true,
    path: targetPath,
    parsed: transactions.length,
    preview: transactions.slice(0, 5)
  });
});

// ── Categories API ─────────────────────────────────────────────────────────────
app.get('/api/categories', (req, res) => {
  const categories = loadCategories();
  res.json({ data: categories });
});

app.put('/api/categories', (req, res) => {
  const { categories } = req.body || {};
  if (!Array.isArray(categories)) return res.status(400).json({ error: 'categories must be an array' });
  saveCategories(categories);
  reloadCategories();
  res.json({ success: true, count: categories.length });
});

app.get('/api/categories/suggestions', (req, res) => {
  const transactions = getTransactions();
  const suggestions = generateMappingSuggestions(transactions);
  res.json({ data: suggestions });
});

// ── IBAN config API ────────────────────────────────────────────────────────────
app.get('/api/ibans', (req, res) => {
  const config = loadIbans();
  res.json(config);
});

app.put('/api/ibans', (req, res) => {
  const { ibans, labels } = req.body || {};
  if (!Array.isArray(ibans)) return res.status(400).json({ error: 'ibans must be an array' });
  saveIbans({ ibans, labels: labels || {} });
  reloadIbans();
  res.json({ success: true });
});

// ── Accounts API ───────────────────────────────────────────────────────────────
app.get('/api/accounts', (req, res) => {
  const accounts = getAllAccounts();
  res.json({ data: accounts });
});

app.post('/api/accounts', (req, res) => {
  const { id, name, type, iban, startBalance, currency, color } = req.body || {};
  if (!id || !name) return res.status(400).json({ error: 'id and name are required' });
  const account = upsertAccount({ id, name, type, iban, startBalance, currency, color });
  res.status(201).json({ data: account });
});

app.put('/api/accounts/:id', (req, res) => {
  const { name, type, iban, startBalance, currency, color, sortOrder } = req.body || {};
  const account = upsertAccount({ id: req.params.id, name, type, iban, startBalance, currency, color, sortOrder });
  res.json({ data: account });
});

app.delete('/api/accounts/:id', (req, res) => {
  deleteAccount(req.params.id);
  res.json({ success: true });
});

// ── Account snapshots (controle tab) ──────────────────────────────────────────
app.get('/api/accounts/:id/snapshots', (req, res) => {
  const snapshots = getSnapshotsForAccount(req.params.id, 24);
  res.json({ data: snapshots });
});

app.post('/api/accounts/:id/snapshots', (req, res) => {
  const { date, value, notes } = req.body || {};
  if (!date || value === undefined) return res.status(400).json({ error: 'date and value are required' });
  const snapshot = upsertSnapshot(req.params.id, date, Number(value), notes);
  res.status(201).json({ data: snapshot });
});

app.delete('/api/snapshots/:id', (req, res) => {
  deleteSnapshot(Number(req.params.id));
  res.json({ success: true });
});

// ── Controle view ──────────────────────────────────────────────────────────────
app.get('/api/controle', (req, res) => {
  const transactions = getTransactions();
  const controle = buildControleView(transactions);
  res.json({ data: controle });
});

// ── Net worth over time ────────────────────────────────────────────────────────
app.get('/api/networth', (req, res) => {
  const accounts = getAllAccounts();
  const transactions = getTransactions();

  // For each account, gather all snapshots
  const db = require('./db');
  const allSnapshots = db.prepare(`
    SELECT account_id AS accountId, date, value
    FROM account_snapshots
    ORDER BY date ASC
  `).all();

  // Build net worth timeline from snapshots
  const byDate = {};
  const accountNames = Object.fromEntries(accounts.map(a => [a.id, a.name]));

  for (const snap of allSnapshots) {
    if (!byDate[snap.date]) byDate[snap.date] = {};
    byDate[snap.date][snap.accountId] = snap.value;
  }

  // Fill in calculated balances for checking accounts
  const checkingAccounts = accounts.filter(a => a.type === 'checking' && a.iban);
  const dates = Object.keys(byDate).sort();

  // Carry forward values for missing dates
  const timeline = [];
  const lastValues = {};
  for (const d of dates) {
    Object.assign(lastValues, byDate[d]);
    const total = Object.values(lastValues).reduce((s, v) => s + v, 0);
    timeline.push({
      date: d,
      total,
      breakdown: { ...lastValues }
    });
  }

  res.json({ data: timeline, accountNames });
});

// ── Serve frontend ─────────────────────────────────────────────────────────────
if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
    }
  });
}

app.listen(PORT, () => {
  console.log(`Money Monitor running on http://localhost:${PORT}`);
  console.log(`Input directory: ${INPUT_DIR}`);
  console.log(`Drop CSV transaction files into the input/ folder to get started.`);
});
