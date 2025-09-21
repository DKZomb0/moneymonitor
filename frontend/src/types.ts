export interface Account {
  id: number;
  name: string;
  type: string;
  startBalance: number;
  targetAllocation: number | null;
  notes: string | null;
  currentBalance: number;
  totalExpenses: number;
  totalIncome: number;
  netChange: number;
  allocationGap: number | null;
}

export interface Category {
  id: number;
  name: string;
  type: string;
  createdAt: string;
  updatedAt: string;
}

export interface SummaryRow {
  year?: string;
  period?: string;
  category?: string;
  income: number;
  expenses: number;
  net: number;
}

export interface RecentTransaction {
  id: number;
  date: string;
  description: string;
  amount: number;
  accountName: string;
  categoryName?: string;
}

export interface OverviewSummary {
  totalsByYear: SummaryRow[];
  totalsByMonth: SummaryRow[];
  totalsByCategory: SummaryRow[];
  recentTransactions: RecentTransaction[];
}

export interface CsvMapping {
  date: string;
  amount: string;
  description?: string;
  category?: string;
  externalId?: string;
  notes?: string;
}

export interface CsvImportRequest {
  accountId: number;
  csvText: string;
  delimiter?: string;
  dateFormat?: string;
  mapping: CsvMapping;
}

export interface InvestmentRecord {
  id: number;
  accountId: number;
  accountName: string;
  symbol: string | null;
  quantity: number | null;
  price: number | null;
  value: number | null;
  date: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvestmentSummary {
  totalValue: number;
  accounts: Array<{
    accountId: number;
    accountName: string;
    totalValue: number;
  }>;
}

export interface ReconciliationItem {
  accountId: number;
  accountName: string;
  accountType: string;
  expectedBalance: number;
  actualBalance: number;
  difference: number;
}

export interface ReconciliationRecord {
  id: number;
  recordedAt: string;
  notes: string | null;
  recommendedCheckingBalance: number | null;
  expectedNetWorth: number;
  actualNetWorth: number;
  difference: number;
  items: ReconciliationItem[];
}
