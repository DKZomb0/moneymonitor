import { useEffect, useMemo, useState } from 'react';
import type { Account, InvestmentRecord, InvestmentSummary } from '../types';
import { createInvestment, getInvestments } from '../api';
import { formatCurrency, formatDate } from '../utils/format';

interface InvestmentsViewProps {
  accounts: Account[];
}

const today = () => new Date().toISOString().slice(0, 10);

const InvestmentsView = ({ accounts }: InvestmentsViewProps) => {
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [investments, setInvestments] = useState<InvestmentRecord[]>([]);
  const [summary, setSummary] = useState<InvestmentSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [form, setForm] = useState({
    accountId: '',
    symbol: '',
    quantity: '',
    price: '',
    value: '',
    date: today(),
    notes: ''
  });

  const accountOptions = useMemo(() => accounts.map((account) => ({ value: account.id.toString(), label: `${account.name} (${account.type})` })), [accounts]);

  const fetchInvestments = async (accountId?: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await getInvestments(accountId);
      setInvestments(response.data);
      setSummary(response.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load investments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestments(selectedAccountId ? Number(selectedAccountId) : undefined);
  }, [selectedAccountId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus(null);
    setError(null);

    const accountId = form.accountId || selectedAccountId;
    if (!accountId) {
      setError('Select an account for the investment.');
      return;
    }

    try {
      await createInvestment({
        accountId: Number(accountId),
        symbol: form.symbol || undefined,
        quantity: form.quantity ? Number(form.quantity) : undefined,
        price: form.price ? Number(form.price) : undefined,
        value: form.value ? Number(form.value) : undefined,
        date: form.date,
        notes: form.notes || undefined
      });
      setStatus('Investment saved');
      setForm({ accountId: '', symbol: '', quantity: '', price: '', value: '', date: today(), notes: '' });
      await fetchInvestments(selectedAccountId ? Number(selectedAccountId) : undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save investment');
    }
  };

  return (
    <div>
      <h2>Investments</h2>
      <p style={{ color: '#475569' }}>
        Maintain a manual ledger of investment positions and valuations across your brokerage and retirement accounts.
      </p>

      <div className="form-section">
        <div className="form-row">
          <label>
            Filter by account
            <select value={selectedAccountId} onChange={(event) => setSelectedAccountId(event.target.value)}>
              <option value="">All accounts</option>
              {accountOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {summary && (
          <div className="card-grid" style={{ marginTop: '1rem' }}>
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Total tracked value</h3>
              <p style={{ fontSize: '1.75rem', margin: '0.5rem 0 0' }}>{formatCurrency(summary.totalValue ?? 0)}</p>
            </div>
            <div className="card" style={{ gridColumn: 'span 2' }}>
              <h3 style={{ marginTop: 0 }}>By account</h3>
              {summary.accounts.length === 0 ? (
                <p style={{ margin: 0 }}>No investment entries yet.</p>
              ) : (
                <ul style={{ margin: 0, paddingLeft: '1.25rem', columns: 2 }}>
                  {summary.accounts.map((item) => (
                    <li key={item.accountId}>
                      {item.accountName}: {formatCurrency(item.totalValue ?? 0)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Account</th>
              <th>Symbol</th>
              <th>Quantity</th>
              <th>Price</th>
              <th>Value</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '1.5rem' }}>
                  Loading investments…
                </td>
              </tr>
            ) : investments.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '1.5rem' }}>
                  No investments tracked yet.
                </td>
              </tr>
            ) : (
              investments.map((investment) => (
                <tr key={investment.id}>
                  <td>{formatDate(investment.date)}</td>
                  <td>{investment.accountName}</td>
                  <td>{investment.symbol ?? '—'}</td>
                  <td>{investment.quantity ?? '—'}</td>
                  <td>{investment.price != null ? formatCurrency(investment.price) : '—'}</td>
                  <td>{investment.value != null ? formatCurrency(investment.value) : '—'}</td>
                  <td>{investment.notes ?? '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <form className="form-section" onSubmit={handleSubmit}>
        <h3 style={{ marginTop: 0 }}>Add investment entry</h3>
        <div className="form-row">
          <label>
            Account
            <select value={form.accountId} onChange={(event) => setForm((prev) => ({ ...prev, accountId: event.target.value }))}>
              <option value="">{selectedAccountId ? 'Use selected' : 'Choose account'}</option>
              {accountOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Date
            <input value={form.date} type="date" onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))} />
          </label>
          <label>
            Symbol / asset name
            <input value={form.symbol} onChange={(event) => setForm((prev) => ({ ...prev, symbol: event.target.value }))} />
          </label>
        </div>
        <div className="form-row">
          <label>
            Quantity
            <input
              type="number"
              step="any"
              value={form.quantity}
              onChange={(event) => setForm((prev) => ({ ...prev, quantity: event.target.value }))}
            />
          </label>
          <label>
            Price
            <input type="number" step="any" value={form.price} onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))} />
          </label>
          <label>
            Value (override)
            <input
              type="number"
              step="any"
              value={form.value}
              onChange={(event) => setForm((prev) => ({ ...prev, value: event.target.value }))}
              placeholder="Optional"
            />
          </label>
        </div>
        <div className="form-row">
          <label>
            Notes
            <textarea rows={3} value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} />
          </label>
        </div>
        <button className="primary-button" type="submit">
          Save entry
        </button>
        {status && <div className="status-banner">{status}</div>}
        {error && <div className="status-banner error-banner">{error}</div>}
      </form>
    </div>
  );
};

export default InvestmentsView;
