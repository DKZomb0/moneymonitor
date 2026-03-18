import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer
} from 'recharts'
import { api } from '../utils/api'
import { formatCurrency, formatMonthShort, currentYear } from '../utils/format'
import type { YearlySummary } from '../types'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

const INCOME_COLOR = '#22c55e'
const EXPENSE_COLOR = '#ef4444'
const NET_COLOR = '#3b82f6'

function StatCard({ label, value, sub, positive }: {
  label: string; value: string; sub?: string; positive?: boolean
}) {
  return (
    <div className="card flex flex-col gap-1">
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</div>
      <div className={`text-2xl font-bold ${positive === true ? 'text-green-600' : positive === false ? 'text-red-600' : 'text-gray-900'}`}>
        {value}
      </div>
      {sub && <div className="text-xs text-gray-400">{sub}</div>}
    </div>
  )
}

const CUSTOM_TOOLTIP = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <div className="font-medium mb-1">{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-600">{p.name}:</span>
          <span className="font-medium">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function Overview() {
  const [years, setYears] = useState<string[]>([])
  const [selectedYear, setSelectedYear] = useState(currentYear())
  const [summary, setSummary] = useState<YearlySummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.years().then(r => {
      setYears(r.years)
      if (r.years.length > 0 && !r.years.includes(selectedYear)) {
        setSelectedYear(r.years[0])
      }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    api.yearlySummary(selectedYear).then(s => {
      setSummary(s)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [selectedYear])

  const chartData = summary?.byMonth.map(m => ({
    name: formatMonthShort(m.month),
    Inkomsten: Math.round(m.income * 100) / 100,
    Uitgaven: Math.round(m.expense * 100) / 100,
    Netto: Math.round(m.net * 100) / 100
  })) ?? []

  const pieData = summary?.byCategory
    .filter(c => c.expense > 0)
    .slice(0, 10)
    ?? []

  const PIE_COLORS = [
    '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
    '#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'
  ]

  const savingsRate = summary && summary.totalIncome > 0
    ? ((summary.totalIncome - summary.totalExpense) / summary.totalIncome * 100).toFixed(1)
    : null

  return (
    <div className="space-y-6">
      {/* Year selector */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Jaaroverzicht</h1>
        <div className="flex items-center gap-2">
          {years.map(y => (
            <button
              key={y}
              onClick={() => setSelectedYear(y)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                y === selectedYear
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-400">Laden...</div>
      ) : !summary || (summary.totalIncome === 0 && summary.totalExpense === 0) ? (
        <div className="card text-center py-16 text-gray-400">
          <p className="text-lg font-medium mb-2">Geen transacties gevonden</p>
          <p className="text-sm">Importeer CSV bestanden via het tabblad "Importeren".</p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              label="Totaal inkomsten"
              value={formatCurrency(summary.totalIncome)}
              positive={true}
            />
            <StatCard
              label="Totaal uitgaven"
              value={formatCurrency(summary.totalExpense)}
              positive={false}
            />
            <StatCard
              label="Netto"
              value={formatCurrency(summary.totalNet)}
              positive={summary.totalNet >= 0}
            />
            {savingsRate !== null && (
              <StatCard
                label="Spaarquote"
                value={`${savingsRate}%`}
                sub="van inkomsten gespaard"
                positive={Number(savingsRate) >= 0}
              />
            )}
          </div>

          {/* Monthly bar chart */}
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Inkomsten & Uitgaven per Maand</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `€${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CUSTOM_TOOLTIP />} />
                <Legend />
                <Bar dataKey="Inkomsten" fill={INCOME_COLOR} radius={[3, 3, 0, 0]} />
                <Bar dataKey="Uitgaven" fill={EXPENSE_COLOR} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Net per month */}
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Netto per Maand</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `€${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CUSTOM_TOOLTIP />} />
                <Bar dataKey="Netto" fill={NET_COLOR} radius={[3, 3, 0, 0]}
                  label={false}
                >
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.Netto >= 0 ? NET_COLOR : EXPENSE_COLOR} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Category breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie chart */}
            <div className="card">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Uitgaven per Categorie</h2>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="expense"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      innerRadius={50}
                      paddingAngle={2}
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number) => formatCurrency(v)}
                      labelFormatter={(l: string) => l}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
                  Geen categorieën beschikbaar
                </div>
              )}
            </div>

            {/* Category table */}
            <div className="card overflow-hidden">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Categorieën Samenvatting</h2>
              <div className="overflow-y-auto max-h-72">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 uppercase border-b border-gray-100">
                      <th className="text-left pb-2">Categorie</th>
                      <th className="text-right pb-2">Uitgaven</th>
                      <th className="text-right pb-2">Inkomsten</th>
                      <th className="text-right pb-2"># tx</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.byCategory.map((cat, i) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-2 font-medium text-gray-800">{cat.category}</td>
                        <td className="py-2 text-right text-red-600">
                          {cat.expense > 0 ? formatCurrency(cat.expense) : '—'}
                        </td>
                        <td className="py-2 text-right text-green-600">
                          {cat.income > 0 ? formatCurrency(cat.income) : '—'}
                        </td>
                        <td className="py-2 text-right text-gray-400">{cat.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
