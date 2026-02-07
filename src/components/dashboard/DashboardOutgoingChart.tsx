import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { formatNumberWithUnit, formatCurrency, formatDate } from '../../utils/format';
import type { DashboardChartsData } from '../../types';
import { CHART_COLORS, RICE_TYPE_LINE_COLORS, formatChartDate } from './dashboardConstants';

interface DashboardOutgoingChartProps {
  chartsData: DashboardChartsData | null;
  loading: boolean;
}

/** Only rice types that have at least one non-zero outgoing value in the period. */
function getRiceTypeNames(chartsData: DashboardChartsData | null): string[] {
  const byType = chartsData?.outgoingDailyByRiceType;
  if (!byType || byType.length === 0) return [];
  const first = byType[0] as Record<string, unknown>;
  const allNames = Object.keys(first).filter((k) => k !== 'date');
  return allNames.filter((name) =>
    byType.some((row) => {
      const v = row[name];
      return typeof v === 'number' ? v > 0 : Number(v) > 0;
    })
  );
}

function buildChartData(chartsData: DashboardChartsData | null): Array<Record<string, string | number>> {
  const byType = chartsData?.outgoingDailyByRiceType;
  if (byType && byType.length > 0) {
    return byType.map((row) => {
      const r = { ...row } as Record<string, string | number>;
      r.dateLabel = formatChartDate(String(row.date));
      const keys = Object.keys(row).filter((k) => k !== 'date' && k !== 'dateLabel');
      const total = keys.reduce(
        (sum, k) => sum + (Number((row as Record<string, unknown>)[k]) || 0),
        0
      );
      r['Penjualan'] = total;
      return r;
    });
  }
  const daily = chartsData?.outgoingDaily;
  if (!daily || daily.length === 0) return [];
  return daily.map((d: { date: string; quantity: number }) => ({
    date: d.date,
    dateLabel: formatChartDate(d.date),
    ['Penjualan']: d.quantity,
  }));
}

function getTotalQuantity(chartsData: DashboardChartsData | null): number {
  const daily = chartsData?.outgoingDaily;
  if (!daily) return 0;
  return daily.reduce((sum, d) => sum + d.quantity, 0);
}

