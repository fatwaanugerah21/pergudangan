import { useEffect, useState } from 'react';
import api from '../utils/api';
import type { ReportItem, RiceType, Supplier } from '../types';
import Layout from '../components/Layout';
import { DatePicker } from '../components/ui/date-picker';
import { Select } from '../components/ui/select';
import { Tooltip } from '../components/ui/tooltip';
import { CollapsibleFilters, FilterActions } from '../components/ui/collapsible-filters';
import { formatNumberWithUnit, formatDateTime } from '../utils/format';

interface Destination {
  id: string;
  name: string;
  type: string;
}

/** Get display name for supplier (incoming) or destination (outgoing); API returns full objects. */
function getPartnerName(item: ReportItem): string {
  if (item.transactionType === 'incoming') {
    const s = (item as ReportItem & { supplier?: { name?: string } }).supplier;
    return (typeof s === 'object' && s && 'name' in s ? s.name : null) ?? '-';
  }
  const d = (item as ReportItem & { destination?: { name?: string } }).destination;
  return (typeof d === 'object' && d && 'name' in d ? d.name : null) ?? '-';
}

export default function Reports() {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [riceTypes, setRiceTypes] = useState<RiceType[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<{
    startDate: string;
    endDate: string;
    type: 'all' | 'incoming' | 'outgoing';
    riceTypeId?: string;
    supplierId?: string;
    destinationId?: string;
  }>({
    startDate: '',
    endDate: '',
    type: 'all',
  });

  useEffect(() => {
    Promise.all([
      api.get<RiceType[]>('/rice-types'),
      api.get<Supplier[]>('/suppliers'),
      api.get<Destination[]>('/destinations', { params: { type: 'customer' } }),
    ])
      .then(([rt, s, d]) => {
        setRiceTypes(rt.data);
        setSuppliers(s.data);
        setDestinations(d.data);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetchReports();
  }, [filters]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.type !== 'all') params.type = filters.type;
      if (filters.riceTypeId) params.riceTypeId = filters.riceTypeId;
      if (filters.supplierId) params.supplierId = filters.supplierId;
      if (filters.destinationId) params.destinationId = filters.destinationId;

      const response = await api.get('/reports', { params });
      setReports(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Tanggal', 'Tipe', 'Jenis Beras', 'Jumlah', 'Satuan', 'Pemasok/Tujuan', 'Catatan'];
    const rows = reports.map((item) => [
      formatDateTime(item.date),
      item.transactionType === 'incoming' ? 'Pemasukan' : 'Penjualan',
      item.riceType?.name || '-',
      item.quantity.toString(),
      item.riceType?.unit || 'kg',
      getPartnerName(item),
      item.notes || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `rice-warehouse-report-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToExcel = () => {
    // Simple Excel export using CSV format (can be enhanced with a library like xlsx)
    exportToCSV();
  };

  return (
    <Layout>
      <div className="px-4 py-6 sm:px-0">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Laporan</h1>
          <div className="flex space-x-2">
            <button
              onClick={exportToCSV}
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
            >
              Ekspor CSV
            </button>
            <button
              onClick={exportToExcel}
              className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
            >
              Ekspor Excel
            </button>
          </div>
        </div>

        <CollapsibleFilters
          label="Filters"
          activeCount={
            (filters.startDate ? 1 : 0) +
            (filters.endDate ? 1 : 0) +
            (filters.type !== 'all' ? 1 : 0) +
            (filters.riceTypeId ? 1 : 0) +
            (filters.supplierId ? 1 : 0) +
            (filters.destinationId ? 1 : 0)
          }
          defaultOpen={false}
          className="mb-6"
        >
          <DatePicker
            label="Start Date"
            value={filters.startDate}
            onChange={(date) => setFilters({ ...filters, startDate: date })}
            placeholder="Select start date"
            maxDate={filters.endDate ? new Date(filters.endDate) : new Date()}
          />
          <DatePicker
            label="End Date"
            value={filters.endDate}
            onChange={(date) => setFilters({ ...filters, endDate: date })}
            placeholder="Select end date"
            maxDate={new Date()}
          />
          <Select
            label="Type"
            value={filters.type}
            onChange={(value) =>
              setFilters({
                ...filters,
                type: value as 'all' | 'incoming' | 'outgoing',
              })
            }
            options={[
              { value: 'all', label: 'All' },
              { value: 'incoming', label: 'Incoming' },
              { value: 'outgoing', label: 'Outgoing' },
            ]}
          />
          <Select
            label="Rice Type"
            value={filters.riceTypeId || ''}
            onChange={(value) =>
              setFilters({ ...filters, riceTypeId: value || undefined })
            }
            placeholder="All rice types"
            options={[
              { value: '', label: 'All rice types' },
              ...riceTypes.map((rt) => ({ value: rt.id, label: rt.name })),
            ]}
          />
          <Select
            label="Supplier (Incoming)"
            value={filters.supplierId || ''}
            onChange={(value) =>
              setFilters({ ...filters, supplierId: value || undefined })
            }
            placeholder="All suppliers"
            options={[
              { value: '', label: 'All suppliers' },
              ...suppliers.map((s) => ({ value: s.id, label: s.name })),
            ]}
          />
          <Select
            label="Customer (Outgoing)"
            value={filters.destinationId || ''}
            onChange={(value) =>
              setFilters({ ...filters, destinationId: value || undefined })
            }
            placeholder="All customers"
            options={[
              { value: '', label: 'All customers' },
              ...destinations.map((d) => ({ value: d.id, label: d.name })),
            ]}
          />
          <FilterActions className="sm:col-span-2 lg:col-span-4 xl:col-span-5">
            <button
              onClick={() =>
                setFilters({
                  startDate: '',
                  endDate: '',
                  type: 'all',
                  riceTypeId: undefined,
                  supplierId: undefined,
                  destinationId: undefined,
                })
              }
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Clear filters
            </button>
          </FilterActions>
        </CollapsibleFilters>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-8 text-gray-500">Memuat...</div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tanggal
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipe
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Jenis Beras
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Jumlah
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pemasok / Tujuan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Catatan
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reports.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDateTime(item.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.transactionType === 'incoming'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                            }`}
                        >
                          {item.transactionType === 'incoming' ? 'Pemasukan' : 'Penjualan'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.riceType?.name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatNumberWithUnit(item.quantity, item.riceType?.unit || 'kg')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getPartnerName(item)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 w-[180px] max-w-[180px]">
                        <div className="overflow-hidden min-w-0">
                          <Tooltip content={item.notes || '-'}>
                            <span className="block truncate cursor-default text-ellipsis overflow-hidden whitespace-nowrap">
                              {item.notes || '-'}
                            </span>
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {reports.length === 0 && (
              <div className="text-center py-8 text-gray-500">Tidak ada laporan ditemukan</div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
