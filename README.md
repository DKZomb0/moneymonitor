# Money Monitor

Money Monitor is a full-stack personal finance dashboard that ingests bank CSV exports, persists them in SQLite, and presents a
web UI for analysing spending trends, managing allocations, tracking investments, and reconciling real-world balances.

## Features

- **CSV ingestion workflow** – Upload account statements, map custom column headers, and persist transactions once for fast,
  normalized queries.
- **Expense analytics** – See income, expenses, and net totals grouped by year, month, and category alongside the most recent
  transactions.
- **Account management** – Configure starting balances, target allocations, and notes for checking, savings, brokerage, and
  other asset buckets.
- **Investment tracking** – Maintain manual snapshots of portfolio holdings and account-level valuations.
- **Reconciliation checks** – Enter real-world balances across accounts and receive a recommended checking balance to close the
  books.

## Tech stack

- **Backend:** Node.js, Express, SQLite (via [`better-sqlite3`](https://github.com/WiseLibs/better-sqlite3))
- **Frontend:** React + Vite + TypeScript
- **CSV parsing:** [`csv-parse`](https://csv.js.org/parse/) with flexible date and amount normalization

## Project structure

```
├── server          # Express API and SQLite data access layer
│   └── src
│       ├── index.js              # HTTP server & routes
│       ├── db.js                 # SQLite connection helper
│       ├── dbInit.js             # Schema creation & seed data
│       ├── services/             # Domain logic (accounts, summary, investments, reconciliation)
│       └── utils/csv.js          # CSV parsing + normalization helpers
├── frontend       # React SPA built with Vite
│   ├── src
│   │   ├── App.tsx               # Tabbed application shell
│   │   ├── components/           # Feature-specific views
│   │   ├── api.ts                # Fetch helpers for the backend API
│   │   ├── types.ts              # Shared TypeScript interfaces
│   │   └── utils/format.ts       # Presentation utilities
└── package.json   # npm workspaces & shared scripts
```

## Getting started

1. **Install dependencies**

   ```bash
   npm install            # installs workspace dependencies (server + frontend)
   npm run --workspace server migrate  # optional: creates the SQLite schema manually
   ```

2. **Run the development servers**

   In two terminals (or use the workspace script once dependencies are available):

   ```bash
   # Terminal 1 – API (http://localhost:4000)
   npm run --workspace server dev

   # Terminal 2 – Frontend (http://localhost:5173)
   npm run --workspace frontend dev

   # Or run both with
   npm run dev
   ```

3. **Build for production**

   ```bash
   npm run build
   ```

   The Express server automatically serves the frontend from `frontend/dist` when the build output exists.

## CSV import tips

- The importer expects the first row to contain headers. Map the header titles (case-sensitive) to the Money Monitor fields.
- Supported date formats include `yyyy-MM-dd`, `dd/MM/yyyy`, `MM/dd/yyyy`, and other common separators. Provide a custom
  pattern when necessary (e.g. `dd-MM-yyyy`).
- Amounts are normalized automatically; both comma and dot decimal separators are supported.
- Optional columns:
  - **Description** – Free-text memo.
  - **Category** – Will auto-create categories when missing.
  - **External ID** – Used to avoid re-importing duplicate rows per account.
  - **Notes** – Extra memo stored on the transaction (available when mapped in the CSV).

## API highlights

The frontend communicates exclusively through REST endpoints exposed by the Express server:

| Endpoint | Description |
| --- | --- |
| `GET /api/accounts` | List accounts with computed balances, income, expenses, and allocation gaps. |
| `POST /api/accounts` | Create a new account (checking, savings, brokerage, etc.). |
| `PUT /api/accounts/:id` | Update account metadata, starting balances, or allocation targets. |
| `POST /api/import/transactions` | Parse a pasted CSV file and persist transactions. |
| `GET /api/summary/overview` | Aggregate totals by year, month, and category. |
| `GET/POST /api/investments` | Manage investment snapshots and see totals per account. |
| `POST /api/reconciliations` | Store a reconciliation run with actual balances per account. |
| `GET /api/reconciliations/latest` | Retrieve the latest reconciliation summary (including recommended checking balance). |

SQLite files are stored in `server/data/moneymonitor.db`; the folder is git-ignored.

## Extensibility ideas

- Add authentication to protect sensitive financial data.
- Integrate budget envelopes and cash-flow projections.
- Enhance the importer with column auto-detection based on sample data.
- Export reports (CSV/PDF) or automate reconciliation reminders.

---

Happy monitoring! 🎯
