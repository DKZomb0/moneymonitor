import { useState, useEffect } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer
} from 'recharts'
import { api } from '../utils/api'
import { formatCurrency, formatDate } from '../utils/format'
import type { NetWorthPoint } from '../types'

const LINE_COLORS = [
  '#3b82f6', '#22c55e', '#8b5cf6', '#f59e0b', '#ef4444',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6b7280'
]

export default function NetWorthPage() {
  const [data, setData] = useState<NetWorthPoint[]>([])
  const [accountNames, setAccountNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.netWorth().then(res => {
      setData(res.data)
      setAccountNames(res.accountNames)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const accountIds = data.length > 0
    ? Object.keys(data[data.length - 1].breakdown)
    : []

  const chartData = data.map(point => ({
    date: formatDate(point.date),
    Totaal: Math.round(point.total * 100) / 100,
    ...Object.fromEntries(
      Object.entries(point.breakdown).map(([id, v]) => [
        accountNames[id] || id,
        Math.round(v * 100) / 100
      ])
    )
  }))

  const latest = data[data.length - 1]

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Vermogensontwikkeling</h1>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-400">Laden...</div>
      ) : data.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <p className="text-lg font-medium mb-2">Geen vermogensdata beschikbaar</p>
          <p className="text-sm">Voeg rekening-waarden toe via het tabblad "Controle" om de ontwikkeling te volgen.</p>
        </div>
      ) : (
        <>
          {/* Latest snapshot */}
          {latest && (
            <div className="card bg-gradient-to-r from-blue-600 to-blue-700 text-white">
              <div className="text-sm opacity-80 mb-1">Huidig totaal vermogen</div>
              <div className="text-3xl font-bold">{formatCurrency(latest.total)}</div>
              <div className="text-xs opacity-60 mt-1">Stand per {formatDate(latest.date)}</div>
            </div>
          )}

          {/* Line chart */}
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Vermogen over tijd</h2>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `€${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="Totaal"
                  stroke="#1d4ed8"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                {accountIds.map((id, i) => (
                  <Line
                    key={id}
                    type="monotone"
                    dataKey={accountNames[id] || id}
                    stroke={LINE_COLORS[(i + 1) % LINE_COLORS.length]}
                    strokeWidth={1.5}
                    strokeDasharray="4 2"
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Data table */}
          {data.length > 0 && (
            <div className="card overflow-x-auto">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Historische waarden</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
                    <th className="text-left pb-2">Datum</th>
                    {accountIds.map(id => (
                      <th key={id} className="text-right pb-2">{accountNames[id] || id}</th>
                    ))}
                    <th className="text-right pb-2 font-bold">Totaal</th>
                  </tr>
                </thead>
                <tbody>
                  {[...data].reverse().map((point, i) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2">{formatDate(point.date)}</td>
                      {accountIds.map(id => (
                        <td key={id} className="py-2 text-right text-gray-600">
                          {point.breakdown[id] != null ? formatCurrency(point.breakdown[id]) : '—'}
                        </td>
                      ))}
                      <td className="py-2 text-right font-semibold text-blue-700">
                        {formatCurrency(point.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
