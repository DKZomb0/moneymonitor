export interface Transaction {
  id: string
  date: string
  year: string
  month: string
  amount: number
  description: string
  ownIban: string
  counterpartyName: string
  counterpartyIban: string
  balance: number | null
  category: string | null
  type: 'income' | 'expense' | 'internal'
  isInternal: boolean
  sourceFile: string
  sourceFormat: string
  notes?: string
  hasOverride?: boolean
}

export interface MonthlySummary {
  month: string
  income: number
  expense: number
  net: number
}

export interface CategorySummary {
  category: string
  income: number
  expense: number
  net: number
  count: number
}

export interface YearlySummary {
  year: string
  totalIncome: number
  totalExpense: number
  totalNet: number
  byMonth: MonthlySummary[]
  byCategory: CategorySummary[]
}

export interface MonthlyDetail {
  yearMonth: string
  transactions: Transaction[]
  byCategory: {
    category: string
    income: number
    expense: number
    transactions: Transaction[]
  }[]
}

export interface Category {
  name: string
  type: 'income' | 'expense'
  color: string
  keywords: string[]
}

export interface AccountSnapshot {
  id: number
  accountId: string
  date: string
  value: number
  notes: string | null
}

export interface Account {
  id: string
  name: string
  type: 'checking' | 'savings' | 'investment' | 'other'
  iban: string | null
  startBalance: number
  currency: string
  color: string | null
  sortOrder: number
  // from controle view
  currentValue?: number | null
  snapshotDate?: string | null
  snapshotNotes?: string | null
  recentSnapshots?: AccountSnapshot[]
  calculatedBalance?: number | null
  transactionCount?: number
  difference?: number | null
}

export interface IbanConfig {
  ibans: string[]
  labels: Record<string, string>
}

export interface NetWorthPoint {
  date: string
  total: number
  breakdown: Record<string, number>
}
