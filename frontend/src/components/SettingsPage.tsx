import { useState, useEffect } from 'react'
import { Plus, Trash2, Save, RefreshCw, Tag, CreditCard, Info } from 'lucide-react'
import { api } from '../utils/api'
import type { Category, IbanConfig } from '../types'

// ── Category editor ────────────────────────────────────────────────────────────

function CategoryRow({
  cat,
  onChange,
  onDelete
}: {
  cat: Category
  onChange: (updated: Category) => void
  onDelete: () => void
}) {
  const set = (k: keyof Category, v: unknown) => onChange({ ...cat, [k]: v } as Category)

  return (
    <tr className="border-b border-gray-100 group align-top">
      <td className="py-2 pr-2">
        <input
          value={cat.name}
          onChange={e => set('name', e.target.value)}
          className="input text-sm py-1"
          placeholder="Naam"
        />
      </td>
      <td className="py-2 pr-2">
        <select
          value={cat.type}
          onChange={e => set('type', e.target.value)}
          className="input text-sm py-1"
        >
          <option value="income">Inkomsten</option>
          <option value="expense">Uitgave</option>
        </select>
      </td>
      <td className="py-2 pr-2">
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={cat.color || '#6b7280'}
            onChange={e => set('color', e.target.value)}
            className="h-8 w-10 rounded cursor-pointer border border-gray-200"
          />
          <span className="text-xs text-gray-400">{cat.color}</span>
        </div>
      </td>
      <td className="py-2 pr-2">
        <input
          value={cat.keywords.join(', ')}
          onChange={e => set('keywords', e.target.value.split(',').map(k => k.trim()).filter(Boolean))}
          className="input text-sm py-1 font-mono"
          placeholder="keyword1, keyword2, ..."
        />
      </td>
      <td className="py-2">
        <button onClick={onDelete} className="btn-danger py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Trash2 className="w-4 h-4" />
        </button>
      </td>
    </tr>
  )
}

