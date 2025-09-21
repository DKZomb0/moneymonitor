import { useEffect, useState } from 'react';
import './App.css';
import Dashboard from './components/Dashboard';
import AccountsView from './components/AccountsView';
import ImportTransactions from './components/ImportTransactions';
import InvestmentsView from './components/InvestmentsView';
import ReconciliationView from './components/ReconciliationView';
import type { Account, OverviewSummary, ReconciliationRecord } from './types';
import { getAccounts, getLatestReconciliation, getOverview } from './api';

const TABS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'accounts', label: 'Accounts' },
  { key: 'import', label: 'Import CSV' },
  { key: 'investments', label: 'Investments' },
  { key: 'reconciliation', label: 'Reconciliation' }
] as const;

type TabKey = (typeof TABS)[number]['key'];

const App = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [summary, setSummary] = useState<OverviewSummary | null>(null);
  const [summaryYear, setSummaryYear] = useState<string | undefined>(undefined);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [latestReconciliation, setLatestReconciliation] = useState<ReconciliationRecord | null>(null);

  const loadAccounts = async () => {
    try {
      const data = await getAccounts();
      setAccounts(data);
      setGlobalError(null);
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : 'Failed to load accounts');
    }
  };

  const loadSummary = async (year?: string) => {
    setSummaryLoading(true);
    try {
      const data = await getOverview(year);
      setSummary(data);
      setGlobalError(null);
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : 'Failed to load summary');
    } finally {
      setSummaryLoading(false);
    }
  };

  const loadLatestReconciliation = async () => {
    try {
      const data = await getLatestReconciliation();
      setLatestReconciliation(data);
      setGlobalError(null);
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : 'Failed to load reconciliation');
    }
  };

  useEffect(() => {
    void loadAccounts();
    void loadSummary();
    void loadLatestReconciliation();
  }, []);

  useEffect(() => {
    if (activeTab === 'dashboard') {
      void loadSummary(summaryYear);
    }
  }, [activeTab, summaryYear]);

  const handleAccountCreated = (_account: Account) => {
    void loadAccounts();
    if (activeTab === 'dashboard') {
      void loadSummary(summaryYear);
    }
  };

  const handleAccountUpdated = (_account: Account) => {
    void loadAccounts();
    if (activeTab === 'dashboard') {
      void loadSummary(summaryYear);
    }
  };

  const handleImportComplete = () => {
    void loadAccounts();
    void loadSummary(summaryYear);
  };

  const handleReconciled = (record: ReconciliationRecord) => {
    setLatestReconciliation(record);
    void loadAccounts();
    if (activeTab === 'dashboard') {
      void loadSummary(summaryYear);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div>
          <h1>Money Monitor</h1>
          <p style={{ margin: 0, opacity: 0.8 }}>Import, categorize, and reconcile your personal finances from bank CSV exports.</p>
        </div>
        <nav className="nav-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={tab.key === activeTab ? 'active' : ''}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="main-content">
        {globalError && <div className="status-banner error-banner">{globalError}</div>}

        {activeTab === 'dashboard' && (
          <Dashboard
            summary={summary}
            selectedYear={summaryYear}
            onYearChange={setSummaryYear}
            loading={summaryLoading}
            onRefresh={() => void loadSummary(summaryYear)}
          />
        )}

        {activeTab === 'accounts' && (
          <AccountsView
            accounts={accounts}
            onAccountCreated={handleAccountCreated}
            onAccountUpdated={handleAccountUpdated}
          />
        )}

        {activeTab === 'import' && <ImportTransactions accounts={accounts} onImportComplete={handleImportComplete} />}

        {activeTab === 'investments' && <InvestmentsView accounts={accounts} />}

        {activeTab === 'reconciliation' && (
          <ReconciliationView
            accounts={accounts}
            latestReconciliation={latestReconciliation}
            onReconciled={handleReconciled}
          />
        )}
      </main>
    </div>
  );
};

export default App;
