import { useEffect, useState, useCallback } from 'react';
import api from '../utils/api';
import Layout from '../components/Layout';
import { DateTimePicker } from '../components/ui/datetime-picker';
import { Select } from '../components/ui/select';
import { NumberInput } from '../components/ui/number-input';
import { Input } from '../components/ui/input';
import { DatePicker } from '../components/ui/date-picker';
import { Modal } from '../components/ui/modal';
import { ConfirmDialog } from '../components/ui/confirm-dialog';
import { Tooltip } from '../components/ui/tooltip';
import { CreatableSelect } from '../components/ui/creatable-select';
import { CollapsibleFilters, FilterActions } from '../components/ui/collapsible-filters';
import { useToast } from '../contexts/ToastContext';
import { formatNumberWithUnit, formatDateTime, formatCurrency, toLocalDateTimeString, localDateTimeToUTCISO } from '../utils/format';
import { FaEdit, FaTrash, FaSort, FaSortUp, FaSortDown } from 'react-icons/fa';
import type { IncomingTransaction, RiceType, Supplier } from '../types';

type SortField = 'date' | 'riceType' | 'quantity' | 'supplier' | 'paymentAmount' | null;
type SortDirection = 'asc' | 'desc' | null;

interface IncomingFormData {
  date: string;
  riceTypeId: string;
  quantity: string;
  supplierId: string;
  paymentAmount: string;
  notes: string;
}

