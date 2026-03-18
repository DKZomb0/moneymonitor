# Money Monitor

A personal finance dashboard that visualises your net worth, income and expenses based on bank transaction exports.

## Features

- **Yearly overview** — income, expenses and net per month with charts; category breakdown with pie chart
- **Monthly view** — per-transaction list with per-category sidebar; manually override any category
- **Controle tab** — manually enter balances for checking, savings and investment accounts; for checking accounts the balance is calculated from transactions so you can spot missing entries
- **Vermogen (Net worth)** — track total net worth over time from saved account snapshots
- **Auto-categorisation** — keywords in `config/categories.json` are matched against transaction description and counterparty name; catch-all suggestions for unmatched payees
- **Internal transfer filtering** — configure your own IBANs in `config/ibans.json`; transfers between your own accounts are excluded from income/expense views
- **CSV import** — drag-and-drop in the UI or drop files into the `input/` folder; auto-detects ING, Rabobank, ABN AMRO, KBC/CBC, Belfius and generic CSV formats

## Quick Start

```bash
# Install dependencies
npm run install:all

# Development (backend + frontend with hot reload)
npm run dev

# Open http://localhost:5173
```

The backend runs on port **4000**, the frontend dev server on **5173** (proxies API requests).

For production:
```bash
npm run build   # builds frontend into frontend/dist/
npm start       # serves frontend + API on port 4000
```

## Configuration

### `config/ibans.json`
List your own IBAN numbers. Transactions between them are marked as internal transfers and hidden from income/expense overviews.

```json
{
  "ibans": ["NL00INGB0000000000", "NL00RABO0000000000"],
  "labels": {
    "NL00INGB0000000000": "ING Betaalrekening",
    "NL00RABO0000000000": "Rabobank Spaarrekening"
  }
}
```

### `config/accounts.json`
Define your accounts. Checking accounts will have their balance calculated from transaction data (useful for the Controle reconciliation tab).

```json
{
  "accounts": [
    {
      "id": "ing-betaal",
      "name": "ING Betaalrekening",
      "type": "checking",
      "iban": "NL00INGB0000000000",
      "startBalance": 1234.56,
      "currency": "EUR"
    }
  ]
}
```

Types: `checking`, `savings`, `investment`, `other`

### `config/categories.json`
Keywords matched against transaction description and counterparty name (case-insensitive). First match wins. Edit via Settings → Categorieën in the UI or directly in the file.

## Adding Transactions

**Option 1 – Drop files in the input folder**
```
input/
  ing-jan-2025.csv
  ing-feb-2025.csv
```
The server reads all `.csv`/`.txt` files on every request.

**Option 2 – Upload via UI**
Use the *Importeren* tab in the app to drag-and-drop CSV files.

## Supported Bank Formats

| Bank | Format | Delimiter |
|------|--------|-----------|
| ING | Dutch headers | `;` |
| Rabobank | Dutch headers | `,` |
| ABN AMRO | Dutch tab-separated | `\t` |
| KBC / CBC | Dutch headers | `;` |
| Belfius | Dutch headers | `;` |
| Generic | Auto-detected | auto |

## Data Storage

- Transaction data lives entirely in the CSV files — nothing is written to a database
- Account balance snapshots (for the Controle tab) are persisted in `server/data/moneymonitor.db` (SQLite)
- Manual category overrides for individual transactions are also stored in the database
- Category keywords and IBAN config are stored in `config/` JSON files
