import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  fetchOrders,
  fetchSettings,
  updateOrderStatusApi,
  recordOrderPaymentApi,
  deleteOrderApi,
} from '../services/api';
import { Order, OrderStatus, Setting } from '../types';
import { StatusBadge } from '../components/ui/Badge';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { OrderDetailModal } from '../components/orders/OrderDetailModal';
import { PaymentModal } from '../components/orders/PaymentModal';
import { EditOrderModal } from '../components/orders/EditOrderModal';
import { InvoiceView } from '../components/invoice/InvoiceView';
import {
  Search,
  Filter,
  Plus,
  Printer,
  CreditCard,
  Trash2,
  Eye,
  Edit,
  RefreshCw,
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export const OrdersPage: React.FC = () => {
  const { showToast } = useToast();
  const { selectedShop, selectedShopId } = useAuth();
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';

  const [orders, setOrders] = useState<Order[]>([]);
  const [setting, setSetting] = useState<Setting | undefined>(undefined);
  const [search, setSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Pagination states
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [totalOrdersCount, setTotalOrdersCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Selected Order Modals
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [deleteOrderId, setDeleteOrderId] = useState<string | null>(null);

  const navigate = useNavigate();

  const loadOrders = async () => {
    if (orders.length === 0) setIsLoading(true);
    try {
      const [orderRes, setRes] = await Promise.all([
        fetchOrders({
          search,
          status: statusFilter,
          paymentStatus: paymentStatusFilter,
          page,
          limit,
        }),
        fetchSettings(),
      ]);

      if (orderRes.success) {
        setOrders(orderRes.orders);
        if (orderRes.pagination) {
          setTotalOrdersCount(orderRes.pagination.total);
          setTotalPages(orderRes.pagination.pages || Math.ceil(orderRes.pagination.total / limit) || 1);
        } else {
          setTotalOrdersCount(orderRes.orders.length);
          setTotalPages(1);
        }
      }
      if (setRes.success) setSetting(setRes.setting);
    } catch (err) {
      console.error('Failed to load orders', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [selectedShopId]);

  useEffect(() => {
    loadOrders();
  }, [search, statusFilter, paymentStatusFilter, page, limit, selectedShopId]);

  const currencySymbol = setting?.currencySymbol || '₹';

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const res = await updateOrderStatusApi(orderId, newStatus);
      loadOrders();
      if (selectedOrder && selectedOrder._id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
      if (newStatus === 'Delivered') {
        if (res.whatsappSent) {
          showToast(`✅ Order Delivered! WhatsApp PDF Invoice sent to customer.`, 'success');
        } else if (res.whatsappMsg) {
          showToast(`✅ Order Delivered! (${res.whatsappMsg})`, 'info');
        } else {
          showToast(`✅ Order status updated to Delivered!`, 'success');
        }
      } else {
        showToast(`✅ Order status updated to "${newStatus}"!`, 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update order status', 'error');
    }
  };

  const confirmDeleteOrder = async () => {
    if (!deleteOrderId) return;
    try {
      await deleteOrderApi(deleteOrderId);
      setDeleteOrderId(null);
      loadOrders();
      showToast('✅ Order permanently deleted successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete order', 'error');
    }
  };

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

  return (
    <div className="space-y-6 pb-20">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-brand-600" /> Laundry Orders ({totalOrdersCount})
          </h1>
          <p className="hidden sm:block text-xs text-slate-500">
            Manage, track, and update active shop laundry orders
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadOrders}
            title="Refresh Orders"
            className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-brand-600' : ''}`} />
          </button>

          <button
            onClick={() => navigate('/orders/new')}
            className="px-4 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-brand-600/20 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>New Order</span>
          </button>
        </div>
      </div>

      {/* Branch Context Indicator */}
      {selectedShop && (
        <div className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-50 via-white to-brand-50 dark:from-indigo-950/40 dark:via-slate-900 dark:to-brand-950/40 border border-indigo-200/80 dark:border-indigo-800/60 shadow-xs flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              Branch Orders: <strong className="text-indigo-600 dark:text-indigo-400">[{selectedShop.code}] {selectedShop.name}</strong> ({selectedShop.region})
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
            {totalOrdersCount} orders found
          </span>
        </div>
      )}

      {/* Filter & Search Controls */}
      <div className="glass-card p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Order #, Name, Mobile..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Order Statuses</option>
              {statusOptions.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Status Filter */}
          <div className="relative">
            <select
              value={paymentStatusFilter}
              onChange={(e) => {
                setPaymentStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Payment Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="Pending">Pending</option>
            </select>
          </div>
        </div>
      </div>

      {/* Responsive Orders Table & Cards */}
      <div className="glass-card overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 animate-pulse">
              Loading live orders from database...
            </p>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            No orders found matching search or filter criteria.
          </div>
        ) : (
          <div>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Order #</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Order Date</th>
                    <th className="py-3 px-4">Delivery</th>
                    <th className="py-3 px-4">Status Workflow</th>
                    <th className="py-3 px-4">Payment</th>
                    <th className="py-3 px-4 text-right">Total</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                  {orders.map((ord) => (
                    <tr key={ord._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-3.5 px-4 font-bold text-brand-600 dark:text-brand-400">
                        <button
                          onClick={() => setSelectedOrder(ord)}
                          className="hover:underline"
                        >
                          {ord.orderNumber}
                        </button>
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-bold">{ord.customerSnapshot?.name || (typeof ord.customer === 'object' ? (ord.customer as any)?.name : 'Customer')}</p>
                        <p className="text-[10px] text-slate-400">+91 {ord.customerSnapshot?.mobile || (typeof ord.customer === 'object' ? (ord.customer as any)?.mobile : '')}</p>
                      </td>

                      <td className="py-3.5 px-4 text-slate-500">
                        {new Date(ord.orderDate).toLocaleDateString('en-GB')}
                      </td>

                      <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-slate-300">
                        {new Date(ord.expectedDeliveryDate).toLocaleDateString('en-GB')}
                      </td>

                      <td className="py-3.5 px-4">
                        <select
                          value={ord.status}
                          onChange={(e) => handleUpdateStatus(ord._id, e.target.value as OrderStatus)}
                          className="text-xs font-semibold px-2 py-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none"
                        >
                          {statusOptions.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="py-3.5 px-4">
                        <StatusBadge status={ord.paymentStatus} size="sm" />
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <p className="font-black text-slate-900 dark:text-white">{currencySymbol}{ord.totalAmount}</p>
                        {ord.remainingBalance > 0 && (
                          <p className="text-[10px] text-rose-500 font-semibold">Bal: {currencySymbol}{ord.remainingBalance}</p>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedOrder(ord)}
                            title="View Order Details"
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => {
                              setEditingOrder(ord);
                              setShowEditModal(true);
                            }}
                            title="Edit Order Details"
                            className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600 dark:hover:bg-amber-950/60"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => {
                              setSelectedOrder(ord);
                              setShowInvoiceModal(true);
                            }}
                            title="Print Digital Invoice"
                            className="p-1.5 rounded-lg hover:bg-brand-50 text-brand-600"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {ord.remainingBalance > 0 && (
                            <button
                              onClick={() => {
                                setSelectedOrder(ord);
                                setShowPaymentModal(true);
                              }}
                              title="Record Payment"
                              className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600"
                            >
                              <CreditCard className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() => setDeleteOrderId(ord._id)}
                            title="Delete Order"
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

            {/* Mobile Touch Cards View (md:hidden) */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {orders.map((ord) => (
                <div key={ord._id} className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <button
                        onClick={() => setSelectedOrder(ord)}
                        className="font-black text-sm text-brand-600 dark:text-brand-400"
                      >
                        #{ord.orderNumber}
                      </button>
                      <p className="font-bold text-xs text-slate-900 dark:text-white mt-0.5">
                        {ord.customerSnapshot?.name || (typeof ord.customer === 'object' ? (ord.customer as any)?.name : 'Customer')}
                      </p>
                      <p className="text-[11px] text-slate-500">+91 {ord.customerSnapshot?.mobile || (typeof ord.customer === 'object' ? (ord.customer as any)?.mobile : '')}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-sm text-slate-900 dark:text-white">{currencySymbol}{ord.totalAmount}</p>
                      <StatusBadge status={ord.paymentStatus} size="sm" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">
                      Order: <strong>{new Date(ord.orderDate).toLocaleDateString('en-GB')}</strong>
                    </span>

                    <select
                      value={ord.status}
                      onChange={(e) => handleUpdateStatus(ord._id, e.target.value as OrderStatus)}
                      className="text-xs font-semibold px-2 py-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none"
                    >
                      {statusOptions.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => setSelectedOrder(ord)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" /> View
                    </button>
                    <button
                      onClick={() => {
                        setEditingOrder(ord);
                        setShowEditModal(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 text-xs font-semibold flex items-center gap-1"
                    >
                      <Edit className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => {
                        setSelectedOrder(ord);
                        setShowInvoiceModal(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-brand-50 text-brand-600 text-xs font-semibold flex items-center gap-1"
                    >
                      <Printer className="w-3.5 h-3.5" /> Receipt
                    </button>
                    {ord.remainingBalance > 0 && (
                      <button
                        onClick={() => {
                          setSelectedOrder(ord);
                          setShowPaymentModal(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1"
                      >
                        <CreditCard className="w-3.5 h-3.5" /> Pay
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* LIMIT & PAGINATION CONTROLS BAR */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-semibold">Rows per page:</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none font-bold"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-slate-500 font-medium ml-2">
                  Showing {Math.min(totalOrdersCount, (page - 1) * limit + 1)} - {Math.min(totalOrdersCount, page * limit)} of {totalOrdersCount} orders
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                <span className="px-2 font-bold text-slate-700 dark:text-slate-300">
                  Page {page} of {totalPages || 1}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedOrder && !showInvoiceModal && !showPaymentModal && !showEditModal && (
        <OrderDetailModal
          order={selectedOrder}
          setting={setting}
          onClose={() => setSelectedOrder(null)}
          onUpdateStatus={async (newSt) => {
            await handleUpdateStatus(selectedOrder._id, newSt);
          }}
          onRecordPayment={() => setShowPaymentModal(true)}
          onOpenInvoice={() => setShowInvoiceModal(true)}
        />
      )}

      {showEditModal && editingOrder && (
        <EditOrderModal
          order={editingOrder}
          setting={setting}
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingOrder(null);
          }}
          onSave={() => {
            loadOrders();
            showToast('✅ Order details updated successfully!', 'success');
          }}
        />
      )}

      {showPaymentModal && selectedOrder && (
        <PaymentModal
          order={selectedOrder}
          setting={setting}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={async (paymentData) => {
            await recordOrderPaymentApi(selectedOrder._id, paymentData);
            setShowPaymentModal(false);
            loadOrders();
            setSelectedOrder(null);
            showToast('✅ Payment recorded successfully!', 'success');
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

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteOrderId}
        title="Delete Order Record"
        message="Are you sure you want to permanently delete this order record? This action cannot be undone."
        confirmText="Delete Order"
        variant="danger"
        onConfirm={confirmDeleteOrder}
        onCancel={() => setDeleteOrderId(null)}
      />
    </div>
  );
};
