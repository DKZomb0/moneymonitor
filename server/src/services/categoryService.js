const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', '..', '..', 'config', 'categories.json');

let _cache = null;

function loadCategories() {
  if (_cache) return _cache;
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    const config = JSON.parse(raw);
    _cache = config.categories || [];
  } catch {
    _cache = [];
  }
  return _cache;
}

function saveCategories(categories) {
  const existing = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  existing.categories = categories;
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(existing, null, 2), 'utf-8');
  _cache = categories;
}

function reloadCategories() {
  _cache = null;
  return loadCategories();
}

/**
 * Auto-assign a category to a transaction based on keyword matching.
 * Returns the category name or null.
 */
function categorize(transaction) {
  const categories = loadCategories();
  const haystack = [
    transaction.description,
    transaction.counterpartyName,
    transaction.counterpartyIban
  ].join(' ').toLowerCase();

  for (const cat of categories) {
    if (!cat.keywords || cat.keywords.length === 0) continue;
    for (const keyword of cat.keywords) {
      if (keyword && haystack.includes(keyword.toLowerCase())) {
        return cat.name;
      }
    }
  }

  // Last category is "Overig" / catch-all
  const last = categories[categories.length - 1];
  return last ? last.name : null;
}

/**
 * Generate a category mapping config by analysing existing transactions.
 * For each unique counterparty/description, tries to find a pattern.
 */
function generateMappingSuggestions(transactions) {
  const categories = loadCategories();
  const catNames = categories.map(c => c.name);

  // Gather unique counterparty names that don't match any keyword yet
  const unmatched = new Map(); // counterpartyName -> count
  for (const t of transactions) {
    const name = t.counterpartyName?.trim();
    if (!name) continue;
    const assigned = categorize(t);
    const isDefaultFallback = assigned === categories[categories.length - 1]?.name;
    if (isDefaultFallback) {
      unmatched.set(name, (unmatched.get(name) || 0) + 1);
    }
  }

  // Sort by frequency
  return Array.from(unmatched.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([name, count]) => ({ counterpartyName: name, count, suggestedCategory: null }));
}

module.exports = { loadCategories, saveCategories, reloadCategories, categorize, generateMappingSuggestions };
