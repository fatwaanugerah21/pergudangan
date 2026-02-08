import { useEffect, useState, useCallback } from 'react';
import api from '../utils/api';
import Layout from '../components/Layout';
import { DatePicker } from '../components/ui/date-picker';
import type { DashboardData, DashboardChartsData } from '../types';
import {
  DashboardSummaryCards,
  DashboardReminders,
  DashboardStockChart,
  DashboardIncomingChart,
  DashboardOutgoingChart,
  DashboardLowStockSection,
  DashboardCardDetail,
  type SelectedChart,
} from '../components/dashboard';

function defaultChartEnd(): string {
  return new Date().toISOString().slice(0, 10);
}

function defaultChartStart(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [chartsData, setChartsData] = useState<DashboardChartsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartsLoading, setChartsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedChart, setSelectedChart] = useState<SelectedChart>(null);
  const [chartStartDate, setChartStartDate] = useState<string>(defaultChartStart);
  const [chartEndDate, setChartEndDate] = useState<string>(defaultChartEnd);

  const fetchDashboardData = useCallback(async () => {
    try {
      const response = await api.get<DashboardData>('/dashboard');
      setData(response.data);
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : null;
      setError(message || 'Gagal memuat dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchChartsData = useCallback(async () => {
    setChartsLoading(true);
    try {
      const params: { startDate?: string; endDate?: string } = {};
      if (chartStartDate) params.startDate = chartStartDate;
      if (chartEndDate) params.endDate = chartEndDate;
      const response = await api.get<DashboardChartsData>('/dashboard/charts', { params });
      setChartsData(response.data);
    } catch {
      setChartsData({
        stockByRiceType: [],
        incomingDaily: [],
        outgoingDaily: [],
      });
    } finally {
      setChartsLoading(false);
    }
  }, [chartStartDate, chartEndDate]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    fetchChartsData();
  }, [fetchChartsData]);

  // Clamp dates to today so we never send or show future dates
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    if (chartEndDate > today) setChartEndDate(today);
    if (chartStartDate > today) setChartStartDate(today);
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Memuat...</div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="px-4 py-6 sm:px-0">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-sm text-gray-500 mb-6">Ringkasan dan grafik di bawah.</p>

        <DashboardSummaryCards
          data={data}
          selectedChart={selectedChart}
          onSelectChart={setSelectedChart}
        />

        <DashboardReminders />

        {
          selectedChart !== "lowstock" && <div className="mb-4 p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
            <p className="text-sm font-medium text-gray-700 mb-2">Rentang tanggal grafik pemasukan & pengeluaran</p>
            <div className="flex flex-wrap items-center gap-3">
              {(() => {
                const today = new Date();
                today.setHours(23, 59, 59, 999);
                const endDateCap = chartEndDate ? new Date(chartEndDate) : today;
                const maxStart = endDateCap > today ? today : endDateCap;
                return (
                  <>
                    <DatePicker
                      label="Dari"
                      value={chartStartDate}
                      onChange={(date) => setChartStartDate(date || defaultChartStart())}
                      maxDate={maxStart}
                    />
                    <DatePicker
                      label="Sampai"
                      value={chartEndDate}
                      onChange={(date) => setChartEndDate(date || defaultChartEnd())}
                      minDate={new Date(chartStartDate)}
                      maxDate={today}
                    />
                  </>
                );
              })()}
              <button
                type="button"
                onClick={() => {
                  setChartStartDate(defaultChartStart());
                  setChartEndDate(defaultChartEnd());
                }}
                className="text-sm text-gray-600 hover:text-gray-900 underline"
              >
                Reset (30 hari terakhir)
              </button>
            </div>
          </div>

        }
        <div className="space-y-6">
          {selectedChart !== null && (
            <button
              type="button"
              onClick={() => setSelectedChart(null)}
              className="text-sm text-primary-600 hover:text-primary-800 font-medium"
            >
              ← Tampilkan semua grafik
            </button>
          )}
          {(selectedChart === null || selectedChart === 'stock') && (
            <>
              <DashboardStockChart chartsData={chartsData} loading={chartsLoading} />
              <DashboardCardDetail
                visible={selectedChart !== null}
                chartsData={chartsData}
                chartsLoading={chartsLoading}
              />
            </>

          )}
          {(selectedChart === null ||
            selectedChart === 'incoming' ||
            selectedChart === 'outgoing') && (
              <div
                className={
                  selectedChart === null
                    ? 'grid grid-cols-1 lg:grid-cols-2 gap-6'
                    : ''
                }
              >
                {(selectedChart === null || selectedChart === 'incoming') && (
                  <DashboardIncomingChart
                    chartsData={chartsData}
                    loading={chartsLoading}
                  />
                )}
                {(selectedChart === null || selectedChart === 'outgoing') && (
                  <DashboardOutgoingChart
                    chartsData={chartsData}
                    loading={chartsLoading}
                  />
                )}
              </div>
            )}
          {(selectedChart === null || selectedChart === 'lowstock') && (
            <DashboardLowStockSection data={data} />
          )}
        </div>
      </div>
    </Layout>
  );
}
