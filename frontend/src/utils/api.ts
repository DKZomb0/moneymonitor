import type {
  Transaction, YearlySummary, MonthlyDetail,
  Category, Account, AccountSnapshot, IbanConfig, NetWorthPoint
} from '../types'

const BASE = '/api'

async function get<T>(url: string): Promise<T> {
  const res = await fetch(BASE + url)
  if (!res.ok) throw new Error(`GET ${url} failed: ${res.statusText}`)
  return res.json()
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(BASE + url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  if (!res.ok) throw new Error(`POST ${url} failed: ${res.statusText}`)
  return res.json()
}

async function put<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(BASE + url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  if (!res.ok) throw new Error(`PUT ${url} failed: ${res.statusText}`)
  return res.json()
}

async function del(url: string) {
  const res = await fetch(BASE + url, { method: 'DELETE' })
  if (!res.ok) throw new Error(`DELETE ${url} failed: ${res.statusText}`)
  return res.json()
}

// ── Transactions ───────────────────────────────────────────────────────────────
export const api = {
  health: () => get<{ status: string; transactionCount: number; inputFiles: string[] }>('/health'),

  years: () => get<{ years: string[] }>('/years'),

  yearlySummary: (year: string) => get<YearlySummary>(`/summary/${year}`),

  monthlyDetail: (yearMonth: string) => get<MonthlyDetail>(`/months/${yearMonth}`),

  transactions: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return get<{ data: Transaction[]; total: number }>(`/transactions${qs}`)
  },

  transfers: (year?: string) => {
    const qs = year ? `?year=${year}` : ''
    return get<{ data: Transaction[] }>(`/transfers${qs}`)
  },

  overrideCategory: (id: string, category: string, notes?: string) =>
    put(`/transactions/${id}/category`, { category, notes }),

  uploadCsv: (filename: string, content: string) =>
    post<{ saved: boolean; parsed: number; preview: Transaction[] }>('/upload', { filename, content }),

  // ── Categories ──────────────────────────────────────────────────────────────
  categories: () => get<{ data: Category[] }>('/categories'),

  updateCategories: (categories: Category[]) =>
    put('/categories', { categories }),

  categorySuggestions: () =>
    get<{ data: { counterpartyName: string; count: number; suggestedCategory: string | null }[] }>('/categories/suggestions'),

  // ── IBANs ───────────────────────────────────────────────────────────────────
  ibans: () => get<IbanConfig>('/ibans'),

  updateIbans: (data: IbanConfig) => put('/ibans', data),

  // ── Accounts ────────────────────────────────────────────────────────────────
  accounts: () => get<{ data: Account[] }>('/accounts'),

  createAccount: (account: Partial<Account>) =>
    post<{ data: Account }>('/accounts', account),

  updateAccount: (id: string, account: Partial<Account>) =>
    put<{ data: Account }>(`/accounts/${id}`, account),

  deleteAccount: (id: string) => del(`/accounts/${id}`),

  snapshots: (accountId: string) =>
    get<{ data: AccountSnapshot[] }>(`/accounts/${accountId}/snapshots`),

  addSnapshot: (accountId: string, date: string, value: number, notes?: string) =>
    post<{ data: AccountSnapshot }>(`/accounts/${accountId}/snapshots`, { date, value, notes }),

  deleteSnapshot: (id: number) => del(`/snapshots/${id}`),

  // ── Controle ────────────────────────────────────────────────────────────────
  controle: () => get<{ data: Account[] }>('/controle'),

  // ── Net Worth ────────────────────────────────────────────────────────────────
  netWorth: () => get<{ data: NetWorthPoint[]; accountNames: Record<string, string> }>('/networth')
}
