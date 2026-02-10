import React, { useState, useRef, useEffect } from 'react'
import { Download, ChevronDown } from 'lucide-react'
import { exportToCSV, exportToJSON } from '../services/importExport'

interface ExportButtonProps {
  tableName: string
  data: Record<string, any>[]
  columns?: string[]
}

const ExportButton: React.FC<ExportButtonProps> = ({ tableName, data, columns }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        disabled={data.length === 0}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg border border-gray-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Download size={16} />
        Export
        <ChevronDown size={14} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-40 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden z-50">
          <button
            onClick={() => { exportToCSV(tableName, data, columns); setOpen(false) }}
            className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700 transition"
          >
            Export as CSV
          </button>
          <button
            onClick={() => { exportToJSON(tableName, data); setOpen(false) }}
            className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700 border-t border-gray-700 transition"
          >
            Export as JSON
          </button>
        </div>
      )}
    </div>
  )
}

export default ExportButton
