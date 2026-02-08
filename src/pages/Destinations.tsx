import { useEffect, useState } from 'react';
import api from '../utils/api';
import type { Destination } from '../types';
import Layout from '../components/Layout';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { CollapsibleFilters, FilterActions } from '../components/ui/collapsible-filters';
import { Modal } from '../components/ui/modal';
import { ConfirmDialog } from '../components/ui/confirm-dialog';
import { Tooltip } from '../components/ui/tooltip';
import { useToast } from '../contexts/ToastContext';
import { formatNumberWithUnit, formatCurrency } from '../utils/format';
import { FaEdit, FaTrash, FaSort, FaSortUp, FaSortDown } from 'react-icons/fa';

type DestSortField = 'name' | 'type' | 'alamat' | 'totalPembelian' | 'jumlahTransaksi' | 'totalTagihan' | 'totalPembayaran' | 'totalUtang' | null;

interface DestinationWithStats extends Destination {
  totalPembelian?: number;
  jumlahTransaksi?: number;
  totalTagihan?: number;
  totalPembayaran?: number;
  totalUtang?: number;
}

export default function Destinations() {
  const [destinations, setDestinations] = useState<DestinationWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editing, setEditing] = useState<DestinationWithStats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState<string>('');
  const [sortField, setSortField] = useState<DestSortField>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'customer',
    alamat: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    fetchDestinations();
  }, []);

  const fetchDestinations = async () => {
    try {
      const response = await api.get('/destinations');
      setDestinations(response.data);
    } catch (err: any) {
      showError(err.response?.data?.error || 'Gagal memuat data pelanggan');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!formData.name?.trim()) errors.name = 'Nama Pelanggan wajib diisi.';
    if (!formData.type?.trim()) errors.type = 'Tipe wajib dipilih.';
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});
    try {
      if (editing) {
        await api.put(`/destinations/${editing.id}`, formData);
        showSuccess('Pelanggan berhasil diperbarui');
      } else {
        await api.post('/destinations', formData);
        showSuccess('Pelanggan berhasil ditambahkan');
      }
      setShowModal(false);
      setEditing(null);
      setFormData({ name: '', type: 'customer', alamat: '' });
      setFormErrors({});
      fetchDestinations();
    } catch (err: any) {
      showError(err.response?.data?.error || 'Gagal menyimpan pelanggan');
    }
  };

  const handleEdit = (destination: DestinationWithStats) => {
    setEditing(destination);
    setFormErrors({});
    setFormData({
      name: destination.name,
      type: destination.type || 'customer',
      alamat: destination.alamat || '',
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
      await api.delete(`/destinations/${deletingId}`);
      showSuccess('Pelanggan berhasil dihapus');
      fetchDestinations();
      setShowDeleteDialog(false);
      setDeletingId(null);
    } catch (err: any) {
      showError(err.response?.data?.error || 'Gagal menghapus pelanggan');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredDestinations = destinations.filter((destination) => {
    const matchesSearch = destination.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !filterType || destination.type === filterType;
    const debt = destination.totalUtang ?? 0;
    const matchesPaymentStatus =
      !filterPaymentStatus ||
      (filterPaymentStatus === 'full' && debt <= 0) ||
      (filterPaymentStatus === 'unpaid' && debt > 0);
    return matchesSearch && matchesType && matchesPaymentStatus;
  });

  const toggleSort = (field: DestSortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedDestinations = [...filteredDestinations].sort((a, b) => {
    if (!sortField || !sortDirection) return 0;
    let aVal: string | number;
    let bVal: string | number;
    switch (sortField) {
      case 'name':
        aVal = a.name?.toLowerCase() ?? '';
        bVal = b.name?.toLowerCase() ?? '';
        break;
      case 'type':
        aVal = a.type ?? '';
        bVal = b.type ?? '';
        break;
      case 'alamat':
        aVal = a.alamat ?? '';
        bVal = b.alamat ?? '';
        break;
      case 'totalPembelian':
        aVal = a.totalPembelian ?? 0;
        bVal = b.totalPembelian ?? 0;
        break;
      case 'jumlahTransaksi':
        aVal = a.jumlahTransaksi ?? 0;
        bVal = b.jumlahTransaksi ?? 0;
        break;
      case 'totalTagihan':
        aVal = a.totalTagihan ?? 0;
        bVal = b.totalTagihan ?? 0;
        break;
      case 'totalPembayaran':
        aVal = a.totalPembayaran ?? 0;
        bVal = b.totalPembayaran ?? 0;
        break;
      case 'totalUtang':
        aVal = a.totalUtang ?? 0;
        bVal = b.totalUtang ?? 0;
        break;
      default:
        return 0;
    }
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const SortableTh = ({ field, label }: { field: DestSortField; label: string }) => (
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
    <Layout>
      <div className="px-4 py-6 sm:px-0">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Data Master Pelanggan</h1>
          <button
            onClick={() => {
              setEditing(null);
              setFormErrors({});
              setFormData({ name: '', type: 'customer', alamat: '' });
              setShowModal(true);
            }}
            className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
          >
            Tambah Pelanggan
          </button>
        </div>

        <CollapsibleFilters
          label="Filter"
          activeCount={(searchTerm.trim() ? 1 : 0) + (filterType ? 1 : 0) + (filterPaymentStatus ? 1 : 0)}
          defaultOpen={false}
          className="mb-6"
        >
          <Input
            label="Cari"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari berdasarkan nama..."
          />
          <Select
            label="Tipe"
            value={filterType}
            onChange={(value) => setFilterType(value)}
            placeholder="Semua tipe"
            options={[
              { value: '', label: 'Semua tipe' },
              { value: 'customer', label: 'Pelanggan' },
              { value: 'supplier', label: 'Pemasok' },
            ]}
          />
          <Select
            label="Status Pembayaran"
            value={filterPaymentStatus}
            onChange={(value) => setFilterPaymentStatus(value)}
            placeholder="Semua"
            options={[
              { value: '', label: 'Semua' },
              { value: 'full', label: 'Lunas' },
              { value: 'unpaid', label: 'Masih Utang' },
            ]}
          />
          <FilterActions>
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterType('');
                setFilterPaymentStatus('');
              }}
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
                    <SortableTh field="name" label="Nama Pelanggan" />
                    <SortableTh field="type" label="Tipe" />
                    <SortableTh field="alamat" label="Alamat" />
                    <SortableTh field="totalPembelian" label="Total Pembelian" />
                    <SortableTh field="jumlahTransaksi" label="Jumlah Transaksi" />
                    <SortableTh field="totalTagihan" label="Total Tagihan (Rp)" />
                    <SortableTh field="totalPembayaran" label="Total Pembayaran (Rp)" />
                    <SortableTh field="totalUtang" label="Total Utang (Rp)" />
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredDestinations.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-4 text-center text-sm text-gray-500">
                        {searchTerm || filterType ? 'Tidak ada pelanggan ditemukan' : 'Tidak ada data pelanggan'}
                      </td>
                    </tr>
                  ) : (
                    sortedDestinations.map((destination) => {
                      const hasDebt = (destination.totalUtang ?? 0) > 0;
                      return (
                      <tr
                        key={destination.id}
                        className={hasDebt ? 'bg-amber-50/60 hover:bg-amber-100/50' : undefined}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {destination.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${destination.type === 'customer'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-orange-100 text-orange-800'
                              }`}
                          >
                            {destination.type === 'customer' ? 'Pelanggan' : 'Pemasok'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {destination.alamat || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatNumberWithUnit(destination.totalPembelian || 0, 'kg')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {destination.jumlahTransaksi || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatCurrency(destination.totalTagihan ?? 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {formatCurrency(destination.totalPembayaran ?? 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-amber-700">
                          {formatCurrency((destination.totalUtang ?? 0) > 0 ? destination.totalUtang : 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <Tooltip content="Edit pelanggan">
                              <button
                                onClick={() => handleEdit(destination)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors duration-200 font-medium"
                              >
                                <FaEdit className="h-4 w-4" />
                                <span>Ubah</span>
                              </button>
                            </Tooltip>
                            {destination.jumlahTransaksi && destination.jumlahTransaksi > 0 ? (
                              <Tooltip
                                content={`Tidak dapat menghapus pelanggan karena sudah memiliki ${destination.jumlahTransaksi} transaksi penjualan. Hapus semua transaksi terkait terlebih dahulu.`}
                              >
                                <span className="inline-block">
                                  <button
                                    disabled
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-400 cursor-not-allowed transition-colors duration-200 font-medium"
                                  >
                                    <FaTrash className="h-4 w-4" />
                                    <span>Hapus</span>
                                  </button>
                                </span>
                              </Tooltip>
                            ) : (
                              <Tooltip content="Hapus pelanggan">
                                <button
                                  onClick={() => handleDeleteClick(destination.id)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition-colors duration-200 font-medium"
                                >
                                  <FaTrash className="h-4 w-4" />
                                  <span>Hapus</span>
                                </button>
                              </Tooltip>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <Modal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setEditing(null);
            setFormErrors({});
            setFormData({ name: '', type: 'customer', alamat: '' });
          }}
          title={editing ? 'Edit Pelanggan' : 'Tambah Pelanggan'}
          size="md"
        >
          <form onSubmit={handleSubmit} noValidate>
            <div className="space-y-4">
              <Input
                label="Nama Pelanggan"
                type="text"
                required
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (formErrors.name) setFormErrors((p) => ({ ...p, name: '' }));
                }}
                placeholder="Masukkan nama pelanggan"
                error={formErrors.name}
              />
              <Select
                label="Tipe"
                required
                value={formData.type}
                onChange={(value) => {
                  setFormData({ ...formData, type: value });
                  if (formErrors.type) setFormErrors((p) => ({ ...p, type: '' }));
                }}
                options={[
                  { value: 'customer', label: 'Pelanggan' },
                  { value: 'supplier', label: 'Pemasok' },
                ]}
                error={formErrors.type}
              />
              <Input
                label="Alamat"
                type="text"
                value={formData.alamat}
                onChange={(e) =>
                  setFormData({ ...formData, alamat: e.target.value })
                }
                placeholder="Masukkan alamat pelanggan (opsional)"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 mt-6 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setEditing(null);
                  setFormErrors({});
                  setFormData({ name: '', type: 'customer', alamat: '' });
                }}
                className="px-4 py-2 rounded-lg font-medium transition-all duration-200 border border-slate-300 text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg font-medium transition-all duration-200 bg-primary-600 text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              >
                Simpan
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
          title="Hapus Pelanggan"
          message="Apakah Anda yakin ingin menghapus pelanggan ini? Tindakan ini tidak dapat dibatalkan."
          confirmText="Hapus"
          cancelText="Batal"
          variant="danger"
          isLoading={isDeleting}
        />
      </div>
    </Layout>
  );
}
