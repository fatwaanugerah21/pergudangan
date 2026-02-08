import { useEffect, useState, useCallback } from 'react';
import api from '../utils/api';
import Layout from '../components/Layout';
import { Select } from '../components/ui/select';
import { DatePicker } from '../components/ui/date-picker';
import { CollapsibleFilters, FilterActions } from '../components/ui/collapsible-filters';
import { useToast } from '../contexts/ToastContext';
import { formatDateTime, formatNumberWithUnit } from '../utils/format';
import { FaSort, FaSortUp, FaSortDown } from 'react-icons/fa';
import type { DeliveryOrder } from '../types';

type DeliverySortField = 'scheduledDate' | 'destination' | 'riceType' | 'quantity' | 'address' | 'status' | null;

const STATUS_LABELS: Record<string, string> = {
  pending: 'Belum Diantar',
  dispatched: 'Dikirim',
  delivered: 'Sampai',
  cancelled: 'Dibatalkan',
};

export default function DeliveryOrders() {
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<DeliverySortField>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);
  const [filters, setFilters] = useState<{ status?: string; startDate?: string; endDate?: string }>({});
  const { showSuccess, showError } = useToast();

  const fetchOrders = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (filters.status) params.status = filters.status;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      const response = await api.get<DeliveryOrder[]>('/delivery-orders', { params });
      setOrders(response.data);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
        : null;
      showError(msg || 'Gagal memuat order pengantaran');
    } finally {
      setLoading(false);
    }
  }, [filters.status, filters.startDate, filters.endDate, showError]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      await api.put(`/delivery-orders/${orderId}`, { status: newStatus });
      showSuccess('Status berhasil diperbarui');
      fetchOrders();
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
        : null;
      showError(msg || 'Gagal memperbarui status');
    }
  };

  const activeFilterCount =
    (filters.status ? 1 : 0) + (filters.startDate ? 1 : 0) + (filters.endDate ? 1 : 0);

  const toggleSort = (field: DeliverySortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedOrders = [...orders].sort((a, b) => {
    if (!sortField || !sortDirection) return 0;
    let aVal: string | number;
    let bVal: string | number;
    switch (sortField) {
      case 'scheduledDate':
        aVal = new Date(a.scheduledDeliveryDate || 0).getTime();
        bVal = new Date(b.scheduledDeliveryDate || 0).getTime();
        break;
      case 'destination':
        aVal = a.destination?.name ?? '';
        bVal = b.destination?.name ?? '';
        break;
      case 'riceType':
        aVal = a.riceType?.name ?? '';
        bVal = b.riceType?.name ?? '';
        break;
      case 'quantity':
        aVal = a.quantity;
        bVal = b.quantity;
        break;
      case 'address':
        aVal = a.deliveryAddress || a.destination?.alamat || '';
        bVal = b.deliveryAddress || b.destination?.alamat || '';
        break;
      case 'status':
        aVal = a.status ?? '';
        bVal = b.status ?? '';
        break;
      default:
        return 0;
    }
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const SortableTh = ({ field, label, title }: { field: DeliverySortField; label: string; title?: string }) => (
    <th
      className="px-4 py-3 font-medium whitespace-nowrap cursor-pointer hover:bg-gray-100 text-gray-600"
      onClick={() => field != null && toggleSort(field)}
      title={title}
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
    <Layout>
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Order Pengantaran</h1>
          <p className="text-sm text-gray-500 mt-1">Order pengantaran dibuat dari penjualan (Tanggal Pengantaran).</p>
        </div>

        <CollapsibleFilters
          label="Filter"
          activeCount={activeFilterCount}
          defaultOpen={activeFilterCount > 0}
          className="mb-6"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <Select
              label="Status"
              value={filters.status ?? ''}
              onChange={(v) => setFilters((prev) => ({ ...prev, status: v || undefined }))}
              placeholder="Semua status"
              options={[
                { value: '', label: 'Semua status' },
                { value: 'pending', label: 'Menunggu' },
                { value: 'dispatched', label: 'Dikirim' },
                { value: 'delivered', label: 'Sampai' },
                { value: 'cancelled', label: 'Dibatalkan' },
              ]}
            />
            <DatePicker
              label="Dari Tanggal"
              value={filters.startDate ?? ''}
              onChange={(d: string) => setFilters((prev) => ({ ...prev, startDate: d || undefined }))}
              placeholder="Pilih tanggal awal"
              maxDate={filters.endDate ? new Date(filters.endDate) : undefined}
            />
            <DatePicker
              label="Sampai Tanggal"
              value={filters.endDate ?? ''}
              onChange={(d: string) => setFilters((prev) => ({ ...prev, endDate: d || undefined }))}
              placeholder="Pilih tanggal akhir"
              minDate={filters.startDate ? new Date(filters.startDate) : undefined}
            />
            <FilterActions className="sm:col-span-2 lg:col-span-1">
              <button
                type="button"
                onClick={() => setFilters({})}
                disabled={activeFilterCount === 0}
                className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Hapus filter
              </button>
            </FilterActions>
          </div>
        </CollapsibleFilters>

        {loading ? (
          <div className="py-12 text-center text-gray-500">Memuat...</div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-500">
            Tidak ada order pengantaran.
          </div>
        ) : (
          <div className="bg-white shadow rounded-xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <SortableTh field="scheduledDate" label="Tanggal Pengantaran (Jadwal)" title="Tanggal jadwal pengantaran ke pelanggan" />
                    <SortableTh field="destination" label="Tujuan" />
                    <SortableTh field="riceType" label="Produk" />
                    <SortableTh field="quantity" label="Jumlah" />
                    <SortableTh field="address" label="Alamat" />
                    <SortableTh field="status" label="Status" />
                  </tr>
                </thead>
                <tbody>
                  {sortedOrders.map((order) => (
                    <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">{formatDateTime(order.scheduledDeliveryDate)}</td>
                      <td className="px-4 py-3 text-gray-900">{order.destination?.name ?? '-'}</td>
                      <td className="px-4 py-3 text-gray-900">{order.riceType?.name ?? '-'}</td>
                      <td className="px-4 py-3 font-medium">{formatNumberWithUnit(order.quantity, 'kg')}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">
                        {order.deliveryAddress || order.destination?.alamat || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <Select
                          value={order.status}
                          onChange={(v) => handleStatusChange(order.id, v)}
                          options={Object.entries(STATUS_LABELS).map(([val, lbl]) => ({ value: val, label: lbl }))}
                          className="min-w-[140px]"
                          dropdownInPortal
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
