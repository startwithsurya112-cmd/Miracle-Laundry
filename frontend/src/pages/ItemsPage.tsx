import React, { useState, useEffect } from 'react';
import {
  fetchItems,
  createItemApi,
  updateItemApi,
  deleteItemApi,
  fetchSettings,
  fetchGarmentCategories,
} from '../services/api';
import { LaundryItem, Setting } from '../types';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import {
  getItemPriceForService,
  mainServicesList,
  posGroupCatalog,
  KgServiceRate,
  getKgServicesList,
  saveKgServicesList,
} from '../data/posCatalogData';
import { useToast } from '../context/ToastContext';
import { Shirt, Plus, Edit, Trash2, X, Tag, Search, Sparkles, Check, Scale } from 'lucide-react';

export const ItemsPage: React.FC = () => {
  const { showToast } = useToast();
  const [items, setItems] = useState<LaundryItem[]>([]);
  const [setting, setSetting] = useState<Setting | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [categoriesList, setCategoriesList] = useState<string[]>([
    'Regular',
    'Men',
    'Women',
    'Kids',
    'Household',
    'Others',
  ]);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<LaundryItem | null>(null);

  // --- Kg Services State ---
  const [kgServicesList, setKgServicesList] = useState<KgServiceRate[]>(getKgServicesList());
  const [showKgModal, setShowKgModal] = useState(false);
  const [editingKgService, setEditingKgService] = useState<KgServiceRate | null>(null);
  const [kgFormData, setKgFormData] = useState({ name: '', ratePerKg: 120 });

  // Active Service Category Filter (Default: 'Wash and Fold')
  const [selectedService, setSelectedService] = useState<string>('Wash and Fold');

  // Active Garment Category Filter (Default: 'Regular')
  const [selectedCategory, setSelectedCategory] = useState<string>('Regular');
  const [search, setSearch] = useState<string>('');

  const [formData, setFormData] = useState({
    name: '',
    defaultPrice: 15,
    category: 'Regular',
    serviceName: 'Wash and Fold',
    icon: 'Shirt',
    isActive: true,
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [itemRes, setRes, catRes] = await Promise.all([
        fetchItems(),
        fetchSettings(),
        fetchGarmentCategories(),
      ]);
      if (itemRes.success) setItems(itemRes.items);
      if (setRes.success) setSetting(setRes.setting);
      if (catRes.success && Array.isArray(catRes.categories) && catRes.categories.length > 0) {
        setCategoriesList(catRes.categories.map((c: any) => c.name));
      }
    } catch (err) {
      console.error('Failed to load laundry items', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const currencySymbol = setting?.currencySymbol || '₹';

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      defaultPrice: 15,
      category: selectedCategory || 'Regular',
      serviceName: selectedService || 'Wash and Fold',
      icon: 'Shirt',
      isActive: true,
    });
    setShowModal(true);
  };

  const handleOpenEdit = (item: LaundryItem) => {
    setEditingItem(item);
    const activeServicePrice = getItemPriceForService(
      { name: item.name, price: item.defaultPrice, category: item.category, servicePrices: item.servicePrices },
      selectedService
    );
    setFormData({
      name: item.name,
      defaultPrice: activeServicePrice,
      category: item.category || 'Regular',
      serviceName: selectedService || 'Wash and Fold',
      icon: item.icon || 'Shirt',
      isActive: item.isActive,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newRate = Number(formData.defaultPrice);
      const currentServicePrices = editingItem?.servicePrices || {};
      const updatedServicePrices = {
        ...currentServicePrices,
        [formData.serviceName]: newRate,
      };

      const newDefaultPrice = formData.serviceName === 'Wash and Fold' ? newRate : (editingItem?.defaultPrice || newRate);

      const payload = {
        name: formData.name,
        defaultPrice: newDefaultPrice,
        category: formData.category,
        servicePrices: updatedServicePrices,
        icon: formData.icon,
        isActive: formData.isActive,
      };

      if (editingItem) {
        await updateItemApi(editingItem._id, payload);
      } else {
        await createItemApi(payload);
      }
      setShowModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to save laundry item');
    }
  };

  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);

  const confirmDeleteItem = async () => {
    if (!deleteItemId) return;
    try {
      await deleteItemApi(deleteItemId);
      loadData();
    } catch (err) {
      console.error('Failed to delete item', err);
    } finally {
      setDeleteItemId(null);
    }
  };

  const categories = ['Regular', 'Men', 'Women', 'Kids', 'Household', 'Others'];

  // Build exact catalog item order map matching New Order page sequence
  const catalogOrderIds: string[] = [];
  const catalogOrderNames: string[] = [];

  posGroupCatalog.forEach((group) => {
    group.subCategories.forEach((sub) => {
      sub.items.forEach((item) => {
        catalogOrderIds.push(item.id);
        catalogOrderNames.push(item.name.toLowerCase());
      });
    });
  });

  const getItemRank = (item: LaundryItem) => {
    const idIndex = catalogOrderIds.indexOf(item._id);
    if (idIndex !== -1) return idIndex;
    const nameIndex = catalogOrderNames.indexOf(item.name.toLowerCase());
    if (nameIndex !== -1) return nameIndex;
    return 9999;
  };

  const filteredItems = items
    .filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
      const matchesCat = item.category === selectedCategory;
      return matchesSearch && matchesCat;
    })
    .sort((a, b) => getItemRank(a) - getItemRank(b));

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
            <Shirt className="w-6 h-6 text-brand-600" /> Clothing & Item Price Catalog
          </h1>
          <p className="hidden sm:block text-xs text-slate-500">
            Select service & garment category to view and edit service-specific prices ({items.length} items catalog)
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs shadow-md shadow-brand-600/30 flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add Laundry Item</span>
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
              Manage per-kg rates used in the Express POS By Weight builder
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

      {/* SERVICE CATEGORIES FILTER BAR AT TOP */}
      <div className="glass-card p-4 space-y-2">
        <span className="block text-xs font-extrabold uppercase tracking-wider text-slate-400">
          Select Service Category for Price Lookup
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-11 gap-1.5">
          {mainServicesList.map((sName) => {
            const active = selectedService === sName;
            return (
              <button
                key={sName}
                type="button"
                onClick={() => setSelectedService(sName)}
                className={`px-2.5 py-2 rounded-xl text-[11px] font-extrabold transition-all flex items-center justify-center gap-1 text-center truncate ${
                  active
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {active && <Check className="w-3 h-3 shrink-0" />}
                <span className="truncate">{sName}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SEARCH & GARMENT CATEGORY FILTER BAR */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search garment item by name (e.g. Shirt, Blazer, Saree, Hoodie)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500 font-medium"
            />
          </div>

          <div className="text-xs font-bold text-slate-500 shrink-0">
            Active Service: <span className="text-brand-600 dark:text-brand-400 font-black">{selectedService}</span> ({filteredItems.length} items)
          </div>
        </div>

        {/* Garment Category Pills */}
        <div>
          <span className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
            Garment Category Groups
          </span>
          <div className="flex flex-wrap gap-1.5">
            {categoriesList.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    active
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Items Grid */}
      {isLoading ? (
        <div className="glass-card p-10 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 animate-pulse">
            Loading laundry items catalog from database...
          </p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="glass-card p-8 text-center text-xs text-slate-500">
          No garment items found matching your search or category filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const activeServicePrice = getItemPriceForService(
              { name: item.name, price: item.defaultPrice, category: item.category, servicePrices: item.servicePrices },
              selectedService
            );
            return (
              <div
                key={item._id}
                className="glass-card p-5 space-y-3 flex items-center justify-between hover:border-brand-500 transition-all group"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400 px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-900">
                      {item.category || 'Regular'}
                    </span>
                    <span className="text-[10px] font-extrabold text-slate-400">
                      {selectedService}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white mt-1.5">
                    {item.name}
                  </h3>

                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-xs text-slate-500 font-semibold">Service Price:</span>
                    <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                      {currencySymbol}{activeServicePrice}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(item)}
                    title="Edit Item & Pricing"
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-brand-600 hover:text-white transition-all"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteItemId(item._id)}
                    title="Delete Item"
                    className="p-2 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-600 hover:text-white transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                {editingItem ? 'Edit Laundry Item & Base Rate' : 'Add New Laundry Item'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Saree (Silk) or Leather Jacket"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Garment Group *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-bold"
                  >
                    {categoriesList.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Applicable Service *
                  </label>
                  <select
                    value={formData.serviceName}
                    onChange={(e) => {
                      const newSrv = e.target.value;
                      const rateForNewSrv = editingItem
                        ? getItemPriceForService(
                            { name: editingItem.name, price: editingItem.defaultPrice, category: editingItem.category, servicePrices: editingItem.servicePrices },
                            newSrv
                          )
                        : formData.defaultPrice;
                      setFormData({ ...formData, serviceName: newSrv, defaultPrice: rateForNewSrv });
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-bold text-brand-600"
                  >
                    {mainServicesList.map((srv) => (
                      <option key={srv} value={srv}>
                        {srv}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Item Rate for {formData.serviceName} ({currencySymbol}) *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={formData.defaultPrice}
                  onChange={(e) => setFormData({ ...formData, defaultPrice: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-bold text-emerald-600"
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
                  Save Item
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

      {/* Delete Item Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteItemId}
        title="Delete Garment Item"
        message="Are you sure you want to delete this clothing item?"
        confirmText="Delete Item"
        variant="danger"
        onConfirm={confirmDeleteItem}
        onCancel={() => setDeleteItemId(null)}
      />
    </div>
  );
};
