import { FaBoxes, FaArrowDown, FaArrowUp, FaExclamationTriangle } from 'react-icons/fa';
import { formatNumberWithUnit } from '../../utils/format';
import type { DashboardData } from '../../types';
import { CARD_BASE_CLASS } from './dashboardConstants';

export type SelectedChart = 'stock' | 'incoming' | 'outgoing' | 'lowstock' | null;

interface DashboardSummaryCardsProps {
  data: DashboardData | null;
  selectedChart: SelectedChart;
  onSelectChart: (chart: SelectedChart) => void;
}

export function DashboardSummaryCards({
  data,
  selectedChart,
  onSelectChart,
}: DashboardSummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
      <button
        type="button"
        onClick={() => onSelectChart(selectedChart === 'stock' ? null : 'stock')}
        className={`${CARD_BASE_CLASS} text-left hover:shadow-md hover:border-indigo-200 ${selectedChart === 'stock' ? 'ring-2 ring-indigo-500 border-indigo-300' : ''}`}
      >
        <div className="p-3 sm:p-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 rounded-lg bg-indigo-50 p-2">
              <FaBoxes className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-500 truncate">Stok Saat Ini</p>
              <p className="text-base font-semibold text-gray-900 truncate">
                {data ? formatNumberWithUnit(data.totalStock) : '0 kg'}
              </p>
            </div>
          </div>
        </div>
      </button>

      <button
        type="button"
        onClick={() => onSelectChart(selectedChart === 'incoming' ? null : 'incoming')}
        className={`${CARD_BASE_CLASS} text-left hover:shadow-md hover:border-emerald-200 ${selectedChart === 'incoming' ? 'ring-2 ring-emerald-500 border-emerald-300' : ''}`}
      >
        <div className="p-3 sm:p-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 rounded-lg bg-emerald-50 p-2">
              <FaArrowDown className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-500 truncate">Total Pemasukan Stok</p>
              <p className="text-base font-semibold text-gray-900 truncate">
                {data ? formatNumberWithUnit(data.totalIncoming) : '0 kg'}
              </p>
            </div>
          </div>
        </div>
      </button>

      <button
        type="button"
        onClick={() => onSelectChart(selectedChart === 'outgoing' ? null : 'outgoing')}
        className={`${CARD_BASE_CLASS} text-left hover:shadow-md hover:border-red-200 ${selectedChart === 'outgoing' ? 'ring-2 ring-red-500 border-red-300' : ''}`}
      >
        <div className="p-3 sm:p-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 rounded-lg bg-red-50 p-2">
              <FaArrowUp className="w-5 h-5 text-red-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-500 truncate">Total Penjualan Stok</p>
              <p className="text-base font-semibold text-gray-900 truncate">
                {data ? formatNumberWithUnit(data.totalOutgoing) : '0 kg'}
              </p>
            </div>
          </div>
        </div>
      </button>

      <button
        type="button"
        onClick={() => onSelectChart(selectedChart === 'lowstock' ? null : 'lowstock')}
        className={`${CARD_BASE_CLASS} text-left hover:shadow-md hover:border-amber-200 ${selectedChart === 'lowstock' ? 'ring-2 ring-amber-500 border-amber-300' : ''}`}
      >
        <div className="p-3 sm:p-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 rounded-lg bg-amber-50 p-2">
              <FaExclamationTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-500 truncate">Stok Rendah</p>
              <p className="text-base font-semibold text-gray-900 truncate">
                {data?.lowStockWarnings.length ?? 0}
              </p>
            </div>
          </div>
        </div>
      </button>
    </div>
  );
}