export default function Incoming() {
  const [transactions, setTransactions] = useState<IncomingTransaction[]>([]);
  const [riceTypes, setRiceTypes] = useState<RiceType[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [filters, setFilters] = useState<{
    riceTypeId?: string;
    supplierId?: string;
    startDate?: string;
    endDate?: string;
    minQuantity?: string;
    maxQuantity?: string;
    notesSearch?: string;
  }>({});
  const [showModal, setShowModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editing, setEditing] = useState<IncomingTransaction | null>(null);
  const { showSuccess, showError } = useToast();
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<IncomingFormData>({
    date: toLocalDateTimeString(),
    riceTypeId: '',
    quantity: '',
    supplierId: '',
    paymentAmount: '',
    notes: '',
  });

  const fetchTransactions = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.riceTypeId) params.riceTypeId = filters.riceTypeId;
      if (filters.supplierId) params.supplierId = filters.supplierId;
      const response = await api.get<IncomingTransaction[]>('/incoming', { params });
      setTransactions(response.data);
    } catch (err: any) {
      showError(err.response?.data?.error || 'Gagal memuat transaksi');
    } finally {
      setLoading(false);
    }
  }, [filters.startDate, filters.endDate, filters.riceTypeId, filters.supplierId, showError]);

  useEffect(() => {
    setLoading(true);
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    fetchRiceTypes();
    fetchSuppliers();
  }, []);

  const fetchRiceTypes = async () => {
    try {
      const response = await api.get<RiceType[]>('/rice-types');
      setRiceTypes(response.data);
    } catch (err: any) {
      console.error('Failed to fetch rice types:', err);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await api.get<Supplier[]>('/suppliers');
      setSuppliers(response.data);
    } catch (err: any) {
      console.error('Failed to fetch suppliers:', err);
    }
  };

  const createSupplier = async (name: string) => {
    try {
      const response = await api.post('/suppliers', { name });
      const newSupplier = response.data;
      setSuppliers((prev) => [...prev, newSupplier]);
      return newSupplier.id;
    } catch (err: any) {
      showError(err.response?.data?.error || 'Gagal membuat pemasok baru');
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: Record<string, string> = {};
    if (!formData.date?.trim()) errors.date = 'Tanggal & Waktu wajib diisi.';
    if (!formData.riceTypeId?.trim()) errors.riceTypeId = 'Jenis Beras wajib dipilih.';
    const qtyNum = formData.quantity ? parseFloat(formData.quantity.replace(/,/g, '')) : NaN;
    if (!formData.quantity?.trim() || isNaN(qtyNum) || qtyNum <= 0) errors.quantity = 'Jumlah (Kg) wajib diisi dan harus lebih dari 0.';
    if (!formData.supplierId?.trim()) errors.supplierId = 'Pemasok wajib dipilih.';
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});

    setIsSubmitting(true);
    try {
      const paymentNum = formData.paymentAmount?.trim()
        ? parseFloat(formData.paymentAmount.replace(/,/g, ''))
        : NaN;
      const payload = {
        ...formData,
        date: localDateTimeToUTCISO(formData.date) || formData.date,
        paymentAmount: !isNaN(paymentNum) ? paymentNum : 0,
      };
      if (editing) {
        await api.put(`/incoming/${editing.id}`, payload);
        showSuccess('Transaksi pemasukan berhasil diperbarui');
      } else {
        await api.post('/incoming', payload);
        showSuccess('Transaksi pemasukan berhasil ditambahkan');
      }
      setShowModal(false);
      setEditing(null);
      setFormData({
        date: toLocalDateTimeString(),
        riceTypeId: '',
        quantity: '',
        supplierId: '',
        paymentAmount: '',
        notes: '',
      });
      setFormErrors({});
      fetchTransactions();
      fetchSuppliers();
    } catch (err: any) {
      showError(err.response?.data?.error || 'Gagal menyimpan transaksi pemasukan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (transaction: IncomingTransaction) => {
    setEditing(transaction);
    setFormErrors({});
    setFormData({
      date: toLocalDateTimeString(new Date(transaction.date)),
      riceTypeId: transaction.riceTypeId,
      quantity: transaction.quantity.toString(),
      supplierId: transaction.supplierId || transaction.supplier?.id || '',
      paymentAmount: transaction.paymentAmount != null ? transaction.paymentAmount.toString() : '',
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
      await api.delete(`/incoming/${deletingId}`);
      showSuccess('Transaksi pemasukan berhasil dihapus');
      fetchTransactions();
      setShowDeleteDialog(false);
      setDeletingId(null);
    } catch (err: any) {
      showError(err.response?.data?.error || 'Gagal menghapus transaksi pemasukan');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Layout>
      <div className="px-4 py-6 sm:px-0">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Pemasukan Beras</h1>
          <button
            onClick={() => {
              setEditing(null);
              setFormErrors({});
              setFormData({
                date: toLocalDateTimeString(),
                riceTypeId: '',
                quantity: '',
                supplierId: '',
                paymentAmount: '',
                notes: '',
              });
              setShowModal(true);
            }}
            className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
          >
            Tambah Pemasukan
          </button>
        </div>

        {/* Collapsible Filters */}
        <CollapsibleFilters
          label="Filter"
          activeCount={
            (filters.riceTypeId ? 1 : 0) +
            (filters.supplierId ? 1 : 0) +
            (filters.startDate ? 1 : 0) +
            (filters.endDate ? 1 : 0) +
            (filters.minQuantity ? 1 : 0) +
            (filters.maxQuantity ? 1 : 0) +
            (filters.notesSearch?.trim() ? 1 : 0)
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
            label="Pemasok"
            value={filters.supplierId || ''}
            onChange={(value) => setFilters({ ...filters, supplierId: value || undefined })}
            placeholder="Semua pemasok"
            options={[
              { value: '', label: 'Semua pemasok' },
              ...suppliers.map((s) => ({ value: s.id, label: s.name })),
            ]}
          />
          <NumberInput
            label="Jumlah (Min)"
            value={filters.minQuantity || ''}
            onChange={(value) => setFilters({ ...filters, minQuantity: value || undefined })}
            placeholder="0"
          />
          <NumberInput
            label="Jumlah (Max)"
            value={filters.maxQuantity || ''}
            onChange={(value) => setFilters({ ...filters, maxQuantity: value || undefined })}
            placeholder="Semua"
          />
          <Input
            label="Cari Catatan"
            value={filters.notesSearch || ''}
            onChange={(e) => setFilters({ ...filters, notesSearch: e.target.value || undefined })}
            placeholder="Cari di catatan..."
          />
          <FilterActions className="sm:col-span-2 lg:col-span-4 xl:col-span-5">
            <button
              onClick={() =>
                setFilters({
                  riceTypeId: undefined,
                  supplierId: undefined,
                  startDate: undefined,
                  endDate: undefined,
                  minQuantity: undefined,
                  maxQuantity: undefined,
                  notesSearch: undefined,
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
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => {
                        if (sortField === 'date') {
                          setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortField('date');
                          setSortDirection('asc');
                        }
                      }}
                    >
                      <div className="flex items-center gap-2">
                        Tanggal
                        {sortField === 'date' ? (
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
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => {
                        if (sortField === 'riceType') {
                          setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortField('riceType');
                          setSortDirection('asc');
                        }
                      }}
                    >
                      <div className="flex items-center gap-2">
                        Jenis Beras
                        {sortField === 'riceType' ? (
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
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => {
                        if (sortField === 'quantity') {
                          setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortField('quantity');
                          setSortDirection('asc');
                        }
                      }}
                    >
                      <div className="flex items-center gap-2">
                        Jumlah
                        {sortField === 'quantity' ? (
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
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => {
                        if (sortField === 'supplier') {
                          setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortField('supplier');
                          setSortDirection('asc');
                        }
                      }}
                    >
                      <div className="flex items-center gap-2">
                        Pemasok
                        {sortField === 'supplier' ? (
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
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => {
                        if (sortField === 'paymentAmount') {
                          setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortField('paymentAmount');
                          setSortDirection('asc');
                        }
                      }}
                    >
                      <div className="flex items-center gap-2">
                        Jumlah Pembayaran
                        {sortField === 'paymentAmount' ? (
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

                    // Apply client-side filters (server already applies date, riceType, supplier)
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
                          case 'supplier':
                            aVal = a.supplier?.name || '';
                            bVal = b.supplier?.name || '';
                            break;
                          case 'paymentAmount':
                            aVal = a.paymentAmount ?? 0;
                            bVal = b.paymentAmount ?? 0;
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
                  })().map((transaction) => (
                    <tr key={transaction.id}>
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
                        {transaction.supplier?.name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(transaction.paymentAmount ?? undefined)}
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
                  ))}
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
              supplierId: '',
              paymentAmount: '',
              notes: '',
            });
          }}
          preventClose={isSubmitting}
          title={editing ? 'Edit Transaksi Pemasukan' : 'Tambah Transaksi Pemasukan'}
          size="md"
        >
          <form onSubmit={handleSubmit} noValidate>
            <div className="space-y-4">
              <DateTimePicker
                label="Tanggal & Waktu"
                required
                value={formData.date}
                onChange={(date) => {
                  setFormData({ ...formData, date });
                  if (formErrors.date) setFormErrors((p) => ({ ...p, date: '' }));
                }}
                maxDateTime={new Date()}
                error={formErrors.date}
              />
              <Select
                label="Jenis Beras"
                required
                value={formData.riceTypeId}
                onChange={(value) => {
                  setFormData({ ...formData, riceTypeId: value });
                  if (formErrors.riceTypeId) setFormErrors((p) => ({ ...p, riceTypeId: '' }));
                }}
                placeholder="Pilih jenis beras"
                options={riceTypes.map((rt) => ({
                  value: rt.id,
                  label: rt.name,
                }))}
                error={formErrors.riceTypeId}
              />
              <NumberInput
                label="Jumlah (Kg)"
                required
                value={formData.quantity}
                onChange={(value) => {
                  setFormData({ ...formData, quantity: value });
                  if (formErrors.quantity) setFormErrors((p) => ({ ...p, quantity: '' }));
                }}
                placeholder="0"
                error={formErrors.quantity}
              />
              <CreatableSelect
                label="Pemasok"
                required
                value={formData.supplierId}
                onChange={(value) => {
                  setFormData({ ...formData, supplierId: value });
                  if (formErrors.supplierId) setFormErrors((p) => ({ ...p, supplierId: '' }));
                }}
                onCreateOption={createSupplier}
                placeholder="Pilih atau ketik untuk membuat baru"
                options={suppliers.map((supplier) => ({
                  value: supplier.id,
                  label: supplier.name,
                }))}
                disabled={!!editing}
                error={formErrors.supplierId}
              />
              <NumberInput
                label="Pembayaran yang dibayar (Rp.)"
                value={formData.paymentAmount}
                onChange={(value) =>
                  setFormData({ ...formData, paymentAmount: value })
                }
                placeholder="0"
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
                disabled={isSubmitting}
                onClick={() => {
                  setShowModal(false);
                  setEditing(null);
                  setFormErrors({});
                  setFormData({
                    date: toLocalDateTimeString(),
                    riceTypeId: '',
                    quantity: '',
                    supplierId: '',
                    paymentAmount: '',
                    notes: '',
                  });
                }}
                className="px-4 py-2 rounded-lg font-medium transition-all duration-200 border border-slate-300 text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg font-medium transition-all duration-200 bg-primary-600 text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  'Simpan'
                )}
              </button>
            </div>
          </form>
        </Modal>

        <ConfirmDialog
          isOpen={showDeleteDialog}
          onClose={() => {
            setShowDeleteDialog(false);
            setDeletingId(null);
          }}
          onConfirm={handleDeleteConfirm}
          title="Hapus Transaksi Pemasukan"
          message="Apakah Anda yakin ingin menghapus transaksi pemasukan ini? Tindakan ini tidak dapat dibatalkan."
          confirmText="Hapus"
          cancelText="Batal"
          variant="danger"
          isLoading={isDeleting}
        />
      </div>
    </Layout>
  );
}
