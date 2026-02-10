import React, { useState, useCallback } from 'react'
import { X, Upload, ArrowRight, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react'
import { parseCSV, validateRows, importBatch, type ParseResult, type ValidationError } from '../services/importExport'

interface ImportModalProps {
  tableName: string
  tableColumns: string[]
  onClose: () => void
  onImportComplete: () => void
}

type Step = 'upload' | 'map' | 'validate' | 'result'

const ImportModal: React.FC<ImportModalProps> = ({ tableName, tableColumns, onClose, onImportComplete }) => {
  const [step, setStep] = useState<Step>('upload')
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({})
  const [validRows, setValidRows] = useState<Record<string, any>[]>([])
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [importResult, setImportResult] = useState<{ imported: number; failed: number } | null>(null)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')

  // Columns available for mapping (exclude system columns)
  const mappableColumns = tableColumns.filter(c => !['id', 'user_id', 'created_at', 'updated_at'].includes(c))

  const handleFileSelect = useCallback(async (file: File) => {
    setError('')
    try {
      const result = await parseCSV(file)
      if (result.rows.length === 0) {
        setError('CSV file is empty or has no data rows')
        return
      }
      setParseResult(result)

      // Auto-map columns by matching names (case-insensitive)
      const autoMapping: Record<string, string> = {}
      result.headers.forEach(header => {
        const lower = header.toLowerCase().replace(/[\s_-]+/g, '_')
        const match = mappableColumns.find(col => col.toLowerCase() === lower)
        if (match) autoMapping[header] = match
        else autoMapping[header] = ''
      })
      setColumnMapping(autoMapping)
      setStep('map')
    } catch (err: any) {
      setError(`Failed to parse CSV: ${err.message}`)
    }
  }, [mappableColumns])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.name.endsWith('.csv')) handleFileSelect(file)
    else setError('Please drop a .csv file')
  }, [handleFileSelect])

  const handleValidate = () => {
    if (!parseResult) return
    const { valid, errors } = validateRows(parseResult.rows, tableColumns, columnMapping)
    setValidRows(valid)
    setValidationErrors(errors)
    setStep('validate')
  }

  const handleImport = async () => {
    setImporting(true)
    try {
      const result = await importBatch(tableName, validRows)
      setImportResult(result)
      setStep('result')
      if (result.imported > 0) onImportComplete()
    } catch (err: any) {
      setError(`Import failed: ${err.message}`)
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <div>
            <h2 className="text-white font-semibold">Import Data to {tableName}</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {step === 'upload' ? 'Step 1: Upload CSV' : step === 'map' ? 'Step 2: Map Columns' : step === 'validate' ? 'Step 3: Validate' : 'Import Complete'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300"><X size={20} /></button>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mt-4 px-4 py-2 bg-red-900/30 border border-red-700 text-red-400 rounded-lg text-sm flex items-center gap-2">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
              className="border-2 border-dashed border-gray-600 rounded-xl p-12 text-center hover:border-orange-500/50 transition"
            >
              <Upload size={48} className="mx-auto text-gray-500 mb-4" />
              <p className="text-gray-300 mb-2">Drag & drop a CSV file here</p>
              <p className="text-gray-500 text-sm mb-4">or</p>
              <label className="cursor-pointer px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg transition">
                Browse Files
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) handleFileSelect(file)
                  }}
                />
              </label>
              <p className="text-gray-600 text-xs mt-4">Supported format: .csv with headers</p>
            </div>
          )}

          {/* Step 2: Column Mapping */}
          {step === 'map' && parseResult && (
            <div>
              <p className="text-gray-400 text-sm mb-4">
                Found {parseResult.rows.length} rows and {parseResult.headers.length} columns. Map CSV columns to database fields:
              </p>
              <div className="space-y-2">
                {parseResult.headers.map(header => (
                  <div key={header} className="flex items-center gap-3">
                    <span className="w-1/3 text-sm text-gray-300 truncate font-mono bg-gray-700/50 px-2 py-1.5 rounded">{header}</span>
                    <ArrowRight size={16} className="text-gray-500 flex-shrink-0" />
                    <select
                      value={columnMapping[header] || ''}
                      onChange={e => setColumnMapping(prev => ({ ...prev, [header]: e.target.value }))}
                      className="flex-1 bg-gray-700 border border-gray-600 text-gray-300 text-sm rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="">-- Skip --</option>
                      {mappableColumns.map(col => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {/* Preview */}
              <div className="mt-6">
                <h4 className="text-gray-400 text-xs uppercase tracking-wider mb-2">Preview (first 3 rows)</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-700">
                        {parseResult.headers.map(h => (
                          <th key={h} className="text-left text-gray-500 px-2 py-1">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parseResult.rows.slice(0, 3).map((row, i) => (
                        <tr key={i} className="border-b border-gray-700/50">
                          {parseResult.headers.map(h => (
                            <td key={h} className="text-gray-400 px-2 py-1 truncate max-w-[120px]">{String(row[h] ?? '')}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Validate */}
          {step === 'validate' && (
            <div>
              <div className="flex items-center gap-6 mb-6">
                <div className="flex items-center gap-2">
                  <CheckCircle size={20} className="text-green-400" />
                  <span className="text-green-400 font-medium">{validRows.length} valid rows</span>
                </div>
                {validationErrors.length > 0 && (
                  <div className="flex items-center gap-2">
                    <AlertCircle size={20} className="text-amber-400" />
                    <span className="text-amber-400 font-medium">{validationErrors.length} warnings</span>
                  </div>
                )}
              </div>

              {validationErrors.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-gray-400 text-xs uppercase tracking-wider mb-2">Validation Issues</h4>
                  <div className="max-h-40 overflow-y-auto bg-gray-900 rounded-lg p-3">
                    {validationErrors.slice(0, 20).map((err, i) => (
                      <div key={i} className="text-xs text-amber-400/80 py-0.5">
                        Row {err.row}: {err.field} — {err.message}
                      </div>
                    ))}
                    {validationErrors.length > 20 && (
                      <div className="text-xs text-gray-500 mt-1">...and {validationErrors.length - 20} more</div>
                    )}
                  </div>
                </div>
              )}

              {validRows.length > 0 && (
                <p className="text-gray-400 text-sm">
                  Ready to import {validRows.length} records into <span className="text-white font-medium">{tableName}</span>.
                  {validationErrors.length > 0 ? ' Rows with warnings will be skipped.' : ''}
                </p>
              )}

              {validRows.length === 0 && (
                <p className="text-red-400 text-sm">No valid rows to import. Please go back and check your column mapping.</p>
              )}
            </div>
          )}

          {/* Step 4: Result */}
          {step === 'result' && importResult && (
            <div className="text-center py-8">
              <CheckCircle size={48} className="mx-auto text-green-400 mb-4" />
              <h3 className="text-white text-lg font-semibold mb-2">Import Complete</h3>
              <p className="text-gray-400">
                <span className="text-green-400 font-medium">{importResult.imported}</span> records imported
                {importResult.failed > 0 && (
                  <>, <span className="text-red-400 font-medium">{importResult.failed}</span> failed</>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-700">
          <div>
            {(step === 'map' || step === 'validate') && (
              <button
                onClick={() => setStep(step === 'validate' ? 'map' : 'upload')}
                className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-400 hover:text-white transition"
              >
                <ArrowLeft size={16} /> Back
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {step === 'result' ? (
              <button onClick={onClose} className="px-4 py-2 text-sm bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition">
                Done
              </button>
            ) : step === 'map' ? (
              <button
                onClick={handleValidate}
                disabled={!Object.values(columnMapping).some(v => v)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Validate <ArrowRight size={16} />
              </button>
            ) : step === 'validate' ? (
              <button
                onClick={handleImport}
                disabled={validRows.length === 0 || importing}
                className="flex items-center gap-1.5 px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>Import {validRows.length} Records</>
                )}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ImportModal
