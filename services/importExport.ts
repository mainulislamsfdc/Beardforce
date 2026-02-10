import Papa from 'papaparse'
import { databaseService } from './database'

// ============================================================================
// EXPORT
// ============================================================================

function triggerDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function exportToCSV(tableName: string, data: Record<string, any>[], columns?: string[]) {
  if (data.length === 0) return

  const filteredData = columns
    ? data.map(row => {
        const filtered: Record<string, any> = {}
        columns.forEach(col => { filtered[col] = row[col] })
        return filtered
      })
    : data.map(row => {
        const { user_id, ...rest } = row
        return rest
      })

  const csv = Papa.unparse(filteredData)
  const timestamp = new Date().toISOString().split('T')[0]
  triggerDownload(csv, `${tableName}_${timestamp}.csv`, 'text/csv;charset=utf-8;')
}

export function exportToJSON(tableName: string, data: Record<string, any>[]) {
  if (data.length === 0) return

  const filteredData = data.map(row => {
    const { user_id, ...rest } = row
    return rest
  })

  const json = JSON.stringify(filteredData, null, 2)
  const timestamp = new Date().toISOString().split('T')[0]
  triggerDownload(json, `${tableName}_${timestamp}.json`, 'application/json')
}

// ============================================================================
// IMPORT
// ============================================================================

export interface ParseResult {
  headers: string[]
  rows: Record<string, any>[]
  errors: Papa.ParseError[]
}

export function parseCSV(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        resolve({
          headers: results.meta.fields || [],
          rows: results.data as Record<string, any>[],
          errors: results.errors,
        })
      },
      error: (error: Error) => reject(error),
    })
  })
}

export interface ValidationError {
  row: number
  field: string
  message: string
}

export function validateRows(
  rows: Record<string, any>[],
  tableColumns: string[],
  columnMapping: Record<string, string>
): { valid: Record<string, any>[]; errors: ValidationError[] } {
  const valid: Record<string, any>[] = []
  const errors: ValidationError[] = []

  rows.forEach((row, idx) => {
    const mapped: Record<string, any> = {}
    let hasData = false

    Object.entries(columnMapping).forEach(([csvCol, dbCol]) => {
      if (dbCol && row[csvCol] !== undefined && row[csvCol] !== null && row[csvCol] !== '') {
        mapped[dbCol] = row[csvCol]
        hasData = true
      }
    })

    if (!hasData) {
      errors.push({ row: idx + 1, field: '-', message: 'Empty row (no mapped data)' })
      return
    }

    // Skip system columns
    delete mapped.id
    delete mapped.user_id
    delete mapped.created_at
    delete mapped.updated_at

    // Check that mapped fields exist in table schema
    Object.keys(mapped).forEach(key => {
      if (!tableColumns.includes(key)) {
        errors.push({ row: idx + 1, field: key, message: `Unknown column "${key}"` })
        delete mapped[key]
      }
    })

    valid.push(mapped)
  })

  return { valid, errors }
}

export async function importBatch(
  tableName: string,
  records: Record<string, any>[]
): Promise<{ imported: number; failed: number }> {
  const BATCH_SIZE = 50
  let imported = 0
  let failed = 0

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE)
    try {
      const adapter = databaseService.getAdapter()
      await adapter.createMany(tableName, batch.map(r => ({
        ...r,
        user_id: databaseService.getUserId(),
      })))
      imported += batch.length
    } catch (err) {
      console.error(`Import batch failed at offset ${i}:`, err)
      failed += batch.length
    }
  }

  return { imported, failed }
}
