import React, { useState, useEffect } from 'react';
import {
  fetchServices,
  createServiceApi,
  updateServiceApi,
  toggleServiceStatusApi,
  deleteServiceApi,
  fetchSettings,
} from '../services/api';
import { Service, Setting } from '../types';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import {
  KgServiceRate,
  getKgServicesList,
  saveKgServicesList,
} from '../data/posCatalogData';
import { useToast } from '../context/ToastContext';
import {
  WashingMachine,
  Plus,
  Edit,
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
  X,
  Scale,
} from 'lucide-react';

export const ServicesPage: React.FC = () => {
  const { showToast } = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [setting, setSetting] = useState<Setting | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  // --- Kg Services State ---
  const [kgServicesList, setKgServicesList] = useState<KgServiceRate[]>(getKgServicesList());
  const [showKgModal, setShowKgModal] = useState(false);
  const [editingKgService, setEditingKgService] = useState<KgServiceRate | null>(null);
  const [kgFormData, setKgFormData] = useState({ name: '', ratePerKg: 120 });

  const [formData, setFormData] = useState({
    name: '',
    price: 50,
    unit: 'piece',
    estimatedHours: 24,
    description: '',
    isActive: true,
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [servRes, setRes] = await Promise.all([fetchServices(), fetchSettings()]);
      if (servRes.success) setServices(servRes.services);
      if (setRes.success) setSetting(setRes.setting);
    } catch (err) {
      console.error('Failed to load services', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const currencySymbol = setting?.currencySymbol || '₹';

  const handleOpenAdd = () => {
    setEditingService(null);
    setFormData({ name: '', price: 50, unit: 'piece', estimatedHours: 24, description: '', isActive: true });
    setShowModal(true);
  };

  const handleOpenEdit = (s: Service) => {
    setEditingService(s);
    setFormData({
      name: s.name,
      price: s.price,
      unit: s.unit || 'piece',
      estimatedHours: s.estimatedHours || 24,
      description: s.description || '',
      isActive: s.isActive,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingService) {
        await updateServiceApi(editingService._id, formData);
      } else {
        await createServiceApi(formData);
      }
      setShowModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to save service');
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      await toggleServiceStatusApi(id);
      loadData();
    } catch (err) {
      console.error('Failed to toggle status', err);
    }
  };

  const [deleteServId, setDeleteServId] = useState<string | null>(null);

  const confirmDeleteService = async () => {
    if (!deleteServId) return;
    try {
      await deleteServiceApi(deleteServId);
      loadData();
    } catch (err) {
      console.error('Failed to delete service', err);
    } finally {
      setDeleteServId(null);
    }
  };

  const handleOpenEditKg = (kgServ: KgServiceRate) => {
    setEditingKgService(kgServ);
    setKgFormData({ name: kgServ.name, ratePerKg: kgServ.ratePerKg });
    setShowKgModal(true);
  };

  const handleOpenAddKg = () => {
    setEditingKgService(null);
    setKgFormData({ name: '', ratePerKg: 100 });
    setShowKgModal(true);
  };

  const handleSaveKgService = (e: React.FormEvent) => {
    e.preventDefault();
    const name = kgFormData.name.trim();
    const ratePerKg = Number(kgFormData.ratePerKg);
    if (!name) {
      showToast('Please enter a service name', 'error');
      return;
    }
    if (isNaN(ratePerKg) || ratePerKg < 0) {
      showToast('Please enter a valid rate per Kg', 'error');
      return;
    }

    setKgServicesList((prev) => {
      let updated: KgServiceRate[];
      if (editingKgService) {
        updated = prev.map((item) =>
          item.name === editingKgService.name || (editingKgService.id && item.id === editingKgService.id)
            ? { ...item, name, ratePerKg }
            : item
        );
      } else {
        updated = [...prev, { id: `kg-${Date.now()}`, name, ratePerKg }];
      }
      saveKgServicesList(updated);
      return updated;
    });

    setShowKgModal(false);
    showToast(`✅ Rate for "${name}" updated to ${currencySymbol}${ratePerKg}/Kg!`, 'success');
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <WashingMachine className="w-6 h-6 text-brand-600" /> Laundry Services
          </h1>
          <p className="hidden sm:block text-xs text-slate-500">
            Configure offered laundry processes, rates & turnaround times
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs shadow-md shadow-brand-600/30 flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Service</span>
        </button>
      </div>

      {/* BY WEIGHT (KG) SERVICE RATES CATALOG CARD */}
      <div className="glass-card p-5 space-y-4 border-l-4 border-l-brand-600">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Scale className="w-4.5 h-4.5 text-brand-600" /> By Weight (Kg) Laundry Rates
            </h3>
            <p className="text-xs text-slate-500">
              Manage per-kg pricing rates used in the Express POS By Weight builder
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenAddKg}
            className="px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all w-fit"
          >
            <Plus className="w-3.5 h-3.5" /> Add Kg Rate
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {kgServicesList.map((kgServ) => (
            <div
              key={kgServ.name}
              className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between shadow-xs"
            >
              <div>
                <p className="font-extrabold text-xs text-slate-900 dark:text-white">{kgServ.name}</p>
                <p className="text-sm font-black text-brand-600 dark:text-brand-400 mt-1">
                  {currencySymbol}{kgServ.ratePerKg}.00 <span className="text-[10px] text-slate-400 font-normal">/ Kg</span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleOpenEditKg(kgServ)}
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 transition-all font-bold text-xs flex items-center gap-1 shadow-xs"
              >
                <Edit className="w-3.5 h-3.5 text-brand-600" /> Edit Rate
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Services Row-by-Row Table List View */}
      <div className="glass-card overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 animate-pulse">
              Loading laundry services from database...
            </p>
          </div>
        ) : services.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            No laundry services configured. Click "New Service" to add one.
          </div>
        ) : (
          <div>
            {/* Desktop / Tablet Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4 w-12">#</th>
                    <th className="py-3.5 px-4">Service Name & Description</th>
                    <th className="py-3.5 px-4">Turnaround Time</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                  {services.map((serv, idx) => (
                    <tr
                      key={serv._id}
                      className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors ${
                        !serv.isActive ? 'opacity-60 bg-slate-50/50 dark:bg-slate-900/50' : ''
                      }`}
                    >
                      <td className="py-4 px-4 font-bold text-slate-400">
                        {idx + 1}
                      </td>

                      <td className="py-4 px-4">
                        <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                          {serv.name}
                        </h3>
                        {serv.description && (
                          <p className="text-xs text-slate-500 mt-0.5 max-w-md line-clamp-1">
                            {serv.description}
                          </p>
                        )}
                      </td>

                      <td className="py-4 px-4 text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          ~{serv.estimatedHours} Hours
                        </span>
                      </td>

                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleToggleStatus(serv._id)}
                          className={`px-3 py-1 rounded-full text-[11px] font-extrabold inline-flex items-center gap-1.5 transition-all ${
                            serv.isActive
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                          }`}
                        >
                          {serv.isActive ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                          <span>{serv.isActive ? 'Active' : 'Inactive'}</span>
                        </button>
                      </td>

                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(serv)}
                            title="Edit Service"
                            className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-brand-600 hover:text-white transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteServId(serv._id)}
                            title="Delete Service"
                            className="p-1.5 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-600 hover:text-white transition-colors"
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

            {/* Mobile Touch Row View */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {services.map((serv, idx) => (
                <div
                  key={serv._id}
                  className={`p-4 space-y-2.5 ${!serv.isActive ? 'opacity-60 bg-slate-50/50 dark:bg-slate-900/50' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-400">#{idx + 1}</span>
                        <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                          {serv.name}
                        </h3>
                      </div>
                      {serv.description && (
                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                          {serv.description}
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-black text-sm text-brand-600 dark:text-brand-400">
                        {currencySymbol}{serv.price}
                        <span className="text-[10px] font-normal text-slate-400 ml-0.5">/{serv.unit}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <span className="flex items-center gap-1 text-slate-500 font-medium">
                      <Clock className="w-3.5 h-3.5" /> ~{serv.estimatedHours} Hours
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleStatus(serv._id)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                          serv.isActive
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                        }`}
                      >
                        {serv.isActive ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        <span>{serv.isActive ? 'Active' : 'Inactive'}</span>
                      </button>

                      <button
                        onClick={() => handleOpenEdit(serv)}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteServId(serv._id)}
                        className="p-1.5 rounded-lg bg-rose-50 text-rose-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                {editingService ? 'Edit Service' : 'Add New Service'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Service Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Steam Ironing"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Price ({currencySymbol}) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Pricing Unit *
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  >
                    <option value="piece">Per Piece</option>
                    <option value="kg">Per Kg</option>
                    <option value="pair">Per Pair</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Estimated Turnaround (Hours)
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.estimatedHours}
                  onChange={(e) => setFormData({ ...formData, estimatedHours: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief service process details..."
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
                  className="flex-1 py-2 rounded-xl bg-brand-600 text-white text-xs font-semibold shadow-md"
                >
                  Save Service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Kg Service Rate Modal */}
      {showKgModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Scale className="w-5 h-5 text-brand-600" />
                <span>{editingKgService ? 'Edit Kg Service Rate' : 'Add New Kg Service Rate'}</span>
              </h3>
              <button onClick={() => setShowKgModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveKgService} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Kg Service Package Name *
                </label>
                <input
                  type="text"
                  required
                  value={kgFormData.name}
                  onChange={(e) => setKgFormData({ ...kgFormData, name: e.target.value })}
                  placeholder="e.g. Wash & Iron, Express Laundry"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Rate per Kg ({currencySymbol}) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={kgFormData.ratePerKg}
                  onChange={(e) => setKgFormData({ ...kgFormData, ratePerKg: Number(e.target.value) })}
                  placeholder="e.g. 120"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-black text-brand-600 text-base"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowKgModal(false)}
                  className="flex-1 py-2 rounded-xl border text-xs font-semibold text-slate-600 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-extrabold shadow-md"
                >
                  Save Kg Rate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Service Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteServId}
        title="Delete Service Category"
        message="Are you sure you want to delete this service category?"
        confirmText="Delete Service"
        variant="danger"
        onConfirm={confirmDeleteService}
        onCancel={() => setDeleteServId(null)}
      />
    </div>
  );
};
