import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  fetchShops,
  createShopApi,
  updateShopApi,
  deleteShopApi,
  fetchShopOverviewApi,
} from '../services/api';
import { Shop } from '../types';
import {
  Building2,
  Plus,
  Search,
  MapPin,
  Phone,
  Mail,
  Receipt,
  TrendingUp,
  ShoppingBag,
  Users,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  ExternalLink,
  RefreshCw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export const ShopsPage: React.FC = () => {
  const { isSuperAdmin, selectShop, refreshShops } = useAuth();
  const navigate = useNavigate();

  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [overviewStats, setOverviewStats] = useState<any>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingShop, setEditingShop] = useState<Shop | null>(null);
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    region: 'South Region',
    phone: '',
    email: '',
    address: '',
    invoicePrefix: 'ML',
    gstNumber: '',
    gstPercentage: 5,
    currencySymbol: '₹',
    currencyCode: 'INR',
    upiId: '',
    gpayNumber: '',
    termsAndConditions: '1. Please check your garments upon delivery.\n2. We are not responsible for color bleeding on unfast dyes.',
    isActive: true,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [shopsRes, overviewRes] = await Promise.all([
        fetchShops(),
        fetchShopOverviewApi().catch(() => ({ success: false, stats: null, regionalBreakdown: [] })),
      ]);

      if (shopsRes.success) {
        setShops(shopsRes.shops);
      }
      if (overviewRes.success) {
        setOverviewStats(overviewRes);
      }
    } catch (err) {
      console.error('Failed to load shops:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingShop(null);
    const nextCode = `BR-${String(shops.length + 1).padStart(2, '0')}`;
    setFormData({
      name: '',
      code: nextCode,
      region: 'Central',
      phone: '',
      email: '',
      address: '',
      invoicePrefix: nextCode.replace('-', ''),
      gstNumber: '',
      gstPercentage: 5,
      currencySymbol: '₹',
      currencyCode: 'INR',
      upiId: '',
      gpayNumber: '',
      termsAndConditions: '1. Please check your garments upon delivery.\n2. We are not responsible for color bleeding on unfast dyes.',
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (shop: Shop) => {
    setEditingShop(shop);
    setFormData({
      name: shop.name || '',
      code: shop.code || '',
      region: shop.region || 'Central',
      phone: shop.phone || '',
      email: shop.email || '',
      address: shop.address || '',
      invoicePrefix: shop.invoicePrefix || 'ML',
      gstNumber: shop.gstNumber || '',
      gstPercentage: shop.gstPercentage || 0,
      currencySymbol: shop.currencySymbol || '₹',
      currencyCode: shop.currencyCode || 'INR',
      upiId: shop.upiId || '',
      gpayNumber: shop.gpayNumber || '',
      termsAndConditions: shop.termsAndConditions || '',
      isActive: shop.isActive ?? true,
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) {
      alert('Branch Name and Code are required.');
      return;
    }

    setFormSubmitting(true);
    try {
      if (editingShop) {
        await updateShopApi(editingShop._id, formData);
      } else {
        await createShopApi(formData);
      }
      setIsModalOpen(false);
      await loadData();
      await refreshShops();
    } catch (err: any) {
      alert(err.message || 'Failed to save branch');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleActive = async (shop: Shop) => {
    try {
      await updateShopApi(shop._id, { isActive: !shop.isActive });
      await loadData();
      await refreshShops();
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  };

  const handleSwitchToBranch = (shop: Shop) => {
    selectShop(shop._id);
    navigate('/dashboard');
  };

  const regions = Array.from(new Set(shops.map((s) => s.region).filter(Boolean)));

  const filteredShops = shops.filter((shop) => {
    const matchesSearch =
      shop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shop.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shop.region.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (shop.phone && shop.phone.includes(searchQuery));
    const matchesRegion = selectedRegion === 'all' || shop.region === selectedRegion;
    return matchesSearch && matchesRegion;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-brand-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Branches & Shops
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Multi-branch laundry operations, store isolation, and central control
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadData}
            title="Refresh Data"
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-brand-600 hover:from-indigo-700 hover:to-brand-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/25 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add New Branch</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      {overviewStats?.stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold">Total Branches</span>
              <Building2 className="w-4 h-4 text-indigo-500" />
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{overviewStats.stats.totalShops}</p>
            <p className="text-[11px] text-emerald-600 font-semibold mt-1">
              {overviewStats.stats.activeShops} Active Stores
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold">Network Revenue</span>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white">
              ₹{(overviewStats.stats.totalRevenue || 0).toLocaleString()}
            </p>
            <p className="text-[11px] text-slate-400 font-medium mt-1">
              Today: ₹{(overviewStats.stats.todayRevenue || 0).toLocaleString()}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold">Total Orders</span>
              <ShoppingBag className="w-4 h-4 text-brand-500" />
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white">
              {(overviewStats.stats.totalOrders || 0).toLocaleString()}
            </p>
            <p className="text-[11px] text-slate-400 font-medium mt-1">
              Today: {overviewStats.stats.todayOrders || 0} orders
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold">Total Customers</span>
              <Users className="w-4 h-4 text-purple-500" />
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white">
              {(overviewStats.stats.totalCustomers || 0).toLocaleString()}
            </p>
            <p className="text-[11px] text-slate-400 font-medium mt-1">
              Staff Network: {overviewStats.stats.totalStaff || 0}
            </p>
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search branch by name, code, region..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setSelectedRegion('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              selectedRegion === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            All Regions ({shops.length})
          </button>
          {regions.map((reg) => (
            <button
              key={reg}
              onClick={() => setSelectedRegion(reg)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedRegion === reg
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {reg} ({shops.filter((s) => s.region === reg).length})
            </button>
          ))}
        </div>
      </div>

      {/* Branch Cards Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="text-sm font-semibold">Loading branch network...</p>
        </div>
      ) : filteredShops.length === 0 ? (
        <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 text-center">
          <Building2 className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">No Branches Found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {searchQuery ? 'No branches matched your search query.' : 'Create your first regional branch to get started.'}
          </p>
          {!searchQuery && (
            <button
              onClick={openCreateModal}
              className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4 stroke-[3]" /> Add Branch
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredShops.map((shop) => (
            <div
              key={shop._id}
              className={`rounded-3xl bg-white dark:bg-slate-900 border transition-all flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-md ${
                shop.isActive
                  ? 'border-slate-200/80 dark:border-slate-800'
                  : 'border-rose-200 dark:border-rose-950/60 opacity-75'
              }`}
            >
              {/* Card Header */}
              <div className="p-5 pb-4 border-b border-slate-100 dark:border-slate-800/80">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                      {shop.code.slice(0, 3)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white leading-tight">
                          {shop.name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-mono text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded border border-indigo-200/60 dark:border-indigo-800/60">
                          {shop.code}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {shop.region}
                        </span>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase shrink-0 ${
                      shop.isActive
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                    }`}
                  >
                    {shop.isActive ? 'Active' : 'Disabled'}
                  </span>
                </div>

                {/* Address & Contact Info */}
                <div className="mt-3.5 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <p className="flex items-center gap-2 truncate">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{shop.phone || 'No phone'}</span>
                  </p>
                  <p className="flex items-center gap-2 truncate">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{shop.email || 'No email'}</span>
                  </p>
                  <p className="flex items-start gap-2 line-clamp-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>{shop.address || 'No address set'}</span>
                  </p>
                </div>
              </div>

              {/* Branch Live Metrics */}
              <div className="p-4 bg-slate-50/70 dark:bg-slate-800/40 grid grid-cols-3 gap-2 border-b border-slate-100 dark:border-slate-800/80 text-center">
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400">Today Orders</p>
                  <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                    {shop.metrics?.todayOrders ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400">Today Rev</p>
                  <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                    ₹{(shop.metrics?.todayRevenue ?? 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400">Total Orders</p>
                  <p className="text-sm font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                    {(shop.metrics?.totalOrders ?? 0).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-3.5 bg-white dark:bg-slate-900 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleSwitchToBranch(shop)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition-colors"
                >
                  <span>Open Branch POS</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(shop)}
                    title="Edit Branch Settings"
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleToggleActive(shop)}
                    title={shop.isActive ? 'Deactivate Branch' : 'Activate Branch'}
                    className={`p-2 rounded-xl border transition-colors ${
                      shop.isActive
                        ? 'border-emerald-200 dark:border-emerald-900 text-emerald-600 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950'
                        : 'border-rose-200 dark:border-rose-900 text-rose-600 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950'
                    }`}
                  >
                    {shop.isActive ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Branch Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    {editingShop ? 'Edit Branch Details' : 'Create New Branch'}
                  </h3>
                  <p className="text-xs text-slate-400">Configure store metadata, invoice prefix, and billing parameters</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Branch Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Miracle Laundry - South Branch"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Branch Code (Unique) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BR-SOUTH, MAIN-01"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl font-mono uppercase border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Region / Zone <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. South Zone, Central Hub, Downtown"
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Invoice Prefix
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ML, MLS, B01"
                    value={formData.invoicePrefix}
                    onChange={(e) => setFormData({ ...formData, invoicePrefix: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl font-mono uppercase border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Branch Phone
                  </label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Branch Email
                  </label>
                  <input
                    type="email"
                    placeholder="branch@miraclelaundry.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Store Address
                </label>
                <textarea
                  rows={2}
                  placeholder="Street, Landmark, City, Pincode"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    GST Number
                  </label>
                  <input
                    type="text"
                    placeholder="33AAAAA0000A1Z5"
                    value={formData.gstNumber}
                    onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl font-mono uppercase border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    GST Rate (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={28}
                    value={formData.gstPercentage}
                    onChange={(e) => setFormData({ ...formData, gstPercentage: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    UPI ID / VPA
                  </label>
                  <input
                    type="text"
                    placeholder="miraclesouth@okaxis"
                    value={formData.upiId}
                    onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700"
                />
                <label htmlFor="isActiveToggle" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Branch is Active & Accepting Orders
                </label>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-brand-600 hover:from-indigo-700 hover:to-brand-700 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all disabled:opacity-50"
                >
                  {formSubmitting ? 'Saving Branch...' : editingShop ? 'Update Branch' : 'Create Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