export function DashboardOutgoingChart({ chartsData, loading }: DashboardOutgoingChartProps) {
  const chartData = buildChartData(chartsData);
  const riceTypeNames = getRiceTypeNames(chartsData);
  const useByRiceType = riceTypeNames.length > 0;
  const totalQuantity = getTotalQuantity(chartsData);
  const totalAmount = chartsData?.totalOutgoingAmount ?? 0;
  const periodLabel =
    chartsData?.chartStartDate && chartsData?.chartEndDate
      ? `${formatDate(chartsData.chartStartDate)} – ${formatDate(chartsData.chartEndDate)}`
      : '30 Hari Terakhir';
  const txCount = chartsData?.outgoingTransactionCount ?? 0;
  const avgKg = chartsData?.outgoingAveragePerDayKg ?? 0;
  const avgRp = chartsData?.outgoingAveragePerDayRp ?? 0;
  const topDestinations = chartsData?.topDestinations ?? [];
  const topRiceTypes = chartsData?.topRiceTypes ?? [];

  const hasData = chartData.length > 0 && (useByRiceType || chartsData?.outgoingDaily?.length);

  return (
    <section className="bg-white shadow rounded-xl border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">Penjualan</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Periode: {periodLabel}. Jumlah penjualan per hari per jenis beras.
        </p>
        {hasData && (
          <>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Total Penjualan Stok (Kg)
                </p>
                <p className="mt-1 text-xl font-semibold text-gray-900">
                  {formatNumberWithUnit(totalQuantity, 'kg')}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Total yang diterima (Rp.)
                </p>
                <p className="mt-1 text-xl font-semibold text-gray-900">
                  {formatCurrency(totalAmount)}
                </p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div className="rounded border border-gray-100 bg-white px-3 py-2">
                <span className="text-gray-500">Jumlah transaksi</span>
                <p className="font-semibold text-gray-900">{txCount}</p>
              </div>
              <div className="rounded border border-gray-100 bg-white px-3 py-2">
                <span className="text-gray-500">Rata-rata per hari (kg)</span>
                <p className="font-semibold text-gray-900">{formatNumberWithUnit(avgKg, 'kg')}</p>
              </div>
              <div className="rounded border border-gray-100 bg-white px-3 py-2">
                <span className="text-gray-500">Rata-rata per hari (Rp.)</span>
                <p className="font-semibold text-gray-900">{formatCurrency(avgRp)}</p>
              </div>
            </div>
            {(topDestinations.length > 0 || topRiceTypes.length > 0) && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {topDestinations.length > 0 && (
                  <div className="rounded border border-gray-100 bg-white px-3 py-2">
                    <span className="text-gray-500 font-medium">Pembeli terbesar</span>
                    <ul className="mt-1 space-y-0.5">
                      {topDestinations.slice(0, 3).map((d) => (
                        <li key={d.name} className="flex justify-between">
                          <span className="text-gray-700 truncate mr-2">{d.name}</span>
                          <span className="font-medium text-gray-900 shrink-0">
                            {formatNumberWithUnit(d.quantity, 'kg')}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {topRiceTypes.length > 0 && (
                  <div className="rounded border border-gray-100 bg-white px-3 py-2">
                    <span className="text-gray-500 font-medium">Produk terlaris</span>
                    <ul className="mt-1 space-y-0.5">
                      {topRiceTypes.slice(0, 3).map((r) => (
                        <li key={r.name} className="flex justify-between">
                          <span className="text-gray-700 truncate mr-2">{r.name}</span>
                          <span className="font-medium text-gray-900 shrink-0">
                            {formatNumberWithUnit(r.quantity, 'kg')}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
      <div className="p-5">
        {loading ? (
          <div className="h-64 flex items-center justify-center text-gray-500">Memuat...</div>
        ) : hasData ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 12, right: 12, left: 0, bottom: 24 }}
              >
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
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    padding: '10px 12px',
                  }}
                  labelFormatter={(_, payload: Array<{ payload?: Record<string, unknown> }>) =>
                    payload?.[0]?.payload?.date
                      ? formatChartDate(String(payload[0].payload.date))
                      : ''
                  }
                  formatter={(value: number, name: string) => [
                    formatNumberWithUnit(Number(value), 'kg'),
                    name,
                  ]}
                  itemSorter={(item) => {
                    const v = Number(item.value);
                    return -v;
                  }}
                />
                <Legend />
                {useByRiceType
                  ? riceTypeNames.map((name, i) => (
                    <Line
                      key={name}
                      type="monotone"
                      dataKey={name}
                      name={`${name} (kg)`}
                      stroke={RICE_TYPE_LINE_COLORS[i % RICE_TYPE_LINE_COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      connectNulls
                    />
                  ))
                  : (
                    <Line
                      type="monotone"
                      dataKey="Penjualan"
                      name="Penjualan (kg)"
                      stroke={CHART_COLORS.outgoing}
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      connectNulls
                    />
                  )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-500 bg-gray-50 rounded-lg">
            Tidak ada data penjualan dalam 30 hari terakhir.
          </div>
        )}

        {/* Pengeluaran Rupiah chart (below stock chart) */}
        {!loading && chartsData?.outgoingDailyAmount && (
          <div className="mt-6 pt-6 border-t border-gray-100">
            <h3 className="text-base font-semibold text-gray-900 mb-3">
              Pengeluaran Rupiah ({periodLabel})
            </h3>
            {chartsData.outgoingDailyAmount.some((d) => d.amount > 0) ? (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartsData.outgoingDailyAmount.map((d) => ({
                      ...d,
                      dateLabel: formatChartDate(d.date),
                    }))}
                    margin={{ top: 12, right: 12, left: 0, bottom: 24 }}
                  >
                    <defs>
                      <linearGradient id="outgoingRupiahGrad" x1="0" y1="0" x2="0" y2="1">
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
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      tickFormatter={(v: number) =>
                        v >= 1e6 ? `${(v / 1e6).toFixed(0)}jt` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                      }
                    />
                    <Tooltip
                      formatter={(value: number) => [
                        formatCurrency(Number(value)),
                        'Yang diterima (Rp)',
                      ]}
                      labelFormatter={(_, payload: Array<{ payload?: { date?: string } }>) =>
                        payload?.[0]?.payload?.date
                          ? formatChartDate(payload[0].payload.date)
                          : ''
                      }
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        padding: '10px 12px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="amount"
                      name="Yang diterima (Rp)"
                      stroke={CHART_COLORS.outgoing}
                      strokeWidth={2}
                      fill="url(#outgoingRupiahGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-56 flex items-center justify-center text-gray-500 bg-gray-50 rounded-lg">
                Tidak ada data pembayaran yang diterima dalam 30 hari terakhir.
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
