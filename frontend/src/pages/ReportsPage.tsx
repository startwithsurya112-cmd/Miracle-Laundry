import React, { useState, useEffect } from 'react';
import { fetchRevenueReport, fetchProfitLossReport, fetchSettings, getApiBaseUrl, getAuthToken } from '../services/api';
import { useToast } from '../context/ToastContext';
import { Customer, Setting } from '../types';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  BarChart3,
  Download,
  TrendingUp,
  TrendingDown,
  Award,
  DollarSign,
  PieChart as PieChartIcon,
  Printer,
  FileText,
  Percent,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Building2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const ReportsPage: React.FC = () => {
  const { showToast } = useToast();
  const { selectedShop, selectedShopId } = useAuth();
  const [activeTab, setActiveTab] = useState<'pnl' | 'revenue' | 'customers'>('pnl');
  const [periodPreset, setPeriodPreset] = useState<string>('current_month');

  // Revenue & Sales Data
  const [period, setPeriod] = useState('30days');
  const [chartData, setChartData] = useState<any[]>([]);
  const [serviceBreakdown, setServiceBreakdown] = useState<any[]>([]);
  const [topCustomers, setTopCustomers] = useState<Customer[]>([]);

  // P&L Data State
  const [pnlData, setPnlData] = useState<any>({
    summary: {
      grossRevenue: 0,
      cashIncome: 0,
      upiIncome: 0,
      cardIncome: 0,
      totalExpenses: 0,
      cashExpenses: 0,
      bankExpenses: 0,
      netProfit: 0,
      profitMargin: 0,
      isProfit: true,
    },
    expenseBreakdown: [],
    monthlyTrends: [],
  });

  const [setting, setSetting] = useState<Setting | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSettings().then((res) => {
      if (res?.success) setSetting(res.setting);
    }).catch(() => {});
  }, []);

  const loadData = async () => {
    if (chartData.length === 0 && !pnlData?.summary?.grossRevenue) setIsLoading(true);
    try {
      const [revRes, pnlRes] = await Promise.all([
        fetchRevenueReport({ period, preset: periodPreset }),
        fetchProfitLossReport({ preset: periodPreset }),
      ]);

      if (revRes.success) {
        setChartData(revRes.chartData || []);
        setServiceBreakdown(revRes.serviceBreakdown || []);
        setTopCustomers(revRes.topCustomers || []);
      }

      if (pnlRes.success) {
        setPnlData(pnlRes);
      }
    } catch (err) {
      console.error('Failed to load reports', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedShopId, period, periodPreset]);

  const currencySymbol = setting?.currencySymbol || '₹';

  const handleExportCSV = async (type: 'orders' | 'customers' | 'pnl') => {
    try {
      showToast('⏳ Generating export file...', 'info');
      const token = getAuthToken();
      const baseUrl = getApiBaseUrl();
      const exportHeaders: Record<string, string> = {
        'Authorization': `Bearer ${token || ''}`,
      };
      if (selectedShopId && selectedShopId !== 'all') {
        exportHeaders['X-Shop-Id'] = selectedShopId;
      }
      const res = await fetch(`${baseUrl}/reports/export?type=${type}&token=${encodeURIComponent(token || '')}`, {
        headers: exportHeaders,
      });

      if (!res.ok) {
        throw new Error(`Export failed with status ${res.status}`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = type === 'pnl' ? 'laundry_profit_loss_statement.csv' : type === 'orders' ? 'laundry_orders.csv' : 'laundry_customers.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast('✅ Export downloaded successfully!', 'success');
    } catch (err: any) {
      console.error('Export error:', err);
      showToast(err.message || 'Failed to export CSV', 'error');
    }
  };

  const handlePrintPnl = () => {
    window.print();
  };

  const COLORS = ['#0284c7', '#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#6366f1'];

  const { summary, expenseBreakdown, monthlyTrends } = pnlData;

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-brand-600" /> Business Reports & Financial Analytics
          </h1>
          <p className="hidden sm:block text-xs text-slate-500">
            Profit & Loss statement, net margins, income vs expenses, service share & exports
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleExportCSV('pnl')}
            className="px-3.5 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs shadow-md shadow-brand-600/30 flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Export P&L Report</span>
          </button>
          <button
            onClick={() => handleExportCSV('orders')}
            className="px-3.5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/30 flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Orders CSV</span>
          </button>
        </div>
      </div>

      {selectedShop && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/40 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>
              Branch Analytics & Financials: <strong className="text-indigo-600 dark:text-indigo-400">[{selectedShop.code}] {selectedShop.name}</strong> ({selectedShop.region})
            </span>
          </div>
        </div>
      )}

      {/* Main View Mode Selector Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-3 pb-2">
        <button
          onClick={() => setActiveTab('pnl')}
          className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 ${
            activeTab === 'pnl'
              ? 'bg-brand-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <DollarSign className="w-4 h-4" /> Profit & Loss Statement (P&L)
        </button>

        <button
          onClick={() => setActiveTab('revenue')}
          className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 ${
            activeTab === 'revenue'
              ? 'bg-brand-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" /> Sales & Revenue Trends
        </button>

        <button
          onClick={() => setActiveTab('customers')}
          className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 ${
            activeTab === 'customers'
              ? 'bg-brand-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Award className="w-4 h-4" /> Top Customers Ranking
        </button>
      </div>

      {/* -------------------- TAB 1: PROFIT & LOSS STATEMENT -------------------- */}
      {activeTab === 'pnl' && (
        <div className="space-y-6">
          {/* Period Filter Preset Pill Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 glass-card p-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-600" />
              <span className="text-xs font-extrabold text-slate-900 dark:text-white">P&L Date Range:</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'current_month', label: 'This Month' },
                { id: 'last_month', label: 'Last Month' },
                { id: 'last_3_months', label: 'Last 3 Months' },
                { id: 'current_year', label: 'This Year' },
                { id: 'all', label: 'All Time' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPeriodPreset(p.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    periodPreset === p.id
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <button
              onClick={handlePrintPnl}
              className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-extrabold text-xs flex items-center gap-1.5 hover:bg-slate-300 transition-all"
            >
              <Printer className="w-3.5 h-3.5" /> Print P&L Sheet
            </button>
          </div>

          {/* 4 Key P&L Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Gross Revenue */}
            <div className="glass-card p-5 space-y-2 border-l-4 border-l-emerald-500 relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Gross Income</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
              {isLoading ? (
                <div className="flex items-center gap-2 py-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-500" />
                  <span className="text-xs font-semibold text-slate-400">Loading...</span>
                </div>
              ) : (
                <>
                  <p className="text-2xl font-black text-slate-900 dark:text-white">
                    {currencySymbol}{summary.grossRevenue.toLocaleString()}
                  </p>
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
                    <span>Cash: {currencySymbol}{summary.cashIncome}</span>
                    <span>•</span>
                    <span>UPI: {currencySymbol}{summary.upiIncome}</span>
                  </div>
                </>
              )}
            </div>

            {/* 2. Total Operating Expenses */}
            <div className="glass-card p-5 space-y-2 border-l-4 border-l-rose-500 relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Operating Expenses</span>
                <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <ArrowDownRight className="w-4 h-4" />
                </div>
              </div>
              {isLoading ? (
                <div className="flex items-center gap-2 py-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-rose-500" />
                  <span className="text-xs font-semibold text-slate-400">Loading...</span>
                </div>
              ) : (
                <>
                  <p className="text-2xl font-black text-rose-600 dark:text-rose-400">
                    {currencySymbol}{summary.totalExpenses.toLocaleString()}
                  </p>
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
                    <span>Utility & Supplies & Wages</span>
                  </div>
                </>
              )}
            </div>

            {/* 3. Net Profit / Loss */}
            <div className={`glass-card p-5 space-y-2 border-l-4 relative overflow-hidden ${summary.isProfit ? 'border-l-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20' : 'border-l-rose-500 bg-rose-50/20'}`}>
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Net Profit / Loss</span>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${summary.isProfit ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                  {summary.isProfit ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                </div>
              </div>
              {isLoading ? (
                <div className="flex items-center gap-2 py-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-brand-500" />
                  <span className="text-xs font-semibold text-slate-400">Loading...</span>
                </div>
              ) : (
                <>
                  <p className={`text-2xl font-black ${summary.isProfit ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-600'}`}>
                    {summary.isProfit ? '+' : ''}{currencySymbol}{summary.netProfit.toLocaleString()}
                  </p>
                  <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    {summary.isProfit ? '🟢 Net Business Profit' : '🔴 Net Loss Recorded'}
                  </div>
                </>
              )}
            </div>

            {/* 4. Profit Margin % */}
            <div className="glass-card p-5 space-y-2 border-l-4 border-l-brand-500 relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Net Margin (%)</span>
                <div className="w-8 h-8 rounded-xl bg-brand-100 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                  <Percent className="w-4 h-4" />
                </div>
              </div>
              {isLoading ? (
                <div className="flex items-center gap-2 py-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-brand-500" />
                  <span className="text-xs font-semibold text-slate-400">Loading...</span>
                </div>
              ) : (
                <>
                  <p className="text-2xl font-black text-brand-600 dark:text-brand-400">
                    {summary.profitMargin}%
                  </p>
                  <div className="text-[11px] font-semibold text-slate-500">
                    Net Profit Rate per ₹100 Revenue
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Month-over-Month Revenue vs Expense Chart & Expense Allocation */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Revenue vs Expenses Comparative Bar Chart (lg:col-span-7) */}
            <div className="glass-card p-6 lg:col-span-7 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-brand-500" /> Income vs Operating Expenses Trend
                  </h3>
                  <p className="text-xs text-slate-500">Comparative monthly financial performance</p>
                </div>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyTrends}>
                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <Tooltip
                      formatter={(val: any, name: any) => [`${currencySymbol}${val}`, name === 'revenue' ? 'Gross Revenue' : name === 'expenses' ? 'Expenses' : 'Net Profit']}
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar dataKey="revenue" name="Gross Revenue" fill="#10b981" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Expense Allocation Breakdown (lg:col-span-5) */}
            <div className="glass-card p-6 lg:col-span-5 flex flex-col justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4 text-rose-500" /> Expense Category Share
                </h3>
                <p className="text-xs text-slate-500 mb-4">Where your shop operational money is spent</p>

                {expenseBreakdown.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-xs font-semibold">
                    No operating expenses recorded for this period.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {expenseBreakdown.map((exp: any, idx: number) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-slate-700 dark:text-slate-300">{exp.category}</span>
                          <span className="text-slate-900 dark:text-white">
                            {currencySymbol}{exp.amount.toLocaleString()} ({exp.percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${exp.percentage}%`,
                              backgroundColor: COLORS[idx % COLORS.length],
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Complete Official P&L Statement Sheet */}
          <div className="glass-card p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 gap-2">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-brand-600" /> Official Profit & Loss Statement Sheet
                </h3>
                <p className="text-xs text-slate-500">
                  Comprehensive accounting summary for period ({pnlData.period?.startDate} to {pnlData.period?.endDate})
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs font-bold text-slate-400">Status: </span>
                <span className={`text-xs font-black px-2.5 py-1 rounded-full ${summary.isProfit ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                  {summary.isProfit ? 'NET PROFIT' : 'NET LOSS'}
                </span>
              </div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {/* Income Rows */}
              <div className="py-3 space-y-1.5">
                <p className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-[11px] text-emerald-600">
                  A. Gross Revenue / Income
                </p>
                <div className="flex justify-between text-slate-600 dark:text-slate-400 pl-3">
                  <span>Order Payments Collected (Cash)</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{currencySymbol}{summary.cashIncome}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400 pl-3">
                  <span>Order Payments Collected (UPI & Bank)</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{currencySymbol}{summary.upiIncome + summary.cardIncome}</span>
                </div>
                <div className="flex justify-between font-extrabold text-emerald-700 dark:text-emerald-400 pl-3 pt-1 border-t border-dashed border-slate-200 dark:border-slate-800">
                  <span>Total Gross Income (A)</span>
                  <span>{currencySymbol}{summary.grossRevenue.toLocaleString()}</span>
                </div>
              </div>

              {/* Expense Rows */}
              <div className="py-3 space-y-1.5">
                <p className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-[11px] text-rose-600">
                  B. Operational Expenses
                </p>
                {expenseBreakdown.map((e: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-slate-600 dark:text-slate-400 pl-3">
                    <span>{e.category}</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{currencySymbol}{e.amount.toLocaleString()}</span>
                  </div>
                ))}
                <div className="flex justify-between font-extrabold text-rose-600 dark:text-rose-400 pl-3 pt-1 border-t border-dashed border-slate-200 dark:border-slate-800">
                  <span>Total Operational Expenses (B)</span>
                  <span>{currencySymbol}{summary.totalExpenses.toLocaleString()}</span>
                </div>
              </div>

              {/* Net Result */}
              <div className="py-4 flex justify-between items-center text-sm font-black bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl">
                <span className="text-slate-900 dark:text-white">NET PROFIT / (LOSS) (A - B)</span>
                <span className={summary.isProfit ? 'text-emerald-600 text-lg' : 'text-rose-600 text-lg'}>
                  {summary.isProfit ? '+' : ''}{currencySymbol}{summary.netProfit.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- TAB 2: REVENUE TRENDS -------------------- */}
      {activeTab === 'revenue' && (
        <div className="space-y-6">
          {/* Period Selector Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 glass-card p-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-brand-600" />
              <span className="text-xs font-extrabold text-slate-900 dark:text-white">Revenue Period:</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'current_month', label: 'This Month' },
                { id: 'last_month', label: 'Last Month' },
                { id: 'last_3_months', label: 'Last 3 Months' },
                { id: '30days', label: '30 Days' },
                { id: 'current_year', label: 'This Year' },
                { id: 'all', label: 'All Time' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setPeriod(t.id);
                    setPeriodPreset(t.id);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    periodPreset === t.id || period === t.id
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="glass-card p-6 lg:col-span-8 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-brand-500" /> Revenue Collection Chart
                  </h3>
                  <p className="text-xs text-slate-500">Historical financial breakdown</p>
                </div>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <Tooltip
                      formatter={(val: any) => [`${currencySymbol}${val}`, 'Revenue']}
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                    />
                    <Bar dataKey="revenue" fill="#0284c7" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-card p-6 lg:col-span-4 flex flex-col justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white mb-1">
                  Revenue by Service
                </h3>
                <p className="text-xs text-slate-500 mb-4">Service category distribution</p>

                <div className="h-48 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={serviceBreakdown}
                        dataKey="amount"
                        nameKey="service"
                        cx="50%"
                        cy="50%"
                        outerRadius={65}
                        innerRadius={35}
                      >
                        {serviceBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val: any) => [`${currencySymbol}${val}`, 'Revenue']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                {serviceBreakdown.map((s, idx) => (
                  <div key={idx} className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                      {s.service}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">{currencySymbol}{s.amount}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- TAB 3: TOP CUSTOMERS RANKING -------------------- */}
      {activeTab === 'customers' && (
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  Top Customer Leaderboard
                </h3>
                <p className="text-xs text-slate-500">Highest spending customers ranked by lifetime revenue</p>
              </div>
            </div>

            <button
              onClick={() => handleExportCSV('customers')}
              className="px-3 py-1.5 rounded-xl bg-slate-800 text-white font-extrabold text-xs flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Export Customers
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {topCustomers.map((cust, idx) => (
              <div key={cust._id} className="py-3 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40 px-2 rounded-xl transition-all">
                <div className="flex items-center gap-3">
                  <span className={`w-7 h-7 rounded-full font-extrabold flex items-center justify-center text-xs ${
                    idx === 0 ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                    idx === 1 ? 'bg-slate-200 text-slate-800' :
                    idx === 2 ? 'bg-amber-800/20 text-amber-900' :
                    'bg-brand-50 text-brand-600'
                  }`}>
                    #{idx + 1}
                  </span>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{cust.name}</p>
                    <p className="text-[10px] text-slate-400">Mobile: +91 {cust.mobile}</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-black text-slate-900 dark:text-white">{currencySymbol}{cust.totalSpent}</p>
                  <p className="text-[10px] text-slate-500 font-semibold">{cust.totalOrders} total orders</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
