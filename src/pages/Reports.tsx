import { useEffect, useState } from 'react';
import api from '../utils/api';
import type { ReportItem, RiceType, Supplier } from '../types';
import Layout from '../components/Layout';
import { DatePicker } from '../components/ui/date-picker';
import { Select } from '../components/ui/select';
import { Tooltip } from '../components/ui/tooltip';
import { CollapsibleFilters, FilterActions } from '../components/ui/collapsible-filters';
import { formatNumberWithUnit, formatDateTime } from '../utils/format';
import { FaSort, FaSortUp, FaSortDown } from 'react-icons/fa';

type ReportSortField = 'date' | 'type' | 'riceType' | 'quantity' | 'partner' | null;

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
    paymentStatus?: string;
  }>({
    startDate: '',
    endDate: '',
    type: 'all',
  });
  const [sortField, setSortField] = useState<ReportSortField>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);

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
      if (filters.paymentStatus && (filters.type === 'outgoing' || filters.type === 'all'))
        params.paymentStatus = filters.paymentStatus;

      const response = await api.get('/reports', { params });
      setReports(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Gagal memuat laporan');
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
          label="Filter"
          activeCount={
            (filters.startDate ? 1 : 0) +
            (filters.endDate ? 1 : 0) +
            (filters.type !== 'all' ? 1 : 0) +
            (filters.riceTypeId ? 1 : 0) +
            (filters.supplierId ? 1 : 0) +
            (filters.destinationId ? 1 : 0) +
            (filters.paymentStatus ? 1 : 0)
          }
          defaultOpen={false}
          className="mb-6"
        >
          <DatePicker
            label="Dari Tanggal"
            value={filters.startDate}
            onChange={(date) => setFilters({ ...filters, startDate: date })}
            placeholder="Pilih tanggal awal"
            maxDate={filters.endDate ? new Date(filters.endDate) : new Date()}
          />
          <DatePicker
            label="Sampai Tanggal"
            value={filters.endDate}
            onChange={(date) => setFilters({ ...filters, endDate: date })}
            placeholder="Pilih tanggal akhir"
            maxDate={new Date()}
          />
          <Select
            label="Tipe"
            value={filters.type}
            onChange={(value) =>
              setFilters({
                ...filters,
                type: value as 'all' | 'incoming' | 'outgoing',
              })
            }
            options={[
              { value: 'all', label: 'Semua' },
              { value: 'incoming', label: 'Pemasukan' },
              { value: 'outgoing', label: 'Pengeluaran' },
            ]}
          />
          <Select
            label="Jenis Beras"
            value={filters.riceTypeId || ''}
            onChange={(value) =>
              setFilters({ ...filters, riceTypeId: value || undefined })
            }
            placeholder="Semua jenis beras"
            options={[
              { value: '', label: 'Semua jenis beras' },
              ...riceTypes.map((rt) => ({ value: rt.id, label: rt.name })),
            ]}
          />
          <Select
            label="Pemasok (Pemasukan)"
            value={filters.supplierId || ''}
            onChange={(value) =>
              setFilters({ ...filters, supplierId: value || undefined })
            }
            placeholder="Semua pemasok"
            options={[
              { value: '', label: 'Semua pemasok' },
              ...suppliers.map((s) => ({ value: s.id, label: s.name })),
            ]}
          />
          <Select
            label="Pelanggan (Pengeluaran)"
            value={filters.destinationId || ''}
            onChange={(value) =>
              setFilters({ ...filters, destinationId: value || undefined })
            }
            placeholder="Semua pelanggan"
            options={[
              { value: '', label: 'Semua pelanggan' },
              ...destinations.map((d) => ({ value: d.id, label: d.name })),
            ]}
          />
          {(filters.type === 'outgoing' || filters.type === 'all') && (
            <Select
              label="Status Pembayaran"
              value={filters.paymentStatus || ''}
              onChange={(value) =>
                setFilters({ ...filters, paymentStatus: value || undefined })
              }
              placeholder="Semua"
              options={[
                { value: '', label: 'Semua' },
                { value: 'full', label: 'Lunas' },
                { value: 'unpaid', label: 'Masih Utang' },
              ]}
            />
          )}
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
                  paymentStatus: undefined,
                })
              }
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Hapus filter
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
                    {(() => {
                      const toggleSort = (field: ReportSortField) => {
                        if (sortField === field) {
                          setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortField(field);
                          setSortDirection('asc');
                        }
                      };
                      const SortableTh = ({ field, label }: { field: ReportSortField; label: string }) => (
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => field != null && toggleSort(field)}
                        >
                          <div className="flex items-center gap-2">
                            {label}
                            {sortField === field ? (
                              sortDirection === 'asc' ? (
                                <FaSortUp className="h-3 w-3" />
                              ) : (
                                <FaSortDown className="h-3 w-3" />
                              )
                            ) : (
                              <FaSort className="h-3 w-3 text-gray-400" />
                            )}
                          </div>
                        </th>
                      );
                      return (
                        <>
                          <SortableTh field="date" label="Tanggal" />
                          <SortableTh field="type" label="Tipe" />
                          <SortableTh field="riceType" label="Jenis Beras" />
                          <SortableTh field="quantity" label="Jumlah" />
                          <SortableTh field="partner" label="Pemasok / Tujuan" />
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Catatan
                          </th>
                        </>
                      );
                    })()}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {[...reports]
                    .sort((a, b) => {
                      if (!sortField || !sortDirection) return 0;
                      let aVal: string | number;
                      let bVal: string | number;
                      switch (sortField) {
                        case 'date':
                          aVal = new Date(a.date).getTime();
                          bVal = new Date(b.date).getTime();
                          break;
                        case 'type':
                          aVal = a.transactionType ?? '';
                          bVal = b.transactionType ?? '';
                          break;
                        case 'riceType':
                          aVal = a.riceType?.name ?? '';
                          bVal = b.riceType?.name ?? '';
                          break;
                        case 'quantity':
                          aVal = a.quantity;
                          bVal = b.quantity;
                          break;
                        case 'partner':
                          aVal = getPartnerName(a);
                          bVal = getPartnerName(b);
                          break;
                        default:
                          return 0;
                      }
                      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
                      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
                      return 0;
                    })
                    .map((item) => (
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
