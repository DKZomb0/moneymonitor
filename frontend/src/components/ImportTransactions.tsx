import { useEffect, useState } from 'react';
import type { Account, Category } from '../types';
import { getCategories, importTransactions } from '../api';

interface ImportTransactionsProps {
  accounts: Account[];
  onImportComplete: () => void;
}

const ImportTransactions = ({ accounts, onImportComplete }: ImportTransactionsProps) => {
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [csvText, setCsvText] = useState('');
  const [delimiter, setDelimiter] = useState(',');
  const [dateFormat, setDateFormat] = useState('yyyy-MM-dd');
  const [mapping, setMapping] = useState({
    date: 'Date',
    amount: 'Amount',
    description: 'Description',
    category: 'Category',
    externalId: 'Id'
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  const handleImport = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedAccountId) {
      setError('Select an account to import into.');
      return;
    }
    if (!csvText.trim()) {
      setError('Paste the CSV file contents before importing.');
      return;
    }

    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const response = await importTransactions({
        accountId: Number(selectedAccountId),
        csvText,
        delimiter,
        dateFormat,
        mapping
      });
      setMessage(`Imported ${response.data.inserted} rows (${response.data.skipped} skipped).`);
      setCsvText('');
      onImportComplete();
      const refreshedCategories = await getCategories();
      setCategories(refreshedCategories);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Import Transactions</h2>
      <p style={{ color: '#475569' }}>
        Paste raw CSV data exported from your bank. Map the column names so the importer knows how to process the rows.
      </p>

      <form className="form-section" onSubmit={handleImport}>
        <div className="form-row">
          <label>
            Account
            <select value={selectedAccountId} onChange={(event) => setSelectedAccountId(event.target.value)} required>
              <option value="">Select account</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.type})
                </option>
              ))}
            </select>
          </label>
          <label>
            Delimiter
            <input value={delimiter} onChange={(event) => setDelimiter(event.target.value)} maxLength={1} />
          </label>
          <label>
            Date format
            <input value={dateFormat} onChange={(event) => setDateFormat(event.target.value)} placeholder="yyyy-MM-dd" />
          </label>
        </div>

        <div className="form-row">
          <label>
            Date column name
            <input
              value={mapping.date}
              onChange={(event) => setMapping((prev) => ({ ...prev, date: event.target.value }))}
              required
            />
          </label>
          <label>
            Amount column name
            <input
              value={mapping.amount}
              onChange={(event) => setMapping((prev) => ({ ...prev, amount: event.target.value }))}
              required
            />
          </label>
          <label>
            Description column name
            <input
              value={mapping.description}
              onChange={(event) => setMapping((prev) => ({ ...prev, description: event.target.value }))}
            />
          </label>
        </div>

        <div className="form-row">
          <label>
            Category column name
            <input
              value={mapping.category}
              onChange={(event) => setMapping((prev) => ({ ...prev, category: event.target.value }))}
            />
          </label>
          <label>
            External ID column name
            <input
              value={mapping.externalId}
              onChange={(event) => setMapping((prev) => ({ ...prev, externalId: event.target.value }))}
              placeholder="Optional"
            />
          </label>
        </div>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          CSV content
          <textarea
            value={csvText}
            onChange={(event) => setCsvText(event.target.value)}
            rows={12}
            placeholder="Date,Amount,Description,Category\n2023-01-01,-52.21,Grocery Store,Groceries"
            style={{ width: '100%', resize: 'vertical' }}
          />
        </label>

        <button className="primary-button" type="submit" disabled={loading}>
          {loading ? 'Importing…' : 'Import transactions'}
        </button>

        {message && <div className="status-banner">{message}</div>}
        {error && <div className="status-banner error-banner">{error}</div>}
      </form>

      <div className="form-section">
        <h3 style={{ marginTop: 0 }}>Known categories</h3>
        {categories.length === 0 ? (
          <p style={{ margin: 0 }}>No categories yet—import data or create categories to see them listed.</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.35rem' }}>
            {categories.map((category) => (
              <li key={category.id} style={{ listStyle: 'disc' }}>
                {category.name} · <span style={{ color: '#475569' }}>{category.type}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ImportTransactions;
