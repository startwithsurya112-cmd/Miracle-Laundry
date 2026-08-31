import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  fetchDashboardStats,
  fetchSettings,
  updateOrderStatusApi,
  recordOrderPaymentApi,
  prefetchAllAppData,
} from '../services/api';
import { DashboardStats, Order, OrderStatus, Setting, Customer, Payment } from '../types';
import { StatusBadge } from '../components/ui/Badge';
import { OrderDetailModal } from '../components/orders/OrderDetailModal';
import { InvoiceView } from '../components/invoice/InvoiceView';
import { PaymentModal } from '../components/orders/PaymentModal';
import {
  ShoppingBag,
  Clock,
  WashingMachine,
  CheckCircle,
  PackageCheck,
  DollarSign,
  TrendingUp,
  Users,
  PlusCircle,
  UserPlus,
  ArrowRight,
  BellRing,
  RefreshCw,
  Filter,
  X,
  CreditCard,
  Printer,
  Smartphone,
  Edit,
  Eye,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Receipt,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Building2,
  Globe,
  MapPin,
} from 'lucide-react';

type CardType = 'orders' | 'payments' | 'active' | 'customers' | 'overdue' | 'delivered_orders' | 'delivered_revenue';

export const DashboardPage: React.FC = () => {
  const { isSuperAdmin, selectedShop, selectedShopId } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [setting, setSetting] = useState<Setting | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);


  // Selected Active Metric Card (Default: 'orders')
  const [activeCard, setActiveCard] = useState<CardType>('orders');

  // Lists for each metric category
  const [ordersList, setOrdersList] = useState<Order[]>([]);
  const [paymentsList, setPaymentsList] = useState<any[]>([]);
  const [activeOrdersList, setActiveOrdersList] = useState<Order[]>([]);
  const [deliveredOrdersList, setDeliveredOrdersList] = useState<Order[]>([]);
  const [newCustomersList, setNewCustomersList] = useState<Customer[]>([]);
  const [overdueOrdersList, setOverdueOrdersList] = useState<Order[]>([]);

  // Pagination states for Dashboard Table
  const [dashPage, setDashPage] = useState<number>(1);
  const [dashLimit, setDashLimit] = useState<number>(10);

  // Collapsible Filter Drawer State
  const [isFilterExpanded, setIsFilterExpanded] = useState<boolean>(false);

  // Filter States
  const [preset, setPreset] = useState<string>('current_month');
  const [paymentStatus, setPaymentStatus] = useState<string>('');
  const [orderStatus, setOrderStatus] = useState<string>('');
  const [dateType, setDateType] = useState<string>('orderDate');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  // Modals state
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  const navigate = useNavigate();

  const loadData = async () => {
    if (!stats) setIsLoading(true);
    try {
      const [dashRes, setRes] = await Promise.all([
        fetchDashboardStats({
          preset,
          paymentStatus,
          status: orderStatus,
          dateType,
          dateFrom,
          dateTo,
        }),
        fetchSettings(),
      ]);

      if (dashRes.success) {
        const allOrds = dashRes.ordersList || dashRes.recentOrders || [];
        const delOrds = (dashRes.deliveredOrdersList && dashRes.deliveredOrdersList.length > 0)
          ? dashRes.deliveredOrdersList
          : allOrds.filter((o: any) => /^delivered$/i.test(o.status || ''));

        const calculatedDeliveredRevenue = dashRes.stats?.deliveredRevenue ?? delOrds.reduce((sum: number, o: any) => {
          const paid = o.paymentStatus === 'Paid' ? Number(o.totalAmount || 0) : Number(o.advancePaid || 0);
          return sum + paid;
        }, 0);

        setStats({
          ...dashRes.stats,
          deliveredOrders: dashRes.stats?.deliveredOrders ?? delOrds.length,
          deliveredRevenue: calculatedDeliveredRevenue,
        });

        setOrdersList(allOrds);
        setPaymentsList(dashRes.paymentsList || []);
        setActiveOrdersList(dashRes.activeOrdersList || dashRes.pendingReminders || []);
        setDeliveredOrdersList(delOrds);
        setNewCustomersList(dashRes.newCustomersList || []);
        setOverdueOrdersList(dashRes.overdueOrdersList || dashRes.pendingReminders || []);
      }
      if (setRes.success) {
        setSetting(setRes.setting);
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        prefetchAllAppData();
      }, 50);
    }
  };

  useEffect(() => {
    loadData();
    setDashPage(1);
  }, [preset, paymentStatus, orderStatus, dateType, dateFrom, dateTo, activeCard, selectedShopId]);

  const currencySymbol = setting?.currencySymbol || '₹';

  const handleQuickStatusUpdate = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await updateOrderStatusApi(orderId, newStatus);
      loadData();
    } catch (err) {
      console.error('Failed to bump status:', err);
    }
  };

  const handlePresetSelect = (p: string) => {
    setPreset(p);
    setDateFrom('');
    setDateTo('');
  };

  const handleClearFilters = () => {
    setPreset('current_month');
    setPaymentStatus('');
    setOrderStatus('');
    setDateType('orderDate');
    setDateFrom('');
    setDateTo('');
  };

  const handleWhatsAppShare = (ord: Order) => {
    const mobile = ord.customerSnapshot.mobile.replace(/\D/g, '');
    const receiptUrl = `${window.location.origin}/receipt/${ord.orderNumber}?r=${ord.orderNumber}`;
    const text = `Hello *${ord.customerSnapshot.name}*,\n\nYour official laundry invoice & receipt for Order *#${ord.orderNumber}* from *${setting?.shopName || 'Miracle Laundry'}* is ready!\n\n📋 *Invoice Summary*:\n• Status: ${ord.status}\n• Payment: ${ord.paymentStatus}\n• Total Amount: ${currencySymbol}${ord.totalAmount}\n• Advance Paid: ${currencySymbol}${ord.advancePaid}\n• Remaining Balance: ${currencySymbol}${ord.remainingBalance}\n\n🔗 *View / Print Invoice Directly*:\n${receiptUrl}\n\nThank you for choosing ${setting?.shopName || 'Miracle Laundry'}!`;
    const url = `https://wa.me/${mobile.length === 10 ? '91' + mobile : mobile}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const presetOptions = [
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: 'current_week', label: 'Current Week' },
    { id: 'current_month', label: 'Current Month' },
    { id: 'current_year', label: 'Current Year' },
    { id: 'last_7_days', label: 'Last 7 Days' },
    { id: 'last_30_days', label: 'Last 30 Days' },
    { id: 'last_365_days', label: 'Last 365 Days' },
    { id: '', label: 'All Time' },
  ];

  const statusOptions: OrderStatus[] = [
    'Received',
    'Washing',
    'Drying',
    'Ironing',
    'Packing',
    'Ready for Delivery',
    'Delivered',
    'Cancelled',
  ];

  const formatDateTime = (dateStr?: string | Date) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'N/A';
    return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const activePresetLabel = presetOptions.find((p) => p.id === preset)?.label || 'All Time';

  // Active Category List & Pagination math
  const processedCustomersList = newCustomersList.map((c) => {
    const custOrders = ordersList.filter(
      (o) =>
        (typeof o.customer === 'object' ? (o.customer as any)?._id : o.customer) === c._id ||
        o.customerSnapshot?.mobile === c.mobile
    );
    return {
      ...c,
      totalOrders: Math.max(c.totalOrders || 0, custOrders.length),
      totalSpent: Math.max(
        c.totalSpent || 0,
        custOrders.reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0)
      ),
    };
  });

  const activeList: any[] = activeCard === 'orders' ? ordersList
    : activeCard === 'payments' ? paymentsList
    : activeCard === 'active' ? activeOrdersList
    : activeCard === 'customers' ? processedCustomersList
    : activeCard === 'delivered_orders' ? deliveredOrdersList
    : activeCard === 'delivered_revenue' ? deliveredOrdersList
    : overdueOrdersList;

  const totalDashRecords = activeList.length;
  const totalDashPages = Math.ceil(totalDashRecords / dashLimit) || 1;
  const paginatedList = activeList.slice((dashPage - 1) * dashLimit, dashPage * dashLimit);

  return (
    <div className="flex flex-col gap-4 sm:gap-6 pb-12">
      {/* Branch Context Indicator Banner */}
      {isSuperAdmin && (
        <div className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-50 via-white to-brand-50 dark:from-indigo-950/40 dark:via-slate-900 dark:to-brand-950/40 border border-indigo-200/80 dark:border-indigo-800/60 shadow-xs flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            {selectedShop ? (
              <>
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  Branch Context: <strong className="text-indigo-600 dark:text-indigo-400">[{selectedShop.code}] {selectedShop.name}</strong> ({selectedShop.region})
                </span>
              </>
            ) : (
              <>
                <Globe className="w-4 h-4 text-indigo-500" />
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  Global Overview: <strong className="text-indigo-600 dark:text-indigo-400">All Branches Consolidated</strong>
                </span>
              </>
            )}
          </div>

          <button
            onClick={() => navigate('/shops')}
            className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 shrink-0"
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Manage Branches</span>
          </button>
        </div>
      )}

      {/* Header Banner & Quick Action Buttons (Hidden on Desktop, Visible on Mobile) */}
      <div className="md:hidden flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 bg-gradient-to-r from-brand-600 to-cyan-600 rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 text-white shadow-lg shadow-brand-600/20">
        <div>
          <h1 className="text-sm sm:text-2xl font-black tracking-tight">
            Dashboard Overview
          </h1>
          <p className="hidden sm:block text-xs sm:text-sm text-brand-100 mt-1">
            Welcome back! Click any key metric card below to filter live records.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => navigate('/orders/new')}
            className="flex-1 sm:flex-initial px-3 py-1.5 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl bg-white text-brand-700 hover:bg-brand-50 text-[11px] sm:text-xs font-extrabold shadow-md flex items-center justify-center gap-1.5 active:scale-95 transition-all"
          >
            <PlusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand-600" />
            <span>New Order</span>
          </button>
          <button
            onClick={() => navigate('/customers')}
            className="flex-1 sm:flex-initial px-3 py-1.5 sm:px-3.5 sm:py-2.5 rounded-xl sm:rounded-2xl bg-white/10 hover:bg-white/20 text-white text-[11px] sm:text-xs font-semibold backdrop-blur-md flex items-center justify-center gap-1.5 transition-all"
          >
            <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Customer</span>
          </button>
          <button
            onClick={loadData}
            title="Refresh Dashboard"
            className="p-1.5 sm:p-2.5 rounded-xl sm:rounded-2xl bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* COLLAPSIBLE DASHBOARD FILTERS ACCORDION (Sits right at top on Desktop) */}
      <div className="glass-card p-3 sm:p-5 border-l-4 border-l-brand-600 space-y-2.5">
        {/* Header Summary & Toggle Bar */}
        <div className="flex flex-row justify-between items-center gap-2">
          <div className="flex items-center gap-2 overflow-hidden">
            <Filter className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
            <h2 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
              Filters
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300 font-bold text-[10px] border border-brand-200 truncate">
              {dateFrom || dateTo ? 'Custom' : activePresetLabel}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Quick Action Buttons for Desktop View */}
            <div className="hidden md:flex items-center gap-2 mr-2">
              <button
                onClick={() => navigate('/orders/new')}
                className="px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-extrabold shadow-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                <span>New Order</span>
              </button>
              <button
                onClick={() => navigate('/customers')}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
              >
                <UserPlus className="w-4 h-4 text-brand-600" />
                <span>Customer</span>
              </button>
              <button
                onClick={loadData}
                title="Refresh Dashboard"
                className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {(preset || paymentStatus || orderStatus || dateFrom || dateTo) && (
              <button
                onClick={handleClearFilters}
                className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-0.5"
              >
                <X className="w-3 h-3" /> Clear
              </button>
            )}

            <button
              onClick={() => setIsFilterExpanded((prev) => !prev)}
              className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-[11px] sm:text-xs font-semibold flex items-center gap-1 transition-all"
            >
              <span>{isFilterExpanded ? 'Hide' : 'Filter'}</span>
              {isFilterExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Collapsible Content Body */}
        {isFilterExpanded && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3 animate-in fade-in zoom-in-95 duration-150">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Presets
              </span>
              <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
                {presetOptions.map((p) => {
                  const active = preset === p.id && !dateFrom && !dateTo;
                  return (
                    <button
                      key={p.id}
                      onClick={() => handlePresetSelect(p.id)}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all ${
                        active
                          ? 'bg-brand-600 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Payment</label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                  className="w-full px-2 py-1.5 text-[11px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                >
                  <option value="">All Payment</option>
                  <option value="Paid">Paid</option>
                  <option value="Partially Paid">Partially Paid</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Order Status</label>
                <select
                  value={orderStatus}
                  onChange={(e) => setOrderStatus(e.target.value)}
                  className="w-full px-2 py-1.5 text-[11px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                >
                  <option value="">All Statuses</option>
                  {statusOptions.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Date Type</label>
                <select
                  value={dateType}
                  onChange={(e) => setDateType(e.target.value)}
                  className="w-full px-2 py-1.5 text-[11px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                >
                  <option value="orderDate">Order Date</option>
                  <option value="expectedDeliveryDate">Delivery Date</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-0.5">From Date</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => { setDateFrom(e.target.value); setPreset(''); }}
                  className="w-full px-2 py-1.5 text-[11px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-0.5">To Date</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => { setDateTo(e.target.value); setPreset(''); }}
                  className="w-full px-2 py-1.5 text-[11px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* THE 7 DYNAMIC KEY METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 sm:gap-3">
        {/* CARD 1: Orders */}
        <div
          onClick={() => setActiveCard('orders')}
          className={`col-span-1 glass-card p-3 sm:p-4 flex flex-col justify-between cursor-pointer transition-all duration-200 select-none ${
            activeCard === 'orders'
              ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50/50 dark:bg-blue-950/50 shadow-md'
              : 'hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-slate-600 dark:text-slate-300 truncate">Orders</span>
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400 shrink-0">
              <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            {isLoading ? (
              <div className="h-6 sm:h-7 w-16 bg-slate-200 dark:bg-slate-700 animate-pulse rounded-lg mt-1" />
            ) : (
              <p className="text-base sm:text-2xl font-black text-slate-900 dark:text-white truncate">
                {stats?.totalOrders ?? ordersList.length}
              </p>
            )}
            <p className="hidden sm:block text-[10px] font-semibold text-blue-600 mt-0.5">View all orders</p>
          </div>
        </div>

        {/* CARD 2: Payments Received */}
        <div
          onClick={() => setActiveCard('payments')}
          className={`col-span-1 glass-card p-3 sm:p-4 flex flex-col justify-between cursor-pointer transition-all duration-200 select-none ${
            activeCard === 'payments'
              ? 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/50 shadow-md'
              : 'hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-slate-600 dark:text-slate-300 truncate">Income</span>
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 shrink-0">
              <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            {isLoading ? (
              <div className="h-6 sm:h-7 w-20 bg-slate-200 dark:bg-slate-700 animate-pulse rounded-lg mt-1" />
            ) : (
              <p className="text-base sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 truncate">
                {currencySymbol}{stats?.paymentsReceived ?? (paymentsList.length > 0 ? paymentsList : ordersList).reduce((acc, o: any) => acc + (o.amount || o.advancePaid || 0), 0)}
              </p>
            )}
            <p className="hidden sm:block text-[10px] font-semibold text-emerald-600 mt-0.5">View income</p>
          </div>
        </div>

        {/* CARD 3: Active Orders */}
        <div
          onClick={() => setActiveCard('active')}
          className={`col-span-1 glass-card p-3 sm:p-4 flex flex-col justify-between cursor-pointer transition-all duration-200 select-none ${
            activeCard === 'active'
              ? 'ring-2 ring-cyan-500 border-cyan-500 bg-cyan-50/50 dark:bg-cyan-950/50 shadow-md'
              : 'hover:border-cyan-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-slate-600 dark:text-slate-300 truncate">Active</span>
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-cyan-100 text-cyan-600 dark:bg-cyan-950 dark:text-cyan-400 shrink-0">
              <WashingMachine className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            {isLoading ? (
              <div className="h-6 sm:h-7 w-16 bg-slate-200 dark:bg-slate-700 animate-pulse rounded-lg mt-1" />
            ) : (
              <p className="text-base sm:text-2xl font-black text-cyan-600 dark:text-cyan-400 truncate">
                {stats?.activeOrders ?? activeOrdersList.length}
              </p>
            )}
            <p className="hidden sm:block text-[10px] font-semibold text-cyan-600 mt-0.5">View active</p>
          </div>
        </div>

        {/* CARD 4: Delivered Orders */}
        <div
          onClick={() => setActiveCard('delivered_orders')}
          className={`col-span-1 glass-card p-3 sm:p-4 flex flex-col justify-between cursor-pointer transition-all duration-200 select-none ${
            activeCard === 'delivered_orders'
              ? 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/50 shadow-md'
              : 'hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-slate-600 dark:text-slate-300 truncate">Delivered</span>
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 shrink-0">
              <PackageCheck className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            {isLoading ? (
              <div className="h-6 sm:h-7 w-16 bg-slate-200 dark:bg-slate-700 animate-pulse rounded-lg mt-1" />
            ) : (
              <p className="text-base sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 truncate">
                {stats?.deliveredOrders ?? deliveredOrdersList.length}
              </p>
            )}
            <p className="hidden sm:block text-[10px] font-semibold text-emerald-600 mt-0.5">View delivered</p>
          </div>
        </div>

        {/* CARD 5: Delivered Income */}
        <div
          onClick={() => setActiveCard('delivered_revenue')}
          className={`col-span-1 glass-card p-3 sm:p-4 flex flex-col justify-between cursor-pointer transition-all duration-200 select-none ${
            activeCard === 'delivered_revenue'
              ? 'ring-2 ring-teal-500 border-teal-500 bg-teal-50/50 dark:bg-teal-950/50 shadow-md'
              : 'hover:border-teal-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-slate-600 dark:text-slate-300 truncate">Delivered Income</span>
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-teal-100 text-teal-600 dark:bg-teal-950 dark:text-teal-400 shrink-0">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            {isLoading ? (
              <div className="h-6 sm:h-7 w-20 bg-slate-200 dark:bg-slate-700 animate-pulse rounded-lg mt-1" />
            ) : (
              <p className="text-base sm:text-2xl font-black text-teal-600 dark:text-teal-400 truncate">
                {currencySymbol}{(stats?.deliveredRevenue ?? deliveredOrdersList.reduce((acc, o: any) => {
                  const paid = o.paymentStatus === 'Paid' ? Number(o.totalAmount || 0) : Number(o.advancePaid || 0);
                  return acc + paid;
                }, 0)).toLocaleString('en-IN')}
              </p>
            )}
            <p className="hidden sm:block text-[10px] font-semibold text-teal-600 mt-0.5">Delivered revenue</p>
          </div>
        </div>

        {/* CARD 6: New Customers */}
        <div
          onClick={() => setActiveCard('customers')}
          className={`col-span-1 glass-card p-3 sm:p-4 flex flex-col justify-between cursor-pointer transition-all duration-200 select-none ${
            activeCard === 'customers'
              ? 'ring-2 ring-indigo-500 border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/50 shadow-md'
              : 'hover:border-indigo-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-slate-600 dark:text-slate-300 truncate">Customers</span>
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 shrink-0">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            {isLoading ? (
              <div className="h-6 sm:h-7 w-16 bg-slate-200 dark:bg-slate-700 animate-pulse rounded-lg mt-1" />
            ) : (
              <p className="text-base sm:text-2xl font-black text-slate-900 dark:text-white truncate">
                {stats?.totalCustomers ?? newCustomersList.length}
              </p>
            )}
            <p className="hidden sm:block text-[10px] font-semibold text-indigo-600 mt-0.5">View customers</p>
          </div>
        </div>

        {/* CARD 7: Overdue Orders */}
        <div
          onClick={() => setActiveCard('overdue')}
          className={`col-span-1 glass-card p-3 sm:p-4 flex flex-col justify-between cursor-pointer transition-all duration-200 select-none ${
            activeCard === 'overdue'
              ? 'ring-2 ring-rose-500 border-rose-500 bg-rose-50/50 dark:bg-rose-950/50 shadow-md'
              : 'hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-slate-600 dark:text-slate-300 truncate">Overdue</span>
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400 shrink-0">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            {isLoading ? (
              <div className="h-6 sm:h-7 w-16 bg-slate-200 dark:bg-slate-700 animate-pulse rounded-lg mt-1" />
            ) : (
              <p className="text-base sm:text-2xl font-black text-rose-600 dark:text-rose-400 truncate">
                {stats?.overdueOrders ?? overdueOrdersList.length}
              </p>
            )}
            <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400 mt-0.5 truncate">
              Due: {currencySymbol}{overdueOrdersList.reduce((sum: number, o: any) => sum + Math.max(0, o.remainingBalance !== undefined ? Number(o.remainingBalance) : (Number(o.totalAmount || 0) - Number(o.advancePaid || 0))), 0).toLocaleString('en-IN')}
            </p>
          </div>
        </div>
      </div>

      {/* DYNAMIC CONTENT CONTAINER (SWITCHES BASED ON SELECTED CARD) */}
      <div className="glass-card p-4 sm:p-6 border-t-4 border-t-brand-600 space-y-4">
        {/* CONTAINER HEADER TITLE */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
              {activeCard === 'orders' && <ShoppingBag className="w-4 h-4 text-blue-500" />}
              {activeCard === 'payments' && <DollarSign className="w-4 h-4 text-emerald-500" />}
              {activeCard === 'active' && <WashingMachine className="w-4 h-4 text-cyan-500" />}
              {activeCard === 'delivered_orders' && <PackageCheck className="w-4 h-4 text-emerald-500" />}
              {activeCard === 'delivered_revenue' && <TrendingUp className="w-4 h-4 text-teal-500" />}
              {activeCard === 'customers' && <Users className="w-4 h-4 text-indigo-500" />}
              {activeCard === 'overdue' && <AlertTriangle className="w-4 h-4 text-rose-500" />}

              <span>
                {activeCard === 'orders' && `All Filtered Orders (${totalDashRecords})`}
                {activeCard === 'payments' && `Payments Collected (${totalDashRecords})`}
                {activeCard === 'active' && `Active Orders (${totalDashRecords})`}
                {activeCard === 'delivered_orders' && `Delivered Orders (${totalDashRecords})`}
                {activeCard === 'delivered_revenue' && `Delivered Income Orders (${totalDashRecords})`}
                {activeCard === 'customers' && `Customers (${totalDashRecords})`}
                {activeCard === 'overdue' && `Overdue Orders (${totalDashRecords})`}
              </span>
            </h3>
            <p className="hidden sm:block text-xs text-slate-500 mt-0.5">
              {activeCard === 'orders' && 'Showing all orders matching filter criteria.'}
              {activeCard === 'payments' && 'Showing payment collection receipts matching filter criteria.'}
              {activeCard === 'active' && 'Active orders currently in washing, drying, ironing, packing, or ready for delivery.'}
              {activeCard === 'delivered_orders' && 'Showing completed orders that have been delivered.'}
              {activeCard === 'delivered_revenue' && 'Showing delivered orders and total revenue income collected.'}
              {activeCard === 'customers' && 'Showing new customer profiles registered during selected period.'}
              {activeCard === 'overdue' && 'Showing active orders that have exceeded their expected delivery date.'}
            </p>
          </div>

          <button
            onClick={() => navigate(activeCard === 'customers' ? '/customers' : '/orders')}
            className="text-xs font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400 flex items-center gap-1 self-start sm:self-auto"
          >
            <span>View All {activeCard === 'customers' ? 'Customers' : 'Orders'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* SKELETON TABLE SHIMMER LOADER WHEN FETCHING BACKEND DATA */}
        {isLoading ? (
          <div className="py-4 space-y-3 animate-pulse">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="h-4 w-44 bg-slate-200 dark:bg-slate-700 rounded-md" />
              <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded-md" />
            </div>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-700" />
                  <div className="space-y-1.5">
                    <div className="h-3.5 w-28 bg-slate-200 dark:bg-slate-700 rounded-md" />
                    <div className="h-3 w-40 bg-slate-100 dark:bg-slate-800 rounded-md" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-5 w-16 bg-slate-200 dark:bg-slate-700 rounded-full" />
                  <div className="h-7 w-20 bg-slate-200 dark:bg-slate-700 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
        {/* --- VIEW 1: ORDERS LIST (activeCard === 'orders' | 'delivered_orders' | 'delivered_revenue') --- */}
        {(activeCard === 'orders' || activeCard === 'delivered_orders' || activeCard === 'delivered_revenue') && (
          <div>
            {paginatedList.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">No orders found matching filters.</div>
            ) : (
              <div>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Order ID</th>
                        <th className="py-3 px-4">Customer</th>
                        <th className="py-3 px-4">Order Date & Time</th>
                        <th className="py-3 px-4">Amount</th>
                        <th className="py-3 px-4">Order Status (Dropdown)</th>
                        <th className="py-3 px-4">Payment</th>
                        <th className="py-3 px-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                      {(paginatedList as Order[]).map((ord) => (
                        <tr key={ord._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="py-3.5 px-4 font-bold text-brand-600 dark:text-brand-400 whitespace-nowrap">
                            <button onClick={() => setSelectedOrder(ord)} className="hover:underline">
                              #{ord.orderNumber}
                            </button>
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="font-bold">{ord.customerSnapshot?.name || 'Walk-in'}</p>
                            <p className="text-[10px] text-slate-400">+91 {ord.customerSnapshot?.mobile}</p>
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                            {formatDateTime(ord.orderDate)}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <p className="font-extrabold text-slate-900 dark:text-white">{currencySymbol}{ord.totalAmount}</p>
                            {ord.remainingBalance > 0 ? (
                              <p className="text-[10px] text-rose-500 font-semibold">Bal: {currencySymbol}{ord.remainingBalance}</p>
                            ) : (
                              <p className="text-[10px] text-emerald-600 font-medium">Paid</p>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <select
                              value={ord.status}
                              onChange={(e) => handleQuickStatusUpdate(ord._id, e.target.value as OrderStatus)}
                              className="text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-brand-500"
                            >
                              {statusOptions.map((st) => (
                                <option key={st} value={st}>{st}</option>
                              ))}
                            </select>
                          </td>
                          <td className="py-3.5 px-4">
                            <StatusBadge status={ord.paymentStatus} size="sm" />
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button onClick={() => handleWhatsAppShare(ord)} title="WhatsApp" className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-colors">
                                <Smartphone className="w-4 h-4" />
                              </button>
                              <button onClick={() => { setSelectedOrder(ord); setShowInvoiceModal(true); }} title="Print" className="p-2 rounded-xl bg-brand-50 text-brand-600 hover:bg-brand-600 hover:text-white transition-colors">
                                <Printer className="w-4 h-4" />
                              </button>
                              <button onClick={() => setSelectedOrder(ord)} title="Edit" className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition-colors">
                                <Edit className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-3">
                  {(paginatedList as Order[]).map((ord) => (
                    <div key={ord._id} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <button onClick={() => setSelectedOrder(ord)} className="font-black text-sm text-brand-600 dark:text-brand-400">
                          #{ord.orderNumber}
                        </button>
                        <StatusBadge status={ord.paymentStatus} size="sm" />
                      </div>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-xs text-slate-900 dark:text-white">{ord.customerSnapshot?.name}</p>
                          <p className="text-[11px] text-slate-500">+91 {ord.customerSnapshot?.mobile}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-sm text-slate-900 dark:text-white">{currencySymbol}{ord.totalAmount}</p>
                          {ord.remainingBalance > 0 && <p className="text-[10px] text-rose-500 font-bold">Bal: {currencySymbol}{ord.remainingBalance}</p>}
                        </div>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-[11px] flex justify-between">
                        <span className="text-slate-400">Order Date & Time:</span>
                        <span className="font-bold">{formatDateTime(ord.orderDate)}</span>
                      </div>
                      <select
                        value={ord.status}
                        onChange={(e) => handleQuickStatusUpdate(ord._id, e.target.value as OrderStatus)}
                        className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                      >
                        {statusOptions.map((st) => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                        <button onClick={() => handleWhatsAppShare(ord)} className="py-2 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-xs flex items-center justify-center gap-1">
                          <Smartphone className="w-3.5 h-3.5" /> WhatsApp
                        </button>
                        <button onClick={() => { setSelectedOrder(ord); setShowInvoiceModal(true); }} className="py-2 rounded-xl bg-brand-50 text-brand-700 font-bold text-xs flex items-center justify-center gap-1">
                          <Printer className="w-3.5 h-3.5" /> Print
                        </button>
                        <button onClick={() => setSelectedOrder(ord)} className="py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center gap-1">
                          <Edit className="w-3.5 h-3.5" /> Edit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- VIEW 2: PAYMENTS RECEIVED LIST (activeCard === 'payments') --- */}
        {activeCard === 'payments' && (
          <div>
            {paginatedList.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">No payment records found for selected filters.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Order #</th>
                      <th className="py-3 px-4">Customer Name</th>
                      <th className="py-3 px-4">Payment Method</th>
                      <th className="py-3 px-4">Paid Date & Time</th>
                      <th className="py-3 px-4 text-right">Amount Collected</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                    {paginatedList.map((p, idx) => (
                      <tr key={p._id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-3.5 px-4 font-bold text-brand-600 dark:text-brand-400">
                          #{p.orderNumber || p.orderId || 'N/A'}
                        </td>
                        <td className="py-3.5 px-4 font-semibold">
                          {p.customerName || p.customerId || 'Customer'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[10px]">
                            {p.paymentMethod || 'Cash'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">
                          {formatDateTime(p.paidAt || p.createdAt)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-emerald-600 dark:text-emerald-400 text-sm">
                          +{currencySymbol}{p.amount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* --- VIEW 3: ACTIVE ORDERS LIST (activeCard === 'active') --- */}
        {activeCard === 'active' && (
          <div>
            {paginatedList.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">No active orders currently processing.</div>
            ) : (
              <div>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Order ID</th>
                        <th className="py-3 px-4">Customer</th>
                        <th className="py-3 px-4">Order Date & Time</th>
                        <th className="py-3 px-4">Amount</th>
                        <th className="py-3 px-4">Order Status (Dropdown)</th>
                        <th className="py-3 px-4">Payment</th>
                        <th className="py-3 px-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                      {(paginatedList as Order[]).map((ord) => (
                        <tr key={ord._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="py-3.5 px-4 font-bold text-brand-600 dark:text-brand-400 whitespace-nowrap">
                            <button onClick={() => setSelectedOrder(ord)} className="hover:underline">
                              #{ord.orderNumber}
                            </button>
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="font-bold">{ord.customerSnapshot?.name}</p>
                            <p className="text-[10px] text-slate-400">+91 {ord.customerSnapshot?.mobile}</p>
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                            {formatDateTime(ord.orderDate)}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <p className="font-extrabold text-slate-900 dark:text-white">{currencySymbol}{ord.totalAmount}</p>
                            {ord.remainingBalance > 0 && <p className="text-[10px] text-rose-500 font-semibold">Bal: {currencySymbol}{ord.remainingBalance}</p>}
                          </td>
                          <td className="py-3.5 px-4">
                            <select
                              value={ord.status}
                              onChange={(e) => handleQuickStatusUpdate(ord._id, e.target.value as OrderStatus)}
                              className="text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-brand-500"
                            >
                              {statusOptions.map((st) => (
                                <option key={st} value={st}>{st}</option>
                              ))}
                            </select>
                          </td>
                          <td className="py-3.5 px-4">
                            <StatusBadge status={ord.paymentStatus} size="sm" />
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button onClick={() => handleWhatsAppShare(ord)} title="WhatsApp" className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-colors">
                                <Smartphone className="w-4 h-4" />
                              </button>
                              <button onClick={() => { setSelectedOrder(ord); setShowInvoiceModal(true); }} title="Print" className="p-2 rounded-xl bg-brand-50 text-brand-600 hover:bg-brand-600 hover:text-white transition-colors">
                                <Printer className="w-4 h-4" />
                              </button>
                              <button onClick={() => setSelectedOrder(ord)} title="Edit" className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition-colors">
                                <Edit className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-3">
                  {(paginatedList as Order[]).map((ord) => (
                    <div key={ord._id} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <button onClick={() => setSelectedOrder(ord)} className="font-black text-sm text-brand-600 dark:text-brand-400">
                          #{ord.orderNumber}
                        </button>
                        <StatusBadge status={ord.paymentStatus} size="sm" />
                      </div>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-xs text-slate-900 dark:text-white">{ord.customerSnapshot?.name}</p>
                          <p className="text-[11px] text-slate-500">+91 {ord.customerSnapshot?.mobile}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-sm text-slate-900 dark:text-white">{currencySymbol}{ord.totalAmount}</p>
                          {ord.remainingBalance > 0 && <p className="text-[10px] text-rose-500 font-bold">Bal: {currencySymbol}{ord.remainingBalance}</p>}
                        </div>
                      </div>
                      <select
                        value={ord.status}
                        onChange={(e) => handleQuickStatusUpdate(ord._id, e.target.value as OrderStatus)}
                        className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                      >
                        {statusOptions.map((st) => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                        <button onClick={() => handleWhatsAppShare(ord)} className="py-2 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-xs flex items-center justify-center gap-1">
                          <Smartphone className="w-3.5 h-3.5" /> WhatsApp
                        </button>
                        <button onClick={() => { setSelectedOrder(ord); setShowInvoiceModal(true); }} className="py-2 rounded-xl bg-brand-50 text-brand-700 font-bold text-xs flex items-center justify-center gap-1">
                          <Printer className="w-3.5 h-3.5" /> Print
                        </button>
                        <button onClick={() => setSelectedOrder(ord)} className="py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center gap-1">
                          <Edit className="w-3.5 h-3.5" /> Edit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- VIEW 4: NEW CUSTOMERS LIST (activeCard === 'customers') --- */}
        {activeCard === 'customers' && (
          <div>
            {paginatedList.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">No new customers registered in selected filter range.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Customer Name</th>
                      <th className="py-3 px-4">Mobile</th>
                      <th className="py-3 px-4">Address</th>
                      <th className="py-3 px-4">Total Orders</th>
                      <th className="py-3 px-4">Total Spent</th>
                      <th className="py-3 px-4">Registered On</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                    {(paginatedList as Customer[]).map((c) => (
                      <tr key={c._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                          {c.name}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                          +91 {c.mobile}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">
                          {c.address || 'N/A'}
                        </td>
                        <td className="py-3.5 px-4 font-semibold">
                          {c.totalOrders || 0} orders
                        </td>
                        <td className="py-3.5 px-4 font-extrabold text-emerald-600 dark:text-emerald-400">
                          {currencySymbol}{c.totalSpent || 0}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">
                          {formatDateTime(c.createdAt)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => navigate(`/orders/new?customer=${c._id}`)}
                            className="px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs"
                          >
                            New POS Order
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* --- VIEW 5: OVERDUE & PENDING BALANCE ORDERS (activeCard === 'overdue') --- */}
        {activeCard === 'overdue' && (
          <div>
            {paginatedList.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs font-semibold">No overdue orders found. All active orders are on schedule!</div>
            ) : (
              <div>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-semibold border-b border-rose-100 dark:border-rose-900/60">
                      <tr>
                        <th className="py-3 px-4">Order ID</th>
                        <th className="py-3 px-4">Customer</th>
                        <th className="py-3 px-4">Order Date & Time</th>
                        <th className="py-3 px-4">Total Amount</th>
                        <th className="py-3 px-4">Pending Balance</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                      {(paginatedList as Order[]).map((ord) => (
                        <tr key={ord._id} className="hover:bg-rose-50/20 dark:hover:bg-rose-950/20">
                          <td className="py-3.5 px-4 font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                            <button onClick={() => setSelectedOrder(ord)} className="hover:underline">
                              #{ord.orderNumber}
                            </button>
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="font-bold">{ord.customerSnapshot?.name}</p>
                            <p className="text-[10px] text-slate-400">+91 {ord.customerSnapshot?.mobile}</p>
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                            {formatDateTime(ord.orderDate)}
                          </td>
                          <td className="py-3.5 px-4 font-bold">
                            {currencySymbol}{ord.totalAmount}
                          </td>
                          <td className="py-3.5 px-4 font-black text-rose-600 dark:text-rose-400 text-sm whitespace-nowrap">
                            {currencySymbol}{ord.remainingBalance}
                          </td>
                          <td className="py-3.5 px-4">
                            <StatusBadge status={ord.status} size="sm" />
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedOrder(ord);
                                  setShowPaymentModal(true);
                                }}
                                title="Collect Pending Payment"
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                              >
                                Record Pay
                              </button>

                              <button onClick={() => handleWhatsAppShare(ord)} title="WhatsApp Reminder" className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-colors">
                                <Smartphone className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-3">
                  {(paginatedList as Order[]).map((ord) => (
                    <div key={ord._id} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 shadow-sm space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <button onClick={() => setSelectedOrder(ord)} className="font-black text-sm text-rose-600 dark:text-rose-400">
                          #{ord.orderNumber}
                        </button>
                        <StatusBadge status={ord.status} size="sm" />
                      </div>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-xs text-slate-900 dark:text-white">{ord.customerSnapshot?.name}</p>
                          <p className="text-[11px] text-slate-500">+91 {ord.customerSnapshot?.mobile}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-sm text-rose-600 dark:text-rose-400">
                            Bal: {currencySymbol}{ord.remainingBalance}
                          </p>
                          <p className="text-[10px] text-slate-400">Total: {currencySymbol}{ord.totalAmount}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <button
                          onClick={() => {
                            setSelectedOrder(ord);
                            setShowPaymentModal(true);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs flex-1 text-center"
                        >
                          Record Pay
                        </button>

                        <button onClick={() => handleWhatsAppShare(ord)} className="py-1.5 px-3 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-xs flex items-center justify-center gap-1">
                          <Smartphone className="w-3.5 h-3.5" /> WhatsApp
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* DASHBOARD LIMIT & PAGINATION CONTROLS BAR */}
        {totalDashRecords > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 text-xs rounded-b-2xl">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-semibold">Rows per page:</span>
              <select
                value={dashLimit}
                onChange={(e) => {
                  setDashLimit(Number(e.target.value));
                  setDashPage(1);
                }}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none font-bold"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-slate-500 font-medium ml-2">
                Showing {Math.min(totalDashRecords, (dashPage - 1) * dashLimit + 1)} - {Math.min(totalDashRecords, dashPage * dashLimit)} of {totalDashRecords} entries
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={dashPage <= 1}
                onClick={() => setDashPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              <span className="px-2 font-bold text-slate-700 dark:text-slate-300">
                Page {dashPage} of {totalDashPages}
              </span>
              <button
                disabled={dashPage >= totalDashPages}
                onClick={() => setDashPage((p) => Math.min(totalDashPages, p + 1))}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </>
    )}
  </div>

      {/* Modals */}
      {selectedOrder && !showInvoiceModal && !showPaymentModal && (
        <OrderDetailModal
          order={selectedOrder}
          setting={setting}
          onClose={() => setSelectedOrder(null)}
          onUpdateStatus={async (newSt) => {
            await handleQuickStatusUpdate(selectedOrder._id, newSt);
            setSelectedOrder((prev) => (prev ? { ...prev, status: newSt } : null));
          }}
          onRecordPayment={() => setShowPaymentModal(true)}
          onOpenInvoice={() => setShowInvoiceModal(true)}
        />
      )}

      {showPaymentModal && selectedOrder && (
        <PaymentModal
          order={selectedOrder}
          setting={setting}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={async (paymentData) => {
            try {
              await recordOrderPaymentApi(selectedOrder._id, paymentData);
              setShowPaymentModal(false);
              loadData();
              setSelectedOrder(null);
            } catch (err: any) {
              alert(err.message || 'Failed to record payment');
            }
          }}
        />
      )}

      {showInvoiceModal && selectedOrder && (
        <InvoiceView
          order={selectedOrder}
          setting={setting}
          onClose={() => setShowInvoiceModal(false)}
        />
      )}
    </div>
  );
};
