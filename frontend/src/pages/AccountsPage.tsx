import React, { useState, useEffect } from 'react';
import {
  fetchAccountsSummary,
  fetchExpenses,
  createExpenseApi,
  updateExpenseApi,
  deleteExpenseApi,
  fetchSettings,
} from '../services/api';
import {
  Expense,
  AccountsSummary,
  AccountsTransaction,
  Setting,
} from '../types';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import {
  Wallet,
  Building2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Calendar,
  X,
  CreditCard,
  Edit,
  Trash2,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Tag,
} from 'lucide-react';

import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export const AccountsPage: React.FC = () => {
  const { showToast } = useToast();
  const { selectedShop, selectedShopId } = useAuth();
  const [activeTab, setActiveTab] = useState<'orders' | 'shop'>('orders');
  const [setting, setSetting] = useState<Setting | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingExpense, setIsSavingExpense] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showExpFilterPanel, setShowExpFilterPanel] = useState(false);

  // --- Order Accounts State ---
  const [accountsSummary, setAccountsSummary] = useState<AccountsSummary | null>(null);
  const [transactions, setTransactions] = useState<AccountsTransaction[]>([]);
  const [transPage, setTransPage] = useState(1);
  const [transLimit, setTransLimit] = useState(10);
  const [transPaymentMethod, setTransPaymentMethod] = useState('');
  const [transDateFrom, setTransDateFrom] = useState('');
  const [transDateTo, setTransDateTo] = useState('');

  // --- Shop Accounts (Expenses) State ---
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseSummary, setExpenseSummary] = useState({
    totalExpenseAmount: 0,
    cashExpenses: 0,
    bankExpenses: 0,
  });
  const [expCategoryFilter, setExpCategoryFilter] = useState('');
  const [expPaymentMethodFilter, setExpPaymentMethodFilter] = useState('');
  const [expSearch, setExpSearch] = useState('');
  const [expPage, setExpPage] = useState(1);
  const [expLimit, setExpLimit] = useState(10);
  const [expTotal, setExpTotal] = useState(0);
  const [expTotalPages, setExpTotalPages] = useState(1);

  // Expense Modal State
  const [showExpModal, setShowExpModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const [expFormData, setExpFormData] = useState({
    category: '',
    description: '',
    amount: '',
    paymentMethod: 'Cash' as 'Cash' | 'Bank / UPI' | 'Card',
    paidTo: '',
    expenseDate: new Date().toISOString().slice(0, 10),
    notes: '',
  });

  const loadData = async () => {
    if (!accountsSummary) setIsLoading(true);
    try {
      const [setRes, accRes, expRes] = await Promise.all([
        fetchSettings(),
        fetchAccountsSummary({
          dateFrom: transDateFrom,
          dateTo: transDateTo,
          paymentMethod: transPaymentMethod,
        }),
        fetchExpenses({
          category: expCategoryFilter,
          paymentMethod: expPaymentMethodFilter,
          search: expSearch,
          page: expPage,
          limit: expLimit,
        }),
      ]);

      if (setRes.success) setSetting(setRes.setting);

      if (accRes.success) {
        setAccountsSummary(accRes.summary);
        setTransactions(accRes.transactions || []);
      }

      if (expRes.success) {
        setExpenses(expRes.expenses || []);
        if (expRes.summary) setExpenseSummary(expRes.summary);
        if (expRes.pagination) {
          setExpTotal(expRes.pagination.total);
          setExpTotalPages(expRes.pagination.pages || Math.ceil(expRes.pagination.total / expLimit) || 1);
        }
      }
    } catch (err) {
      console.error('Failed to load accounts data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedShopId, activeTab, transDateFrom, transDateTo, transPaymentMethod, expCategoryFilter, expPaymentMethodFilter, expSearch, expPage, expLimit]);

  const currencySymbol = setting?.currencySymbol || '₹';

  const handleOpenAddExpense = () => {
    setEditingExpense(null);
    setExpFormData({
      category: '',
      description: '',
      amount: '',
      paymentMethod: 'Cash',
      paidTo: '',
      expenseDate: new Date().toISOString().slice(0, 10),
      notes: '',
    });
    setShowExpModal(true);
  };

  const handleOpenEditExpense = (exp: Expense) => {
    setEditingExpense(exp);
    setExpFormData({
      category: exp.category || '',
      description: exp.description || exp.category || '',
      amount: String(exp.amount),
      paymentMethod: exp.paymentMethod,
      paidTo: exp.paidTo || '',
      expenseDate: exp.expenseDate ? new Date(exp.expenseDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      notes: exp.notes || '',
    });
    setShowExpModal(true);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();

    const categoryName = expFormData.category.trim();

    if (!categoryName) {
      showToast('Please enter an expense category', 'error');
      return;
    }

    if (!expFormData.amount || Number(expFormData.amount) <= 0) {
      showToast('Please enter a valid expense amount', 'error');
      return;
    }

    const payload = {
      ...expFormData,
      category: categoryName,
      description: categoryName,
      shopId: selectedShopId !== 'all' ? selectedShopId : undefined,
    };

    setIsSavingExpense(true);
    try {
      if (editingExpense) {
        await updateExpenseApi(editingExpense._id, payload);
        showToast('✅ Expense record updated successfully!', 'success');
      } else {
        await createExpenseApi(payload);
        showToast('✅ Expense logged successfully!', 'success');
      }
      setShowExpModal(false);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to save expense record', 'error');
    } finally {
      setIsSavingExpense(false);
    }
  };

  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null);

  const confirmDeleteExpense = async () => {
    if (!deleteExpenseId) return;
    try {
      await deleteExpenseApi(deleteExpenseId);
      loadData();
      showToast('✅ Expense record deleted successfully!', 'success');
    } catch (err: any) {
      showToast('Could not delete expense', 'error');
    } finally {
      setDeleteExpenseId(null);
    }
  };

  // Order Transactions pagination math
  const totalTransCount = transactions.length;
  const totalTransPages = Math.ceil(totalTransCount / transLimit) || 1;
  const paginatedTrans = transactions.slice((transPage - 1) * transLimit, transPage * transLimit);

  return (
    <div className="space-y-6 pb-20">
      {/* Header & Sub-section Tabs Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Wallet className="w-6 h-6 text-brand-600" /> Shop Accounts & Expenses
          </h1>
          <p className="hidden sm:block text-xs text-slate-500">
            Track order incomes, shop operating expenses (EB, wages, detergent & custom categories) & cash balances
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            title="Refresh Accounts Data"
            className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {activeTab === 'shop' && (
            <button
              onClick={handleOpenAddExpense}
              className="px-4 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs shadow-md shadow-brand-600/30 flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Shop Expense</span>
            </button>
          )}
        </div>
      </div>

      {selectedShop && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/40 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>
              Branch Accounts: <strong className="text-indigo-600 dark:text-indigo-400">[{selectedShop.code}] {selectedShop.name}</strong> ({selectedShop.region})
            </span>
          </div>
        </div>
      )}

      {/* TABS SWITCHER (Order Accounts vs Shop Accounts) */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-5 py-3 font-extrabold text-xs sm:text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'orders'
              ? 'border-brand-600 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Order Accounts Ledger</span>
        </button>

        <button
          onClick={() => setActiveTab('shop')}
          className={`px-5 py-3 font-extrabold text-xs sm:text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'shop'
              ? 'border-brand-600 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Shop Expenses (EB, Wages, Custom)</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUB-SECTION 1: ORDER ACCOUNTS */}
      {/* ========================================================================= */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          {/* THE 4 DASHBOARD METRICS CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Card 1: Total Income */}
            <div className="glass-card p-4 flex flex-col justify-between border-l-4 border-l-emerald-500 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Total Income</span>
                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                {isLoading ? (
                  <div className="flex items-center gap-2 py-1">
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-500" />
                    <span className="text-xs font-semibold text-slate-400">Loading...</span>
                  </div>
                ) : (
                  <>
                    <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                      {currencySymbol}{accountsSummary?.totalIncome || 0}
                    </p>
                    <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Order payments collected</p>
                  </>
                )}
              </div>
            </div>

            {/* Card 2: Total Expenses */}
            <div className="glass-card p-4 flex flex-col justify-between border-l-4 border-l-rose-500 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Total Expenses</span>
                <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600">
                  <ArrowDownRight className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                {isLoading ? (
                  <div className="flex items-center gap-2 py-1">
                    <RefreshCw className="w-4 h-4 animate-spin text-rose-500" />
                    <span className="text-xs font-semibold text-slate-400">Loading...</span>
                  </div>
                ) : (
                  <>
                    <p className="text-2xl font-black text-rose-600 dark:text-rose-400">
                      {currencySymbol}{accountsSummary?.totalExpenses || 0}
                    </p>
                    <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Shop operating costs</p>
                  </>
                )}
              </div>
            </div>

            {/* Card 3: Cash Balance */}
            <div className="glass-card p-4 flex flex-col justify-between border-l-4 border-l-amber-500 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Cash Balance</span>
                <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                {isLoading ? (
                  <div className="flex items-center gap-2 py-1">
                    <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />
                    <span className="text-xs font-semibold text-slate-400">Loading...</span>
                  </div>
                ) : (
                  <>
                    <p className="text-2xl font-black text-slate-900 dark:text-white">
                      {currencySymbol}{accountsSummary?.cashBalance || 0}
                    </p>
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5">Physical cash drawer</p>
                  </>
                )}
              </div>
            </div>

            {/* Card 4: Bank / UPI Balance */}
            <div className="glass-card p-4 flex flex-col justify-between border-l-4 border-l-blue-500 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Bank / UPI Balance</span>
                <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600">
                  <CreditCard className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                {isLoading ? (
                  <div className="flex items-center gap-2 py-1">
                    <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
                    <span className="text-xs font-semibold text-slate-400">Loading...</span>
                  </div>
                ) : (
                  <>
                    <p className="text-2xl font-black text-blue-600 dark:text-blue-400">
                      {currencySymbol}{accountsSummary?.bankBalance || 0}
                    </p>
                    <p className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold mt-0.5">Digital bank payments</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Filter Toggle Button */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 border shadow-sm ${
                showFilterPanel || transPaymentMethod || transDateFrom || transDateTo
                  ? 'bg-brand-50 dark:bg-brand-950/50 border-brand-500 text-brand-600 dark:text-brand-400'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-4 h-4 text-brand-500" />
              <span>{showFilterPanel ? 'Hide Filters' : 'Filter Options'}</span>
              {(transPaymentMethod || transDateFrom || transDateTo) && (
                <span className="px-2 py-0.5 rounded-full bg-brand-500 text-white text-[10px] font-extrabold">Active</span>
              )}
            </button>
            {(transPaymentMethod || transDateFrom || transDateTo) && (
              <button
                onClick={() => {
                  setTransPaymentMethod('');
                  setTransDateFrom('');
                  setTransDateTo('');
                }}
                className="text-xs text-slate-400 hover:text-rose-500 font-semibold flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" /> Clear Filters
              </button>
            )}
          </div>

          {/* Collapsible Filter Bar */}
          {showFilterPanel && (
            <div className="glass-card p-4 transition-all">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Payment Method</label>
                  <select
                    value={transPaymentMethod}
                    onChange={(e) => setTransPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  >
                    <option value="">All Payment Methods</option>
                    <option value="Cash">Cash Only</option>
                    <option value="Bank / UPI">Bank / UPI Only</option>
                    <option value="Card">Card Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">From Date</label>
                  <input
                    type="date"
                    value={transDateFrom}
                    onChange={(e) => setTransDateFrom(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">To Date</label>
                  <input
                    type="date"
                    value={transDateTo}
                    onChange={(e) => setTransDateTo(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TRANSACTIONS TABLE LIST */}
          <div className="glass-card overflow-hidden">
            {transactions.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                No ledger transactions found matching filters.
              </div>
            ) : (
              <div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Date & No.</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Description</th>
                        <th className="py-3 px-4">Payment Method</th>
                        <th className="py-3 px-4 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                      {paginatedTrans.map((t, idx) => (
                        <tr key={t.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="py-3.5 px-4 font-bold text-brand-600 dark:text-brand-400 whitespace-nowrap">
                            <p className="font-mono">{t.refNumber}</p>
                            <p className="text-[10px] text-slate-400 font-normal">
                              {new Date(t.date).toLocaleString('en-GB')}
                            </p>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                t.type === 'Income'
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                              }`}
                            >
                              {t.category}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-medium">
                            {t.description}
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[11px] font-bold">
                              {t.paymentMethod}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right font-black text-sm whitespace-nowrap">
                            <span className={t.type === 'Income' ? 'text-emerald-600' : 'text-rose-600'}>
                              {t.type === 'Income' ? '+' : '-'}{currencySymbol}{t.amount}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* LIMIT & PAGINATION CONTROLS BAR */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-semibold">Rows per page:</span>
                    <select
                      value={transLimit}
                      onChange={(e) => {
                        setTransLimit(Number(e.target.value));
                        setTransPage(1);
                      }}
                      className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none font-bold"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                    <span className="text-slate-500 font-medium ml-2">
                      Showing {Math.min(totalTransCount, (transPage - 1) * transLimit + 1)} - {Math.min(totalTransCount, transPage * transLimit)} of {totalTransCount} transactions
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      disabled={transPage <= 1}
                      onClick={() => setTransPage((p) => Math.max(1, p - 1))}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1"
                    >
                      <ChevronLeft className="w-4 h-4" /> Previous
                    </button>
                    <span className="px-2 font-bold text-slate-700 dark:text-slate-300">
                      Page {transPage} of {totalTransPages || 1}
                    </span>
                    <button
                      disabled={transPage >= totalTransPages}
                      onClick={() => setTransPage((p) => Math.min(totalTransPages, p + 1))}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1"
                    >
                      Next <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-SECTION 2: SHOP ACCOUNTS (EXPENSES) WITH CUSTOM CATEGORIES */}
      {/* ========================================================================= */}
      {activeTab === 'shop' && (
        <div className="space-y-6">
          {/* Shop Expenses Metric Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass-card p-4 border-l-4 border-l-rose-500 relative overflow-hidden">
              <span className="text-xs font-bold text-slate-500">Total Shop Expenses</span>
              {isLoading ? (
                <div className="flex items-center gap-2 mt-2 py-1">
                  <RefreshCw className="w-4 h-4 animate-spin text-rose-500" />
                  <span className="text-xs font-semibold text-slate-400">Loading...</span>
                </div>
              ) : (
                <>
                  <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-2">
                    {currencySymbol}{expenseSummary.totalExpenseAmount}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Electricity, Wages, Solvents & Custom bills</p>
                </>
              )}
            </div>

            <div className="glass-card p-4 border-l-4 border-l-amber-500 relative overflow-hidden">
              <span className="text-xs font-bold text-slate-500">Cash Paid Expenses</span>
              {isLoading ? (
                <div className="flex items-center gap-2 mt-2 py-1">
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />
                  <span className="text-xs font-semibold text-slate-400">Loading...</span>
                </div>
              ) : (
                <>
                  <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                    {currencySymbol}{expenseSummary.cashExpenses}
                  </p>
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">Paid from cash drawer</p>
                </>
              )}
            </div>

            <div className="glass-card p-4 border-l-4 border-l-blue-500 relative overflow-hidden">
              <span className="text-xs font-bold text-slate-500">Bank / UPI Paid Expenses</span>
              {isLoading ? (
                <div className="flex items-center gap-2 mt-2 py-1">
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
                  <span className="text-xs font-semibold text-slate-400">Loading...</span>
                </div>
              ) : (
                <>
                  <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-2">
                    {currencySymbol}{expenseSummary.bankExpenses}
                  </p>
                  <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-0.5">Online transfer payments</p>
                </>
              )}
            </div>
          </div>

          {/* Shop Expenses Filter Toggle & Bar */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowExpFilterPanel(!showExpFilterPanel)}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 border shadow-sm ${
                showExpFilterPanel || expCategoryFilter || expPaymentMethodFilter || expSearch
                  ? 'bg-brand-50 dark:bg-brand-950/50 border-brand-500 text-brand-600 dark:text-brand-400'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-4 h-4 text-brand-500" />
              <span>{showExpFilterPanel ? 'Hide Filters' : 'Filter Options'}</span>
              {(expCategoryFilter || expPaymentMethodFilter || expSearch) && (
                <span className="px-2 py-0.5 rounded-full bg-brand-500 text-white text-[10px] font-extrabold">Active</span>
              )}
            </button>
            {(expCategoryFilter || expPaymentMethodFilter || expSearch) && (
              <button
                onClick={() => {
                  setExpCategoryFilter('');
                  setExpPaymentMethodFilter('');
                  setExpSearch('');
                }}
                className="text-xs text-slate-400 hover:text-rose-500 font-semibold flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" /> Clear Filters
              </button>
            )}
          </div>

          {showExpFilterPanel && (
            <div className="glass-card p-4 space-y-3 transition-all">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search expense description, vendor..."
                    value={expSearch}
                    onChange={(e) => {
                      setExpSearch(e.target.value);
                      setExpPage(1);
                    }}
                    className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  {(() => {
                    const allCategories = Array.from(new Set(expenses.map((e) => e.category).filter(Boolean)));
                    return (
                      <select
                        value={expCategoryFilter}
                        onChange={(e) => {
                          setExpCategoryFilter(e.target.value);
                          setExpPage(1);
                        }}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                      >
                        <option value="">All Expense Categories</option>
                        {allCategories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    );
                  })()}
                </div>

                <div>
                  <select
                    value={expPaymentMethodFilter}
                    onChange={(e) => {
                      setExpPaymentMethodFilter(e.target.value);
                      setExpPage(1);
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  >
                    <option value="">All Payment Methods</option>
                    <option value="Cash">Cash</option>
                    <option value="Bank / UPI">Bank / UPI</option>
                    <option value="Card">Card</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* SHOP EXPENSES TABLE */}
          <div className="glass-card overflow-hidden">
            {expenses.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                No shop expenses recorded yet. Click "+ Add Shop Expense" to log bills & wages.
              </div>
            ) : (
              <div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Voucher & Date</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Paid To / Vendor</th>
                        <th className="py-3 px-4">Payment Method</th>
                        <th className="py-3 px-4 text-right">Amount</th>
                        <th className="py-3 px-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                      {expenses.map((exp) => (
                        <tr key={exp._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <p className="font-mono font-bold text-slate-900 dark:text-white">{exp.voucherNumber}</p>
                            <p className="text-[10px] text-slate-400">
                              {new Date(exp.expenseDate).toLocaleDateString('en-GB')}
                            </p>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold text-[10px] flex items-center gap-1 w-fit">
                              <Tag className="w-3 h-3 text-rose-500" />
                              <span>{exp.category}</span>
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            {exp.paidTo ? (
                              <p className="font-bold text-slate-900 dark:text-white">Paid to: {exp.paidTo}</p>
                            ) : (
                              <p className="text-slate-400 text-[11px]">-</p>
                            )}
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px]">
                              {exp.paymentMethod}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right font-black text-rose-600 dark:text-rose-400 text-sm whitespace-nowrap">
                            -{currencySymbol}{exp.amount}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleOpenEditExpense(exp)}
                                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteExpenseId(exp._id)}
                                className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* LIMIT & PAGINATION CONTROLS BAR */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-semibold">Rows per page:</span>
                    <select
                      value={expLimit}
                      onChange={(e) => {
                        setExpLimit(Number(e.target.value));
                        setExpPage(1);
                      }}
                      className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none font-bold"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                    <span className="text-slate-500 font-medium ml-2">
                      Showing {Math.min(expTotal, (expPage - 1) * expLimit + 1)} - {Math.min(expTotal, expPage * expLimit)} of {expTotal} expenses
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      disabled={expPage <= 1}
                      onClick={() => setExpPage((p) => Math.max(1, p - 1))}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1"
                    >
                      <ChevronLeft className="w-4 h-4" /> Previous
                    </button>
                    <span className="px-2 font-bold text-slate-700 dark:text-slate-300">
                      Page {expPage} of {expTotalPages || 1}
                    </span>
                    <button
                      disabled={expPage >= expTotalPages}
                      onClick={() => setExpPage((p) => Math.min(expTotalPages, p + 1))}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1"
                    >
                      Next <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ADD / EDIT SHOP EXPENSE MODAL WITH CUSTOM CATEGORY OPTION */}
      {showExpModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                {editingExpense ? 'Edit Shop Expense' : 'Record Shop Expense'}
              </h3>
              <button onClick={() => setShowExpModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Expense Category *
                </label>
                <input
                  type="text"
                  required
                  value={expFormData.category}
                  onChange={(e) => setExpFormData({ ...expFormData, category: e.target.value })}
                  placeholder="Enter expense category (e.g. Rent, Tea, Detergent, EB Bill)"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Amount ({currencySymbol}) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={expFormData.amount}
                    onChange={(e) => setExpFormData({ ...expFormData, amount: e.target.value })}
                    placeholder="e.g. 1500"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={expFormData.paymentMethod}
                    onChange={(e) => setExpFormData({ ...expFormData, paymentMethod: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank / UPI">Bank / UPI</option>
                    <option value="Card">Card</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Paid To / Vendor (Optional)
                </label>
                <input
                  type="text"
                  value={expFormData.paidTo}
                  onChange={(e) => setExpFormData({ ...expFormData, paidTo: e.target.value })}
                  placeholder="e.g. Electricity Department / Chemical Supplier"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Expense Date
                </label>
                <input
                  type="date"
                  value={expFormData.expenseDate}
                  onChange={(e) => setExpFormData({ ...expFormData, expenseDate: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowExpModal(false)}
                  className="flex-1 py-2 rounded-xl border text-xs font-semibold text-slate-600 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingExpense}
                  className="flex-1 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isSavingExpense ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Expense...</span>
                    </>
                  ) : (
                    <span>Save Expense</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Expense Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteExpenseId}
        title="Delete Expense Record"
        message="Are you sure you want to delete this expense record?"
        confirmText="Delete Expense"
        variant="danger"
        onConfirm={confirmDeleteExpense}
        onCancel={() => setDeleteExpenseId(null)}
      />
    </div>
  );
};
