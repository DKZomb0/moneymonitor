const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');

const db = require('./db');
const initializeDatabase = require('./dbInit');
const { parseTransactionsCsv } = require('./utils/csv');
const accountService = require('./services/accountService');
const { getOverview } = require('./services/summaryService');
const investmentService = require('./services/investmentService');
const reconciliationService = require('./services/reconciliationService');

initializeDatabase();

const app = express();
const PORT = process.env.PORT || 4000;
const ALLOWED_ACCOUNT_TYPES = ['checking', 'savings', 'brokerage', 'investment', 'retirement', 'cash', 'debt', 'other'];

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/accounts', (req, res) => {
  const accounts = accountService.listAccounts();
  res.json({ data: accounts });
});

app.post('/api/accounts', (req, res) => {
  const { name, type, startBalance = 0, targetAllocation = null, notes = null } = req.body || {};
  if (!name || !type) {
    return res.status(400).json({ error: 'Name and type are required' });
  }

  if (!ALLOWED_ACCOUNT_TYPES.includes(type.toLowerCase())) {
    return res.status(400).json({ error: `Type must be one of: ${ALLOWED_ACCOUNT_TYPES.join(', ')}` });
  }

  const startValue = Number(startBalance);
  const parsedStartBalance = Number.isFinite(startValue) ? startValue : 0;
  const targetValue =
    targetAllocation === null || targetAllocation === undefined || targetAllocation === ''
      ? null
      : Number(targetAllocation);
  const parsedTargetAllocation = targetValue === null || Number.isNaN(targetValue) ? null : targetValue;

  const account = accountService.createAccount({
    name,
    type: type.toLowerCase(),
    startBalance: parsedStartBalance,
    targetAllocation: parsedTargetAllocation,
    notes
  });
  res.status(201).json({ data: account });
});

app.put('/api/accounts/:id', (req, res) => {
  const id = Number(req.params.id);
  const { name, type, startBalance, targetAllocation, notes } = req.body || {};

  if (type && !ALLOWED_ACCOUNT_TYPES.includes(type.toLowerCase())) {
    return res.status(400).json({ error: `Type must be one of: ${ALLOWED_ACCOUNT_TYPES.join(', ')}` });
  }

  const account = accountService.updateAccount(id, {
    name,
    type: type ? type.toLowerCase() : undefined,
    startBalance: startBalance !== undefined ? Number(startBalance) : undefined,
    targetAllocation: targetAllocation !== undefined ? (targetAllocation === null ? null : Number(targetAllocation)) : undefined,
    notes
  });

  if (!account) {
    return res.status(404).json({ error: 'Account not found' });
  }

  res.json({ data: account });
});

app.get('/api/categories', (req, res) => {
  const categories = db
    .prepare('SELECT id, name, type, created_at AS createdAt, updated_at AS updatedAt FROM categories ORDER BY name ASC')
    .all();
  res.json({ data: categories });
});

app.post('/api/categories', (req, res) => {
  const { name, type = 'expense' } = req.body || {};
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }
  const insert = db.prepare('INSERT OR IGNORE INTO categories (name, type) VALUES (?, ?)');
  insert.run(name, type);
  const category = db
    .prepare('SELECT id, name, type, created_at AS createdAt, updated_at AS updatedAt FROM categories WHERE name = ?')
    .get(name);
  res.status(201).json({ data: category });
});

app.get('/api/summary/overview', (req, res) => {
  const { year } = req.query;
  const summary = getOverview(year);
  res.json(summary);
});

app.post('/api/import/transactions', (req, res) => {
  const { accountId, csvText, delimiter = ',', mapping, dateFormat } = req.body || {};

  if (!accountId || !csvText) {
    return res.status(400).json({ error: 'accountId and csvText are required' });
  }

  const account = accountService.getAccountById(Number(accountId));
  if (!account) {
    return res.status(404).json({ error: 'Account not found' });
  }

  let parsedRecords;
  try {
    parsedRecords = parseTransactionsCsv(csvText, { delimiter, mapping, dateFormat });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  const insertTransaction = db.prepare(
    `INSERT INTO transactions (account_id, category_id, date, description, amount, external_id, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  const findCategory = db.prepare('SELECT id FROM categories WHERE lower(name) = lower(?)');
  const insertCategory = db.prepare('INSERT OR IGNORE INTO categories (name, type) VALUES (?, ?)');

  const result = db.transaction(() => {
    let inserted = 0;
    let skipped = 0;

    parsedRecords.forEach((record) => {
      if (!record.date || Number.isNaN(record.amount)) {
        skipped += 1;
        return;
      }

      let categoryId = null;
      if (record.categoryName) {
        const existing = findCategory.get(record.categoryName);
        if (existing) {
          categoryId = existing.id;
        } else {
          const info = insertCategory.run(record.categoryName, 'expense');
          categoryId = info.lastInsertRowid || findCategory.get(record.categoryName)?.id || null;
        }
      }

      try {
        insertTransaction.run(
          account.id,
          categoryId,
          record.date,
          record.description,
          record.amount,
          record.externalId,
          record.notes
        );
        inserted += 1;
      } catch (error) {
        skipped += 1;
      }
    });

    return { inserted, skipped };
  })();

  res.status(201).json({
    data: {
      inserted: result.inserted,
      skipped: result.skipped,
      total: parsedRecords.length
    }
  });
});

app.get('/api/investments', (req, res) => {
  const { accountId } = req.query;
  const investments = investmentService.listInvestments({ accountId: accountId ? Number(accountId) : undefined });
  const summary = investmentService.getInvestmentSummary();
  res.json({ data: investments, summary });
});

app.post('/api/investments', (req, res) => {
  const { accountId, symbol, quantity, price, value, date, notes } = req.body || {};
  if (!accountId || !date) {
    return res.status(400).json({ error: 'accountId and date are required' });
  }
  const account = accountService.getAccountById(Number(accountId));
  if (!account) {
    return res.status(404).json({ error: 'Account not found' });
  }

  const investment = investmentService.createInvestment({
    accountId: Number(accountId),
    symbol,
    quantity: quantity !== undefined ? Number(quantity) : null,
    price: price !== undefined ? Number(price) : null,
    value: value !== undefined ? Number(value) : null,
    date,
    notes
  });

  res.status(201).json({ data: investment });
});

app.post('/api/reconciliations', (req, res) => {
  const { recordedAt = null, notes = null, snapshots = [] } = req.body || {};
  try {
    const reconciliation = reconciliationService.createReconciliation({
      recordedAt,
      notes,
      snapshots: Array.isArray(snapshots)
        ? snapshots.map((snapshot) => ({
            accountId: Number(snapshot.accountId),
            actualBalance: Number(snapshot.actualBalance)
          }))
        : []
    });
    res.status(201).json({ data: reconciliation });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/reconciliations/latest', (req, res) => {
  const reconciliation = reconciliationService.getLatestReconciliation();
  if (!reconciliation) {
    return res.json({ data: null });
  }
  res.json({ data: reconciliation });
});

const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Money Monitor API listening on port ${PORT}`);
});
