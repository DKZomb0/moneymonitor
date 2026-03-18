/**
 * CSV format definitions for Dutch/Belgian banks.
 * Each format has a `detect` function and a `parse` function.
 *
 * Normalized transaction fields:
 *   date:             string  YYYY-MM-DD
 *   amount:           number  positive=credit, negative=debit
 *   description:      string
 *   ownIban:          string
 *   counterpartyName: string
 *   counterpartyIban: string
 *   balance:          number | null  (balance after transaction)
 */

function parseAmount(raw) {
  if (raw === undefined || raw === null || raw === '') return NaN;
  const s = String(raw).trim().replace(/\s/g, '');
  // Handle European notation (1.234,56) vs standard (1,234.56)
  const hasComma = s.includes(',');
  const hasDot = s.includes('.');
  let normalized;
  if (hasComma && hasDot) {
    // whichever comes last is the decimal separator
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      normalized = s.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = s.replace(/,/g, '');
    }
  } else if (hasComma) {
    normalized = s.replace(',', '.');
  } else {
    normalized = s;
  }
  return parseFloat(normalized.replace(/[^0-9.\-]/g, ''));
}

function parseDate(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
    const [d, m, y] = s.split('-');
    return `${y}-${m}-${d}`;
  }
  // DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const [d, m, y] = s.split('/');
    return `${y}-${m}-${d}`;
  }
  // YYYYMMDD
  if (/^\d{8}$/.test(s)) {
    return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  }
  // MM/DD/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
    const parts = s.split('/');
    return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
  }
  return null;
}

function splitCsvLine(line, delimiter) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCsvRows(text, delimiter) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const nonEmpty = lines.filter(l => l.trim().length > 0);
  if (nonEmpty.length < 2) return { headers: [], rows: [] };
  const headers = splitCsvLine(nonEmpty[0], delimiter).map(h => h.replace(/^"|"$/g, '').trim());
  const rows = nonEmpty.slice(1).map(line => {
    const values = splitCsvLine(line, delimiter).map(v => v.replace(/^"|"$/g, '').trim());
    const row = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ''; });
    return row;
  });
  return { headers, rows };
}

// ─── ING ──────────────────────────────────────────────────────────────────────
// Format: "Datum";"Naam / Omschrijving";"Rekening";"Tegenrekening";"Code";"Af Bij";"Bedrag (EUR)";"MutatieSoort";"Mededelingen";"Saldo na mutatie";"Tag"
const ING = {
  name: 'ING',
  detect(text) {
    const first = text.slice(0, 500);
    return first.includes('"Datum"') && first.includes('"Rekening"') && first.includes('"Tegenrekening"') && first.includes('"Af Bij"');
  },
  parse(text) {
    const { rows } = parseCsvRows(text, ';');
    return rows.map(row => {
      const debitCredit = row['Af Bij'] || row['Af/Bij'] || '';
      let amount = parseAmount(row['Bedrag (EUR)'] || row['Bedrag'] || '');
      if (!isNaN(amount) && debitCredit.toLowerCase().startsWith('af')) amount = -Math.abs(amount);
      else if (!isNaN(amount)) amount = Math.abs(amount);
      return {
        date: parseDate(row['Datum']),
        amount,
        description: row['Mededelingen'] || row['Naam / Omschrijving'] || '',
        ownIban: row['Rekening'] || '',
        counterpartyName: row['Naam / Omschrijving'] || '',
        counterpartyIban: row['Tegenrekening'] || '',
        balance: parseAmount(row['Saldo na mutatie'] || ''),
        rawRow: row
      };
    }).filter(t => t.date);
  }
};