function CategoriesTab() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [suggestions, setSuggestions] = useState<{ counterpartyName: string; count: number }[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  useEffect(() => {
    api.categories().then(r => { setCategories(r.data); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const handleChange = (i: number, updated: Category) => {
    setCategories(cats => cats.map((c, idx) => idx === i ? updated : c))
  }

  const handleDelete = (i: number) => {
    setCategories(cats => cats.filter((_, idx) => idx !== i))
  }

  const handleAdd = () => {
    setCategories(cats => [...cats, { name: 'Nieuwe categorie', type: 'expense', color: '#6b7280', keywords: [] }])
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.updateCategories(categories)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  const loadSuggestions = async () => {
    const res = await api.categorySuggestions()
    setSuggestions(res.data)
    setShowSuggestions(true)
  }

  const addKeyword = (catName: string, keyword: string) => {
    const normalized = keyword.toLowerCase()
    setCategories(cats => cats.map(c =>
      c.name === catName
        ? { ...c, keywords: [...new Set([...c.keywords, normalized])] }
        : c
    ))
  }

  if (loading) return <div className="text-gray-400">Laden...</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Categorieën</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Keywords worden vergeleken met de omschrijving en tegenpartijnaam van elke transactie (hoofdlettergevoelig: nee).
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadSuggestions} className="btn-secondary">
            <RefreshCw className="w-4 h-4" /> Suggesties
          </button>
          <button onClick={handleAdd} className="btn-secondary">
            <Plus className="w-4 h-4" /> Categorie
          </button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            <Save className="w-4 h-4" />
            {saved ? 'Opgeslagen!' : saving ? 'Opslaan...' : 'Opslaan'}
          </button>
        </div>
      </div>

      {/* Suggestions panel */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-2 mb-3">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-amber-800">Niet-gecategoriseerde tegenpartijen</div>
              <div className="text-xs text-amber-600">Klik op een categorie om de tegenpartij als keyword toe te voegen.</div>
            </div>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {suggestions.map((s, i) => (
              <div key={i} className="flex items-center gap-3 flex-wrap">
                <span className="text-sm font-medium text-gray-800 min-w-48">{s.counterpartyName}</span>
                <span className="text-xs text-gray-400">{s.count}x</span>
                <div className="flex flex-wrap gap-1">
                  {categories.map(cat => (
                    <button
                      key={cat.name}
                      onClick={() => addKeyword(cat.name, s.counterpartyName.toLowerCase())}
                      className="text-xs px-2 py-0.5 rounded border border-gray-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors"
                    >
                      → {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
              <th className="text-left pb-2 pr-2">Naam</th>
              <th className="text-left pb-2 pr-2">Type</th>
              <th className="text-left pb-2 pr-2">Kleur</th>
              <th className="text-left pb-2 pr-2">Keywords (komma-gescheiden)</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat, i) => (
              <CategoryRow
                key={i}
                cat={cat}
                onChange={updated => handleChange(i, updated)}
                onDelete={() => handleDelete(i)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── IBAN editor ────────────────────────────────────────────────────────────────

function IbansTab() {
  const [config, setConfig] = useState<IbanConfig>({ ibans: [], labels: {} })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [newIban, setNewIban] = useState('')
  const [newLabel, setNewLabel] = useState('')

  useEffect(() => {
    api.ibans().then(c => { setConfig(c); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const addIban = () => {
    const iban = newIban.toUpperCase().replace(/\s/g, '')
    if (!iban || config.ibans.includes(iban)) return
    setConfig(c => ({
      ibans: [...c.ibans, iban],
      labels: newLabel ? { ...c.labels, [iban]: newLabel } : c.labels
    }))
    setNewIban('')
    setNewLabel('')
  }

  const removeIban = (iban: string) => {
    setConfig(c => {
      const labels = { ...c.labels }
      delete labels[iban]
      return { ibans: c.ibans.filter(i => i !== iban), labels }
    })
  }

  const updateLabel = (iban: string, label: string) => {
    setConfig(c => ({ ...c, labels: { ...c.labels, [iban]: label } }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.updateIbans(config)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-gray-400">Laden...</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Eigen IBAN-nummers</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Transacties tussen deze rekeningen worden herkend als interne overboekingen en worden uitgesloten van het inkomsten/uitgaven-overzicht.
          </p>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          <Save className="w-4 h-4" />
          {saved ? 'Opgeslagen!' : saving ? 'Opslaan...' : 'Opslaan'}
        </button>
      </div>

      <div className="card">
        {config.ibans.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            Nog geen IBAN-nummers geconfigureerd
          </div>
        ) : (
          <table className="w-full mb-4">
            <thead>
              <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
                <th className="text-left pb-2">IBAN</th>
                <th className="text-left pb-2">Naam / Label</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {config.ibans.map(iban => (
                <tr key={iban} className="border-b border-gray-50">
                  <td className="py-2 pr-4 font-mono text-sm">{iban}</td>
                  <td className="py-2 pr-4">
                    <input
                      value={config.labels[iban] ?? ''}
                      onChange={e => updateLabel(iban, e.target.value)}
                      className="input text-sm py-1"
                      placeholder="Bijv. ING Betaalrekening"
                    />
                  </td>
                  <td className="py-2">
                    <button onClick={() => removeIban(iban)} className="text-red-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Add new */}
        <div className="border-t border-gray-100 pt-4">
          <div className="text-xs font-medium text-gray-500 mb-2">IBAN toevoegen</div>
          <div className="flex gap-2 flex-wrap">
            <input
              value={newIban}
              onChange={e => setNewIban(e.target.value)}
              className="input text-sm font-mono flex-1 min-w-48"
              placeholder="NL00INGB0000000000"
              onKeyDown={e => e.key === 'Enter' && addIban()}
            />
            <input
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              className="input text-sm flex-1 min-w-40"
              placeholder="Label (optioneel)"
              onKeyDown={e => e.key === 'Enter' && addIban()}
            />
            <button onClick={addIban} disabled={!newIban} className="btn-primary">
              <Plus className="w-4 h-4" /> Toevoegen
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Settings page ─────────────────────────────────────────────────────────

type SettingsTab = 'categories' | 'ibans'

export default function SettingsPage() {
  const [tab, setTab] = useState<SettingsTab>('categories')

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold text-gray-900">Instellingen</h1>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab('categories')}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === 'categories' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Tag className="w-4 h-4" /> Categorieën
        </button>
        <button
          onClick={() => setTab('ibans')}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === 'ibans' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <CreditCard className="w-4 h-4" /> Eigen IBANs
        </button>
      </div>

      {tab === 'categories' && <CategoriesTab />}
      {tab === 'ibans' && <IbansTab />}
    </div>
  )
}
