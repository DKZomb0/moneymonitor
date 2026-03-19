import { useState, useCallback } from 'react'
import { Upload, FileText, CheckCircle, AlertCircle, FolderOpen } from 'lucide-react'
import { api } from '../utils/api'
import { formatCurrency, formatDate } from '../utils/format'

interface UploadResult {
  filename: string
  parsed: number
  preview: { date: string; counterpartyName: string; amount: number }[]
  error?: string
}

export default function UploadPage({ onUploaded }: { onUploaded: () => void }) {
  const [dragging, setDragging] = useState(false)
  const [results, setResults] = useState<UploadResult[]>([])
  const [uploading, setUploading] = useState(false)

  const processFile = async (file: File) => {
    const content = await file.text()
    try {
      const res = await api.uploadCsv(file.name, content)
      return {
        filename: file.name,
        parsed: res.parsed,
        preview: res.preview as any
      }
    } catch (err: any) {
      return { filename: file.name, parsed: 0, preview: [], error: err.message }
    }
  }

  const processFiles = async (files: FileList | File[]) => {
    setUploading(true)
    const arr = Array.from(files)
    const newResults: UploadResult[] = []
    for (const file of arr) {
      const result = await processFile(file)
      newResults.push(result)
    }
    setResults(r => [...newResults, ...r])
    setUploading(false)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    processFiles(e.dataTransfer.files)
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) processFiles(e.target.files)
    e.target.value = ''
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Transacties importeren</h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload CSV-exportbestanden van je bank. Ondersteunde formaten: ING, Rabobank, ABN AMRO, KBC/CBC, Belfius, en generiek CSV.
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors ${
          dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300 bg-white'
        }`}
      >
        <Upload className={`w-10 h-10 mx-auto mb-3 ${dragging ? 'text-blue-500' : 'text-gray-300'}`} />
        <div className="text-sm font-medium text-gray-700 mb-1">
          Sleep bestanden hiernaartoe of klik om te uploaden
        </div>
        <div className="text-xs text-gray-400 mb-4">Ondersteunt .csv en .txt bankexports</div>
        <label className="btn-primary cursor-pointer">
          <FileText className="w-4 h-4" />
          Bestanden kiezen
          <input type="file" accept=".csv,.txt" multiple onChange={handleFileChange} className="hidden" />
        </label>
      </div>

      {/* Folder tip */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-lg p-4">
        <FolderOpen className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700">
          <div className="font-medium mb-0.5">Automatisch inladen via map</div>
          Je kunt ook CSV-bestanden rechtstreeks in de <code className="bg-blue-100 px-1 rounded">input/</code> map plaatsen.
          De server laadt ze automatisch in bij elke pagina-aanvraag.
        </div>
      </div>

      {uploading && (
        <div className="text-center text-sm text-gray-500 py-4">Verwerken...</div>
      )}

      {/* Results */}
      {results.map((r, i) => (
        <div key={i} className={`card border ${r.error ? 'border-red-200' : 'border-green-200'}`}>
          <div className="flex items-start gap-3 mb-3">
            {r.error
              ? <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              : <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
            }
            <div className="flex-1">
              <div className="font-medium text-gray-900">{r.filename}</div>
              {r.error
                ? <div className="text-sm text-red-600 mt-0.5">{r.error}</div>
                : <div className="text-sm text-green-600 mt-0.5">{r.parsed} transacties ingelezen</div>
              }
            </div>
          </div>

          {r.preview.length > 0 && (
            <div className="border-t border-gray-100 pt-3">
              <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">Voorbeeld (eerste 5)</div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 border-b border-gray-100">
                    <th className="text-left pb-1">Datum</th>
                    <th className="text-left pb-1">Tegenpartij</th>
                    <th className="text-right pb-1">Bedrag</th>
                  </tr>
                </thead>
                <tbody>
                  {r.preview.map((p, j) => (
                    <tr key={j} className="border-b border-gray-50">
                      <td className="py-1">{formatDate(p.date)}</td>
                      <td className="py-1 text-gray-600">{p.counterpartyName || '—'}</td>
                      <td className={`py-1 text-right font-medium ${p.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(p.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}

      {results.some(r => !r.error) && (
        <div className="flex justify-end">
          <button onClick={onUploaded} className="btn-primary">
            Bekijk overzicht →
          </button>
        </div>
      )}
    </div>
  )
}
