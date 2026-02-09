import { useEffect, useState, useCallback } from 'react';
import api from '../utils/api';
import Layout from '../components/Layout';
import { Modal } from '../components/ui/modal';
import { NumberInput } from '../components/ui/number-input';
import { DateTimePicker } from '../components/ui/datetime-picker';
import { Select } from '../components/ui/select';
import { CollapsibleFilters, FilterActions } from '../components/ui/collapsible-filters';
import { useToast } from '../contexts/ToastContext';
import { formatCurrency, formatDate, formatDateTime, toLocalDateTimeString } from '../utils/format';
import type { OutgoingTransaction, Installment } from '../types';
import { FaList, FaSort, FaSortUp, FaSortDown } from 'react-icons/fa';

type DebtSortField = 'date' | 'destination' | 'riceType' | 'quantity' | 'totalAmount' | 'paymentAmount' | 'remainingDebt' | null;

interface Destination {
  id: string;
  name: string;
  type: string;
}

export default function Debt() {
  const [transactions, setTransactions] = useState<OutgoingTransaction[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<{
    destinationId?: string;
    startDate?: string;
    endDate?: string;
    minRemainingDebt?: string;
    maxRemainingDebt?: string;
  }>({});
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedTx, setSelectedTx] = useState<OutgoingTransaction | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showInstallmentsModal, setShowInstallmentsModal] = useState(false);
  const [installmentsForTx, setInstallmentsForTx] = useState<OutgoingTransaction | null>(null);
  const [installmentsList, setInstallmentsList] = useState<Installment[]>([]);
  const [loadingInstallments, setLoadingInstallments] = useState(false);
  const [payFormErrors, setPayFormErrors] = useState<Record<string, string>>({});
  const [sortField, setSortField] = useState<DebtSortField>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);
  const { showError, showSuccess } = useToast();

  const openInstallmentsList = useCallback(async (tx: OutgoingTransaction) => {
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
  }, [showError]);

  const closeInstallmentsModal = useCallback(() => {
    setShowInstallmentsModal(false);
    setInstallmentsForTx(null);
    setInstallmentsList([]);
  }, []);

  const fetchDebtSummary = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (filters.destinationId) params.destinationId = filters.destinationId;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.minRemainingDebt) params.minRemainingDebt = filters.minRemainingDebt;
      if (filters.maxRemainingDebt) params.maxRemainingDebt = filters.maxRemainingDebt;
      const response = await api.get<OutgoingTransaction[]>('/installments/debt-summary', { params });
      setTransactions(response.data);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
        : null;
      showError(msg || 'Gagal memuat data utang');
    } finally {
      setLoading(false);
    }
  }, [showError, filters.destinationId, filters.startDate, filters.endDate, filters.minRemainingDebt, filters.maxRemainingDebt]);

  const fetchDestinations = useCallback(async () => {
    try {
      const response = await api.get<Destination[]>('/destinations', { params: { type: 'customer' } });
      setDestinations(response.data);
    } catch {
      setDestinations([]);
    }
  }, []);

  useEffect(() => {
    fetchDestinations();
  }, [fetchDestinations]);

  useEffect(() => {
    setLoading(true);
    fetchDebtSummary();
  }, [fetchDebtSummary]);

  const getRemainingDebt = (tx: OutgoingTransaction): number => {
    const total = tx.totalAmount ?? tx.paymentAmount ?? 0;
    const paid = tx.paymentAmount ?? 0;
    return Math.max(0, total - paid);
  };

  const toggleSort = (field: DebtSortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedTransactions = [...transactions].sort((a, b) => {
    if (!sortField || !sortDirection) return 0;
    let aVal: string | number;
    let bVal: string | number;
    switch (sortField) {
      case 'date':
        aVal = new Date(a.date).getTime();
        bVal = new Date(b.date).getTime();
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
      case 'totalAmount':
        aVal = a.totalAmount ?? a.paymentAmount ?? 0;
        bVal = b.totalAmount ?? b.paymentAmount ?? 0;
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

  const SortableTh = ({ field, label }: { field: DebtSortField; label: string }) => (
    <th
      className="px-6 py-4 font-medium text-sm uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-gray-100 text-gray-600"
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

  const handleAddPaymentClick = (tx: OutgoingTransaction) => {
    setSelectedTx(tx);
    setPayAmount('');
    setPayDate(toLocalDateTimeString());
    setPayFormErrors({});
    setShowPayModal(true);
  };

  const handlePayAmountChange = (value: string) => {
    setPayAmount(value);
  };

  const handleAddPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTx) return;
    const errors: Record<string, string> = {};
    if (!payDate?.trim()) errors.payDate = 'Tanggal & Jam Pembayaran wajib diisi.';
    const amount = payAmount ? parseFloat(payAmount.replace(/,/g, '')) : NaN;
    if (!payAmount?.trim() || isNaN(amount) || amount <= 0) {
      errors.payAmount = 'Jumlah pembayaran wajib diisi dan harus lebih dari 0.';
    } else {
      const remaining = getRemainingDebt(selectedTx);
      if (amount > remaining) errors.payAmount = 'Jumlah pembayaran tidak boleh melebihi sisa utang.';
    }
    if (Object.keys(errors).length > 0) {
      setPayFormErrors(errors);
      return;
    }
    setPayFormErrors({});
    const paidAt = payDate ? new Date(payDate).toISOString() : new Date().toISOString();
    setIsSubmitting(true);
    try {
      await api.post('/installments', {
        outgoingTransactionId: selectedTx.id,
        amount,
        paidAt,
      });
      showSuccess('Pembayaran berhasil dicatat');
      setShowPayModal(false);
      setSelectedTx(null);
      setPayAmount('');
      setPayDate('');
      setPayFormErrors({});
      fetchDebtSummary();
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
        : null;
      showError(msg || 'Gagal mencatat pembayaran');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="px-4 py-6 sm:px-0 max-w-7xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Utang</h1>
        <p className="text-sm text-gray-500 mb-6">
          Daftar transaksi belum lunas.
        </p>

        <CollapsibleFilters
          label="Filter"
          activeCount={
            (filters.destinationId ? 1 : 0) +
            (filters.startDate ? 1 : 0) +
            (filters.endDate ? 1 : 0) +
            (filters.minRemainingDebt ? 1 : 0) +
            (filters.maxRemainingDebt ? 1 : 0)
          }
          defaultOpen={false}
          className="mb-6"
        >
          <Select
            label="Pelanggan"
            value={filters.destinationId || ''}
            onChange={(value) => setFilters({ ...filters, destinationId: value || undefined })}
            placeholder="Semua pelanggan"
            options={[
              { value: '', label: 'Semua pelanggan' },
              ...destinations.map((d) => ({ value: d.id, label: d.name })),
            ]}
          />
          <NumberInput
            label="Min. Sisa Utang (Rp)"
            value={filters.minRemainingDebt || ''}
            onChange={(value) => setFilters({ ...filters, minRemainingDebt: value || undefined })}
            placeholder="0"
          />
          <NumberInput
            label="Maks. Sisa Utang (Rp)"
            value={filters.maxRemainingDebt || ''}
            onChange={(value) => setFilters({ ...filters, maxRemainingDebt: value || undefined })}
            placeholder="Tanpa batas"
          />
          <FilterActions className="sm:col-span-2 lg:col-span-4 xl:col-span-5">
            <button
              type="button"
              onClick={() =>
                setFilters({
                  destinationId: undefined,
                  startDate: undefined,
                  endDate: undefined,
                  minRemainingDebt: undefined,
                  maxRemainingDebt: undefined,
                })
              }
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Hapus filter
            </button>
          </FilterActions>
        </CollapsibleFilters>

        {loading ? (
          <div className="py-16 text-center text-gray-500">Memuat...</div>
        ) : (
          <section className="bg-white shadow rounded-xl border border-gray-100 overflow-hidden">
            <h2 className="text-lg font-semibold text-gray-900 px-6 py-5 border-b border-gray-100">
              Transaksi Belum Lunas
            </h2>
            {transactions.length === 0 ? (
              <div className="py-16 text-center text-gray-500">
                Tidak ada transaksi dengan utang.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[700px]">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <SortableTh field="date" label="Tanggal Order" />
                      <SortableTh field="destination" label="Pelanggan" />
                      <SortableTh field="riceType" label="Produk" />
                      <SortableTh field="quantity" label="Jumlah (Kg)" />
                      <SortableTh field="totalAmount" label="Total Tagihan (Rp)" />
                      <SortableTh field="paymentAmount" label="Uang Diterima (Rp)" />
                      <SortableTh field="remainingDebt" label="Sisa Utang" />
                      <th className="px-6 py-4 font-medium text-sm uppercase tracking-wider whitespace-nowrap">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sortedTransactions.map((tx) => {
                      const remaining = getRemainingDebt(tx);
                      return (
                        <tr key={tx.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="px-6 py-4 text-gray-900 text-sm whitespace-nowrap">{formatDate(tx.date)}</td>
                          <td className="px-6 py-4 text-gray-900 text-sm">{tx.destination?.name ?? '-'}</td>
                          <td className="px-6 py-4 text-gray-900 text-sm">{tx.riceType?.name ?? '-'}</td>
                          <td className="px-6 py-4 text-gray-900 text-sm">{tx.quantity}</td>
                          <td className="px-6 py-4 font-medium text-gray-900 text-sm whitespace-nowrap">{formatCurrency(tx.totalAmount ?? tx.paymentAmount)}</td>
                          <td className="px-6 py-4 text-gray-600 text-sm whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5">
                              {formatCurrency(tx.paymentAmount ?? 0)}
                              <button
                                type="button"
                                onClick={() => openInstallmentsList(tx)}
                                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                                title="Lihat daftar cicilan"
                              >
                                <FaList className="h-4 w-4" />
                              </button>
                            </span>
                          </td>
                          <td className="px-6 py-4 font-semibold text-amber-700 text-sm whitespace-nowrap">{formatCurrency(remaining)}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleAddPaymentClick(tx)}
                              className="text-sm font-medium text-primary-600 hover:text-primary-800 bg-primary-50 hover:bg-primary-100 px-3 py-2 rounded-lg transition-colors"
                            >
                              Tambah Pembayaran
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        <Modal
          isOpen={showPayModal}
          onClose={() => {
            setShowPayModal(false);
            setSelectedTx(null);
            setPayAmount('');
            setPayDate('');
            setPayFormErrors({});
          }}
          preventClose={isSubmitting}
          title="Tambah Pembayaran"
          size="md"
        >
          {selectedTx && (() => {
            const remaining = getRemainingDebt(selectedTx);
            const amountNum = payAmount ? parseFloat(payAmount.replace(/,/g, '')) : 0;
            const exceedsRemaining = !isNaN(amountNum) && amountNum > 0 && amountNum > remaining;
            return (
              <form onSubmit={handleAddPaymentSubmit} noValidate>
                <div className="space-y-5">
                  <p className="text-sm text-gray-600">
                    {selectedTx.destination?.name ?? '-'} · Sisa utang: {formatCurrency(remaining)}
                  </p>
                  <DateTimePicker
                    label="Tanggal & Jam Pembayaran"
                    required
                    value={payDate}
                    onChange={(v) => {
                      setPayDate(v);
                      if (payFormErrors.payDate) setPayFormErrors((p) => ({ ...p, payDate: '' }));
                    }}
                    maxDateTime={new Date()}
                    error={payFormErrors.payDate}
                  />
                  <NumberInput
                    label="Jumlah Pembayaran (Rp)"
                    required
                    value={payAmount}
                    onChange={(v) => {
                      handlePayAmountChange(v);
                      if (payFormErrors.payAmount) setPayFormErrors((p) => ({ ...p, payAmount: '' }));
                    }}
                    placeholder="0"
                    error={payFormErrors.payAmount || (exceedsRemaining ? 'Tidak boleh melebihi sisa utang' : undefined)}
                    helperText={!payFormErrors.payAmount && !exceedsRemaining ? `Maksimal: ${formatCurrency(remaining)} (sisa utang)` : undefined}
                  />
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => setShowPayModal(false)}
                      className="px-4 py-2.5 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium inline-flex items-center justify-center gap-2"
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
                </div>
              </form>
            );
          })()}
        </Modal>

        <Modal
          isOpen={showInstallmentsModal}
          onClose={closeInstallmentsModal}
          title={installmentsForTx ? `Daftar Cicilan · ${installmentsForTx.destination?.name ?? '-'}` : 'Daftar Cicilan'}
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
      </div>
    </Layout>
  );
}
