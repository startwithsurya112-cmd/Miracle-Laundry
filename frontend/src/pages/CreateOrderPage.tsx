import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchCustomers,
  createOrderApi,
  fetchSettings,
  createCustomerApi,
  fetchItems,
} from '../services/api';
import { Customer, Order, Setting } from '../types';
import { InvoiceView } from '../components/invoice/InvoiceView';
import {
  mainServicesList,
  kgServicesList,
  posGroupCatalog,
  POSCatalogItem,
  POSGroup,
  KgServiceRate,
  getItemPriceForService,
} from '../data/posCatalogData';
import { useToast } from '../context/ToastContext';
import {
  User,
  Search,
  Plus,
  Trash2,
  Calendar,
  DollarSign,
  FileText,
  CheckCircle,
  ShoppingBag,
  Sparkles,
  Percent,
  Scale,
  Layers,
  Tag,
  Check,
  Zap,
  AlertCircle,
  RefreshCw,
  Building2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const CreateOrderPage: React.FC = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { isSuperAdmin, shops, selectedShop, selectedShopId, selectShop } = useAuth();

  const [selectedOrderShopId, setSelectedOrderShopId] = useState<string>('');

  const effectiveShopId =
    selectedShopId !== 'all'
      ? selectedShopId
      : selectedOrderShopId || (shops.length > 0 ? shops[0]._id : '');

  const activeOrderShop =
    shops.find((s) => s._id === effectiveShopId) ||
    selectedShop ||
    (shops.length > 0 ? shops[0] : null);

  // Master State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [setting, setSetting] = useState<Setting | undefined>(undefined);

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerSearch, setCustomerSearch] = useState<string>('');
  const [isCustDropdownOpen, setIsCustDropdownOpen] = useState<boolean>(false);
  const [showNewCustModal, setShowNewCustModal] = useState(false);
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);

  // New inline customer form
  const [newCustName, setNewCustName] = useState('');
  const [newCustMobile, setNewCustMobile] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');

  // 1. Order Mode: 'quantity' (Pcs) vs 'kg' (Weight)
  const [orderMode, setOrderMode] = useState<'quantity' | 'kg'>('quantity');

  // 2. Quantity Mode Active Service Category (Default: 'Wash and Fold')
  const [selectedServiceCategory, setSelectedServiceCategory] = useState<string>('Wash and Fold');

  // 3. Kg Mode Selected Service (Default: 'Wash & Iron', Rate: 120)
  const [selectedKgService, setSelectedKgService] = useState<KgServiceRate>(kgServicesList[0]);

  // 4. Active Target Group (Default: 'Regular')
  const [activeGroup, setActiveGroup] = useState<'Regular' | 'Men' | 'Women' | 'Kids' | 'Household' | 'Others'>('Regular');

  // 5. Active Sub-category filter
  const [activeSubCategory, setActiveSubCategory] = useState<string>('All');

  // Search inside catalog
  const [catalogSearch, setCatalogSearch] = useState<string>('');

  // Selected Order Cart Items
  const [orderItems, setOrderItems] = useState<
    Array<{
      itemId: string;
      itemName: string;
      serviceId: string;
      serviceName: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
      isKgMode?: boolean;
      isKgPackItem?: boolean;
    }>
  >([]);

  // Pricing & Discounts
  const [discount, setDiscount] = useState<number>(0);
  const [taxPercent, setTaxPercent] = useState<number>(0);
  const [advancePaid, setAdvancePaid] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI'>('Cash');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Final Generated Order & Invoice Modal
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Active POS Catalog State (Dynamic Sync with Items Manager)
  const [activeCatalog, setActiveCatalog] = useState<POSGroup[]>(posGroupCatalog);

  useEffect(() => {
    const loadCustomersList = async () => {
      try {
        const custRes = await fetchCustomers({ limit: 500 });
        if (custRes && custRes.success) {
          setCustomers(custRes.customers || []);
        }
      } catch (err) {
        console.error('Failed to load customers for POS', err);
      }
    };
    loadCustomersList();
  }, [effectiveShopId]);

  useEffect(() => {
    const loadInitial = async () => {
      try {
        const [setRes, itemRes] = await Promise.all([
          fetchSettings(),
          fetchItems(),
        ]);

        if (setRes.success) {
          setSetting(setRes.setting);
          setTaxPercent(0);
        }

        if (itemRes.success && Array.isArray(itemRes.items) && itemRes.items.length > 0) {
          const priceMap = new Map<string, { price: number; name: string; servicePrices?: Record<string, number> }>();
          itemRes.items.forEach((i: any) => {
            const info = { price: i.defaultPrice, name: i.name, servicePrices: i.servicePrices };
            if (i._id) priceMap.set(i._id, info);
            if (i.name) priceMap.set(i.name.toLowerCase(), info);
          });

          const synced = posGroupCatalog.map((grp) => ({
            ...grp,
            subCategories: grp.subCategories.map((sub) => ({
              ...sub,
              items: sub.items.map((item) => {
                const match = priceMap.get(item.id) || priceMap.get(item.name.toLowerCase());
                if (match) {
                  return {
                    ...item,
                    name: match.name || item.name,
                    price: match.price !== undefined ? match.price : item.price,
                    servicePrices: match.servicePrices,
                  };
                }
                return item;
              }),
            })),
          }));
          setActiveCatalog(synced);
        }
      } catch (err) {
        console.error('Failed to load POS reference data', err);
      }
    };
    loadInitial();
  }, []);

  const currencySymbol = setting?.currencySymbol || '₹';

  // Switch or Select Kg Service Rate Category
  const handleSelectKgService = (kgServ: KgServiceRate) => {
    setSelectedKgService(kgServ);
    setOrderItems((prev) => {
      const kgLineIdx = prev.findIndex((l) => l.isKgMode);
      if (kgLineIdx === -1) {
        return [
          {
            itemId: `kg-${Date.now()}`,
            itemName: `Bulk Laundry - ${kgServ.name} (1 Kg @ ${currencySymbol}${kgServ.ratePerKg}/Kg)`,
            serviceId: 'service-kg',
            serviceName: kgServ.name,
            quantity: 1,
            unitPrice: kgServ.ratePerKg,
            subtotal: kgServ.ratePerKg,
            isKgMode: true,
          },
          ...prev,
        ];
      }
      return prev.map((line) => {
        if (line.isKgMode) {
          const currentQty = line.quantity || 1;
          return {
            ...line,
            serviceName: kgServ.name,
            unitPrice: kgServ.ratePerKg,
            subtotal: Math.round(currentQty * kgServ.ratePerKg),
            itemName: `Bulk Laundry - ${kgServ.name} (${currentQty} Kg @ ${currencySymbol}${kgServ.ratePerKg}/Kg)`,
          };
        }
        if (line.isKgPackItem) {
          return {
            ...line,
            serviceName: `${kgServ.name} (Kg Pack)`,
            serviceId: `${kgServ.name.toLowerCase().replace(/\s+/g, '-')}-pack`,
          };
        }
        return line;
      });
    });
  };

  // Add Item to Cart (Clicking Card in Quantity or Kg mode)
  const handleCardClick = (item: POSCatalogItem) => {
    if (orderMode === 'quantity') {
      const serviceName = selectedServiceCategory;
      const price = getItemPriceForService(item, selectedServiceCategory);

      setOrderItems((prev) => {
        const existingIdx = prev.findIndex(
          (line) => line.itemId === item.id && line.serviceName === serviceName && !line.isKgPackItem
        );
        if (existingIdx !== -1) {
          const updated = [...prev];
          const newQty = updated[existingIdx].quantity + 1;
          updated[existingIdx].quantity = newQty;
          updated[existingIdx].subtotal = Math.round(newQty * updated[existingIdx].unitPrice);
          return updated;
        }
        return [
          ...prev,
          {
            itemId: item.id,
            itemName: item.name,
            serviceId: serviceName.toLowerCase().replace(/\s+/g, '-'),
            serviceName,
            quantity: 1,
            unitPrice: price,
            subtotal: price,
          },
        ];
      });
    } else {
      // By Weight (Kg) Mode:
      // Bill is generated as Kg only (Bulk Laundry line item at kg rate).
      // Each clicked garment item is listed as part of the Kg package at ₹0.
      setOrderItems((prev) => {
        let updated = [...prev];

        // 1. Ensure the master Bulk Laundry Kg line item exists for this service
        const kgLineIdx = updated.findIndex((l) => l.isKgMode);
        if (kgLineIdx === -1) {
          updated.unshift({
            itemId: `kg-${Date.now()}`,
            itemName: `Bulk Laundry - ${selectedKgService.name} (1 Kg @ ${currencySymbol}${selectedKgService.ratePerKg}/Kg)`,
            serviceId: 'service-kg',
            serviceName: selectedKgService.name,
            quantity: 1,
            unitPrice: selectedKgService.ratePerKg,
            subtotal: selectedKgService.ratePerKg,
            isKgMode: true,
          });
        } else if (updated[kgLineIdx].serviceName !== selectedKgService.name) {
          const currentQty = updated[kgLineIdx].quantity || 1;
          updated[kgLineIdx] = {
            ...updated[kgLineIdx],
            serviceName: selectedKgService.name,
            unitPrice: selectedKgService.ratePerKg,
            subtotal: Math.round(currentQty * selectedKgService.ratePerKg),
            itemName: `Bulk Laundry - ${selectedKgService.name} (${currentQty} Kg @ ${currencySymbol}${selectedKgService.ratePerKg}/Kg)`,
          };
        }

        // 2. Add or increment the garment item under the Kg pack
        const packServiceName = `${selectedKgService.name} (Kg Pack)`;
        const garmentIdx = updated.findIndex(
          (l) => l.itemId === item.id && l.isKgPackItem
        );

        if (garmentIdx !== -1) {
          const newQty = updated[garmentIdx].quantity + 1;
          updated[garmentIdx] = {
            ...updated[garmentIdx],
            quantity: newQty,
            subtotal: Math.round(newQty * updated[garmentIdx].unitPrice),
          };
        } else {
          updated.push({
            itemId: item.id,
            itemName: item.name,
            serviceId: `${selectedKgService.name.toLowerCase().replace(/\s+/g, '-')}-pack`,
            serviceName: packServiceName,
            quantity: 1,
            unitPrice: 0,
            subtotal: 0,
            isKgPackItem: true,
          });
        }

        return updated;
      });
    }
  };

  const updateItemQty = (index: number, newQty: number) => {
    if (newQty <= 0) {
      removeItem(index);
      return;
    }
    setOrderItems((prev) => {
      const updated = [...prev];
      const line = updated[index];
      const roundedQty = line.isKgMode ? Math.round(newQty * 10) / 10 : Math.round(newQty);
      updated[index] = {
        ...line,
        quantity: roundedQty,
        subtotal: Math.round(roundedQty * line.unitPrice),
        itemName: line.isKgMode
          ? `Bulk Laundry - ${line.serviceName} (${roundedQty} Kg @ ${currencySymbol}${line.unitPrice}/Kg)`
          : line.itemName,
      };
      return updated;
    });
  };

  const updateItemQtyDirect = (index: number, newQty: number) => {
    const validQty = isNaN(newQty) ? 0 : Math.max(0, newQty);
    setOrderItems((prev) => {
      const updated = [...prev];
      const line = updated[index];
      const roundedQty = line.isKgMode ? Math.round(validQty * 100) / 100 : Math.round(validQty);
      updated[index] = {
        ...line,
        quantity: roundedQty,
        subtotal: Math.round(roundedQty * line.unitPrice),
        itemName: line.isKgMode
          ? `Bulk Laundry - ${line.serviceName} (${roundedQty} Kg @ ${currencySymbol}${line.unitPrice}/Kg)`
          : line.itemName,
      };
      return updated;
    });
  };

  const updateItemPrice = (index: number, newPrice: number) => {
    const validPrice = Math.max(0, isNaN(newPrice) ? 0 : newPrice);
    setOrderItems((prev) => {
      const updated = [...prev];
      const line = updated[index];
      updated[index] = {
        ...line,
        unitPrice: validPrice,
        subtotal: Math.round(line.quantity * validPrice),
        itemName: line.isKgMode
          ? `Bulk Laundry - ${line.serviceName} (${line.quantity} Kg @ ${currencySymbol}${validPrice}/Kg)`
          : line.itemName,
      };
      return updated;
    });
  };

  const updateItemSubtotal = (index: number, newSubtotal: number) => {
    const validSubtotal = Math.max(0, isNaN(newSubtotal) ? 0 : newSubtotal);
    setOrderItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        subtotal: validSubtotal,
      };
      return updated;
    });
  };

  const removeItem = (index: number) => {
    setOrderItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Inline Create Customer
  const handleCreateInlineCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName || !newCustMobile) return;
    setIsCreatingCustomer(true);
    try {
      const res = await createCustomerApi({
        name: newCustName,
        mobile: newCustMobile,
        address: newCustAddress || 'Local Address',
        email: newCustEmail,
        shopId: effectiveShopId || undefined,
      });
      if (res.success && res.customer) {
        setCustomers((prev) => [res.customer, ...prev]);
        setSelectedCustomerId(res.customer._id);
        setShowNewCustModal(false);
        setNewCustName('');
        setNewCustMobile('');
        setNewCustAddress('');
        setNewCustEmail('');
        showToast(`✅ Customer "${res.customer.name}" created & selected!`, 'success');
      } else {
        showToast(res.message || 'Failed to create customer', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to create customer', 'error');
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  // Calculations
  const subtotal = orderItems.reduce((acc, item) => acc + item.subtotal, 0);
  const taxableAmount = Math.max(0, subtotal - discount);
  const taxAmount = (taxableAmount * taxPercent) / 100;
  const totalAmount = Math.round(taxableAmount + taxAmount);
  const remainingBalance = Math.max(0, totalAmount - advancePaid);

  const [posError, setPosError] = useState<string>('');

  // Submit Order
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setPosError('');

    if (!selectedCustomerId) {
      const msg = 'Please select a customer or add a new customer before creating order.';
      setPosError(msg);
      showToast(msg, 'error');
      return;
    }
    if (orderItems.length === 0) {
      const msg = 'Please add at least one garment or service item to the order.';
      setPosError(msg);
      showToast(msg, 'error');
      return;
    }
    if (!expectedDeliveryDate) {
      const msg = 'Please select an Expected Delivery Date for the order.';
      setPosError(msg);
      showToast(msg, 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createOrderApi({
        customerId: selectedCustomerId,
        customerSnapshot: selectedCustomerObj
          ? {
              name: selectedCustomerObj.name,
              mobile: selectedCustomerObj.mobile,
              address: selectedCustomerObj.address || 'Local',
              email: selectedCustomerObj.email || '',
            }
          : undefined,
        newCustomer: selectedCustomerObj
          ? {
              name: selectedCustomerObj.name,
              mobile: selectedCustomerObj.mobile,
              address: selectedCustomerObj.address || 'Local',
              email: selectedCustomerObj.email || '',
            }
          : undefined,
        items: orderItems,
        expectedDeliveryDate,
        discount,
        taxPercent,
        advancePaid,
        paymentMethod: advancePaid > 0 ? paymentMethod : 'Pending',
        notes,
        shopId: effectiveShopId || undefined,
      });

      if (res.success && res.order) {
        setCreatedOrder(res.order);
        showToast(`✅ Order #${res.order.orderNumber} created successfully!`, 'success');
      } else {
        const msg = res.message || 'Failed to create order';
        setPosError(msg);
        showToast(msg, 'error');
      }
    } catch (err: any) {
      const msg = err.message || 'Failed to create order';
      setPosError(msg);
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Current Group Object
  const currentGroupObj = activeCatalog.find((g) => g.groupName === activeGroup) || activeCatalog[0];

  // Available Sub-categories for active group
  const subCategoriesList = [
    'All',
    ...currentGroupObj.subCategories.map((sc: any) => sc.name),
  ];

  // Flattened items list for current active group & subcategory filter & search
  let displayItems: POSCatalogItem[] = [];
  currentGroupObj.subCategories.forEach((sc: any) => {
    if (activeSubCategory === 'All' || activeSubCategory === sc.name) {
      displayItems.push(...sc.items);
    }
  });

  if (catalogSearch.trim()) {
    displayItems = displayItems.filter((i) =>
      i.name.toLowerCase().includes(catalogSearch.toLowerCase())
    );
  }

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.mobile.includes(customerSearch)
  );

  const selectedCustomerObj = customers.find((c) => c._id === selectedCustomerId);

  return (
    <div className="space-y-6 pb-20">
      {/* Branch Context Banner / Selector */}
      {isSuperAdmin ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 bg-indigo-50/90 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-800/50 rounded-2xl shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
            <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>Assigning Order to Branch:</span>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={effectiveShopId}
              onChange={(e) => {
                setSelectedOrderShopId(e.target.value);
                if (selectedShopId !== 'all') {
                  selectShop(e.target.value);
                }
              }}
              className="px-3 py-1.5 text-xs font-bold rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-xs outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {shops.map((s) => (
                <option key={s._id} value={s._id}>
                  [{s.code}] {s.name} ({s.region})
                </option>
              ))}
            </select>
            {activeOrderShop && (
              <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-100/70 dark:bg-indigo-900/50 px-2.5 py-1 rounded-lg">
                Prefix: {activeOrderShop.invoicePrefix}
              </span>
            )}
          </div>
        </div>
      ) : (
        selectedShop && (
          <div className="flex items-center justify-between px-4 py-2.5 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/40 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>
                Order Branch: <strong className="text-indigo-600 dark:text-indigo-400">[{selectedShop.code}] {selectedShop.name}</strong> ({selectedShop.region})
              </span>
            </div>
            <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-100/70 dark:bg-indigo-900/50 px-2 py-0.5 rounded">
              Prefix: {selectedShop.invoicePrefix}
            </span>
          </div>
        )
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-brand-600" /> Express POS Order Builder
          </h1>
          <p className="hidden sm:block text-xs text-slate-500">
            Click cards to select items by Quantity or Kg, pick services & generate receipt
          </p>
        </div>

        {/* ORDER MODE SWITCHER (Quantity Pcs vs Weight Kg) */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setOrderMode('quantity')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
              orderMode === 'quantity'
                ? 'bg-brand-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" /> By Quantity (Pcs)
          </button>
          <button
            type="button"
            onClick={() => {
              setOrderMode('kg');
              setOrderItems((prev) => {
                if (prev.length === 0) {
                  return [
                    {
                      itemId: `kg-${Date.now()}`,
                      itemName: `Bulk Laundry - ${selectedKgService.name} (1 Kg @ ${currencySymbol}${selectedKgService.ratePerKg}/Kg)`,
                      serviceId: 'service-kg',
                      serviceName: selectedKgService.name,
                      quantity: 1,
                      unitPrice: selectedKgService.ratePerKg,
                      subtotal: selectedKgService.ratePerKg,
                      isKgMode: true,
                    },
                  ];
                }
                return prev;
              });
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
              orderMode === 'kg'
                ? 'bg-brand-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Scale className="w-4 h-4" /> By Weight (Kg)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Customer & Cart Summary (lg:col-span-5) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Step 1: Customer Selection */}
          <div className="glass-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <User className="w-4 h-4 text-brand-500" /> Step 1: Select Customer
              </span>
              <button
                type="button"
                onClick={() => setShowNewCustModal(true)}
                className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> New Customer
              </button>
            </div>

            {/* Selected Customer Card or Search Selector */}
            {selectedCustomerObj ? (
              <div className="p-4 rounded-2xl bg-brand-50 dark:bg-brand-950/50 border border-brand-200 dark:border-brand-900 flex items-center justify-between shadow-xs">
                <div>
                  <h3 className="font-extrabold text-sm text-brand-900 dark:text-brand-100 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                    <span>{selectedCustomerObj.name}</span>
                  </h3>
                  <p className="text-xs text-brand-700 dark:text-brand-300 mt-0.5 font-medium">
                    Mobile: +91 {selectedCustomerObj.mobile} {selectedCustomerObj.address ? `| ${selectedCustomerObj.address}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCustomerId('');
                    setIsCustDropdownOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-xs hover:bg-slate-50 transition-all"
                >
                  Change Customer
                </button>
              </div>
            ) : (
              <div className="relative space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Click to select or search customer by name / mobile..."
                    value={customerSearch}
                    onFocus={() => setIsCustDropdownOpen(true)}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setIsCustDropdownOpen(true);
                    }}
                    className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500 font-medium"
                  />
                </div>

                {/* Dropdown list - ONLY SHOWN WHEN CLICKED/FOCUSED OR SEARCHING */}
                {isCustDropdownOpen && (
                  <div className="absolute z-20 left-0 right-0 top-full mt-1 max-h-52 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-xl">
                    {filteredCustomers.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400">
                        No matching customers found.{' '}
                        <button
                          type="button"
                          onClick={() => {
                            setIsCustDropdownOpen(false);
                            setShowNewCustModal(true);
                          }}
                          className="text-brand-600 font-bold underline"
                        >
                          + Add New Customer
                        </button>
                      </div>
                    ) : (
                      filteredCustomers.slice(0, 10).map((cust) => (
                        <button
                          key={cust._id}
                          type="button"
                          onClick={() => {
                            setSelectedCustomerId(cust._id);
                            setIsCustDropdownOpen(false);
                            setCustomerSearch('');
                          }}
                          className="w-full text-left p-3 hover:bg-brand-50/60 dark:hover:bg-slate-800 transition-colors flex justify-between items-center text-xs group"
                        >
                          <div>
                            <p className="font-extrabold text-slate-900 dark:text-white group-hover:text-brand-600">
                              {cust.name}
                            </p>
                            <p className="text-slate-500 text-[11px] font-medium">+91 {cust.mobile}</p>
                          </div>
                          <span className="text-[10px] px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold group-hover:bg-brand-600 group-hover:text-white transition-all">
                            Select
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Step 2: Selected Cart Items Table */}
          <div className="glass-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-brand-500" /> Step 2: Order Items ({orderItems.length})
              </span>
              {orderItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => setOrderItems([])}
                  className="text-xs text-rose-500 font-bold hover:underline"
                >
                  Clear Cart
                </button>
              )}
            </div>

            {orderItems.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                <ShoppingBag className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                <p className="text-xs text-slate-500 font-medium">Order Cart is empty</p>
                <p className="text-[11px] text-slate-400">Click any card from the catalog on the right</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {orderItems.map((line, idx) => (
                  <div key={idx} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    {/* Item Details */}
                    <div className="flex-1 min-w-[130px]">
                      <p className="font-bold text-xs text-slate-900 dark:text-white leading-tight">
                        {line.itemName}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            line.isKgMode
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300'
                              : line.isKgPackItem
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {line.serviceName}
                        </span>
                      </div>
                    </div>

                    {/* Controls: Price, Qty/Weight Stepper, Total Subtotal, Delete */}
                    <div className="flex items-center flex-wrap gap-2">
                      {/* 1. Unit Price Input */}
                      <div className="flex items-center gap-0.5 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
                        <span className="text-slate-400 font-bold text-xs">{currencySymbol}</span>
                        <input
                          type="number"
                          min="0"
                          value={line.unitPrice}
                          onChange={(e) => updateItemPrice(idx, parseFloat(e.target.value) || 0)}
                          className="w-12 text-center font-bold text-xs bg-transparent outline-none text-slate-900 dark:text-white"
                          title="Unit Price"
                        />
                        {line.isKgMode && (
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">/Kg</span>
                        )}
                        {line.isKgPackItem && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">(Kg Pack)</span>
                        )}
                      </div>

                      {/* 2. Quantity / Weight with Steppers */}
                      <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5 border border-slate-200 dark:border-slate-700">
                        <button
                          type="button"
                          onClick={() =>
                            updateItemQty(
                              idx,
                              line.isKgMode
                                ? Math.max(0.5, Number((line.quantity - 1).toFixed(1)))
                                : line.quantity - 1
                            )
                          }
                          className="w-6 h-6 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-600 shadow-xs"
                          title="Decrease"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          step={line.isKgMode ? '0.1' : '1'}
                          min="0.1"
                          value={line.quantity}
                          onChange={(e) => updateItemQtyDirect(idx, parseFloat(e.target.value))}
                          className="w-10 text-center font-bold text-xs bg-transparent outline-none text-slate-900 dark:text-white"
                          title="Quantity or Weight in Kg"
                        />
                        {line.isKgMode && (
                          <span className="text-[10px] font-extrabold text-slate-600 dark:text-slate-300 pr-1">
                            Kg
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            updateItemQty(
                              idx,
                              line.isKgMode
                                ? Number((line.quantity + 1).toFixed(1))
                                : line.quantity + 1
                            )
                          }
                          className="w-6 h-6 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-600 shadow-xs"
                          title="Increase"
                        >
                          +
                        </button>
                      </div>

                      {/* 3. Subtotal Input */}
                      <div className="flex items-center gap-0.5 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
                        <span className="text-slate-400 font-bold text-xs">{currencySymbol}</span>
                        <input
                          type="number"
                          min="0"
                          value={line.subtotal}
                          onChange={(e) => updateItemSubtotal(idx, parseFloat(e.target.value) || 0)}
                          className="w-14 text-center font-black text-xs bg-transparent outline-none text-slate-900 dark:text-white"
                          title="Item Subtotal"
                        />
                      </div>

                      {/* 4. Delete Item */}
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors shrink-0"
                        title="Remove Item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Step 3: Payment & Summary Panel */}
          <div className="glass-card p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-500" /> Step 3: Payment Summary
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Subtotal ({orderItems.length} items)</span>
                <span className="font-bold text-slate-900 dark:text-white">{currencySymbol}{subtotal}</span>
              </div>

              {/* Discount Input */}
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-600 dark:text-slate-400">Discount ({currencySymbol})</span>
                <input
                  type="number"
                  min="0"
                  value={discount}
                  onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                  className="w-24 px-2 py-1 text-right font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                />
              </div>

              {/* GST Tax % Input (Default 0%) */}
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-600 dark:text-slate-400">GST / Tax (%)</span>
                <input
                  type="number"
                  min="0"
                  value={taxPercent}
                  onChange={(e) => setTaxPercent(Math.max(0, Number(e.target.value)))}
                  className="w-24 px-2 py-1 text-right font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-2 flex justify-between items-center text-sm font-black">
                <span className="text-slate-900 dark:text-white">Net Total Amount</span>
                <span className="text-brand-600 dark:text-brand-400 text-lg">{currencySymbol}{totalAmount}</span>
              </div>

              {/* Advance Paid */}
              <div className="flex justify-between items-center gap-2 pt-1">
                <span className="font-bold text-slate-700 dark:text-slate-300">Advance Collection ({currencySymbol})</span>
                <input
                  type="number"
                  min="0"
                  max={totalAmount}
                  value={advancePaid}
                  onChange={(e) => setAdvancePaid(Math.max(0, Number(e.target.value)))}
                  className="w-28 px-2 py-1.5 text-right font-black rounded-xl border-2 border-emerald-500 bg-emerald-50/40 text-emerald-700 dark:text-emerald-300 outline-none"
                />
              </div>

              <div className="flex justify-between items-center text-xs font-bold pt-1">
                <span className="text-slate-500">Remaining Balance</span>
                <span className={remainingBalance > 0 ? 'text-rose-500 font-extrabold' : 'text-emerald-600'}>
                  {currencySymbol}{remainingBalance}
                </span>
              </div>

              {/* Payment Method (Only displayed if advancePaid > 0) */}
              {advancePaid > 0 && (
                <div className="pt-2">
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Advance Payment Method</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['Cash', 'UPI'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setPaymentMethod(m)}
                        className={`py-2 rounded-xl text-xs font-extrabold border transition-all ${
                          paymentMethod === m
                            ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Expected Delivery Date */}
              <div className="pt-2">
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  Expected Delivery Date <span className="text-rose-500 font-black">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={expectedDeliveryDate}
                  onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                  className={`w-full px-3 py-2 text-xs rounded-xl border ${
                    !expectedDeliveryDate ? 'border-amber-400 bg-amber-50/30 dark:bg-amber-950/20' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'
                  } text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500`}
                />
              </div>

              {posError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{posError}</span>
                </div>
              )}

              {/* Submit Order Button */}
              <button
                type="button"
                disabled={isSubmitting || orderItems.length === 0 || !selectedCustomerId || !expectedDeliveryDate}
                onClick={handleSubmitOrder}
                className="w-full mt-4 py-3.5 rounded-2xl bg-gradient-to-r from-brand-600 to-cyan-600 hover:from-brand-700 hover:to-cyan-700 text-white font-black text-sm shadow-lg shadow-brand-600/30 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Creating Order & Opening Invoice...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>Create Order & Open Invoice</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Dynamic Item Catalog (lg:col-span-7) */}
        <div className="lg:col-span-7 space-y-4">
          {/* ========================================================================= */}
          {/* MODE A: BY QUANTITY (Pcs) CATALOG */}
          {/* ========================================================================= */}
          {orderMode === 'quantity' && (
            <div className="glass-card p-5 space-y-4">
              {/* 1. Main Service Categories Selector */}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-brand-500" /> Select Service Category
                </label>
                <div className="grid grid-cols-6 sm:flex sm:flex-wrap gap-1.5">
                  {mainServicesList.map((servName, idx) => {
                    const active = selectedServiceCategory === servName;
                    const isLastTwo = idx >= 9;
                    return (
                      <button
                        key={servName}
                        type="button"
                        onClick={() => setSelectedServiceCategory(servName)}
                        className={`${
                          isLastTwo ? 'col-span-3' : 'col-span-2'
                        } sm:col-span-auto px-2 sm:px-3 py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 text-center truncate ${
                          active
                            ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        {active && <Check className="w-3.5 h-3.5 shrink-0" />}
                        <span className="truncate">{servName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Target Group Tabs (Regular, Men, Women, Kids, Household, Others) */}
              <div>
                <span className="block text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                  Garment Category Groups
                </span>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {activeCatalog.map((grp) => {
                    const active = activeGroup === grp.groupName;
                    return (
                      <button
                        key={grp.groupName}
                        type="button"
                        onClick={() => {
                          setActiveGroup(grp.groupName);
                          setActiveSubCategory('All');
                        }}
                        className={`py-2 rounded-xl text-xs font-extrabold transition-all text-center ${
                          active
                            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                        }`}
                      >
                        {grp.groupName}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Sub-Category Filter Pills & Catalog Search */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none flex-1">
                    {subCategoriesList.map((sc) => (
                      <button
                        key={sc}
                        type="button"
                        onClick={() => setActiveSubCategory(sc)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors ${
                          activeSubCategory === sc
                            ? 'bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300 border border-brand-300'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        {sc}
                      </button>
                    ))}
                  </div>

                  <div className="relative w-36 sm:w-44 shrink-0">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Filter items..."
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value)}
                      className="w-full pl-8 pr-2 py-1.5 text-[11px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Garment Items Catalog Grid (CLICKING ANY CARD SELECTS ITEM!) */}
              <div className="max-h-[520px] overflow-y-auto pr-1">
                {displayItems.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    No clothing items found in selected category.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {displayItems.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleCardClick(item)}
                        className="p-3 sm:p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-brand-500 hover:border-brand-500 hover:text-white group cursor-pointer transition-all duration-150 shadow-xs active:scale-[0.98] select-none flex flex-col justify-between"
                      >
                        <div>
                          <p className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-white line-clamp-1">
                            {item.name}
                          </p>
                          <p className="text-[10px] text-slate-400 group-hover:text-brand-100">
                            {item.subCategory}
                          </p>
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          <span className="font-black text-brand-600 dark:text-brand-400 group-hover:text-white text-xs">
                            {currencySymbol}{getItemPriceForService(item, selectedServiceCategory)}
                          </span>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300 group-hover:bg-white/20 group-hover:text-white">
                            Select
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* MODE B: BY WEIGHT (Kg) CATALOG WITH HIGHLIGHTED KG SERVICES */}
          {/* ========================================================================= */}
          {orderMode === 'kg' && (
            <div className="glass-card p-5 space-y-4 border-l-4 border-l-brand-600">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Scale className="w-5 h-5 text-brand-600" />
                  <h3 className="font-black text-base text-slate-900 dark:text-white">
                    By Weight (Kg) Laundry Builder
                  </h3>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 dark:bg-brand-950 text-xs font-bold">
                  {selectedKgService.name} ({currencySymbol}{selectedKgService.ratePerKg}/Kg)
                </span>
              </div>

              {/* 1. Top Highlight Cards for the 4 Kg Services */}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                  Select Kg Service Rate Category
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {kgServicesList.map((kgServ) => {
                    const active = selectedKgService.name === kgServ.name;
                    return (
                      <div
                        key={kgServ.name}
                        onClick={() => handleSelectKgService(kgServ)}
                        className={`p-3 rounded-2xl border cursor-pointer transition-all duration-150 select-none flex flex-col justify-between ${
                          active
                            ? 'bg-brand-600 border-brand-600 text-white shadow-md shadow-brand-600/30'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-brand-400 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        <div>
                          <p className="font-bold text-xs leading-snug line-clamp-1">{kgServ.name}</p>
                          <p className={`text-[10px] mt-0.5 ${active ? 'text-brand-100' : 'text-slate-400'}`}>
                            Laundry per Kg
                          </p>
                        </div>
                        <div className="mt-2 text-right">
                          <span className={`text-sm font-black ${active ? 'text-white' : 'text-brand-600 dark:text-brand-400'}`}>
                            {currencySymbol}{kgServ.ratePerKg}.00
                          </span>
                          <span className={`text-[9px] block ${active ? 'text-brand-100' : 'text-slate-400'}`}>/ Kg</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Garment Items Selection for Selected Service */}
              <div className="pt-2 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="block text-xs font-extrabold uppercase tracking-wider text-slate-400">
                    Add Garments under {selectedKgService.name}
                  </span>
                </div>

                {/* Target Group Tabs */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {activeCatalog.map((grp) => {
                    const active = activeGroup === grp.groupName;
                    return (
                      <button
                        key={grp.groupName}
                        type="button"
                        onClick={() => {
                          setActiveGroup(grp.groupName);
                          setActiveSubCategory('All');
                        }}
                        className={`py-1.5 rounded-xl text-xs font-extrabold transition-all text-center ${
                          active
                            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                        }`}
                      >
                        {grp.groupName}
                      </button>
                    );
                  })}
                </div>

                {/* Sub-Category Pills & Search */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none flex-1">
                    {subCategoriesList.map((sc) => (
                      <button
                        key={sc}
                        type="button"
                        onClick={() => setActiveSubCategory(sc)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors ${
                          activeSubCategory === sc
                            ? 'bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300 border border-brand-300'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        {sc}
                      </button>
                    ))}
                  </div>

                  <div className="relative w-36 shrink-0">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Filter..."
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value)}
                      className="w-full pl-8 pr-2 py-1.5 text-[11px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                    />
                  </div>
                </div>

                {/* Garment Cards for Kg mode (CLICKING CARD ADDS TO CART AT SELECTED KG RATE!) */}
                <div className="max-h-[350px] overflow-y-auto pr-1">
                  {displayItems.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-xs">
                      No garments found in selected category.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {displayItems.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleCardClick(item)}
                          className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-brand-500 hover:border-brand-500 hover:text-white group cursor-pointer transition-all duration-150 shadow-xs active:scale-[0.98] select-none flex flex-col justify-between"
                        >
                          <div>
                            <p className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-white line-clamp-1">
                              {item.name}
                            </p>
                            <p className="text-[10px] text-slate-400 group-hover:text-brand-100">
                              {item.subCategory}
                            </p>
                          </div>

                          <div className="mt-2.5 flex items-center justify-between">
                            <span className="font-black text-brand-600 dark:text-brand-400 group-hover:text-white text-xs">
                              {currencySymbol}{item.price && item.price > 0 ? item.price : 15}
                            </span>
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300 group-hover:bg-white/20 group-hover:text-white">
                              Select
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Inline Create Customer Modal */}
      {showNewCustModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Register New Customer</h3>
            <form onSubmit={handleCreateInlineCustomer} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
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
                  value={newCustMobile}
                  onChange={(e) => setNewCustMobile(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowNewCustModal(false)}
                  className="flex-1 py-2 rounded-xl border text-xs font-semibold text-slate-600 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingCustomer}
                  className="flex-1 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isCreatingCustomer ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Save & Select</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Digital Receipt / Invoice Modal on Successful Creation */}
      {createdOrder && (
        <InvoiceView
          order={createdOrder}
          setting={setting}
          onClose={() => {
            setCreatedOrder(null);
            navigate('/orders');
          }}
        />
      )}
    </div>
  );
};
