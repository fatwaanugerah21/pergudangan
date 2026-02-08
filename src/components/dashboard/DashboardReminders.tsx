import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FaMoneyBillWave, FaShippingFast } from 'react-icons/fa';
import api from '../../utils/api';
import { formatCurrency, formatDate, formatNumberWithUnit } from '../../utils/format';
import type { Installment, DeliveryOrder } from '../../types';

export function DashboardReminders() {
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReminders = useCallback(async () => {
    try {
      const [instRes, delRes] = await Promise.all([
        api.get<Installment[]>('/installments', { params: { status: 'pending', upcoming: 'true' } }),
        api.get<DeliveryOrder[]>('/delivery-orders/upcoming'),
      ]);
      setInstallments(instRes.data);
      setDeliveries(delRes.data);
    } catch {
      setInstallments([]);
      setDeliveries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="rounded-xl border border-gray-100 bg-white p-4 animate-pulse">
          <div className="h-6 bg-gray-100 rounded w-1/3 mb-4" />
          <div className="space-y-2">
            <div className="h-4 bg-gray-50 rounded w-full" />
            <div className="h-4 bg-gray-50 rounded w-3/4" />
          </div>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 animate-pulse">
          <div className="h-6 bg-gray-100 rounded w-1/3 mb-4" />
          <div className="space-y-2">
            <div className="h-4 bg-gray-50 rounded w-full" />
            <div className="h-4 bg-gray-50 rounded w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  const hasReminders = installments.length > 0 || deliveries.length > 0;
  if (!hasReminders) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {installments.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-amber-900 flex items-center gap-2">
              <FaMoneyBillWave className="h-4 w-4 text-amber-600" />
              Cicilan Jatuh Tempo (7 Hari)
            </h2>
            <Link
              to="/debt"
              className="text-xs font-medium text-amber-700 hover:text-amber-900 underline"
            >
              Lihat semua
            </Link>
          </div>
          <ul className="space-y-2">
            {installments.slice(0, 5).map((inst) => (
              <li
                key={inst.id}
                className="flex justify-between items-center text-sm bg-white rounded-lg px-3 py-2 border border-amber-100"
              >
                <span className="text-gray-700 truncate">
                  {inst.outgoingTransaction?.destination?.name ?? '-'} · {formatDate(inst.dueDate)}
                </span>
                <span className="font-semibold text-amber-800 ml-2">{formatCurrency(inst.amount)}</span>
              </li>
            ))}
            {installments.length > 5 && (
              <li className="text-xs text-amber-700 pl-1">
                +{installments.length - 5} lagi
              </li>
            )}
          </ul>
        </div>
      )}

      {deliveries.length > 0 && (
        <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-teal-900 flex items-center gap-2">
              <span className="relative inline-flex">
                <FaShippingFast className="h-4 w-4 text-teal-600" />
                <span
                  className="absolute -top-2 -right-2 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-teal-600 text-white text-xs font-bold px-1"
                  title={`${deliveries.length} pengantaran minggu ini`}
                >
                  {deliveries.length > 99 ? '99+' : deliveries.length}
                </span>
              </span>
              Pengantaran Minggu Ini
            </h2>
            <Link
              to="/delivery-orders"
              className="text-xs font-medium text-teal-700 hover:text-teal-900 underline"
            >
              Lihat semua
            </Link>
          </div>
          <ul className="space-y-2">
            {deliveries.slice(0, 3).map((order) => (
              <li
                key={order.id}
                className="flex justify-between items-center text-sm bg-white rounded-lg px-3 py-2 border border-teal-100"
              >
                <span className="text-gray-700 truncate">
                  {order.destination?.name ?? '-'} · {formatDate(order.scheduledDeliveryDate)}
                </span>
                <span className="font-semibold text-teal-800 ml-2">
                  {formatNumberWithUnit(order.quantity, 'kg')}
                </span>
              </li>
            ))}
            {deliveries.length > 3 && (
              <li className="text-xs text-teal-700 pl-1">
                <Link to="/delivery-orders" className="hover:underline font-medium">
                  +{deliveries.length - 3} lagi · Lihat semua
                </Link>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
