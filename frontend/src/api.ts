import type {
  Account,
  Category,
  CsvImportRequest,
  InvestmentRecord,
  InvestmentSummary,
  OverviewSummary,
  ReconciliationRecord
} from './types';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json'
    },
    ...options
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody.error ?? response.statusText;
    throw new Error(message || 'Request failed');
  }

  return response.json();
}

export async function getAccounts(): Promise<Account[]> {
  const data = await request<{ data: Account[] }>('/accounts');
  return data.data;
}

export async function createAccount(payload: {
  name: string;
  type: string;
  startBalance?: number;
  targetAllocation?: number | null;
  notes?: string | null;
}): Promise<Account> {
  const data = await request<{ data: Account }>('/accounts', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  return data.data;
}

export async function updateAccount(id: number, payload: Partial<Omit<Account, 'id'>>): Promise<Account> {
  const data = await request<{ data: Account }>(`/accounts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
  return data.data;
}

export async function getCategories(): Promise<Category[]> {
  const data = await request<{ data: Category[] }>('/categories');
  return data.data;
}

export async function createCategory(payload: { name: string; type?: string }): Promise<Category> {
  const data = await request<{ data: Category }>('/categories', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  return data.data;
}

export async function getOverview(year?: string): Promise<OverviewSummary> {
  const query = year ? `?year=${encodeURIComponent(year)}` : '';
  return request<OverviewSummary>(`/summary/overview${query}`);
}

export async function importTransactions(payload: CsvImportRequest) {
  return request<{ data: { inserted: number; skipped: number; total: number } }>('/import/transactions', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function getInvestments(accountId?: number): Promise<{
  data: InvestmentRecord[];
  summary: InvestmentSummary;
}> {
  const query = accountId ? `?accountId=${accountId}` : '';
  return request(`/investments${query}`);
}

export async function createInvestment(payload: {
  accountId: number;
  symbol?: string;
  quantity?: number | null;
  price?: number | null;
  value?: number | null;
  date: string;
  notes?: string | null;
}): Promise<InvestmentRecord> {
  const data = await request<{ data: InvestmentRecord }>('/investments', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  return data.data;
}

export async function createReconciliation(payload: {
  recordedAt?: string | null;
  notes?: string | null;
  snapshots: Array<{ accountId: number; actualBalance: number }>;
}): Promise<ReconciliationRecord> {
  const data = await request<{ data: ReconciliationRecord }>('/reconciliations', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  return data.data;
}

export async function getLatestReconciliation(): Promise<ReconciliationRecord | null> {
  const data = await request<{ data: ReconciliationRecord | null }>('/reconciliations/latest');
  return data.data;
}
