const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', '..', '..', 'config', 'ibans.json');

let _cache = null;

function loadIbans() {
  if (_cache) return _cache;
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    const config = JSON.parse(raw);
    _cache = {
      ibans: (config.ibans || []).map(i => i.toUpperCase().replace(/\s/g, '')),
      labels: config.labels || {}
    };
  } catch {
    _cache = { ibans: [], labels: {} };
  }
  return _cache;
}

function saveIbans(data) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2), 'utf-8');
  _cache = null;
}

function reloadIbans() {
  _cache = null;
  return loadIbans();
}

function isOwnIban(iban) {
  if (!iban) return false;
  const { ibans } = loadIbans();
  return ibans.includes(iban.toUpperCase().replace(/\s/g, ''));
}

/**
 * A transaction is an internal transfer if both the own account IBAN
 * and the counterparty IBAN belong to the user.
 */
function isInternalTransfer(transaction) {
  const cpIban = transaction.counterpartyIban?.toUpperCase().replace(/\s/g, '');
  if (!cpIban) return false;
  return isOwnIban(cpIban);
}

module.exports = { loadIbans, saveIbans, reloadIbans, isOwnIban, isInternalTransfer };
