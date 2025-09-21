import { useMemo } from 'react';
import type { OverviewSummary, SummaryRow } from '../types';
import { formatCurrency, formatDate } from '../utils/format';

interface DashboardProps {
  summary: OverviewSummary | null;
  selectedYear?: string;
  onYearChange: (year?: string) => void;
  loading: boolean;
  onRefresh: () => void;
}

function aggregateTotals(rows: SummaryRow[]): { income: number; expenses: number; net: number } {
  return rows.reduce(
    (acc, row) => ({
      income: acc.income + row.income,
      expenses: acc.expenses + row.expenses,
      net: acc.net + row.net
    }),
    { income: 0, expenses: 0, net: 0 }
  );
}

const Dashboard = ({ summary, selectedYear, onYearChange, loading, onRefresh }: DashboardProps) => {
  const years = useMemo(() => summary?.totalsByYear.map((row) => row.year ?? '').filter(Boolean) ?? [], [summary]);

  const selectedYearTotals = useMemo(() => {
    if (!summary || !selectedYear) {
      return null;
    }
    const row = summary.totalsByYear.find((item) => item.year === selectedYear);
    return row ?? null;
  }, [summary, selectedYear]);

  const lifetimeTotals = useMemo(() => {
    if (!summary) {
      return { income: 0, expenses: 0, net: 0 };
    }
    return aggregateTotals(summary.totalsByYear);
  }, [summary]);

  const categoryTotals = summary?.totalsByCategory ?? [];
  const monthlyTotals = summary?.totalsByMonth ?? [];
  const recentTransactions = summary?.recentTransactions ?? [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h2>Spending Overview</h2>
          <p style={{ margin: 0, color: '#475569' }}>
            {selectedYear ? `Detailed performance for ${selectedYear}` : 'Aggregated view across all years'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <label style={{ display: 'flex', flexDirection: 'column', fontSize: '0.85rem', color: '#475569' }}>
            Filter by year
            <select
              value={selectedYear ?? ''}
              onChange={(event) => onYearChange(event.target.value || undefined)}
              style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff' }}
            >
              <option value="">All years</option>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
          <button className="secondary-button" onClick={onRefresh} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="card-grid" style={{ marginTop: '1.5rem' }}>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Net Income ({selectedYear ?? 'all time'})</h3>
          <p style={{ fontSize: '2rem', margin: '0.75rem 0 0' }}>
            {formatCurrency(selectedYearTotals?.net ?? lifetimeTotals.net)}
          </p>
        </div>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Total Income ({selectedYear ?? 'all time'})</h3>
          <p style={{ fontSize: '2rem', margin: '0.75rem 0 0', color: '#047857' }}>
            {formatCurrency(selectedYearTotals?.income ?? lifetimeTotals.income)}
          </p>
        </div>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Total Expenses ({selectedYear ?? 'all time'})</h3>
          <p style={{ fontSize: '2rem', margin: '0.75rem 0 0', color: '#b91c1c' }}>
            {formatCurrency(selectedYearTotals?.expenses ?? lifetimeTotals.expenses)}
          </p>
        </div>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Top Spending Category</h3>
          <p style={{ fontSize: '1.5rem', margin: '0.75rem 0 0' }}>
            {categoryTotals.length > 0 ? `${categoryTotals[0].category ?? 'Unknown'} · ${formatCurrency(categoryTotals[0].expenses)}` : 'No data yet'}
          </p>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Month</th>
              <th>Income</th>
              <th>Expenses</th>
              <th>Net</th>
            </tr>
          </thead>
          <tbody>
            {monthlyTotals.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '1.5rem' }}>
                  Import transactions to see a monthly breakdown.
                </td>
              </tr>
            )}
            {monthlyTotals.map((row, index) => (
              <tr key={row.period ?? `month-${index}`}>
                <td>{row.period}</td>
                <td style={{ color: '#047857' }}>{formatCurrency(row.income)}</td>
                <td style={{ color: '#b91c1c' }}>{formatCurrency(row.expenses)}</td>
                <td style={{ color: row.net >= 0 ? '#047857' : '#b91c1c' }}>{formatCurrency(row.net)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Income</th>
              <th>Expenses</th>
              <th>Net</th>
            </tr>
          </thead>
          <tbody>
            {categoryTotals.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '1.5rem' }}>
                  Import transactions to see category insights.
                </td>
              </tr>
            )}
            {categoryTotals.map((row, index) => (
              <tr key={`${row.category ?? 'uncategorized'}-${index}`}>
                <td>{row.category ?? 'Uncategorized'}</td>
                <td style={{ color: '#047857' }}>{formatCurrency(row.income)}</td>
                <td style={{ color: '#b91c1c' }}>{formatCurrency(row.expenses)}</td>
                <td style={{ color: row.net >= 0 ? '#047857' : '#b91c1c' }}>{formatCurrency(row.net)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Account</th>
              <th>Category</th>
            </tr>
          </thead>
          <tbody>
            {recentTransactions.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '1.5rem' }}>
                  Once you import CSV transactions they will appear here.
                </td>
              </tr>
            )}
            {recentTransactions.map((transaction) => (
              <tr key={transaction.id}>
                <td>{formatDate(transaction.date)}</td>
                <td>{transaction.description || '—'}</td>
                <td style={{ color: transaction.amount >= 0 ? '#047857' : '#b91c1c' }}>{formatCurrency(transaction.amount)}</td>
                <td>{transaction.accountName}</td>
                <td>{transaction.categoryName ?? 'Uncategorized'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Dashboard;