// ─── Rabobank ─────────────────────────────────────────────────────────────────
// Format: IBAN/BBAN,Munt,BIC,Volgnr,Datum,Rentedatum,Bedrag,Saldo na trn,Tegenpartij naam,Tegenpartij rekening,...
const RABOBANK = {
  name: 'Rabobank',
  detect(text) {
    const first = text.slice(0, 500);
    return (first.includes('IBAN/BBAN') || first.includes('Volgnr')) && first.includes('Tegenpartij naam');
  },
  parse(text) {
    const { rows } = parseCsvRows(text, ',');
    return rows.map(row => {
      const amount = parseAmount(row['Bedrag'] || row['Amount'] || '');
      const desc = [row['Omschrijving 1'], row['Omschrijving 2'], row['Omschrijving 3']]
        .filter(Boolean).join(' ').trim();
      return {
        date: parseDate(row['Datum'] || row['Date']),
        amount,
        description: desc || row['Betalingskenmerk'] || '',
        ownIban: row['IBAN/BBAN'] || '',
        counterpartyName: row['Tegenpartij naam'] || row['Naam tegenpartij'] || '',
        counterpartyIban: row['Tegenpartij rekening'] || '',
        balance: parseAmount(row['Saldo na trn'] || ''),
        rawRow: row
      };
    }).filter(t => t.date);
  }
};

// ─── ABN AMRO ─────────────────────────────────────────────────────────────────
// Format: "Rekeningnummer"\t"Muntsoort"\t"Transactiedatum"\t"Beginsaldo"\t"Eindsaldo"\t"Rentedatum"\t"Bedrag"\t"Omschrijving"
const ABNAMRO = {
  name: 'ABN AMRO',
  detect(text) {
    const first = text.slice(0, 500);
    return first.includes('Rekeningnummer') && (first.includes('Transactiedatum') || first.includes('Rentedatum'));
  },
  parse(text) {
    // ABN uses tabs
    const { rows } = parseCsvRows(text, '\t');
    return rows.map(row => {
      const amount = parseAmount(row['Bedrag'] || '');
      const rawDesc = row['Omschrijving'] || '';
      // ABN description often contains counterparty info: "/NAME/<name>/REMI/<ref>..."
      let counterpartyName = '';
      let counterpartyIban = '';
      let description = rawDesc;
      const nameMatch = rawDesc.match(/\/NAME\/([^/]+)/);
      if (nameMatch) counterpartyName = nameMatch[1].trim();
      const ibanMatch = rawDesc.match(/\/IBAN\/([A-Z]{2}\d{2}[A-Z0-9]+)/);
      if (ibanMatch) counterpartyIban = ibanMatch[1].trim();
      return {
        date: parseDate(row['Transactiedatum'] || row['Rentedatum']),
        amount,
        description: description.trim(),
        ownIban: row['Rekeningnummer'] || '',
        counterpartyName,
        counterpartyIban,
        balance: parseAmount(row['Eindsaldo'] || ''),
        rawRow: row
      };
    }).filter(t => t.date);
  }
};

// ─── KBC / CBC ────────────────────────────────────────────────────────────────
// Semicolon-separated, Dutch headers with "Rekeningnummer";"Naam van de rekening"...
const KBC = {
  name: 'KBC/CBC',
  detect(text) {
    const first = text.slice(0, 500).toLowerCase();
    return first.includes('rekeningnummer') && first.includes('naam van de rekening') && first.includes('valutadatum');
  },
  parse(text) {
    const { rows } = parseCsvRows(text, ';');
    return rows.map(row => {
      let amount = parseAmount(row['Bedrag'] || '');
      // KBC uses separate columns for debit/credit
      if (!isNaN(amount)) {
        const type = (row['Credit/debet'] || row['Debet/Credit'] || '').toLowerCase();
        if (type.includes('debet') || type.includes('debit')) amount = -Math.abs(amount);
        else amount = Math.abs(amount);
      }
      return {
        date: parseDate(row['Uitvoeringsdatum'] || row['Valutadatum'] || row['Datum']),
        amount,
        description: row['Details'] || row['Omschrijving'] || row['Vrije mededeling'] || '',
        ownIban: row['Rekeningnummer'] || '',
        counterpartyName: row['Naam van de tegenpartij'] || row['Naam tegenpartij'] || '',
        counterpartyIban: row['Rekening van de tegenpartij'] || row['IBAN tegenpartij'] || '',
        balance: parseAmount(row['Saldo'] || ''),
        rawRow: row
      };
    }).filter(t => t.date);
  }
};

