import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchCustomers,
  createCustomerApi,
  updateCustomerApi,
  deleteCustomerApi,
  fetchCustomerById,
  fetchSettings,
} from '../services/api';
import { Customer, Order, Setting } from '../types';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { StatusBadge } from '../components/ui/Badge';
import { useToast } from '../context/ToastContext';
import {
  Users,
  Search,
  Plus,
  Edit,
  Trash2,
  Phone,
  MapPin,
  Mail,
  History,
  X,
  PlusCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';

export const CustomersPage: React.FC = () => {
  const { showToast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [setting, setSetting] = useState<Setting | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Pagination & Limit States
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [totalCustomers, setTotalCustomers] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Form Modal & History States
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
  const [deleteCustId, setDeleteCustId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    address: '',
    notes: '',
  });

  const navigate = useNavigate();

  useEffect(() => {
    fetchSettings().then((res) => {
      if (res?.success) setSetting(res.setting);
    }).catch(() => {});
  }, []);

  const loadCustomers = async () => {
    if (customers.length === 0) {
      setIsLoading(true);
    }
    try {
      const custRes = await fetchCustomers({ search, page, limit });
      if (custRes.success) {
        setCustomers(custRes.customers);
        if (custRes.pagination) {
          setTotalCustomers(custRes.pagination.total);
          setTotalPages(custRes.pagination.pages || Math.ceil(custRes.pagination.total / limit) || 1);
        } else {
          setTotalCustomers(custRes.customers.length);
          setTotalPages(1);
        }
      }
    } catch (err) {
      console.error('Failed to load customers', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [search, page, limit]);

  const currencySymbol = setting?.currencySymbol || '₹';

  const handleOpenAddModal = () => {
    setEditingCustomer(null);
    setFormData({ name: '', mobile: '', email: '', address: '', notes: '' });
    setShowModal(true);
  };

  const handleOpenEditModal = (cust: Customer) => {
    setEditingCustomer(cust);
    setFormData({
      name: cust.name,
      mobile: cust.mobile,
      address: cust.address,
      email: cust.email || '',
      notes: cust.notes || '',
    });
    setShowModal(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingCustomer) {
        const res = await updateCustomerApi(editingCustomer._id, formData);
        if (res.success) {
          setShowModal(false);
          loadCustomers();
          showToast(`✅ Customer "${formData.name}" updated successfully!`, 'success');
        } else {
          showToast(res.message || 'Failed to update customer', 'error');
        }
      } else {
        const res = await createCustomerApi(formData);
        if (res.success) {
          setShowModal(false);
          loadCustomers();
          showToast(`✅ Customer "${formData.name}" created successfully!`, 'success');
        } else {
          showToast(res.message || 'Failed to create customer', 'error');
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to save customer', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDeleteCustomer = async () => {
    if (!deleteCustId) return;
    const targetId = deleteCustId;
    setCustomers((prev) => prev.filter((c) => c._id !== targetId));
    setTotalCustomers((prev) => Math.max(0, prev - 1));
    setDeleteCustId(null);

    try {
      await deleteCustomerApi(targetId);
      loadCustomers();
      showToast('✅ Customer profile deleted successfully!', 'success');
    } catch (err: any) {
      showToast('Could not delete customer', 'error');
      loadCustomers();
    }
  };

  const handleViewHistory = async (cust: Customer) => {
    setHistoryCustomer(cust);
    try {
      const res = await fetchCustomerById(cust._id);
      if (res.success) {
        setCustomerOrders(res.orders || []);
      }
    } catch (err) {
      console.error('Failed to load customer order history', err);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-brand-600" /> Customer Management ({totalCustomers})
          </h1>
          <p className="hidden sm:block text-xs text-slate-500">
            View customer list line-by-line, search profiles & track order histories
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadCustomers}
            title="Refresh Customers"
            className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs shadow-md shadow-brand-600/30 flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="glass-card p-4">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by customer name, mobile or address..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* LINE-BY-LINE (ROW-BY-ROW) CUSTOMER LIST & CARDS */}
      <div className="glass-card overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 animate-pulse">
              Loading customer directory from database...
            </p>
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            No customers found matching search criteria.
          </div>
        ) : (
          <div>
            {/* Desktop / Tablet Table View (List one below one) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Customer Name</th>
                    <th className="py-3 px-4">Mobile Number</th>
                    <th className="py-3 px-4">Address</th>
                    <th className="py-3 px-4 text-center">Total Orders</th>
                    <th className="py-3 px-4 text-right">Total Spent</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                  {customers.map((cust, idx) => (
                    <tr key={cust._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-3.5 px-4 font-semibold text-slate-400">
                        {(page - 1) * limit + idx + 1}
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        <p>{cust.name}</p>
                        {cust.email && <p className="text-[10px] text-slate-400 font-normal">{cust.email}</p>}
                      </td>

                      <td className="py-3.5 px-4 font-medium text-brand-600 dark:text-brand-400 whitespace-nowrap">
                        +91 {cust.mobile}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                        {cust.address}
                      </td>

                      <td className="py-3.5 px-4 text-center font-bold">
                        <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {cust.totalOrders || 0} orders
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right font-black text-emerald-600 dark:text-emerald-400 text-sm whitespace-nowrap">
                        {currencySymbol}{cust.totalSpent || 0}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => navigate('/orders/new')}
                            title="New Order for Customer"
                            className="p-1.5 rounded-lg bg-brand-50 hover:bg-brand-600 text-brand-600 hover:text-white transition-colors"
                          >
                            <PlusCircle className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleViewHistory(cust)}
                            title="View Order History"
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                          >
                            <History className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleOpenEditModal(cust)}
                            title="Edit Customer"
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setDeleteCustId(cust._id)}
                            title="Delete Customer"
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

            {/* Mobile Touch Row-by-Row Stack View (md:hidden) */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {customers.map((cust) => (
                <div key={cust._id} className="p-4 space-y-2.5">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">{cust.name}</h3>
                      <p className="text-xs text-brand-600 dark:text-brand-400 font-semibold mt-0.5">
                        +91 {cust.mobile}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-black text-sm text-emerald-600 dark:text-emerald-400">
                        {currencySymbol}{cust.totalSpent || 0}
                      </p>
                      <p className="text-[10px] text-slate-400 font-semibold">{cust.totalOrders || 0} orders</p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 flex items-start gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>{cust.address}</span>
                  </p>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => handleViewHistory(cust)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1"
                    >
                      <History className="w-3.5 h-3.5" /> History
                    </button>
                    <button
                      onClick={() => handleOpenEditModal(cust)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1"
                    >
                      <Edit className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => setDeleteCustId(cust._id)}
                      className="px-2.5 py-1.5 rounded-xl bg-rose-50 text-rose-500 text-xs font-semibold"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* CUSTOMER LIMIT & PAGINATION CONTROLS BAR */}
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
                  Showing {Math.min(totalCustomers, (page - 1) * limit + 1)} - {Math.min(totalCustomers, page * limit)} of {totalCustomers} customers
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

      {/* Add / Edit Customer Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mobile Number *
                </label>
                <input
                  type="text"
                  required
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  placeholder="10-digit mobile number"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Address *
                </label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street / Apartment address"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@domain.com"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. Regular customer, prefers starch"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 rounded-xl border text-xs font-semibold text-slate-600 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Customer</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Order History Modal */}
      {historyCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  {historyCustomer.name} - Order History
                </h3>
                <p className="text-xs text-slate-500">Mobile: +91 {historyCustomer.mobile}</p>
              </div>
              <button
                onClick={() => setHistoryCustomer(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-3 flex-1">
              {customerOrders.length === 0 ? (
                <p className="text-center text-xs text-slate-500 py-6">No order history found for this customer.</p>
              ) : (
                customerOrders.map((ord) => (
                  <div
                    key={ord._id}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex justify-between items-center text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">#{ord.orderNumber}</p>
                      <p className="text-[11px] text-slate-400">
                        Date: {new Date(ord.orderDate).toLocaleDateString('en-GB')}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <StatusBadge status={ord.status} size="sm" />
                      <div className="text-right">
                        <p className="font-extrabold text-slate-900 dark:text-white">{currencySymbol}{ord.totalAmount}</p>
                        <p className="text-[10px] text-emerald-600 font-semibold">{ord.paymentStatus}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Customer Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteCustId}
        title="Delete Customer Profile"
        message="Are you sure you want to permanently delete this customer profile? This action cannot be undone."
        confirmText="Delete Customer"
        variant="danger"
        onConfirm={confirmDeleteCustomer}
        onCancel={() => setDeleteCustId(null)}
      />
    </div>
  );
};
