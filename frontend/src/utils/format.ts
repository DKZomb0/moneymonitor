export function formatCurrency(value: number, currency: string = 'USD'): string {
  if (value === null || Number.isNaN(value)) {
    return '-';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

export function formatNumber(value: number, options: Intl.NumberFormatOptions = {}): string {
  if (value === null || Number.isNaN(value)) {
    return '-';
  }

  return new Intl.NumberFormat('en-US', options).format(value);
}

export function formatDate(value: string): string {
  if (!value) {
    return '';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) {
    return value;
  }
  return parsed.toLocaleDateString();
}
