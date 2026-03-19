import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Check, X, RefreshCw, AlertCircle } from 'lucide-react'
import { api } from '../utils/api'
import { formatCurrency, formatDate, currentYearMonth } from '../utils/format'
import type { Account, AccountSnapshot } from '../types'

const ACCOUNT_TYPES = [
  { value: 'checking', label: 'Betaalrekening' },
  { value: 'savings', label: 'Spaarrekening' },
  { value: 'investment', label: 'Beleggingen' },
  { value: 'other', label: 'Overig' }
]

function AccountTypeLabel({ type }: { type: string }) {
  const found = ACCOUNT_TYPES.find(t => t.value === type)
  const colors: Record<string, string> = {
    checking: 'bg-blue-50 text-blue-700',
    savings: 'bg-green-50 text-green-700',
    investment: 'bg-purple-50 text-purple-700',
    other: 'bg-gray-50 text-gray-700'
  }
  return (
    <span className={`badge ${colors[type] || colors.other}`}>
      {found?.label ?? type}
    </span>
  )
}

function DifferenceTag({ diff }: { diff: number | null | undefined }) {
  if (diff == null) return null
  const abs = Math.abs(diff)
  if (abs < 0.01) return <span className="badge bg-green-100 text-green-700">OK ✓</span>
  return (
    <span className={`badge ${diff > 0 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
      {diff > 0 ? '+' : ''}{formatCurrency(diff)}
    </span>
  )
}

interface SnapshotFormProps {
  accountId: string
  onSaved: () => void
  onCancel: () => void
}

function SnapshotForm({ accountId, onSaved, onCancel }: SnapshotFormProps) {
  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(today)
  const [value, setValue] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!value) return
    setSaving(true)
    try {
      await api.addSnapshot(accountId, date, parseFloat(value.replace(',', '.')), notes || undefined)
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mt-2 flex flex-col gap-2">
      <div className="text-xs font-medium text-blue-700 mb-1">Nieuwe waarde invoeren</div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label text-xs">Datum</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input text-sm" />
        </div>
        <div>
          <label className="label text-xs">Waarde (€)</label>
          <input
            type="text"
            inputMode="decimal"
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="0,00"
            className="input text-sm"
            autoFocus
          />
        </div>
      </div>
      <div>
        <label className="label text-xs">Notitie (optioneel)</label>
        <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="input text-sm" placeholder="Bijv. stand per maandafsluiting" />
      </div>
      <div className="flex gap-2 justify-end mt-1">
        <button onClick={onCancel} className="btn-secondary text-xs py-1.5">Annuleren</button>
        <button onClick={handleSave} disabled={!value || saving} className="btn-primary text-xs py-1.5">
          {saving ? 'Opslaan...' : 'Opslaan'}
        </button>
      </div>
    </div>
  )
}

interface AccountCardProps {
  account: Account
  onRefresh: () => void
  onDelete: (id: string) => void
}

function AccountCard({ account, onRefresh, onDelete }: AccountCardProps) {
  const [showForm, setShowForm] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState<AccountSnapshot[]>([])

  const loadHistory = async () => {
    const res = await api.snapshots(account.id)
    setHistory(res.data)
    setShowHistory(true)
  }

  const handleDeleteSnapshot = async (id: number) => {
    await api.deleteSnapshot(id)
    onRefresh()
    setHistory(h => h.filter(s => s.id !== id))
  }

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900">{account.name}</span>
            <AccountTypeLabel type={account.type} />
            {account.iban && (
              <span className="text-xs text-gray-400 font-mono">{account.iban}</span>
            )}
          </div>

          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Current manually entered value */}
            <div className="bg-gray-50 rounded-lg p-2.5">
              <div className="text-xs text-gray-400 mb-0.5">Huidige waarde</div>
              <div className="text-base font-bold text-gray-900">
                {account.currentValue != null ? formatCurrency(account.currentValue) : '—'}
              </div>
              {account.snapshotDate && (
                <div className="text-xs text-gray-400">{formatDate(account.snapshotDate)}</div>
              )}
            </div>

            {/* Calculated balance (checking only) */}
            {account.type === 'checking' && account.calculatedBalance != null && (
              <div className="bg-blue-50 rounded-lg p-2.5">
                <div className="text-xs text-blue-400 mb-0.5">Berekend ({account.transactionCount} tx)</div>
                <div className="text-base font-bold text-blue-700">
                  {formatCurrency(account.calculatedBalance)}
                </div>
                <div className="text-xs text-blue-300">startwaarde + transacties</div>
              </div>
            )}

            {/* Difference */}
            {account.difference != null && (
              <div className={`rounded-lg p-2.5 ${Math.abs(account.difference) < 0.01 ? 'bg-green-50' : 'bg-amber-50'}`}>
                <div className="text-xs text-gray-400 mb-0.5">Verschil</div>
                <DifferenceTag diff={account.difference} />
                {Math.abs(account.difference ?? 0) > 0.01 && (
                  <div className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Mogelijk ontbrekende transacties
                  </div>
                )}
              </div>
            )}

            {/* Start balance */}
            <div className="bg-gray-50 rounded-lg p-2.5">
              <div className="text-xs text-gray-400 mb-0.5">Beginwaarde</div>
              <div className="text-base font-semibold text-gray-600">{formatCurrency(account.startBalance)}</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1.5 shrink-0">
          <button
            onClick={() => setShowForm(f => !f)}
            className="btn-primary text-xs py-1.5 px-3"
          >
            <Plus className="w-3.5 h-3.5" />
            Waarde bijwerken
          </button>
          <button
            onClick={showHistory ? () => setShowHistory(false) : loadHistory}
            className="btn-secondary text-xs py-1.5 px-3"
          >
            Geschiedenis
          </button>
          <button
            onClick={() => { if (confirm(`Rekening "${account.name}" verwijderen?`)) onDelete(account.id) }}
            className="btn-danger text-xs py-1.5 px-3"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Snapshot entry form */}
      {showForm && (
        <SnapshotForm
          accountId={account.id}
          onSaved={() => { setShowForm(false); onRefresh() }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Snapshot history */}
      {showHistory && history.length > 0 && (
        <div className="mt-3 border-t border-gray-100 pt-3">
          <div className="text-xs font-medium text-gray-500 mb-2">Waardegeschiedenis</div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100">
                <th className="text-left pb-1">Datum</th>
                <th className="text-right pb-1">Waarde</th>
                <th className="text-left pb-1 pl-3">Notitie</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {history.map(s => (
                <tr key={s.id} className="border-b border-gray-50">
                  <td className="py-1.5">{formatDate(s.date)}</td>
                  <td className="py-1.5 text-right font-medium">{formatCurrency(s.value)}</td>
                  <td className="py-1.5 pl-3 text-gray-400">{s.notes ?? '—'}</td>
                  <td className="py-1.5 text-right">
                    <button
                      onClick={() => handleDeleteSnapshot(s.id)}
                      className="text-red-400 hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

interface AddAccountFormProps {
  onSaved: () => void
  onCancel: () => void
}

function AddAccountForm({ onSaved, onCancel }: AddAccountFormProps) {
  const [form, setForm] = useState({
    id: '',
    name: '',
    type: 'checking',
    iban: '',
    startBalance: '0',
    currency: 'EUR'
  })
  const [saving, setSaving] = useState(false)

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.id || !form.name) return
    setSaving(true)
    try {
      await api.createAccount({
        ...form,
        type: form.type as Account['type'],
        startBalance: parseFloat(form.startBalance.replace(',', '.')) || 0
      })
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card border-2 border-dashed border-blue-200">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Nieuwe rekening toevoegen</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">ID (uniek)</label>
          <input value={form.id} onChange={e => set('id', e.target.value.replace(/\s/g, '-').toLowerCase())}
            className="input" placeholder="bijv. ing-betaal" />
        </div>
        <div>
          <label className="label">Naam</label>
          <input value={form.name} onChange={e => set('name', e.target.value)} className="input" placeholder="ING Betaalrekening" />
        </div>
        <div>
          <label className="label">Type</label>
          <select value={form.type} onChange={e => set('type', e.target.value)} className="input">
            {ACCOUNT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">IBAN</label>
          <input value={form.iban} onChange={e => set('iban', e.target.value.toUpperCase())}
            className="input font-mono" placeholder="NL00INGB0000000000" />
        </div>
        <div>
          <label className="label">Beginwaarde (€)</label>
          <input value={form.startBalance} onChange={e => set('startBalance', e.target.value)} className="input" placeholder="0" />
        </div>
        <div>
          <label className="label">Valuta</label>
          <input value={form.currency} onChange={e => set('currency', e.target.value.toUpperCase())} className="input" placeholder="EUR" />
        </div>
      </div>
      <div className="flex gap-2 justify-end mt-3">
        <button onClick={onCancel} className="btn-secondary">Annuleren</button>
        <button onClick={handleSave} disabled={!form.id || !form.name || saving} className="btn-primary">
          {saving ? 'Opslaan...' : 'Toevoegen'}
        </button>
      </div>
    </div>
  )
}

export default function Controle() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await api.controle()
      setAccounts(res.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const handleDelete = async (id: string) => {
    await api.deleteAccount(id)
    setAccounts(a => a.filter(acc => acc.id !== id))
  }

  const totalNetWorth = accounts.reduce((sum, acc) => {
    const v = acc.currentValue ?? 0
    return sum + v
  }, 0)

  const byType = (type: string) => accounts.filter(a => a.type === type)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Controle</h1>
        <div className="flex items-center gap-2">
          <button onClick={loadData} className="btn-secondary" title="Verversen">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setShowAddForm(s => !s)} className="btn-primary">
            <Plus className="w-4 h-4" />
            Rekening toevoegen
          </button>
        </div>
      </div>

      {/* Net worth summary */}
      {accounts.length > 0 && (
        <div className="card bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <div className="text-sm font-medium opacity-80 mb-1">Totaal Vermogen</div>
          <div className="text-3xl font-bold">{formatCurrency(totalNetWorth)}</div>
          <div className="mt-3 grid grid-cols-3 gap-4 pt-3 border-t border-blue-500">
            {(['checking', 'savings', 'investment'] as const).map(type => {
              const sum = byType(type).reduce((s, a) => s + (a.currentValue ?? 0), 0)
              const typeLabel = ACCOUNT_TYPES.find(t => t.value === type)?.label ?? type
              return (
                <div key={type}>
                  <div className="text-xs opacity-70">{typeLabel}</div>
                  <div className="text-lg font-semibold">{formatCurrency(sum)}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {showAddForm && (
        <AddAccountForm
          onSaved={() => { setShowAddForm(false); loadData() }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-400">Laden...</div>
      ) : accounts.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <p className="text-lg font-medium mb-2">Nog geen rekeningen</p>
          <p className="text-sm">Voeg je rekeningen, spaarrekeningen en beleggingen toe.</p>
        </div>
      ) : (
        <>
          {(['checking', 'savings', 'investment', 'other'] as const).map(type => {
            const typeAccounts = byType(type)
            if (typeAccounts.length === 0) return null
            const typeLabel = ACCOUNT_TYPES.find(t => t.value === type)?.label ?? type
            return (
              <div key={type}>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{typeLabel}</h2>
                <div className="space-y-3">
                  {typeAccounts.map(acc => (
                    <AccountCard
                      key={acc.id}
                      account={acc}
                      onRefresh={loadData}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}
