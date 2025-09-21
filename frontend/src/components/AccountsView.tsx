import { useEffect, useState } from 'react';
import type { Account } from '../types';
import { createAccount, updateAccount } from '../api';
import { formatCurrency } from '../utils/format';

const ACCOUNT_TYPES = ['checking', 'savings', 'brokerage', 'investment', 'retirement', 'cash', 'debt', 'other'];

interface AccountsViewProps {
  accounts: Account[];
  onAccountCreated: (account: Account) => void;
  onAccountUpdated: (account: Account) => void;
}

const AccountRow = ({ account, onAccountUpdated }: { account: Account; onAccountUpdated: (account: Account) => void }) => {
  const [startBalance, setStartBalance] = useState<string>(account.startBalance.toString());
  const [targetAllocation, setTargetAllocation] = useState<string>(account.targetAllocation?.toString() ?? '');
  const [type, setType] = useState<string>(account.type);
  const [notes, setNotes] = useState<string>(account.notes ?? '');
  const [updating, setUpdating] = useState<boolean>(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setStartBalance(account.startBalance.toString());
    setTargetAllocation(account.targetAllocation?.toString() ?? '');
    setType(account.type);
    setNotes(account.notes ?? '');
  }, [account.startBalance, account.targetAllocation, account.type, account.notes, account.id]);

  const handleUpdate = async () => {
    setUpdating(true);
    setStatus(null);
    setError(null);

    try {
      const updated = await updateAccount(account.id, {
        startBalance: startBalance !== '' ? Number(startBalance) : undefined,
        targetAllocation: targetAllocation === '' ? null : Number(targetAllocation),
        type,
        notes
      });
      onAccountUpdated(updated);
      setStatus('Saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update account');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <tr>
      <td>
        <div style={{ fontWeight: 600 }}>{account.name}</div>
        <div style={{ fontSize: '0.85rem', color: '#475569' }}>{account.type.toUpperCase()}</div>
      </td>
      <td>{formatCurrency(account.currentBalance)}</td>
      <td>
        <input
          type="number"
          value={startBalance}
          onChange={(event) => setStartBalance(event.target.value)}
          style={{ width: '100%' }}
        />
      </td>
      <td>
        <input
          type="number"
          value={targetAllocation}
          onChange={(event) => setTargetAllocation(event.target.value)}
          placeholder="Optional"
          style={{ width: '100%' }}
        />
      </td>
      <td>
        <select value={type} onChange={(event) => setType(event.target.value)} style={{ width: '100%' }}>
          {ACCOUNT_TYPES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </td>
      <td>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={2}
          placeholder="Notes"
          style={{ width: '100%', resize: 'vertical' }}
        />
      </td>
      <td>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <button className="secondary-button" onClick={handleUpdate} disabled={updating}>
            {updating ? 'Saving…' : 'Save'}
          </button>
          {status && <span style={{ fontSize: '0.8rem', color: '#047857' }}>{status}</span>}
          {error && <span style={{ fontSize: '0.8rem', color: '#b91c1c' }}>{error}</span>}
        </div>
      </td>
    </tr>
  );
};

const AccountsView = ({ accounts, onAccountCreated, onAccountUpdated }: AccountsViewProps) => {
  const [formState, setFormState] = useState({
    name: '',
    type: 'checking',
    startBalance: '',
    targetAllocation: '',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const payload = {
        name: formState.name,
        type: formState.type,
        startBalance: formState.startBalance ? Number(formState.startBalance) : 0,
        targetAllocation: formState.targetAllocation ? Number(formState.targetAllocation) : null,
        notes: formState.notes || null
      };
      const account = await createAccount(payload);
      onAccountCreated(account);
      setMessage('Account created');
      setFormState({ name: '', type: 'checking', startBalance: '', targetAllocation: '', notes: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h2>Accounts</h2>
      <p style={{ color: '#475569' }}>
        Track starting balances and target allocations for every account you manage. Update a row to adjust the live balances.
      </p>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Account</th>
              <th>Current Balance</th>
              <th>Starting Balance</th>
              <th>Target Allocation</th>
              <th>Type</th>
              <th>Notes</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {accounts.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '1.5rem' }}>
                  Add an account to get started.
                </td>
              </tr>
            )}
            {accounts.map((account) => (
              <AccountRow key={account.id} account={account} onAccountUpdated={onAccountUpdated} />
            ))}
          </tbody>
        </table>
      </div>

      <form className="form-section" onSubmit={handleSubmit}>
        <h3 style={{ marginTop: 0 }}>Add a new account</h3>
        <div className="form-row">
          <label>
            Name
            <input
              required
              value={formState.name}
              onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
            />
          </label>
          <label>
            Type
            <select
              value={formState.type}
              onChange={(event) => setFormState((prev) => ({ ...prev, type: event.target.value }))}
            >
              {ACCOUNT_TYPES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="form-row">
          <label>
            Starting Balance
            <input
              type="number"
              value={formState.startBalance}
              onChange={(event) => setFormState((prev) => ({ ...prev, startBalance: event.target.value }))}
            />
          </label>
          <label>
            Target Allocation
            <input
              type="number"
              value={formState.targetAllocation}
              placeholder="Optional"
              onChange={(event) => setFormState((prev) => ({ ...prev, targetAllocation: event.target.value }))}
            />
          </label>
        </div>
        <div className="form-row">
          <label>
            Notes
            <textarea
              rows={3}
              value={formState.notes}
              onChange={(event) => setFormState((prev) => ({ ...prev, notes: event.target.value }))}
            />
          </label>
        </div>
        <button className="primary-button" type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : 'Create account'}
        </button>
        {message && <div className="status-banner">{message}</div>}
        {error && <div className="status-banner error-banner">{error}</div>}
      </form>
    </div>
  );
};

export default AccountsView;
