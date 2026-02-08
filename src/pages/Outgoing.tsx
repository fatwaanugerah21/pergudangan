import { useEffect, useState, useCallback } from 'react';
import api from '../utils/api';
import type { OutgoingTransaction, RiceType, Installment } from '../types';
import Layout from '../components/Layout';
import { DateTimePicker } from '../components/ui/datetime-picker';
import { Select } from '../components/ui/select';
import { Input } from '../components/ui/input';
import { NumberInput } from '../components/ui/number-input';
import { DatePicker } from '../components/ui/date-picker';
import { Modal } from '../components/ui/modal';
import { ConfirmDialog } from '../components/ui/confirm-dialog';
import { Tooltip } from '../components/ui/tooltip';
import { CreatableSelect } from '../components/ui/creatable-select';
import { CollapsibleFilters, FilterActions } from '../components/ui/collapsible-filters';
import { useToast } from '../contexts/ToastContext';
import { formatNumberWithUnit, formatDateTime, formatCurrency, toLocalDateTimeString } from '../utils/format';
import { FaEdit, FaTrash, FaSort, FaSortUp, FaSortDown, FaList } from 'react-icons/fa';

interface Destination {
  id: string;
  name: string;
  type: string;
}

export default function Outgoing() {
  const [transactions, setTransactions] = useState<OutgoingTransaction[]>([]);
  const [riceTypes, setRiceTypes] = useState<RiceType[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [stockData, setStockData] = useState<Array<{ riceType: RiceType; currentStock: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<'date' | 'riceType' | 'quantity' | 'destination' | 'totalAmount' | 'paymentAmount' | 'remainingDebt' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);

  const getRemainingDebt = (tx: OutgoingTransaction): number => {
    const total = (tx as { totalAmount?: number | null }).totalAmount ?? tx.paymentAmount ?? 0;
    const paid = tx.paymentAmount ?? 0;
    return Math.max(0, total - paid);
  };

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortableTh = ({ field, label }: { field: typeof sortField; label: string }) => (
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
  const [filters, setFilters] = useState<{
    riceTypeId?: string;
    destinationId?: string;
    startDate?: string;
    endDate?: string;
    minQuantity?: string;
    maxQuantity?: string;
    notesSearch?: string;
    paymentStatus?: string;
  }>({});
  const [showModal, setShowModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editing, setEditing] = useState<OutgoingTransaction | null>(null);
  const { showSuccess, showError } = useToast();
  const [formData, setFormData] = useState({
    date: toLocalDateTimeString(),
    riceTypeId: '',
    quantity: '',
    destinationId: '',
    totalAmount: '',
    paymentAmount: '',
    scheduledDeliveryDate: '',
    notes: '',
  });
  const [showInstallmentsModal, setShowInstallmentsModal] = useState(false);
  const [installmentsForTx, setInstallmentsForTx] = useState<OutgoingTransaction | null>(null);
  const [installmentsList, setInstallmentsList] = useState<Installment[]>([]);
  const [loadingInstallments, setLoadingInstallments] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const fetchTransactions = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.riceTypeId) params.riceTypeId = filters.riceTypeId;
      if (filters.destinationId) params.destinationId = filters.destinationId;
      if (filters.paymentStatus) params.paymentStatus = filters.paymentStatus;
      const response = await api.get('/outgoing', { params });
      setTransactions(response.data);
    } catch (err: any) {
      showError(err.response?.data?.error || 'Gagal memuat transaksi');
    } finally {
      setLoading(false);
    }
  }, [filters.startDate, filters.endDate, filters.riceTypeId, filters.destinationId, filters.paymentStatus, showError]);

  useEffect(() => {
    setLoading(true);
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    fetchRiceTypes();
    fetchStockData();
    fetchDestinations();
  }, []);

  const fetchRiceTypes = async () => {
    try {
      const response = await api.get('/rice-types');
      setRiceTypes(response.data);
    } catch (err: any) {
      console.error('Failed to fetch rice types:', err);
    }
  };

  const fetchStockData = async () => {
    try {
      const response = await api.get('/stock/current');
      setStockData(response.data);
    } catch (err: any) {
      console.error('Failed to fetch stock data:', err);
    }
  };

  const fetchDestinations = async () => {
    try {
      const response = await api.get('/destinations', { params: { type: 'customer' } });
      setDestinations(response.data);
    } catch (err: any) {
      console.error('Failed to fetch destinations:', err);
    }
  };

  const openInstallmentsList = async (tx: OutgoingTransaction) => {
    setInstallmentsForTx(tx);
    setShowInstallmentsModal(true);
    setLoadingInstallments(true);
    try {
      const res = await api.get<Installment[]>('/installments', {
        params: { outgoingTransactionId: tx.id },
      });
      setInstallmentsList(res.data);
    } catch {
      setInstallmentsList([]);
      showError('Gagal memuat daftar cicilan');
    } finally {
      setLoadingInstallments(false);
    }
  };

  const closeInstallmentsModal = () => {
    setShowInstallmentsModal(false);
    setInstallmentsForTx(null);
    setInstallmentsList([]);
  };

  const createDestination = async (name: string): Promise<string> => {
    try {
      const response = await api.post('/destinations', { name, type: 'customer' });
      // Add to destinations list if not already there
      if (!destinations.find((d) => d.id === response.data.id)) {
        setDestinations([...destinations, response.data]);
      }
      return response.data.id;
    } catch (err: any) {
      showError(err.response?.data?.error || 'Gagal membuat pelanggan');
      throw err;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: Record<string, string> = {};
    if (!formData.date?.trim()) errors.date = 'Tanggal & Waktu wajib diisi.';
    if (!formData.riceTypeId?.trim()) errors.riceTypeId = 'Jenis Beras wajib dipilih.';
    const qtyNum = formData.quantity ? parseFloat(formData.quantity.replace(/,/g, '')) : NaN;
    if (!formData.quantity?.trim() || isNaN(qtyNum) || qtyNum <= 0) errors.quantity = 'Jumlah (Kg) wajib diisi dan harus lebih dari 0.';
    if (!formData.destinationId?.trim()) errors.destinationId = 'Pelanggan wajib dipilih.';
    const totalNum = formData.totalAmount ? parseFloat(formData.totalAmount.replace(/,/g, '')) : NaN;
    if (!formData.totalAmount?.trim() || isNaN(totalNum) || totalNum <= 0) {
      errors.totalAmount = 'Jumlah Tagihan (Rp) wajib diisi dan harus lebih dari 0.';
    }
    const paymentNum = formData.paymentAmount != null && formData.paymentAmount !== '' ? parseFloat(String(formData.paymentAmount).replace(/,/g, '')) : NaN;
    if (formData.paymentAmount == null || formData.paymentAmount === '' || isNaN(paymentNum)) {
      errors.paymentAmount = 'Uang Diterima (Rp) wajib diisi.';
    } else if (paymentNum < 0 || paymentNum > (isNaN(totalNum) ? Infinity : totalNum)) {
      errors.paymentAmount = 'Uang Diterima (Rp) harus antara 0 dan jumlah tagihan.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});

    // Validate stock before submitting
    if (formData.riceTypeId && formData.quantity) {
      const selectedStock = stockData.find((stock) => stock.riceType.id === formData.riceTypeId);
      const quantityNum = parseFloat(formData.quantity.replace(/,/g, ''));

      if (selectedStock) {
        // If editing, add back the existing transaction quantity
        let availableStock = selectedStock.currentStock;
        if (editing && editing.riceTypeId === formData.riceTypeId) {
          availableStock += editing.quantity;
        }

        if (availableStock < quantityNum) {
          const unit = selectedStock.riceType.unit || 'kg';
          showError(
            `Stok tidak mencukupi. Stok tersedia: ${formatNumberWithUnit(availableStock, unit)}, jumlah yang diminta: ${formatNumberWithUnit(quantityNum, unit)}`
          );
          return;
        }
      }
    }

    try {
      const payload = {
        ...formData,
        totalAmount: formData.totalAmount,
        paymentAmount: formData.paymentAmount || '0',
        scheduledDeliveryDate: formData.scheduledDeliveryDate || undefined,
        destinationId: formData.destinationId || undefined,
      };

      if (editing) {
        await api.put(`/outgoing/${editing.id}`, payload);
        showSuccess('Transaksi penjualan berhasil diperbarui');
      } else {
        await api.post('/outgoing', payload);
        showSuccess('Transaksi penjualan berhasil ditambahkan');
      }
      setShowModal(false);
      setEditing(null);
      setFormData({
        date: toLocalDateTimeString(),
        riceTypeId: '',
        quantity: '',
        destinationId: '',
        totalAmount: '',
        paymentAmount: '',
        scheduledDeliveryDate: '',
        notes: '',
      });
      setFormErrors({});
      fetchTransactions();
      fetchStockData(); // Refresh stock data
      fetchDestinations(); // Refresh destinations
    } catch (err: any) {
      showError(err.response?.data?.error || 'Gagal menyimpan transaksi penjualan');
    }
  };

  const handleEdit = (transaction: OutgoingTransaction) => {
    setEditing(transaction);
    setFormErrors({});
    const total = (transaction as { totalAmount?: number | null }).totalAmount ?? transaction.paymentAmount ?? 0;
    const paid = transaction.paymentAmount ?? 0;
    const scheduledDate = (transaction as { scheduledDeliveryDate?: string | null }).scheduledDeliveryDate;
    setFormData({
      date: toLocalDateTimeString(new Date(transaction.date)),
      riceTypeId: transaction.riceTypeId,
      quantity: transaction.quantity.toString(),
      destinationId: (transaction as any).destination?.id || transaction.destinationId || '',
      totalAmount: total ? total.toString() : '',
      paymentAmount: paid ? paid.toString() : '',
      scheduledDeliveryDate: scheduledDate ? toLocalDateTimeString(new Date(scheduledDate)) : '',
      notes: transaction.notes || '',
    });
    setShowModal(true);
  };

  const handleDeleteClick = (id: string) => {
    setDeletingId(id);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;

    setIsDeleting(true);
    try {
      await api.delete(`/outgoing/${deletingId}`);
      showSuccess('Transaksi penjualan berhasil dihapus');
      fetchTransactions();
      fetchStockData(); // Refresh stock data
      setShowDeleteDialog(false);
      setDeletingId(null);
    } catch (err: any) {
      showError(err.response?.data?.error || 'Gagal menghapus transaksi penjualan');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Layout>
      <div className="px-4 py-6 sm:px-0">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Penjualan Beras</h1>
          <button
            onClick={() => {
              setEditing(null);
              setFormErrors({});
              setFormData({
                date: toLocalDateTimeString(),
                riceTypeId: '',
                quantity: '',
                destinationId: '',
                totalAmount: '',
                paymentAmount: '',
                scheduledDeliveryDate: '',
                notes: '',
              });
              setShowModal(true);
            }}
            className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
          >
            Tambah Penjualan
          </button>
        </div>

        {/* Collapsible Filters */}
        <CollapsibleFilters
          label="Filter"
          activeCount={
            (filters.riceTypeId ? 1 : 0) +
            (filters.destinationId ? 1 : 0) +
            (filters.startDate ? 1 : 0) +
            (filters.endDate ? 1 : 0) +
            (filters.minQuantity ? 1 : 0) +
            (filters.maxQuantity ? 1 : 0) +
            (filters.notesSearch?.trim() ? 1 : 0) +
            (filters.paymentStatus ? 1 : 0)
          }
          defaultOpen={false}
          className="mb-6"
        >
          <DatePicker
            label="Dari Tanggal"
            value={filters.startDate || ''}
            onChange={(date) => setFilters({ ...filters, startDate: date || undefined })}
            placeholder="Pilih tanggal awal"
            maxDate={filters.endDate ? new Date(filters.endDate) : new Date()}
          />
          <DatePicker
            label="Sampai Tanggal"
            value={filters.endDate || ''}
            onChange={(date) => setFilters({ ...filters, endDate: date || undefined })}
            placeholder="Pilih tanggal akhir"
            maxDate={new Date()}
          />
          <Select
            label="Jenis Beras"
            value={filters.riceTypeId || ''}
            onChange={(value) => setFilters({ ...filters, riceTypeId: value || undefined })}
            placeholder="Semua jenis beras"
            options={[
              { value: '', label: 'Semua jenis beras' },
              ...riceTypes.map((rt) => ({ value: rt.id, label: rt.name })),
            ]}
          />
          <Select
            label="Pelanggan"
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
          <NumberInput
            label="Jumlah (Min)"
            value={filters.minQuantity || ''}
            onChange={(value) =>
              setFilters({ ...filters, minQuantity: value || undefined })
            }
            placeholder="0"
          />
          <NumberInput
            label="Jumlah (Max)"
            value={filters.maxQuantity || ''}
            onChange={(value) =>
              setFilters({ ...filters, maxQuantity: value || undefined })
            }
            placeholder="Semua"
          />
          <Input
            label="Cari Catatan"
            value={filters.notesSearch || ''}
            onChange={(e) =>
              setFilters({ ...filters, notesSearch: e.target.value || undefined })
            }
            placeholder="Cari di catatan..."
          />
          <FilterActions className="sm:col-span-2 lg:col-span-4 xl:col-span-5">
            <button
              onClick={() =>
                setFilters({
                  riceTypeId: undefined,
                  destinationId: undefined,
                  startDate: undefined,
                  endDate: undefined,
                  minQuantity: undefined,
                  maxQuantity: undefined,
                  notesSearch: undefined,
                  paymentStatus: undefined,
                })
              }
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Hapus filter
            </button>
          </FilterActions>
        </CollapsibleFilters>

        {loading ? (
          <div className="text-center py-8 text-gray-500">Memuat...</div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <SortableTh field="date" label="Tanggal" />
                    <SortableTh field="riceType" label="Jenis Beras" />
                    <SortableTh field="quantity" label="Jumlah" />
                    <SortableTh field="destination" label="Pelanggan" />
                    <SortableTh field="totalAmount" label="Jumlah Tagihan (Rp)" />
                    <SortableTh field="paymentAmount" label="Uang Diterima (Rp)" />
                    <SortableTh field="remainingDebt" label="Sisa Utang (Rp)" />
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Catatan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(() => {
                    let filtered = [...transactions];

                    // Apply client-side filters (server already applies date, riceType, destination)
                    if (filters.minQuantity) {
                      const minQty = parseFloat(filters.minQuantity.replace(/,/g, ''));
                      filtered = filtered.filter((t) => t.quantity >= minQty);
                    }
                    if (filters.maxQuantity) {
                      const maxQty = parseFloat(filters.maxQuantity.replace(/,/g, ''));
                      filtered = filtered.filter((t) => t.quantity <= maxQty);
                    }
                    if (filters.notesSearch?.trim()) {
                      const q = filters.notesSearch.trim().toLowerCase();
                      filtered = filtered.filter((t) =>
                        (t.notes || '').toLowerCase().includes(q)
                      );
                    }

                    // Apply sorting
                    if (sortField && sortDirection) {
                      filtered.sort((a, b) => {
                        let aVal: any;
                        let bVal: any;

                        switch (sortField) {
                          case 'date':
                            aVal = new Date(a.date).getTime();
                            bVal = new Date(b.date).getTime();
                            break;
                          case 'riceType':
                            aVal = a.riceType?.name || '';
                            bVal = b.riceType?.name || '';
                            break;
                          case 'quantity':
                            aVal = a.quantity;
                            bVal = b.quantity;
                            break;
                          case 'destination':
                            aVal = (a as any).destination?.name || a.destination || '';
                            bVal = (b as any).destination?.name || b.destination || '';
                            break;
                          case 'totalAmount':
                            aVal = (a as { totalAmount?: number | null }).totalAmount ?? a.paymentAmount ?? 0;
                            bVal = (b as { totalAmount?: number | null }).totalAmount ?? b.paymentAmount ?? 0;
                            break;
                          case 'paymentAmount':
                            aVal = a.paymentAmount ?? 0;
                            bVal = b.paymentAmount ?? 0;
                            break;
                          case 'remainingDebt':
                            aVal = getRemainingDebt(a);
                            bVal = getRemainingDebt(b);
                            break;
                          default:
                            return 0;
                        }

                        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
                        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
                        return 0;
                      });
                    }

                    return filtered;
                  })().map((transaction) => {
                    const remainingDebt = getRemainingDebt(transaction);
                    const hasDebt = remainingDebt > 0;
                    return (
                    <tr
                      key={transaction.id}
                      className={hasDebt ? 'bg-amber-50/60 hover:bg-amber-100/50' : undefined}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDateTime(transaction.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transaction.riceType?.name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatNumberWithUnit(transaction.quantity, transaction.riceType?.unit || 'kg')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(transaction as any).destination?.name || transaction.destination || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency((transaction as { totalAmount?: number | null }).totalAmount ?? transaction.paymentAmount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        <span className="inline-flex items-center gap-1.5">
                          {formatCurrency(transaction.paymentAmount ?? 0)}
                          <button
                            type="button"
                            onClick={() => openInstallmentsList(transaction)}
                            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                            title="Lihat daftar cicilan"
                          >
                            <FaList className="h-4 w-4" />
                          </button>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-amber-700">
                        {formatCurrency(remainingDebt)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 w-[180px] max-w-[180px]">
                        <div className="overflow-hidden min-w-0">
                          <Tooltip content={transaction.notes || '-'}>
                            <span className="block truncate cursor-default text-ellipsis overflow-hidden whitespace-nowrap">
                              {transaction.notes || '-'}
                            </span>
                          </Tooltip>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(transaction)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors duration-200 font-medium"
                            title="Ubah"
                          >
                            <FaEdit className="h-4 w-4" />
                            <span>Ubah</span>
                          </button>
                          <button
                            onClick={() => handleDeleteClick(transaction.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition-colors duration-200 font-medium"
                            title="Hapus"
                          >
                            <FaTrash className="h-4 w-4" />
                            <span>Hapus</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                  })}
                </tbody>
              </table>
            </div>
            {(() => {
              let filtered = [...transactions];
              if (filters.minQuantity) {
                const minQty = parseFloat(filters.minQuantity.replace(/,/g, ''));
                filtered = filtered.filter((t) => t.quantity >= minQty);
              }
              if (filters.maxQuantity) {
                const maxQty = parseFloat(filters.maxQuantity.replace(/,/g, ''));
                filtered = filtered.filter((t) => t.quantity <= maxQty);
              }
              if (filters.notesSearch?.trim()) {
                const q = filters.notesSearch.trim().toLowerCase();
                filtered = filtered.filter((t) =>
                  (t.notes || '').toLowerCase().includes(q)
                );
              }
              return filtered.length === 0;
            })() && (
                <div className="text-center py-8 text-gray-500">Tidak ada transaksi ditemukan</div>
              )}
          </div>
        )}

        <Modal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setEditing(null);
            setFormErrors({});
            setFormData({
              date: toLocalDateTimeString(),
              riceTypeId: '',
              quantity: '',
              destinationId: '',
              totalAmount: '',
              paymentAmount: '',
              scheduledDeliveryDate: '',
              notes: '',
            });
          }}
          title={editing ? 'Edit Transaksi Penjualan' : 'Tambah Transaksi Penjualan'}
          size="md"
        >
          <form onSubmit={handleSubmit} noValidate>
            <div className="space-y-4">
              <DateTimePicker
                label="Tanggal & Waktu"
                required
                value={formData.date}
                onChange={(date: string) => {
                  setFormData({ ...formData, date });
                  if (formErrors.date) setFormErrors((prev) => ({ ...prev, date: '' }));
                }}
                maxDate={new Date()}
                error={formErrors.date}
              />
              <Select
                label="Jenis Beras"
                required
                value={formData.riceTypeId}
                onChange={(value) => {
                  setFormData({ ...formData, riceTypeId: value });
                  if (formErrors.riceTypeId) setFormErrors((prev) => ({ ...prev, riceTypeId: '' }));
                }}
                placeholder="Pilih jenis beras"
                options={riceTypes.map((rt) => ({
                  value: rt.id,
                  label: rt.name,
                }))}
                error={formErrors.riceTypeId}
              />
              {formData.riceTypeId && (() => {
                const selectedStock = stockData.find((stock) => stock.riceType.id === formData.riceTypeId);
                const availableStock = selectedStock
                  ? editing && editing.riceTypeId === formData.riceTypeId
                    ? selectedStock.currentStock + editing.quantity
                    : selectedStock.currentStock
                  : 0;
                const quantityNum = formData.quantity ? parseFloat(formData.quantity.replace(/,/g, '')) : 0;
                const unit = selectedStock?.riceType.unit || 'kg';
                const isExceeding = quantityNum > availableStock;

                return (
                  <div>
                    <div className="mb-2 text-sm text-slate-600">
                      Stok tersedia: <span className="font-semibold">{formatNumberWithUnit(availableStock, unit)}</span>
                    </div>
                    <NumberInput
                      label="Jumlah (Kg)"
                      required
                      value={formData.quantity}
                      onChange={(value) => {
                        setFormData({ ...formData, quantity: value });
                        if (formErrors.quantity) setFormErrors((prev) => ({ ...prev, quantity: '' }));
                      }}
                      placeholder="0"
                      error={formErrors.quantity || (isExceeding && quantityNum > 0 ? `Jumlah melebihi stok tersedia (${formatNumberWithUnit(availableStock, unit)})` : undefined)}
                    />
                  </div>
                );
              })()}
              {!formData.riceTypeId && (
                <NumberInput
                  label="Jumlah (Kg)"
                  required
                  value={formData.quantity}
                  onChange={(value) => {
                    setFormData({ ...formData, quantity: value });
                    if (formErrors.quantity) setFormErrors((prev) => ({ ...prev, quantity: '' }));
                  }}
                  placeholder="0"
                  error={formErrors.quantity}
                />
              )}
              <CreatableSelect
                label="Pelanggan"
                required
                value={formData.destinationId}
                onChange={(value) => {
                  setFormData({ ...formData, destinationId: value });
                  if (formErrors.destinationId) setFormErrors((prev) => ({ ...prev, destinationId: '' }));
                }}
                onCreateOption={createDestination}
                placeholder="Pilih atau ketik untuk membuat baru"
                options={destinations.map((dest) => ({
                  value: dest.id,
                  label: dest.name,
                }))}
                disabled={!!editing}
                error={formErrors.destinationId}
              />
              <NumberInput
                label="Jumlah Tagihan (Rp)"
                required
                value={formData.totalAmount}
                onChange={(value) => {
                  setFormData({ ...formData, totalAmount: value });
                  if (formErrors.totalAmount) setFormErrors((prev) => ({ ...prev, totalAmount: '' }));
                }}
                placeholder="10,000,000"
                error={formErrors.totalAmount}
              />
              {(() => {
                const totalNum = formData.totalAmount ? parseFloat(formData.totalAmount.replace(/,/g, '')) : NaN;
                const paymentNum = formData.paymentAmount != null && formData.paymentAmount !== '' ? parseFloat(String(formData.paymentAmount).replace(/,/g, '')) : NaN;
                const paymentExceedsTotal = !isNaN(totalNum) && totalNum > 0 && !isNaN(paymentNum) && paymentNum > totalNum;
                const totalAmountFilled = formData.totalAmount?.trim() && !isNaN(totalNum) && totalNum > 0;
                return (
                  <NumberInput
                    label="Uang Diterima (Rp)"
                    required
                    value={formData.paymentAmount}
                    onChange={(value) => {
                      setFormData({ ...formData, paymentAmount: value });
                      if (formErrors.paymentAmount) setFormErrors((prev) => ({ ...prev, paymentAmount: '' }));
                    }}
                    placeholder="0"
                    disabled={!totalAmountFilled}
                    error={formErrors.paymentAmount || (paymentExceedsTotal ? 'Uang Diterima tidak boleh lebih dari Jumlah Tagihan.' : undefined)}
                    helperText={!totalAmountFilled ? 'Isi Jumlah Tagihan terlebih dahulu' : (!paymentExceedsTotal && !formErrors.paymentAmount ? `Maksimal: ${formatCurrency(totalNum)}` : undefined)}
                  />
                );
              })()}
              <DateTimePicker
                label="Tanggal & Jam Pengantaran"
                value={formData.scheduledDeliveryDate}
                onChange={(v) => setFormData({ ...formData, scheduledDeliveryDate: v || '' })}
                placeholder="Kosongkan jika tidak diantarkan"
                helperText="Jika tidak diantarkan maka jangan diisi"
              />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Catatan
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  rows={3}
                  className="block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 mt-6 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setEditing(null);
                  setFormErrors({});
                  setFormData({
                    date: toLocalDateTimeString(),
                    riceTypeId: '',
                    quantity: '',
                    destinationId: '',
                    totalAmount: '',
                    paymentAmount: '',
                    scheduledDeliveryDate: '',
                    notes: '',
                  });
                }}
                className="px-4 py-2 rounded-lg font-medium transition-all duration-200 border border-slate-300 text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={(() => {
                  const totalNum = formData.totalAmount ? parseFloat(formData.totalAmount.replace(/,/g, '')) : NaN;
                  const paymentNum = formData.paymentAmount != null && formData.paymentAmount !== '' ? parseFloat(String(formData.paymentAmount).replace(/,/g, '')) : NaN;
                  return !isNaN(totalNum) && totalNum > 0 && !isNaN(paymentNum) && paymentNum > totalNum;
                })()}
                className="px-4 py-2 rounded-lg font-medium transition-all duration-200 bg-primary-600 text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Simpan
              </button>
            </div>
          </form>
        </Modal>

        <Modal
          isOpen={showInstallmentsModal}
          onClose={closeInstallmentsModal}
          title={installmentsForTx ? `Daftar Cicilan · ${(installmentsForTx as any).destination?.name ?? '-'}` : 'Daftar Cicilan'}
          size="md"
        >
          {loadingInstallments ? (
            <div className="py-8 text-center text-gray-500">Memuat...</div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 font-medium text-gray-600">Tanggal & Jam</th>
                      <th className="px-4 py-3 font-medium text-gray-600 text-right">Jumlah (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {installmentsList
                      .filter((i) => i.paidAt != null)
                      .sort((a, b) => new Date(a.paidAt!).getTime() - new Date(b.paidAt!).getTime())
                      .map((i) => (
                        <tr key={i.id}>
                          <td className="px-4 py-3 text-gray-900">{formatDateTime(i.paidAt)}</td>
                          <td className="px-4 py-3 text-right font-medium">{formatCurrency(i.paidAmount ?? i.amount)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
                <span className="font-medium text-gray-700">Total diterima</span>
                <span className="font-semibold text-gray-900">
                  {formatCurrency(
                    installmentsList
                      .filter((i) => i.paidAt != null)
                      .reduce((sum, i) => sum + (i.paidAmount ?? i.amount), 0)
                  )}
                </span>
              </div>
            </div>
          )}
        </Modal>

        <ConfirmDialog
          isOpen={showDeleteDialog}
          onClose={() => {
            setShowDeleteDialog(false);
            setDeletingId(null);
          }}
          onConfirm={handleDeleteConfirm}
          title="Hapus Transaksi Penjualan"
          message="Apakah Anda yakin ingin menghapus transaksi penjualan ini? Tindakan ini tidak dapat dibatalkan."
          confirmText="Hapus"
          cancelText="Batal"
          variant="danger"
          isLoading={isDeleting}
        />
      </div>
    </Layout>
  );
}
