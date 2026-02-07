import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { formatNumberWithUnit } from '../../utils/format';
import type { DashboardChartsData } from '../../types';
import { CHART_COLORS } from './dashboardConstants';

interface DashboardStockChartProps {
  chartsData: DashboardChartsData | null;
  loading: boolean;
}

export function DashboardStockChart({ chartsData, loading }: DashboardStockChartProps) {
  return (
    <section className="bg-white shadow rounded-xl border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">Total Stok per Jenis Beras</h2>
        <p className="text-sm text-gray-500 mt-0.5">Gudang saat ini per produk.</p>
      </div>
      <div className="p-5">
        {loading ? (
          <div className="h-72 flex items-center justify-center text-gray-500">Memuat grafik...</div>
        ) : chartsData && chartsData.stockByRiceType.length > 0 ? (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartsData.stockByRiceType.map(
                  (s: { riceTypeName: string; quantity: number }) => ({
                    name: s.riceTypeName,
                    quantity: s.quantity,
                  })
                )}
                margin={{ top: 12, right: 12, left: 0, bottom: 24 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  tickFormatter={(v: number) => (v >= 1000 ? `${v / 1000}T` : String(v))}
                />
                <Tooltip
                  formatter={(value: number) => [
                    formatNumberWithUnit(Number(value), 'kg'),
                    'Stok',
                  ]}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Bar dataKey="quantity" radius={[4, 4, 0, 0]} maxBarSize={56}>
                  {chartsData.stockByRiceType.map(
                    (_: { riceTypeName: string; quantity: number }, i: number) => (
                      <Cell
                        key={i}
                        fill={CHART_COLORS.stock[i % CHART_COLORS.stock.length]}
                      />
                    )
                  )}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-72 flex items-center justify-center text-gray-500 bg-gray-50 rounded-lg">
            Tidak ada data stok.
          </div>
        )}
      </div>
    </section>
  );
}
