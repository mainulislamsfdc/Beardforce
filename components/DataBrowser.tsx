import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Search, ChevronUp, ChevronDown, Database, RefreshCw } from 'lucide-react';
import { databaseService, initializeDatabase } from '../services/database';
import { useAuth } from '../context/AuthContext';
import type { TableSchema } from '../services/database/DatabaseAdapter';

const VALID_TABLES = ['leads', 'contacts', 'accounts', 'opportunities', 'orders', 'products'];
const ROWS_PER_PAGE = 20;

const formatColumnName = (name: string): string =>
  name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

const formatCellValue = (value: any, type: string): string => {
  if (value === null || value === undefined) return '—';
  switch (type) {
    case 'timestamp':
      return new Date(value).toLocaleString();
    case 'date':
      return new Date(value).toLocaleDateString();
    case 'boolean':
      return value ? 'Yes' : 'No';
    case 'json':
      return typeof value === 'object' ? JSON.stringify(value) : String(value);
    case 'decimal':
      return Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    case 'integer':
      return Number(value).toLocaleString();
    default: {
      const s = String(value);
      return s.length > 80 ? s.substring(0, 80) + '…' : s;
    }
  }
};

const TABLE_FETCHERS: Record<string, (f?: any[]) => Promise<any[]>> = {
  leads: (f) => databaseService.getLeads(f),
  contacts: (f) => databaseService.getContacts(f),
  accounts: (f) => databaseService.getAccounts(f),
  opportunities: (f) => databaseService.getOpportunities(f),
  orders: (f) => databaseService.getOrders(f),
  products: (f) => databaseService.getProducts(f),
};

export const DataBrowser: React.FC = () => {
  const { tableName } = useParams<{ tableName: string }>();
  const { user } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [schema, setSchema] = useState<TableSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const loadingRef = useRef(false);

  const loadTableData = useCallback(async () => {
    if (!tableName || !VALID_TABLES.includes(tableName)) {
      setError(`Unknown table: ${tableName}`);
      setLoading(false);
      return;
    }
    if (!user || loadingRef.current) return;
    loadingRef.current = true;
    try {
      setLoading(true);
      setError(null);
      await initializeDatabase(user.id);
      const [tableSchema, tableData] = await Promise.all([
        databaseService.getAdapter().getTableSchema(tableName),
        TABLE_FETCHERS[tableName](),
      ]);
      setSchema(tableSchema);
      setData(tableData);
    } catch (err: any) {
      setError(err.message || 'Failed to load table data');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [tableName, user?.id]);

  useEffect(() => {
    setSearchTerm('');
    setSortColumn(null);
    setCurrentPage(1);
    loadTableData();
  }, [loadTableData]);

  // Filter visible columns (hide user_id, show id shortened)
  const visibleColumns = useMemo(() => {
    if (!schema) return [];
    return schema.columns.filter(c => c.name !== 'user_id');
  }, [schema]);

  // Search
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const term = searchTerm.toLowerCase();
    return data.filter(row =>
      visibleColumns.some(col => {
        const v = row[col.name];
        if (v === null || v === undefined) return false;
        return String(v).toLowerCase().includes(term);
      })
    );
  }, [data, searchTerm, visibleColumns]);

  // Sort
  const sortedData = useMemo(() => {
    if (!sortColumn) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      return sortDirection === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
  }, [filteredData, sortColumn, sortDirection]);

  // Paginate
  const totalPages = Math.ceil(sortedData.length / ROWS_PER_PAGE);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ROWS_PER_PAGE;
    return sortedData.slice(start, start + ROWS_PER_PAGE);
  }, [sortedData, currentPage]);

  // Reset page on search/sort change
  useEffect(() => { setCurrentPage(1); }, [searchTerm, sortColumn, sortDirection]);

  const handleSort = (colName: string) => {
    if (sortColumn === colName) {
      setSortDirection(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(colName);
      setSortDirection('asc');
    }
  };

  if (!tableName || !VALID_TABLES.includes(tableName)) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-900 text-gray-400">
        <Database size={64} className="mb-4 text-gray-600" />
        <p className="text-xl font-semibold text-gray-300">Table not found</p>
        <p className="text-sm mt-2">Select a table from the sidebar.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white capitalize flex items-center gap-2">
            <Database size={22} className="text-blue-400" />
            {tableName}
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {data.length} record{data.length !== 1 ? 's' : ''}
            {filteredData.length !== data.length && ` · ${filteredData.length} matching`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input
              type="text"
              placeholder={`Search ${tableName}…`}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 w-64 border border-gray-600 rounded-lg bg-gray-700 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={loadTableData}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition"
            title="Refresh"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mt-4 bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg">
          <p className="font-semibold">Error loading data</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400" />
          </div>
        ) : paginatedData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Database size={64} className="mb-4 text-gray-600" />
            <p className="text-xl font-semibold text-gray-300">No data found</p>
            <p className="text-sm mt-2">
              {searchTerm ? 'No results match your search.' : 'This table is empty.'}
            </p>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-800 border-b border-gray-700">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 w-10">#</th>
                    {visibleColumns.map(col => (
                      <th
                        key={col.name}
                        onClick={() => handleSort(col.name)}
                        className="px-4 py-3 text-left text-xs font-semibold text-gray-400 hover:text-gray-200 cursor-pointer select-none whitespace-nowrap"
                      >
                        <div className="flex items-center gap-1">
                          {formatColumnName(col.name)}
                          {sortColumn === col.name && (
                            sortDirection === 'asc'
                              ? <ChevronUp size={14} className="text-blue-400" />
                              : <ChevronDown size={14} className="text-blue-400" />
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((row, idx) => (
                    <tr
                      key={row.id || idx}
                      className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors"
                    >
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {(currentPage - 1) * ROWS_PER_PAGE + idx + 1}
                      </td>
                      {visibleColumns.map(col => (
                        <td
                          key={col.name}
                          className={`px-4 py-3 text-gray-300 whitespace-nowrap ${
                            col.name === 'id' ? 'font-mono text-xs text-gray-500' : ''
                          }`}
                          title={col.name === 'id' ? String(row[col.name]) : undefined}
                        >
                          {col.name === 'id'
                            ? String(row[col.name] || '').substring(0, 8) + '…'
                            : formatCellValue(row[col.name], col.type)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && sortedData.length > ROWS_PER_PAGE && (
        <div className="bg-gray-800 border-t border-gray-700 px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-gray-400">
            Showing {(currentPage - 1) * ROWS_PER_PAGE + 1}–{Math.min(currentPage * ROWS_PER_PAGE, sortedData.length)} of {sortedData.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm bg-gray-700 text-gray-300 rounded hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Previous
            </button>
            <span className="text-sm text-gray-400">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="px-3 py-1.5 text-sm bg-gray-700 text-gray-300 rounded hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
