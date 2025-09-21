const { parse } = require('csv-parse/sync');
const { parse: parseDate, isValid, format } = require('date-fns');

const DEFAULT_DATE_FORMATS = [
  'yyyy-MM-dd',
  'MM/dd/yyyy',
  'dd/MM/yyyy',
  'yyyy/MM/dd',
  'dd-MM-yyyy',
  'MM-dd-yyyy'
];

function normalizeAmount(value) {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value !== 'string') {
    return NaN;
  }

  const cleaned = value.replace(/\s+/g, '');
  if (!cleaned) {
    return NaN;
  }

  let normalized = cleaned.replace(/[^0-9,.-]/g, '');
  const commaCount = (normalized.match(/,/g) || []).length;
  const dotCount = (normalized.match(/\./g) || []).length;

  if (commaCount > 0 && dotCount > 0) {
    if (normalized.lastIndexOf('.') > normalized.lastIndexOf(',')) {
      normalized = normalized.replace(/,/g, '');
    } else {
      normalized = normalized.replace(/\./g, '');
      normalized = normalized.replace(/,/g, '.');
    }
  } else if (commaCount > 0 && dotCount === 0) {
    normalized = normalized.replace(/,/g, '.');
  }

  const amount = Number.parseFloat(normalized);
  return Number.isFinite(amount) ? amount : NaN;
}

function normalizeDate(value, explicitFormat) {
  if (!value) {
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    return format(value, 'yyyy-MM-dd');
  }

  if (explicitFormat) {
    const parsed = parseDate(String(value), explicitFormat, new Date());
    if (isValid(parsed)) {
      return format(parsed, 'yyyy-MM-dd');
    }
  }

  for (const formatString of DEFAULT_DATE_FORMATS) {
    const parsed = parseDate(String(value), formatString, new Date());
    if (isValid(parsed)) {
      return format(parsed, 'yyyy-MM-dd');
    }
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.valueOf())) {
    return format(parsed, 'yyyy-MM-dd');
  }

  return null;
}

function parseTransactionsCsv(csvText, { delimiter = ',', mapping, dateFormat } = {}) {
  if (!mapping || !mapping.date || !mapping.amount) {
    throw new Error('A date and amount mapping is required to import transactions');
  }

  const records = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    delimiter
  });

  return records.map((row, index) => {
    const rawDate = row[mapping.date];
    const normalizedDate = normalizeDate(rawDate, dateFormat);
    const rawAmount = row[mapping.amount];
    const normalizedAmount = normalizeAmount(rawAmount);
    const description = mapping.description ? row[mapping.description] ?? '' : '';
    const categoryName = mapping.category ? row[mapping.category] ?? '' : '';
    const externalId = mapping.externalId ? row[mapping.externalId] ?? null : null;
    const notes = mapping.notes ? row[mapping.notes] ?? '' : '';

    return {
      index,
      date: normalizedDate,
      amount: normalizedAmount,
      description: description.trim(),
      categoryName: categoryName.trim() || null,
      externalId: externalId ? String(externalId).trim() : null,
      notes: notes.trim() || null
    };
  });
}

module.exports = {
  parseTransactionsCsv
};
