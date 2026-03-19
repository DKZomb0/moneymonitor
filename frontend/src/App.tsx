import { useState, useEffect } from 'react'
import { BarChart3, Calendar, Shield, Settings, Upload, TrendingUp } from 'lucide-react'
import Overview from './components/Overview'
import MonthlyView from './components/MonthlyView'
import Controle from './components/Controle'
import SettingsPage from './components/SettingsPage'
import UploadPage from './components/UploadPage'
import NetWorthPage from './components/NetWorthPage'
import { api } from './utils/api'

type Tab = 'overview' | 'monthly' | 'controle' | 'networth' | 'upload' | 'settings'

const TABS: { id: Tab; label: string; Icon: React.FC<{ className?: string }> }[] = [
  { id: 'overview', label: 'Overzicht', Icon: BarChart3 },
  { id: 'monthly', label: 'Maandoverzicht', Icon: Calendar },
  { id: 'controle', label: 'Controle', Icon: Shield },
  { id: 'networth', label: 'Vermogen', Icon: TrendingUp },
  { id: 'upload', label: 'Importeren', Icon: Upload },
  { id: 'settings', label: 'Instellingen', Icon: Settings }
]

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [health, setHealth] = useState<{ transactionCount: number; inputFiles: string[] } | null>(null)

  useEffect(() => {
    api.health().then(setHealth).catch(() => setHealth(null))
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold text-gray-900">Money Monitor</span>
            </div>
            {health !== null && (
              <div className="text-xs text-gray-500">
                {health.transactionCount > 0
                  ? `${health.transactionCount.toLocaleString('nl-NL')} transacties geladen`
                  : 'Geen transacties — importeer CSV bestanden'}
              </div>
            )}
          </div>
          {/* Navigation */}
          <nav className="flex gap-1 -mb-px overflow-x-auto">
            {TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                  ${activeTab === id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'overview' && <Overview />}
        {activeTab === 'monthly' && <MonthlyView />}
        {activeTab === 'controle' && <Controle />}
        {activeTab === 'networth' && <NetWorthPage />}
        {activeTab === 'upload' && <UploadPage onUploaded={() => setActiveTab('overview')} />}
        {activeTab === 'settings' && <SettingsPage />}
      </main>
    </div>
  )
}
