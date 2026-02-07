import { useEffect, useState, useCallback } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import api from '../../utils/api';
import { formatNumberWithUnit, formatDate } from '../../utils/format';
import type {
  DashboardChartsData,
  IncomingTransaction,
  OutgoingTransaction,
} from '../../types';
import { CHART_COLORS, formatChartDate } from './dashboardConstants';

interface DashboardCardDetailProps {
  /** When true, fetch and show purchase/sales detail and chart by date */
  visible: boolean;
  chartsData: DashboardChartsData | null;
  chartsLoading: boolean;
}

function last30DaysRange(): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 29);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

/** Merge incoming and outgoing daily into one array by date for combined chart */
function mergeDailyByDate(chartsData: DashboardChartsData | null): Array<{
  date: string;
  dateLabel: string;
  incoming: number;
  outgoing: number;
}> {
  if (!chartsData) return [];
  const map = new Map<
    string,
    { date: string; dateLabel: string; incoming: number; outgoing: number }
  >();
  for (const d of chartsData.incomingDaily) {
    const key = d.date.slice(0, 10);
    const dateLabel = formatChartDate(d.date);
    map.set(key, {
      date: key,
      dateLabel,
      incoming: d.quantity,
      outgoing: 0,
    });
  }
  for (const d of chartsData.outgoingDaily) {
    const key = d.date.slice(0, 10);
    const existing = map.get(key);
    const dateLabel = formatChartDate(d.date);
    if (existing) {
      existing.outgoing = d.quantity;
    } else {
      map.set(key, { date: key, dateLabel, incoming: 0, outgoing: d.quantity });
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

export function DashboardCardDetail({
  visible,
  chartsData,
  chartsLoading,
}: DashboardCardDetailProps) {
  const [incoming, setIncoming] = useState<IncomingTransaction[]>([]);
  const [outgoing, setOutgoing] = useState<OutgoingTransaction[]>([]);
  const [loadingIncoming, setLoadingIncoming] = useState(false);
  const [loadingOutgoing, setLoadingOutgoing] = useState(false);

  const range = chartsData?.chartStartDate && chartsData?.chartEndDate
    ? { start: chartsData.chartStartDate, end: chartsData.chartEndDate }
    : last30DaysRange();
  const { start, end } = range;

  const fetchIncoming = useCallback(async () => {
    setLoadingIncoming(true);
    try {
      const res = await api.get<IncomingTransaction[]>('/incoming', {
        params: { startDate: start, endDate: end },
      });
      setIncoming(res.data);
    } catch {
      setIncoming([]);
    } finally {
      setLoadingIncoming(false);
    }
  }, [start, end]);

  const fetchOutgoing = useCallback(async () => {
    setLoadingOutgoing(true);
    try {
      const res = await api.get<OutgoingTransaction[]>('/outgoing', {
        params: { startDate: start, endDate: end },
      });
      setOutgoing(res.data);
    } catch {
      setOutgoing([]);
    } finally {
      setLoadingOutgoing(false);
    }
  }, [start, end]);

  useEffect(() => {
    if (visible) {
      fetchIncoming();
      fetchOutgoing();
    }
  }, [visible, fetchIncoming, fetchOutgoing]);

  if (!visible) return null;

  const combinedData = mergeDailyByDate(chartsData);

  return (
    <div className="space-y-6">
      {/* Rice quantity chart by date (incoming + outgoing) */}
      <section className="bg-white shadow rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            Grafik Beras per Tanggal (Periode: {formatDate(start)} – {formatDate(end)})
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Jumlah pemasukan dan penjualan stok per hari.
          </p>
        </div>
        <div className="p-5">
          {chartsLoading ? (
            <div className="h-64 flex items-center justify-center text-gray-500">
              Memuat grafik...
            </div>
          ) : combinedData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={combinedData}
                  margin={{ top: 12, right: 12, left: 0, bottom: 24 }}
                >
                  <defs>
                    <linearGradient id="detailIncomingGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor={CHART_COLORS.incoming}
                        stopOpacity={0.4}
                      />
                      <stop
                        offset="100%"
                        stopColor={CHART_COLORS.incoming}
                        stopOpacity={0}
                      />
                    </linearGradient>
                    <linearGradient id="detailOutgoingGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor={CHART_COLORS.outgoing}
                        stopOpacity={0.4}
                      />
                      <stop
                        offset="100%"
                        stopColor={CHART_COLORS.outgoing}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    tickFormatter={(v: number) =>
                      v >= 1000 ? `${v / 1000}T` : String(v)
                    }
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      return [
                        formatNumberWithUnit(Number(value), 'kg'),
                        name,
                      ]
                    }}
                    labelFormatter={(_, payload: Array<{ payload?: { date?: string } }>) =>
                      payload?.[0]?.payload?.date
                        ? formatChartDate(payload[0].payload.date)
                        : ''
                    }
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                    }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="incoming"
                    name="Pemasukan (kg)"
                    stroke={CHART_COLORS.incoming}
                    strokeWidth={2}
                    fill="url(#detailIncomingGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="outgoing"
                    name="Penjualan (kg)"
                    stroke={CHART_COLORS.outgoing}
                    strokeWidth={2}
                    fill="url(#detailOutgoingGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500 bg-gray-50 rounded-lg">
              Tidak ada data dalam periode {formatDate(start)} – {formatDate(end)}.
            </div>
          )}
        </div>
      </section>

      {/* Purchase detail (incoming) */}
      <section className="bg-white shadow rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Detail Pembelian (Pemasukan)</h2>
          <p className="text-sm text-gray-500 mt-0.5">Transaksi pemasukan {formatDate(start)} – {formatDate(end)}.</p>
        </div>
        <div className="p-5 overflow-x-auto">
          {loadingIncoming ? (
            <div className="py-8 text-center text-gray-500">Memuat...</div>
          ) : incoming.length === 0 ? (
            <div className="py-8 text-center text-gray-500 bg-gray-50 rounded-lg">
              Tidak ada transaksi pemasukan.
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-gray-200 text-gray-600">
                  <th className="py-2 pr-4 font-medium">Tanggal</th>
                  <th className="py-2 pr-4 font-medium">Jenis Beras</th>
                  <th className="py-2 pr-4 font-medium">Jumlah</th>
                  <th className="py-2 pr-4 font-medium">Pemasok</th>
                </tr>
              </thead>
              <tbody>
                {incoming.map((t) => (
                  <tr key={t.id} className="border-b border-gray-100">
                    <td className="py-2 pr-4 text-gray-900">{formatDate(t.date)}</td>
                    <td className="py-2 pr-4 text-gray-900">
                      {t.riceType?.name ?? '-'}
                    </td>
                    <td className="py-2 pr-4 font-medium text-gray-900">
                      {formatNumberWithUnit(t.quantity, t.riceType?.unit ?? 'kg')}
                    </td>
                    <td className="py-2 pr-4 text-gray-600">{t.supplier?.name ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Sales detail (outgoing) */}
      <section className="bg-white shadow rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Detail Penjualan</h2>
          <p className="text-sm text-gray-500 mt-0.5">Transaksi penjualan {formatDate(start)} – {formatDate(end)}.</p>
        </div>
        <div className="p-5 overflow-x-auto">
          {loadingOutgoing ? (
            <div className="py-8 text-center text-gray-500">Memuat...</div>
          ) : outgoing.length === 0 ? (
            <div className="py-8 text-center text-gray-500 bg-gray-50 rounded-lg">
              Tidak ada transaksi penjualan.
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-gray-200 text-gray-600">
                  <th className="py-2 pr-4 font-medium">Tanggal</th>
                  <th className="py-2 pr-4 font-medium">Jenis Beras</th>
                  <th className="py-2 pr-4 font-medium">Jumlah</th>
                  <th className="py-2 pr-4 font-medium">Tujuan</th>
                </tr>
              </thead>
              <tbody>
                {outgoing.map((t) => (
                  <tr key={t.id} className="border-b border-gray-100">
                    <td className="py-2 pr-4 text-gray-900">{formatDate(t.date)}</td>
                    <td className="py-2 pr-4 text-gray-900">
                      {t.riceType?.name ?? '-'}
                    </td>
                    <td className="py-2 pr-4 font-medium text-gray-900">
                      {formatNumberWithUnit(t.quantity, t.riceType?.unit ?? 'kg')}
                    </td>
                    <td className="py-2 pr-4 text-gray-600">{t.destination?.name ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
