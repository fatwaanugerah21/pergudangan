import { useEffect, useState } from 'react';
import api from '../utils/api';
import type { Supplier } from '../types';
import Layout from '../components/Layout';
import { Input } from '../components/ui/input';
import { CollapsibleFilters, FilterActions } from '../components/ui/collapsible-filters';
import { Modal } from '../components/ui/modal';
import { ConfirmDialog } from '../components/ui/confirm-dialog';
import { Tooltip } from '../components/ui/tooltip';
import { useToast } from '../contexts/ToastContext';
import { formatNumberWithUnit } from '../utils/format';
import { FaEdit, FaTrash, FaSort, FaSortUp, FaSortDown } from 'react-icons/fa';

type SupplierSortField = 'name' | 'alamat' | 'totalPemasokan' | 'jumlahTransaksi' | null;

interface SupplierWithStats extends Supplier {
  totalPemasokan?: number;
  jumlahTransaksi?: number;
}

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<SupplierWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SupplierSortField>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    alamat: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const response = await api.get('/suppliers');
      setSuppliers(response.data);
    } catch (err: any) {
      showError(err.response?.data?.error || 'Gagal memuat data pemasok');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!formData.name?.trim()) errors.name = 'Nama Pemasok wajib diisi.';
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});
    try {
      if (editing) {
        await api.put(`/suppliers/${editing.id}`, formData);
        showSuccess('Pemasok berhasil diperbarui');
      } else {
        await api.post('/suppliers', formData);
        showSuccess('Pemasok berhasil ditambahkan');
      }
      setShowModal(false);
      setEditing(null);
      setFormData({ name: '', alamat: '' });
      setFormErrors({});
      fetchSuppliers();
    } catch (err: any) {
      showError(err.response?.data?.error || 'Gagal menyimpan pemasok');
    }
  };

  const handleEdit = (supplier: SupplierWithStats) => {
    setEditing(supplier);
    setFormErrors({});
    setFormData({
      name: supplier.name,
      alamat: supplier.alamat || '',
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
      await api.delete(`/suppliers/${deletingId}`);
      showSuccess('Pemasok berhasil dihapus');
      fetchSuppliers();
      setShowDeleteDialog(false);
      setDeletingId(null);
    } catch (err: any) {
      showError(err.response?.data?.error || 'Gagal menghapus pemasok');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredSuppliers = suppliers.filter(
    (supplier) =>
      supplier.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleSort = (field: SupplierSortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedSuppliers = [...filteredSuppliers].sort((a, b) => {
    if (!sortField || !sortDirection) return 0;
    let aVal: string | number;
    let bVal: string | number;
    switch (sortField) {
      case 'name':
        aVal = a.name?.toLowerCase() ?? '';
        bVal = b.name?.toLowerCase() ?? '';
        break;
      case 'alamat':
        aVal = a.alamat ?? '';
        bVal = b.alamat ?? '';
        break;
      case 'totalPemasokan':
        aVal = a.totalPemasokan ?? 0;
        bVal = b.totalPemasokan ?? 0;
        break;
      case 'jumlahTransaksi':
        aVal = a.jumlahTransaksi ?? 0;
        bVal = b.jumlahTransaksi ?? 0;
        break;
      default:
        return 0;
    }
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const SortableTh = ({ field, label }: { field: SupplierSortField; label: string }) => (
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
          <h1 className="text-2xl font-bold text-gray-900">Data Master Pemasok</h1>
          <button
            onClick={() => {
              setEditing(null);
              setFormErrors({});
              setFormData({ name: '', alamat: '' });
              setShowModal(true);
            }}
            className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
          >
            Tambah Pemasok
          </button>
        </div>

        <CollapsibleFilters
          label="Filter"
          activeCount={searchTerm.trim() ? 1 : 0}
          defaultOpen={false}
          className="mb-6"
        >
          <Input
            label="Cari Pemasok"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari berdasarkan nama..."
          />
          <FilterActions>
            <button
              onClick={() => setSearchTerm('')}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Hapus
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
                    <SortableTh field="name" label="Nama Pemasok" />
                    <SortableTh field="alamat" label="Alamat" />
                    <SortableTh field="totalPemasokan" label="Total Pemasokan" />
                    <SortableTh field="jumlahTransaksi" label="Jumlah Transaksi" />
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedSuppliers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                        {searchTerm ? 'Tidak ada pemasok ditemukan' : 'Tidak ada data pemasok'}
                      </td>
                    </tr>
                  ) : (
                    sortedSuppliers.map((supplier) => (
                      <tr key={supplier.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {supplier.name}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {supplier.alamat || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatNumberWithUnit(supplier.totalPemasokan || 0, 'kg')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {supplier.jumlahTransaksi || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <Tooltip content="Edit pemasok">
                              <button
                                onClick={() => handleEdit(supplier)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors duration-200 font-medium"
                              >
                                <FaEdit className="h-4 w-4" />
                                <span>Ubah</span>
                              </button>
                            </Tooltip>
                            {supplier.jumlahTransaksi && supplier.jumlahTransaksi > 0 ? (
                              <Tooltip
                                content={`Tidak dapat menghapus pemasok karena sudah memiliki ${supplier.jumlahTransaksi} transaksi pemasukan. Hapus semua transaksi terkait terlebih dahulu.`}
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
                              <Tooltip content="Hapus pemasok">
                                <button
                                  onClick={() => handleDeleteClick(supplier.id)}
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
                    ))
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
            setFormData({ name: '', alamat: '' });
          }}
          title={editing ? 'Edit Pemasok' : 'Tambah Pemasok'}
          size="md"
        >
          <form onSubmit={handleSubmit} noValidate>
            <div className="space-y-4">
              <Input
                label="Nama Pemasok"
                type="text"
                required
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (formErrors.name) setFormErrors((p) => ({ ...p, name: '' }));
                }}
                placeholder="Masukkan nama pemasok"
                error={formErrors.name}
              />
              <Input
                label="Alamat"
                type="text"
                value={formData.alamat}
                onChange={(e) =>
                  setFormData({ ...formData, alamat: e.target.value })
                }
                placeholder="Masukkan alamat pemasok (opsional)"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 mt-6 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setEditing(null);
                  setFormErrors({});
                  setFormData({ name: '', alamat: '' });
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
          title="Hapus Pemasok"
          message="Apakah Anda yakin ingin menghapus pemasok ini? Tindakan ini tidak dapat dibatalkan."
          confirmText="Hapus"
          cancelText="Batal"
          variant="danger"
          isLoading={isDeleting}
        />
      </div>
    </Layout>
  );
}
