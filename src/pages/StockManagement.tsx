import { useEffect, useState, useCallback } from 'react';
import api from '../utils/api';
import Layout from '../components/Layout';
import { DatePicker } from '../components/ui/date-picker';
import { Select } from '../components/ui/select';
import { Input } from '../components/ui/input';
import { CollapsibleFilters, FilterActions } from '../components/ui/collapsible-filters';
import { formatNumberWithUnit, formatDate } from '../utils/format';
import type { StockData, StockHistory } from '../types';

export default function StockManagement() {
  const [stockData, setStockData] = useState<StockData[]>([]);
  const [history, setHistory] = useState<StockHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRiceType, setSelectedRiceType] = useState<string>('all');
  const [showHistory, setShowHistory] = useState(false);
  const [stockSearch, setStockSearch] = useState('');
  const [historyFilters, setHistoryFilters] = useState<{
    startDate?: string;
    endDate?: string;
    type?: 'all' | 'incoming' | 'outgoing';
  }>({});

  useEffect(() => {
    fetchStockData();
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (historyFilters.startDate) params.startDate = historyFilters.startDate;
      if (historyFilters.endDate) params.endDate = historyFilters.endDate;
      if (historyFilters.type && historyFilters.type !== 'all') params.type = historyFilters.type;
      if (selectedRiceType !== 'all') {
        const response = await api.get(`/stock/history/${selectedRiceType}`, { params });
        setHistory(response.data);
      } else {
        const response = await api.get('/stock/history', { params: Object.keys(params).length ? params : undefined });
        setHistory(response.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load history');
    }
  }, [selectedRiceType, historyFilters.startDate, historyFilters.endDate, historyFilters.type]);

  useEffect(() => {
    if (showHistory) {
      fetchHistory();
    }
  }, [showHistory, fetchHistory]);

  const fetchStockData = async () => {
    try {
      const response = await api.get('/stock/current');
      setStockData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Gagal memuat data stok');
    } finally {
      setLoading(false);
    }
  };



  return (
    <Layout>
      <div className="px-4 py-6 sm:px-0">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Manajemen Stok</h1>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
          >
            {showHistory ? 'Tampilkan Stok Saat Ini' : 'Tampilkan Riwayat'}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {!showHistory ? (
          <>
            <CollapsibleFilters
              label="Filters"
              activeCount={stockSearch.trim() ? 1 : 0}
              defaultOpen={false}
              className="mb-6"
            >
              <Input
                label="Search Rice Type"
                value={stockSearch}
                onChange={(e) => setStockSearch(e.target.value)}
                placeholder="Search by name..."
              />
              <FilterActions>
                <button
                  onClick={() => setStockSearch('')}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Clear
                </button>
              </FilterActions>
            </CollapsibleFilters>
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
            {loading ? (
              <div className="text-center py-8 text-gray-500">Memuat...</div>
            ) : (() => {
              const filtered = stockData.filter((s) =>
                !stockSearch.trim() ||
                s.riceType.name.toLowerCase().includes(stockSearch.trim().toLowerCase())
              );
              return filtered.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {stockSearch.trim() ? 'No rice types match your search' : 'No stock data'}
                </div>
              ) : (
              <ul className="divide-y divide-gray-200">
                {filtered.map((stock) => (
                  <li key={stock.riceType.id}>
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center">
                            <p className="text-sm font-medium text-gray-900">
                              {stock.riceType.name}
                            </p>
                          </div>
                          <p className="mt-1 text-sm text-gray-500">
                            {stock.riceType.description || 'Tidak ada deskripsi'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p
                            className={`text-lg font-semibold ${stock.currentStock < (stock.riceType.unit === 'kg' ? 1000 : 20)
                              ? 'text-red-600'
                              : 'text-gray-900'
                              }`}
                          >
                            {formatNumberWithUnit(stock.currentStock, stock.riceType.unit)}
                          </p>
                          <button
                            onClick={() => {
                              setSelectedRiceType(stock.riceType.id);
                              setShowHistory(true);
                            }}
                            className="mt-1 text-sm text-primary-600 hover:text-primary-900"
                          >
                            Lihat Riwayat
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              );
            })()}
          </div>
          </>
        ) : (
          <div>
            <CollapsibleFilters
              label="Filters"
              activeCount={
                (selectedRiceType !== 'all' ? 1 : 0) +
                (historyFilters.startDate ? 1 : 0) +
                (historyFilters.endDate ? 1 : 0) +
                (historyFilters.type && historyFilters.type !== 'all' ? 1 : 0)
              }
              defaultOpen={false}
              className="mb-6"
            >
              <Select
                label="Rice Type"
                value={selectedRiceType}
                onChange={(v) => setSelectedRiceType(v || 'all')}
                placeholder="All rice types"
                options={[
                  { value: 'all', label: 'All rice types' },
                  ...stockData.map((s) => ({ value: s.riceType.id, label: s.riceType.name })),
                ]}
              />
              <DatePicker
                label="Start Date"
                value={historyFilters.startDate || ''}
                onChange={(d) => setHistoryFilters({ ...historyFilters, startDate: d || undefined })}
                placeholder="Select start date"
                maxDate={historyFilters.endDate ? new Date(historyFilters.endDate) : new Date()}
              />
              <DatePicker
                label="End Date"
                value={historyFilters.endDate || ''}
                onChange={(d) => setHistoryFilters({ ...historyFilters, endDate: d || undefined })}
                placeholder="Select end date"
                maxDate={new Date()}
              />
              <Select
                label="Type"
                value={historyFilters.type || 'all'}
                onChange={(v) =>
                  setHistoryFilters({
                    ...historyFilters,
                    type: (v || 'all') as 'all' | 'incoming' | 'outgoing',
                  })
                }
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'incoming', label: 'Incoming' },
                  { value: 'outgoing', label: 'Outgoing' },
                ]}
              />
              <FilterActions>
                <button
                  onClick={() => {
                    setSelectedRiceType('all');
                    setHistoryFilters({ startDate: undefined, endDate: undefined, type: undefined });
                  }}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Clear filters
                </button>
              </FilterActions>
            </CollapsibleFilters>

            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tanggal
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Jenis Beras
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tipe
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Jumlah
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {history.map((record) => (
                      <tr key={record.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(record.date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.riceType?.name || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${record.type === 'incoming'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                              }`}
                          >
                            {record.type === 'incoming' ? 'Pemasukan' : 'Penjualan'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatNumberWithUnit(record.quantity, record.riceType?.unit || 'kg')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {history.length === 0 && (
                <div className="text-center py-8 text-gray-500">Tidak ada riwayat ditemukan</div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
