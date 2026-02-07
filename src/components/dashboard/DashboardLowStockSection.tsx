import { formatNumberWithUnit } from '../../utils/format';
import type { DashboardData } from '../../types';

interface DashboardLowStockSectionProps {
  data: DashboardData | null;
}

export function DashboardLowStockSection({ data }: DashboardLowStockSectionProps) {
  return (
    <section className="bg-white shadow rounded-xl border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">Peringatan Stok Rendah</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Barang di bawah batas. Pertimbangkan restok.
        </p>
      </div>
      <div className="p-5">
        {data && data.lowStockWarnings.length > 0 ? (
          <div className="space-y-3">
            {data.lowStockWarnings.map((warning) => (
              <div
                key={warning.riceType.id}
                className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900">{warning.riceType.name}</p>
                </div>
                <p className="text-sm font-semibold text-amber-800">
                  {formatNumberWithUnit(warning.currentStock, warning.unit)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-gray-500 bg-gray-50 rounded-lg">
            Tidak ada peringatan stok rendah. Semua barang di atas batas.
          </div>
        )}
      </div>
    </section>
  );
}
