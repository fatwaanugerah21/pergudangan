import { useEffect, useState } from 'react';
import api from '../utils/api';
import type { RiceType } from '../types';
import Layout from '../components/Layout';
import { Input } from '../components/ui/input';
import { CollapsibleFilters, FilterActions } from '../components/ui/collapsible-filters';
import { Modal } from '../components/ui/modal';
import { ConfirmDialog } from '../components/ui/confirm-dialog';
import { useToast } from '../contexts/ToastContext';
import { FaEdit, FaTrash } from 'react-icons/fa';

export default function RiceTypes() {
  const [riceTypes, setRiceTypes] = useState<RiceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editing, setEditing] = useState<RiceType | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    fetchRiceTypes();
  }, []);

  const fetchRiceTypes = async () => {
    try {
      const response = await api.get('/rice-types');
      setRiceTypes(response.data);
    } catch (err: any) {
      showError(err.response?.data?.error || 'Gagal memuat data jenis beras');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!formData.name?.trim()) errors.name = 'Nama wajib diisi.';
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});
    setIsSubmitting(true);
    try {
      if (editing) {
        await api.put(`/rice-types/${editing.id}`, formData);
        showSuccess('Jenis beras berhasil diperbarui');
      } else {
        await api.post('/rice-types', formData);
        showSuccess('Jenis beras berhasil ditambahkan');
      }
      setShowModal(false);
      setEditing(null);
      setFormData({ name: '', description: '' });
      setFormErrors({});
      fetchRiceTypes();
    } catch (err: any) {
      showError(err.response?.data?.error || 'Gagal menyimpan jenis beras');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (riceType: RiceType) => {
    setEditing(riceType);
    setFormErrors({});
    setFormData({
      name: riceType.name,
      description: riceType.description || '',
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
      await api.delete(`/rice-types/${deletingId}`);
      showSuccess('Jenis beras berhasil dihapus');
      fetchRiceTypes();
      setShowDeleteDialog(false);
      setDeletingId(null);
    } catch (err: any) {
      showError(err.response?.data?.error || 'Gagal menghapus jenis beras');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredRiceTypes = riceTypes.filter((rt) =>
    rt.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="px-4 py-6 sm:px-0">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Data Master Beras</h1>
          <button
            onClick={() => {
              setEditing(null);
              setFormErrors({});
              setFormData({ name: '', description: '' });
              setShowModal(true);
            }}
            className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
          >
            Tambah Jenis Beras
          </button>
        </div>

        <CollapsibleFilters
          label="Filter"
          activeCount={searchTerm.trim() ? 1 : 0}
          defaultOpen={false}
          className="mb-6"
        >
          <Input
            label="Cari Jenis Beras"
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
          <div className="text-center py-8 text-gray-500 animate-pulse">Memuat...</div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg card-hover">
            <ul className="divide-y divide-gray-200">
              {filteredRiceTypes.map((riceType) => (
                <li key={riceType.id}>
                  <div className="px-4 py-4 sm:px-6 flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-gray-900">
                          {riceType.name}
                        </p>
                      </div>
                      {riceType.description && (
                        <p className="mt-1 text-sm text-gray-500">
                          {riceType.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(riceType)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors duration-200 font-medium"
title="Ubah"
                        >
                          <FaEdit className="h-4 w-4" />
                          <span>Ubah</span>
                      </button>
                      <button
                        onClick={() => handleDeleteClick(riceType.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition-colors duration-200 font-medium"
                        title="Hapus"
                      >
                        <FaTrash className="h-4 w-4" />
                        <span>Hapus</span>
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            {filteredRiceTypes.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Tidak ada jenis beras ditemukan
              </div>
            )}
          </div>
        )}

        <Modal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setEditing(null);
            setFormErrors({});
            setFormData({ name: '', description: '' });
          }}
          preventClose={isSubmitting}
          title={editing ? 'Edit Jenis Beras' : 'Tambah Jenis Beras'}
          size="md"
        >
          <form onSubmit={handleSubmit} noValidate>
            <div className="space-y-4">
              <Input
                label="Nama"
                type="text"
                required
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (formErrors.name) setFormErrors((p) => ({ ...p, name: '' }));
                }}
                error={formErrors.name}
              />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Deskripsi
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
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
                    name: '',
                    description: '',
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
          title="Hapus Jenis Beras"
          message="Apakah Anda yakin ingin menghapus jenis beras ini? Tindakan ini tidak dapat dibatalkan."
          confirmText="Hapus"
          cancelText="Batal"
          variant="danger"
          isLoading={isDeleting}
        />
      </div>
    </Layout>
  );
}
