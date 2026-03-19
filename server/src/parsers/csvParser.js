const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');
const { detectAndParse } = require('./formats');

/**
 * Read a CSV file, handling common encodings (UTF-8, Windows-1252/latin1)
 */
function readCsvFile(filePath) {
  const buf = fs.readFileSync(filePath);
  // Try UTF-8 first; fall back to Windows-1252 which is common with Dutch bank exports
  try {
    const text = iconv.decode(buf, 'utf-8');
    // Quick sanity check: if result has replacement chars, retry with latin1
    if (text.includes('\uFFFD')) {
      return iconv.decode(buf, 'windows-1252');
    }
    return text;
  } catch {
    return iconv.decode(buf, 'windows-1252');
  }
}

/**
 * Parse all CSV files in a directory, returning normalised transactions
 * annotated with which file they came from.
 */
function parseDirectory(inputDir) {
  if (!fs.existsSync(inputDir)) return [];

  const files = fs.readdirSync(inputDir)
    .filter(f => /\.(csv|CSV|txt|TXT)$/.test(f))
    .map(f => path.join(inputDir, f));

  const allTransactions = [];

  for (const filePath of files) {
    try {
      const text = readCsvFile(filePath);
      const { format, transactions } = detectAndParse(text);
      for (const t of transactions) {
        allTransactions.push({
          ...t,
          sourceFile: path.basename(filePath),
          sourceFormat: format
        });
      }
    } catch (err) {
      console.error(`Failed to parse ${filePath}: ${err.message}`);
    }
  }

  return allTransactions;
}

/**
 * Parse a single CSV text string (used for uploaded files from the UI)
 */
function parseCsvText(text, filename) {
  const { format, transactions } = detectAndParse(text);
  return transactions.map(t => ({
    ...t,
    sourceFile: filename || 'upload',
    sourceFormat: format
  }));
}

module.exports = { parseDirectory, parseCsvText };
