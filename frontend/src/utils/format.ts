export function formatCurrency(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2
  }).format(amount)
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

export function formatMonth(yearMonth: string): string {
  if (!yearMonth) return ''
  const [year, month] = yearMonth.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })
}

export function formatMonthShort(yearMonth: string): string {
  if (!yearMonth) return ''
  const [year, month] = yearMonth.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleDateString('nl-NL', { month: 'short' })
}

export function amountColor(amount: number): string {
  if (amount > 0) return 'text-green-600'
  if (amount < 0) return 'text-red-600'
  return 'text-gray-500'
}

export function amountSign(amount: number): string {
  return amount >= 0 ? '+' : ''
}

export function currentYearMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function currentYear(): string {
  return String(new Date().getFullYear())
}
