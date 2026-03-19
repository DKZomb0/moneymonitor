import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Tag, Edit2, Check, X } from 'lucide-react'
import { api } from '../utils/api'
import { formatCurrency, formatDate, formatMonth, currentYearMonth, amountColor } from '../utils/format'
import type { MonthlyDetail, Transaction, Category } from '../types'

function CategoryBadge({ category }: { category: string | null }) {
  const label = category === '__internal__' ? 'Intern' : (category ?? 'Onbekend')
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 whitespace-nowrap">
      {label}
    </span>
  )
}

function CategoryEditor({
  transaction,
  categories,
  onSave,
  onCancel
}: {
  transaction: Transaction
  categories: Category[]
  onSave: (cat: string) => void
  onCancel: () => void
}) {
  const [selected, setSelected] = useState(transaction.category ?? '')
  return (
    <div className="flex items-center gap-2">
      <select
        value={selected}
        onChange={e => setSelected(e.target.value)}
        className="text-xs border border-blue-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
        autoFocus
      >
        <option value="">— Geen categorie —</option>
        {categories.map(c => (
          <option key={c.name} value={c.name}>{c.name}</option>
        ))}
      </select>
      <button onClick={() => onSave(selected)} className="text-green-600 hover:text-green-700">
        <Check className="w-4 h-4" />
      </button>
      <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

function TransactionRow({
  tx,
  categories,
  onCategoryChanged
}: {
  tx: Transaction
  categories: Category[]
  onCategoryChanged: (id: string, cat: string) => void
}) {
  const [editing, setEditing] = useState(false)

  const handleSave = async (cat: string) => {
    await api.overrideCategory(tx.id, cat)
    onCategoryChanged(tx.id, cat)
    setEditing(false)
  }

  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50 group">
      <td className="py-2.5 px-3 text-sm text-gray-500 whitespace-nowrap">{formatDate(tx.date)}</td>
      <td className="py-2.5 px-3 text-sm text-gray-800 max-w-xs">
        <div className="truncate">{tx.counterpartyName || tx.description}</div>
        {tx.counterpartyName && tx.description && tx.description !== tx.counterpartyName && (
          <div className="text-xs text-gray-400 truncate">{tx.description}</div>
        )}
      </td>
      <td className="py-2.5 px-3">
        {editing ? (
          <CategoryEditor
            transaction={tx}
            categories={categories}
            onSave={handleSave}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <div className="flex items-center gap-2">
            <CategoryBadge category={tx.category} />
            {tx.hasOverride && <span className="text-xs text-amber-500">*</span>}
            <button
              onClick={() => setEditing(true)}
              className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 transition-opacity"
              title="Categorie wijzigen"
            >
              <Edit2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </td>
      <td className={`py-2.5 px-3 text-sm font-medium text-right whitespace-nowrap ${amountColor(tx.amount)}`}>
        {formatCurrency(tx.amount)}
      </td>
    </tr>
  )
}

function prevMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  if (m === 1) return `${y - 1}-12`
  return `${y}-${String(m - 1).padStart(2, '0')}`
}

function nextMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  if (m === 12) return `${y + 1}-01`
  return `${y}-${String(m + 1).padStart(2, '0')}`
}

export default function MonthlyView() {
  const [yearMonth, setYearMonth] = useState(currentYearMonth())
  const [detail, setDetail] = useState<MonthlyDetail | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [localTx, setLocalTx] = useState<Transaction[]>([])
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  useEffect(() => {
    api.categories().then(r => setCategories(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    api.monthlyDetail(yearMonth).then(d => {
      setDetail(d)
      setLocalTx(d.transactions)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [yearMonth])

  const handleCategoryChanged = (id: string, cat: string) => {
    setLocalTx(prev => prev.map(t => t.id === id ? { ...t, category: cat, hasOverride: true } : t))
    if (detail) {
      setDetail(prev => {
        if (!prev) return prev
        const updated = prev.byCategory.map(bc => ({
          ...bc,
          transactions: bc.transactions.map(t => t.id === id ? { ...t, category: cat } : t)
        }))
        return { ...prev, byCategory: updated }
      })
    }
  }

  const totalIncome = localTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = localTx.filter(t => t.type === 'expense').reduce((s, t) => s + Math.abs(t.amount), 0)
  const netAmount = totalIncome - totalExpense

  const displayTx = activeCategory
    ? localTx.filter(t => t.category === activeCategory)
    : localTx

  return (
    <div className="space-y-5">
      {/* Header with month navigation */}
      <div className="flex items-center justify-between">
        <button onClick={() => setYearMonth(prevMonth(yearMonth))} className="btn-secondary">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900 capitalize">
          {formatMonth(yearMonth)}
        </h1>
        <button onClick={() => setYearMonth(nextMonth(yearMonth))} className="btn-secondary">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-400">Laden...</div>
      ) : (
        <>
          {/* Summary row */}
          <div className="grid grid-cols-3 gap-4">
            <div className="card text-center">
              <div className="text-xs text-gray-500 mb-1">Inkomsten</div>
              <div className="text-xl font-bold text-green-600">{formatCurrency(totalIncome)}</div>
            </div>
            <div className="card text-center">
              <div className="text-xs text-gray-500 mb-1">Uitgaven</div>
              <div className="text-xl font-bold text-red-600">{formatCurrency(totalExpense)}</div>
            </div>
            <div className="card text-center">
              <div className="text-xs text-gray-500 mb-1">Netto</div>
              <div className={`text-xl font-bold ${netAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(netAmount)}
              </div>
            </div>
          </div>

          {localTx.length === 0 ? (
            <div className="card text-center py-12 text-gray-400">
              Geen transacties in {formatMonth(yearMonth)}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Category sidebar */}
              <div className="card lg:col-span-1 h-fit">
                <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Tag className="w-4 h-4" /> Categorieën
                </h2>
                <div className="space-y-1">
                  <button
                    onClick={() => setActiveCategory(null)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors
                      ${activeCategory === null ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-50 text-gray-700'}`}
                  >
                    <span>Alle transacties</span>
                    <span className="text-gray-400">{localTx.length}</span>
                  </button>
                  {detail?.byCategory.map(bc => (
                    <button
                      key={bc.category}
                      onClick={() => setActiveCategory(bc.category === activeCategory ? null : bc.category)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors
                        ${activeCategory === bc.category ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-50 text-gray-700'}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="truncate">{bc.category === '__internal__' ? 'Intern' : bc.category}</span>
                        <span className="text-gray-400 ml-2 shrink-0">{bc.transactions.length}</span>
                      </div>
                      <div className="flex justify-between text-xs mt-0.5">
                        {bc.expense > 0 && <span className="text-red-500">-{formatCurrency(bc.expense)}</span>}
                        {bc.income > 0 && <span className="text-green-500">+{formatCurrency(bc.income)}</span>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Transaction list */}
              <div className="card lg:col-span-2 overflow-hidden">
                <h2 className="text-sm font-semibold text-gray-700 mb-3">
                  {activeCategory ? (activeCategory === '__internal__' ? 'Interne transfers' : activeCategory) : 'Alle transacties'}
                  <span className="text-gray-400 font-normal ml-2">({displayTx.length})</span>
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
                        <th className="text-left pb-2 px-3">Datum</th>
                        <th className="text-left pb-2 px-3">Beschrijving</th>
                        <th className="text-left pb-2 px-3">Categorie</th>
                        <th className="text-right pb-2 px-3">Bedrag</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayTx.map(tx => (
                        <TransactionRow
                          key={tx.id}
                          tx={tx}
                          categories={categories}
                          onCategoryChanged={handleCategoryChanged}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