// ─── Belfius ──────────────────────────────────────────────────────────────────
const BELFIUS = {
  name: 'Belfius',
  detect(text) {
    const first = text.slice(0, 500).toLowerCase();
    return first.includes('belfius') || (first.includes('rekeningnummer') && first.includes('tegenpartij') && first.includes('mededeling'));
  },
  parse(text) {
    const { rows } = parseCsvRows(text, ';');
    return rows.map(row => {
      let amount = parseAmount(row['Bedrag'] || '');
      const type = (row['Afschrijving/bijschrijving'] || '').toLowerCase();
      if (type.includes('afschrijving')) amount = -Math.abs(amount);
      else amount = Math.abs(amount);
      return {
        date: parseDate(row['Datum'] || row['Uitvoeringsdatum'] || row['Boekingsdatum']),
        amount,
        description: row['Mededeling'] || row['Vrije mededeling'] || row['Omschrijving'] || '',
        ownIban: row['Rekeningnummer'] || '',
        counterpartyName: row['Naam van de tegenpartij'] || row['Naam tegenpartij'] || '',
        counterpartyIban: row['Rekening van de tegenpartij'] || '',
        balance: parseAmount(row['Saldo'] || ''),
        rawRow: row
      };
    }).filter(t => t.date);
  }
};

// ─── Generic fallback ─────────────────────────────────────────────────────────
// Tries to auto-detect common column names
const GENERIC = {
  name: 'Generic',
  detect() { return true; }, // always matches as fallback
  parse(text) {
    // Detect delimiter
    const firstLine = text.split('\n')[0] || '';
    let delimiter = ',';
    const semicolons = (firstLine.match(/;/g) || []).length;
    const commas = (firstLine.match(/,/g) || []).length;
    const tabs = (firstLine.match(/\t/g) || []).length;
    if (semicolons > commas && semicolons > tabs) delimiter = ';';
    else if (tabs > commas && tabs > semicolons) delimiter = '\t';

    const { headers, rows } = parseCsvRows(text, delimiter);

    // Try to find columns by common names
    const findCol = (...names) => headers.find(h => names.some(n => h.toLowerCase().includes(n.toLowerCase())));

    const dateCol = findCol('datum', 'date', 'transactiedatum', 'boekingsdatum');
    const amountCol = findCol('bedrag', 'amount', 'bedrag (eur)', 'debet', 'credit');
    const descCol = findCol('omschrijving', 'description', 'mededelingen', 'details', 'naam / omschrijving');
    const ownIbanCol = findCol('rekening', 'rekeningnummer', 'iban/bban', 'account');
    const cpNameCol = findCol('naam tegenpartij', 'tegenpartij naam', 'naam / omschrijving', 'counterparty');
    const cpIbanCol = findCol('tegenrekening', 'tegenpartij rekening', 'counterparty account');
    const balanceCol = findCol('saldo na', 'balance', 'saldo');
    const debitCreditCol = findCol('af bij', 'af/bij', 'debet/credit', 'credit/debet', 'type');

    if (!dateCol || !amountCol) return [];

    return rows.map(row => {
      let amount = parseAmount(row[amountCol] || '');
      if (debitCreditCol) {
        const dc = (row[debitCreditCol] || '').toLowerCase();
        if (dc === 'af' || dc === 'debet' || dc === 'debit' || dc === 'd') amount = -Math.abs(amount);
        else if (dc === 'bij' || dc === 'credit' || dc === 'c') amount = Math.abs(amount);
      }
      return {
        date: parseDate(row[dateCol]),
        amount,
        description: descCol ? (row[descCol] || '') : '',
        ownIban: ownIbanCol ? (row[ownIbanCol] || '') : '',
        counterpartyName: cpNameCol ? (row[cpNameCol] || '') : '',
        counterpartyIban: cpIbanCol ? (row[cpIbanCol] || '') : '',
        balance: balanceCol ? parseAmount(row[balanceCol] || '') : null,
        rawRow: row
      };
    }).filter(t => t.date);
  }
};

const FORMATS = [ING, RABOBANK, ABNAMRO, KBC, BELFIUS, GENERIC];

function detectAndParse(text) {
  const format = FORMATS.find(f => f.detect(text)) || GENERIC;
  const transactions = format.parse(text);
  return { format: format.name, transactions };
}

module.exports = { detectAndParse, parseAmount, parseDate, FORMATS };
