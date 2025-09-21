import { useEffect, useState } from 'react';
import type { Account, ReconciliationRecord } from '../types';
import { createReconciliation } from '../api';
import { formatCurrency, formatDate } from '../utils/format';

interface ReconciliationViewProps {
  accounts: Account[];
  latestReconciliation: ReconciliationRecord | null;
  onReconciled: (record: ReconciliationRecord) => void;
}

const today = () => new Date().toISOString().slice(0, 10);

const ReconciliationView = ({ accounts, latestReconciliation, onReconciled }: ReconciliationViewProps) => {
  const [recordedAt, setRecordedAt] = useState<string>(today());
  const [notes, setNotes] = useState('');
  const [actualBalances, setActualBalances] = useState<Record<number, string>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const defaults: Record<number, string> = {};
    accounts.forEach((account) => {
      defaults[account.id] = account.currentBalance.toFixed(2);
    });
    setActualBalances(defaults);
  }, [accounts]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus(null);
    setError(null);

    try {
      const snapshots = accounts.map((account) => ({
        accountId: account.id,
        actualBalance: Number(actualBalances[account.id] ?? account.currentBalance)
      }));

      const reconciliation = await createReconciliation({
        recordedAt,
        notes,
        snapshots
      });
      setStatus('Reconciliation saved');
      onReconciled(reconciliation);
      setNotes('');
      setRecordedAt(today());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reconcile');
    }
  };

  return (
    <div>
      <h2>Reconciliation</h2>
      <p style={{ color: '#475569' }}>
        Enter the real-world balances for each account to validate that your Money Monitor ledger matches reality. We will compute
        the expected checking account balance required to balance the books.
      </p>

      <form className="form-section" onSubmit={handleSubmit}>
        <div className="form-row">
          <label>
            Reconciliation date
            <input type="date" value={recordedAt} onChange={(event) => setRecordedAt(event.target.value)} />
          </label>
          <label>
            Notes
            <textarea rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional" />
          </label>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Account</th>
                <th>Expected balance</th>
                <th>Actual balance</th>
              </tr>
            </thead>
            <tbody>
              {accounts.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', padding: '1.5rem' }}>
                    Create accounts first to run a reconciliation.
                  </td>
                </tr>
              ) : (
                accounts.map((account) => (
                  <tr key={account.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{account.name}</div>
                      <div style={{ fontSize: '0.85rem', color: '#475569' }}>
                        Target: {account.targetAllocation != null ? formatCurrency(account.targetAllocation) : '—'}
                      </div>
                    </td>
                    <td>{formatCurrency(account.currentBalance)}</td>
                    <td>
                      <input
                        type="number"
                        step="any"
                        value={actualBalances[account.id] ?? ''}
                        onChange={(event) =>
                          setActualBalances((prev) => ({
                            ...prev,
                            [account.id]: event.target.value
                          }))
                        }
                        style={{ width: '100%' }}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <button className="primary-button" type="submit" disabled={accounts.length === 0}>
          Save reconciliation
        </button>
        {status && <div className="status-banner">{status}</div>}
        {error && <div className="status-banner error-banner">{error}</div>}
      </form>

      {latestReconciliation && (
        <div className="form-section">
          <h3 style={{ marginTop: 0 }}>Latest reconciliation</h3>
          <p style={{ marginTop: 0, color: '#475569' }}>
            Recorded on {formatDate(latestReconciliation.recordedAt)} · Net difference:{' '}
            <strong>{formatCurrency(latestReconciliation.difference)}</strong>
          </p>
          {latestReconciliation.recommendedCheckingBalance != null ? (
            <p style={{ margin: '0.5rem 0 0' }}>
              Recommended checking balance: <strong>{formatCurrency(latestReconciliation.recommendedCheckingBalance)}</strong>
            </p>
          ) : (
            <p style={{ margin: '0.5rem 0 0' }}>No checking account found—set an account type that includes “checking”.</p>
          )}
          <div className="table-container" style={{ marginTop: '1rem' }}>
            <table>
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Expected</th>
                  <th>Actual</th>
                  <th>Difference</th>
                </tr>
              </thead>
              <tbody>
                {latestReconciliation.items.map((item) => (
                  <tr key={item.accountId}>
                    <td>{item.accountName}</td>
                    <td>{formatCurrency(item.expectedBalance)}</td>
                    <td>{formatCurrency(item.actualBalance)}</td>
                    <td style={{ color: item.difference >= 0 ? '#047857' : '#b91c1c' }}>{formatCurrency(item.difference)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReconciliationView;
