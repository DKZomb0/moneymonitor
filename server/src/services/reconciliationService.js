const db = require('../db');
const {
  getExpectedBalance,
  summarizeAllExpectedBalances
} = require('./accountService');

function createReconciliation({ recordedAt = null, notes = null, snapshots = [] }) {
  if (!Array.isArray(snapshots) || snapshots.length === 0) {
    throw new Error('At least one account snapshot is required');
  }

  const expectedBalances = summarizeAllExpectedBalances();
  const expectedMap = new Map();
  expectedBalances.forEach((item) => {
    expectedMap.set(item.id, item.expectedBalance);
  });

  let actualNetWorth = 0;
  let expectedNetWorth = 0;

  const create = db.prepare(
    `INSERT INTO reconciliations (recorded_at, notes, recommended_checking_balance, expected_net_worth, actual_net_worth, difference)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  const insertItem = db.prepare(
    `INSERT INTO reconciliation_items (reconciliation_id, account_id, expected_balance, actual_balance, difference)
     VALUES (?, ?, ?, ?, ?)`
  );

  const result = db.transaction(() => {
    const totalsByAccount = snapshots.map((snapshot) => {
      const accountId = Number(snapshot.accountId);
      if (!Number.isFinite(accountId)) {
        throw new Error('Each snapshot must include a valid accountId');
      }

      let expected = expectedMap.get(accountId);
      if (expected == null) {
        const computed = getExpectedBalance(accountId);
        if (computed == null) {
          throw new Error('Snapshot references an unknown account');
        }
        expected = computed;
      }

      const actual = Number(snapshot.actualBalance) || 0;
      const difference = actual - expected;
      expectedNetWorth += expected;
      actualNetWorth += actual;
      return { accountId, expected, actual, difference };
    });

    const netDifference = actualNetWorth - expectedNetWorth;

    const checkingAccounts = expectedBalances.filter((account) =>
      (account.type || '').toLowerCase().includes('check')
    );
    const checkingAccountId = checkingAccounts.length > 0 ? checkingAccounts[0].id : null;

    const recommendedCheckingBalance = (() => {
      if (!checkingAccountId) {
        return null;
      }
      const sumOtherAccounts = totalsByAccount
        .filter((item) => item.accountId !== checkingAccountId)
        .reduce((acc, item) => acc + item.actual, 0);
      return expectedNetWorth - sumOtherAccounts;
    })();

    const reconciliationInfo = create.run(
      recordedAt,
      notes,
      recommendedCheckingBalance,
      expectedNetWorth,
      actualNetWorth,
      netDifference
    );
    const reconciliationId = reconciliationInfo.lastInsertRowid;

    totalsByAccount.forEach((item) => {
      insertItem.run(reconciliationId, item.accountId, item.expected, item.actual, item.difference);
    });

    return getReconciliationById(reconciliationId);
  })();

  return result;
}

function getReconciliationById(id) {
  const reconciliation = db
    .prepare(
      `SELECT id, recorded_at AS recordedAt, notes, recommended_checking_balance AS recommendedCheckingBalance,
              expected_net_worth AS expectedNetWorth, actual_net_worth AS actualNetWorth, difference
       FROM reconciliations
       WHERE id = ?`
    )
    .get(id);

  if (!reconciliation) {
    return null;
  }

  const items = db
    .prepare(
      `SELECT
          ri.account_id AS accountId,
          a.name AS accountName,
          a.type AS accountType,
          ri.expected_balance AS expectedBalance,
          ri.actual_balance AS actualBalance,
          ri.difference
        FROM reconciliation_items ri
        INNER JOIN accounts a ON a.id = ri.account_id
        WHERE ri.reconciliation_id = ?`
    )
    .all(id);

  return {
    ...reconciliation,
    items
  };
}

function getLatestReconciliation() {
  const latest = db
    .prepare('SELECT id FROM reconciliations ORDER BY recorded_at DESC, id DESC LIMIT 1')
    .get();
  if (!latest) {
    return null;
  }
  return getReconciliationById(latest.id);
}

module.exports = {
  createReconciliation,
  getReconciliationById,
  getLatestReconciliation
};
