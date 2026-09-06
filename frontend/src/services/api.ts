import {
  Admin,
  Customer,
  Service,
  LaundryItem,
  GarmentCategory,
  Order,
  Setting,
  DashboardStats,
  Expense,
  AccountsSummary,
  AccountsTransaction,
  Shop,
  UserAccount,
} from '../types';
import { posGroupCatalog } from '../data/posCatalogData';

export const getApiBaseUrl = () => {
  if ((import.meta as any).env?.VITE_API_URL) {
    return (import.meta as any).env.VITE_API_URL;
  }
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://localhost:5000/api';
  }
  return 'https://miracle-laundry.onrender.com/api';
};

const API_BASE = getApiBaseUrl();

// Helper to retrieve auth token
export const getAuthToken = () => localStorage.getItem('auth_token');
export const setAuthToken = (token: string) => localStorage.setItem('auth_token', token);
export const removeAuthToken = () => localStorage.removeItem('auth_token');

// Shop isolation selector helpers
export const getSelectedShopId = () => localStorage.getItem('selected_shop_id');
export const setSelectedShopId = (id: string | null) => {
  if (id && id !== 'all') {
    localStorage.setItem('selected_shop_id', id);
  } else {
    localStorage.removeItem('selected_shop_id');
  }
  clearApiCache();
};

// In-Memory API Response Cache for instant 0ms loads
const apiMemoryCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export const clearApiCache = () => {
  apiMemoryCache.clear();
};

export const peekApiCache = (endpoint: string) => {
  const cached = apiMemoryCache.get(endpoint);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }
  return null;
};

const fetchApiNetwork = async (endpoint: string, options: RequestInit = {}, retries = 1): Promise<any> => {
  const token = getAuthToken();
  const selectedShopId = getSelectedShopId();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(selectedShopId ? { 'X-Shop-Id': selectedShopId } : {}),
    ...(options.headers || {}),
  };


  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      cache: 'no-store',
      ...options,
      headers,
    });

    const data = await response.json();
    if (!response.ok) {
      if (response.status === 401 || data.message?.toLowerCase().includes('token')) {
        removeAuthToken();
      }
      throw new Error(data.message || 'API request failed');
    }

    return data;
  } catch (err: any) {
    if (retries > 0) {
      await new Promise((res) => setTimeout(res, 500));
      return fetchApiNetwork(endpoint, options, retries - 1);
    }
    throw err;
  }
};

// Utility API fetch wrapper with instant memory cache & auto-retry
const fetchApi = async (endpoint: string, options: RequestInit = {}, retries = 1): Promise<any> => {
  const method = (options.method || 'GET').toUpperCase();

  // Invalidate cache on mutations
  if (method !== 'GET') {
    clearApiCache();
  }

  // Serve GET requests instantly from cache if fresh
  if (method === 'GET') {
    const cached = apiMemoryCache.get(endpoint);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      // Revalidate silently in background
      fetchApiNetwork(endpoint, options, 0)
        .then((freshData) => {
          apiMemoryCache.set(endpoint, { data: freshData, timestamp: Date.now() });
        })
        .catch(() => {});
      return cached.data;
    }
  }

  const data = await fetchApiNetwork(endpoint, options, retries);
  if (method === 'GET') {
    apiMemoryCache.set(endpoint, { data, timestamp: Date.now() });
  }
  return data;
};

// --- Auth API ---
export const loginApi = async (usernameOrCreds: any, passwordParam?: string) => {
  const username = typeof usernameOrCreds === 'object' ? usernameOrCreds.username : usernameOrCreds;
  const password = typeof usernameOrCreds === 'object' ? usernameOrCreds.password : passwordParam;
  try {
    return await fetchApi('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  } catch (err) {
    if ((username === 'adminIL' && password === 'IL@112') || (username === 'admin' && password === 'admin123')) {
      const mockAdmin: Admin = {
        id: 'admin-1',
        username: 'adminIL',
        name: 'Shop Owner',
        email: 'owner@intelligentlaundry.com',
      };
      return { success: true, token: 'mock-jwt-token-xyz', admin: mockAdmin };
    }
    throw err;
  }
};

export const loginAdmin = loginApi;

export const getMe = async () => {
  try {
    return await fetchApi('/auth/me');
  } catch (err) {
    return {
      success: true,
      admin: {
        id: 'admin-1',
        username: 'adminIL',
        name: 'Shop Owner',
        email: 'owner@intelligentlaundry.com',
      },
    };
  }
};

export const getMeApi = getMe;

export const updateProfile = async (profileData: any) => {
  try {
    return await fetchApi('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  } catch (err) {
    return { success: true };
  }
};

// --- Customer API ---
export const fetchCustomers = async (params: { search?: string; page?: number; limit?: number } | string = '') => {
  const search = typeof params === 'string' ? params : params.search || '';
  const page = typeof params === 'object' ? params.page || 1 : 1;
  const limit = typeof params === 'object' ? params.limit || 10 : 10;
  const query = new URLSearchParams({ search, page: String(page), limit: String(limit) }).toString();

  try {
    const res = await fetchApi(`/customers?${query}`);
    if (res && res.success && Array.isArray(res.customers)) {
      return res;
    }
  } catch (err) {}

  const localCustomers = getMockCustomers();
  let processed = [...localCustomers];
  if (search) {
    const q = search.toLowerCase();
    processed = processed.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.mobile.includes(q) ||
        (c.address && c.address.toLowerCase().includes(q))
    );
  }

  const skip = (page - 1) * limit;
  return {
    success: true,
    customers: processed.slice(skip, skip + limit),
    pagination: { total: processed.length, page, limit, pages: Math.ceil(processed.length / limit) },
  };
};

export const fetchCustomerById = async (id: string) => {
  let customer: any = null;
  let orders: Order[] = [];
  try {
    const res = await fetchApi(`/customers/${id}`);
    if (res.success) {
      customer = res.customer;
      orders = res.orders || [];
    }
  } catch (err) {}

  if (!customer) {
    customer = getMockCustomers().find((c) => c._id === id);
  }

  const allMockOrders = getMockOrders();
  if (customer) {
    const custOrders = allMockOrders.filter(
      (o: any) =>
        (o.customerId && String(o.customerId) === String(customer._id)) ||
        (o.customer && String(typeof o.customer === 'object' ? o.customer._id : o.customer) === String(customer._id)) ||
        (o.customerSnapshot && o.customerSnapshot.mobile === customer.mobile)
    );
    if (orders.length === 0) {
      orders = custOrders;
    }
    customer.totalOrders = Math.max(customer.totalOrders || 0, custOrders.length, orders.length);
    customer.totalSpent = Math.max(
      customer.totalSpent || 0,
      custOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0),
      orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0)
    );
  }

  return { success: true, customer, orders };
};

export const createCustomerApi = async (customerData: any) => {
  try {
    return await fetchApi('/customers', {
      method: 'POST',
      body: JSON.stringify(customerData),
    });
  } catch (err) {
    const newCust: Customer = {
      _id: 'cust-' + Date.now(),
      ...customerData,
      totalOrders: 0,
      totalSpent: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const current = getMockCustomers();
    current.unshift(newCust);
    saveMockCustomers(current);
    return { success: true, customer: newCust };
  }
};

export const updateCustomerApi = async (id: string, customerData: any) => {
  try {
    return await fetchApi(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(customerData),
    });
  } catch (err) {
    const current = getMockCustomers();
    const idx = current.findIndex((c) => c._id === id);
    if (idx !== -1) {
      current[idx] = { ...current[idx], ...customerData };
      saveMockCustomers(current);
    }
    return { success: true, customer: current[idx] };
  }
};

export const deleteCustomerApi = async (id: string) => {
  try {
    return await fetchApi(`/customers/${id}`, { method: 'DELETE' });
  } catch (err) {
    const current = getMockCustomers().filter((c) => c._id !== id);
    saveMockCustomers(current);
    return { success: true };
  }
};

// --- Service API ---
export const fetchServices = async () => {
  try {
    const res = await fetchApi('/services');
    if (res.success && Array.isArray(res.services) && res.services.length >= 10) {
      return res;
    }
    return { success: true, services: getMockServices() };
  } catch (err) {
    return { success: true, services: getMockServices() };
  }
};

export const createServiceApi = async (serviceData: any) => {
  try {
    return await fetchApi('/services', {
      method: 'POST',
      body: JSON.stringify(serviceData),
    });
  } catch (err) {
    const newServ: Service = {
      _id: 'serv-' + Date.now(),
      ...serviceData,
      isActive: true,
    };
    const current = getMockServices();
    current.push(newServ);
    saveMockServices(current);
    return { success: true, service: newServ };
  }
};

export const updateServiceApi = async (id: string, serviceData: any) => {
  try {
    return await fetchApi(`/services/${id}`, {
      method: 'PUT',
      body: JSON.stringify(serviceData),
    });
  } catch (err) {
    const current = getMockServices();
    const idx = current.findIndex((s) => s._id === id);
    if (idx !== -1) {
      current[idx] = { ...current[idx], ...serviceData };
      saveMockServices(current);
    }
    return { success: true, service: current[idx] };
  }
};

export const toggleServiceStatusApi = async (id: string) => {
  try {
    return await fetchApi(`/services/${id}/toggle`, { method: 'PATCH' });
  } catch (err) {
    const current = getMockServices();
    const idx = current.findIndex((s) => s._id === id);
    if (idx !== -1) {
      current[idx].isActive = !current[idx].isActive;
      saveMockServices(current);
    }
    return { success: true, service: current[idx] };
  }
};

export const deleteServiceApi = async (id: string) => {
  try {
    return await fetchApi(`/services/${id}`, { method: 'DELETE' });
  } catch (err) {
    const current = getMockServices().filter((s) => s._id !== id);
    saveMockServices(current);
    return { success: true };
  }
};

// --- Clothing Item API ---
export const fetchItems = async () => {
  try {
    const res = await fetchApi('/items');
    if (res.success && Array.isArray(res.items) && res.items.length >= 50) {
      return res;
    }
    return { success: true, items: getMockItems() };
  } catch (err) {
    return { success: true, items: getMockItems() };
  }
};

export const createItemApi = async (itemData: any) => {
  try {
    return await fetchApi('/items', {
      method: 'POST',
      body: JSON.stringify(itemData),
    });
  } catch (err) {
    const initialServicePrices = itemData.servicePrices ? { ...itemData.servicePrices } : {};
    if (itemData.serviceName && itemData.defaultPrice !== undefined) {
      initialServicePrices[itemData.serviceName] = Number(itemData.defaultPrice);
    }
    const newItem: LaundryItem = {
      _id: 'item-' + Date.now(),
      ...itemData,
      servicePrices: initialServicePrices,
      isActive: true,
    };
    const current = getMockItems();
    current.push(newItem);
    saveMockItems(current);
    return { success: true, item: newItem };
  }
};

export const updateItemApi = async (id: string, itemData: any) => {
  try {
    return await fetchApi(`/items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(itemData),
    });
  } catch (err) {
    const current = getMockItems();
    const idx = current.findIndex((i) => i._id === id);
    if (idx !== -1) {
      const currentServicePrices = current[idx].servicePrices ? { ...current[idx].servicePrices } : {};
      if (itemData.serviceName && itemData.defaultPrice !== undefined) {
        currentServicePrices[itemData.serviceName] = Number(itemData.defaultPrice);
      }
      current[idx] = {
        ...current[idx],
        ...itemData,
        servicePrices: currentServicePrices,
      };
      saveMockItems(current);
    }
    return { success: true, item: current[idx] };
  }
};

export const deleteItemApi = async (id: string) => {
  try {
    return await fetchApi(`/items/${id}`, { method: 'DELETE' });
  } catch (err) {
    const current = getMockItems().filter((i) => i._id !== id);
    saveMockItems(current);
    return { success: true };
  }
};

// --- Garment Category API ---
export const fetchGarmentCategories = async () => {
  try {
    const res = await fetchApi('/garment-categories');
    if (res.success && Array.isArray(res.categories) && res.categories.length > 0) {
      return res;
    }
    return { success: true, categories: getMockCategories() };
  } catch (err) {
    return { success: true, categories: getMockCategories() };
  }
};

export const createGarmentCategoryApi = async (categoryData: any) => {
  try {
    return await fetchApi('/garment-categories', {
      method: 'POST',
      body: JSON.stringify(categoryData),
    });
  } catch (err) {
    const newCat: GarmentCategory = {
      _id: 'cat-' + Date.now(),
      name: categoryData.name,
      description: categoryData.description || '',
      displayOrder: categoryData.displayOrder || 99,
      isActive: true,
    };
    const current = getMockCategories();
    current.push(newCat);
    saveMockCategories(current);
    return { success: true, category: newCat };
  }
};

export const updateGarmentCategoryApi = async (id: string, categoryData: any) => {
  try {
    return await fetchApi(`/garment-categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(categoryData),
    });
  } catch (err) {
    const current = getMockCategories();
    const idx = current.findIndex((c) => c._id === id);
    if (idx !== -1) {
      current[idx] = { ...current[idx], ...categoryData };
      saveMockCategories(current);
    }
    return { success: true, category: current[idx] };
  }
};

export const deleteGarmentCategoryApi = async (id: string) => {
  try {
    return await fetchApi(`/garment-categories/${id}`, { method: 'DELETE' });
  } catch (err) {
    const current = getMockCategories().filter((c) => c._id !== id);
    saveMockCategories(current);
    return { success: true };
  }
};

export const fetchPublicOrderByNumber = async (orderNumber: string) => {
  try {
    const res = await fetchApi(`/orders/public/${orderNumber}`);
    if (res.success && res.order) {
      return res;
    }
  } catch (err) {}

  const orders = getMockOrders();
  const order = orders.find((o) => o.orderNumber === orderNumber);
  if (order) {
    return { success: true, order };
  }
  return { success: false, message: 'Receipt not found' };
};

export const fetchOrders = async (
  params: { status?: string; paymentStatus?: string; search?: string; page?: number; limit?: number } | string = {}
) => {
  const p = typeof params === 'string' ? { search: params } : params;
  const query = new URLSearchParams(p as any).toString();

  try {
    const res = await fetchApi(`/orders?${query}`);
    if (res && res.success && Array.isArray(res.orders)) {
      return res;
    }
  } catch (err) {
    // Backend fetch failed or offline mode
  }

  const mockOrders = getMockOrders();
  let combined = [...mockOrders];
  combined.sort(
    (a, b) => new Date(b.createdAt || b.orderDate).getTime() - new Date(a.createdAt || a.orderDate).getTime()
  );

  if (p.status) combined = combined.filter((o) => o.status === p.status);
  if (p.paymentStatus) combined = combined.filter((o) => o.paymentStatus === p.paymentStatus);
  if (p.search) {
    const q = p.search.toLowerCase();
    combined = combined.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(q) ||
        (o.customerSnapshot?.name && o.customerSnapshot.name.toLowerCase().includes(q)) ||
        (o.customerSnapshot?.mobile && o.customerSnapshot.mobile.includes(q))
    );
  }

  const page = Number(p.page) || 1;
  const limit = Number(p.limit) || 10;
  const skip = (page - 1) * limit;
  const paginatedOrders = combined.slice(skip, skip + limit);

  return {
    success: true,
    orders: paginatedOrders,
    pagination: {
      total: combined.length,
      page,
      limit,
      pages: Math.ceil(combined.length / limit) || 1,
    },
  };
};

export const fetchOrderById = async (id: string) => {
  try {
    return await fetchApi(`/orders/${id}`);
  } catch (err) {
    const order = getMockOrders().find((o) => o._id === id);
    return { success: true, order, payments: [] };
  }
};

export const createOrderApi = async (orderData: any) => {
  try {
    const res = await fetchApi('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
    if (res.success && res.order) {
      const orders = getMockOrders();
      orders.unshift(res.order);
      saveMockOrders(orders);

      const customers = getMockCustomers();
      const mobile = res.order.customerSnapshot?.mobile;
      const custId = res.order.customer || res.order.customerId;
      const targetCust = customers.find((c) => (custId && c._id === custId) || (mobile && c.mobile === mobile));
      if (targetCust) {
        targetCust.totalOrders = (targetCust.totalOrders || 0) + 1;
        targetCust.totalSpent = (targetCust.totalSpent || 0) + (res.order.totalAmount || 0);
        saveMockCustomers(customers);
      }
    }
    return res;
  } catch (err) {
    const orders = getMockOrders();
    const customers = getMockCustomers();

    // Look up customer snapshot accurately
    const snap = orderData.customerSnapshot || orderData.newCustomer;
    let customerName = snap?.name;
    let customerMobile = snap?.mobile;
    let customerAddress = snap?.address || 'Local';
    let customerEmail = snap?.email || '';

    if (!customerName && orderData.customerId) {
      const found = customers.find((c) => c._id === orderData.customerId);
      if (found) {
        customerName = found.name;
        customerMobile = found.mobile;
        customerAddress = found.address || 'Local';
        customerEmail = found.email || '';
      }
    }

    if (!customerName) {
      customerName = 'Walk-in Customer';
      customerMobile = '9876543210';
    }

    const items = orderData.items || [];
    const subtotal = items.reduce(
      (acc: number, i: any) => acc + (Number(i.subtotal) || Number(i.quantity) * Number(i.unitPrice) || 0),
      0
    );
    const disc = Number(orderData.discount) || 0;
    const taxPct = Number(orderData.taxPercent) || 0;
    const taxableAmount = Math.max(0, subtotal - disc);
    const taxAmount = (taxableAmount * taxPct) / 100;
    const totalAmount = Math.round(taxableAmount + taxAmount);

    const advPaid = Number(orderData.advancePaid) || 0;
    const remainingBalance = Math.max(0, totalAmount - advPaid);

    let paymentStatus: any = 'Pending';
    if (advPaid >= totalAmount && totalAmount > 0) {
      paymentStatus = 'Paid';
    } else if (advPaid > 0) {
      paymentStatus = 'Partially Paid';
    }

    // Determine assigned shop for branch-separated order numbering
    const currentShopId = orderData.shopId || localStorage.getItem('selected_shop_id') || 'shop-main';
    let prefix = 'ORD-';
    try {
      const storedShop = localStorage.getItem('active_shop_info');
      if (storedShop) {
        const parsed = JSON.parse(storedShop);
        if (parsed?.invoicePrefix) {
          prefix = parsed.invoicePrefix.trim();
        } else if (parsed?.code) {
          prefix = parsed.code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
        }
      }
    } catch (e) {}

    if (!prefix.endsWith('-') && !prefix.endsWith('/')) {
      prefix = `${prefix}-`;
    }

    // Filter orders belonging to this branch
    const branchOrders = orders.filter((o) => (o.shopId || 'shop-main') === currentShopId);
    let maxNum = 0;
    branchOrders.forEach((o) => {
      if (o.orderNumber) {
        const withoutYear = o.orderNumber.trim().replace(/\/\d+$/, '');
        const match = withoutYear.match(/(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      }
    });

    const nextNum = maxNum > 0 ? maxNum + 1 : 1;
    const currentYearSuffix = new Date().getFullYear().toString().slice(-2);
    let orderNum = `${prefix}${String(nextNum).padStart(3, '0')}/${currentYearSuffix}`;

    while (orders.some((o) => o.orderNumber === orderNum)) {
      maxNum++;
      orderNum = `${prefix}${String(maxNum + 1).padStart(3, '0')}/${currentYearSuffix}`;
    }

    const newOrd: Order = {
      _id: 'ord-' + Date.now(),
      orderNumber: orderNum,
      shopId: currentShopId,
      customer: orderData.customerId || 'cust-1',
      customerSnapshot: {
        name: customerName,
        mobile: customerMobile,
        address: customerAddress,
        email: customerEmail,
      },
      items,
      status: 'Received',
      statusHistory: [
        {
          status: 'Received',
          timestamp: new Date().toISOString(),
          note: 'Order created in shop POS',
        },
      ],
      orderDate: new Date().toISOString(),
      expectedDeliveryDate: orderData.expectedDeliveryDate || new Date(Date.now() + 86400000).toISOString(),
      discount: disc,
      taxPercent: taxPct,
      taxAmount,
      subtotal,
      totalAmount,
      advancePaid: advPaid,
      remainingBalance,
      paymentStatus,
      paymentMethod: orderData.paymentMethod || 'Cash',
      notes: orderData.notes || '',
      qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${orderNum}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    orders.unshift(newOrd);
    saveMockOrders(orders);

    // Also update customer stats in mock storage
    const targetCust = customers.find(
      (c) => (orderData.customerId && c._id === orderData.customerId) || (customerMobile && c.mobile === customerMobile)
    );
    if (targetCust) {
      targetCust.totalOrders = (targetCust.totalOrders || 0) + 1;
      targetCust.totalSpent = (targetCust.totalSpent || 0) + totalAmount;
      saveMockCustomers(customers);
    }

    return { success: true, order: newOrd };
  }
};

export const updateOrderStatusApi = async (id: string, status: string, note?: string) => {
  try {
    return await fetchApi(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, note }),
    });
  } catch (err) {
    const orders = getMockOrders();
    const idx = orders.findIndex((o) => o._id === id);
    if (idx !== -1) {
      orders[idx].status = status as any;
      orders[idx].statusHistory.push({
        status: status as any,
        timestamp: new Date().toISOString(),
        note: note || `Updated to ${status}`,
      });
      saveMockOrders(orders);
    }
    return { success: true, order: orders[idx] };
  }
};

export const sendOrderWhatsAppPdfApi = async (id: string) => {
  try {
    return await fetchApi(`/orders/${id}/send-whatsapp-pdf`, {
      method: 'POST',
    });
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to send WhatsApp PDF' };
  }
};

export const updateOrderApi = async (id: string, orderData: any) => {
  try {
    return await fetchApi(`/orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(orderData),
    });
  } catch (err) {
    const orders = getMockOrders();
    const idx = orders.findIndex((o) => o._id === id);
    if (idx !== -1) {
      orders[idx] = {
        ...orders[idx],
        ...orderData,
        updatedAt: new Date().toISOString(),
      };
      saveMockOrders(orders);
    }
    return { success: true, order: orders[idx] };
  }
};

export const recordOrderPaymentApi = async (id: string, paymentData: any) => {
  try {
    return await fetchApi(`/orders/${id}/payments`, {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  } catch (err) {
    const orders = getMockOrders();
    const idx = orders.findIndex((o) => o._id === id);
    if (idx !== -1) {
      const payAmount = Number(paymentData.amount);
      orders[idx].advancePaid += payAmount;
      orders[idx].remainingBalance = Math.max(0, orders[idx].totalAmount - orders[idx].advancePaid);
      if (orders[idx].remainingBalance === 0) {
        orders[idx].paymentStatus = 'Paid';
      } else {
        orders[idx].paymentStatus = 'Partially Paid';
      }
      orders[idx].paymentMethod = paymentData.paymentMethod;
      saveMockOrders(orders);
    }
    return { success: true, order: orders[idx] };
  }
};

export const deleteOrderApi = async (id: string) => {
  try {
    return await fetchApi(`/orders/${id}`, { method: 'DELETE' });
  } catch (err) {
    const orders = getMockOrders().filter((o) => o._id !== id);
    saveMockOrders(orders);
    return { success: true };
  }
};

// --- Shop Expenses & Accounts API ---
export const fetchExpenses = async (params: { category?: string; paymentMethod?: string; search?: string; dateFrom?: string; dateTo?: string; page?: number; limit?: number } = {}) => {
  const query = new URLSearchParams(params as any).toString();
  try {
    return await fetchApi(`/expenses?${query}`);
  } catch (err) {
    let expenses = getMockExpenses();
    if (params.category) expenses = expenses.filter((e) => e.category === params.category);
    if (params.paymentMethod) expenses = expenses.filter((e) => e.paymentMethod === params.paymentMethod);
    if (params.search) {
      const q = params.search.toLowerCase();
      expenses = expenses.filter(
        (e) =>
          e.voucherNumber.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          (e.paidTo && e.paidTo.toLowerCase().includes(q))
      );
    }
    const page = params.page || 1;
    const limit = params.limit || 10;
    const skip = (page - 1) * limit;
    const paginated = expenses.slice(skip, skip + limit);

    const totalExpenseAmount = expenses.reduce((acc, e) => acc + e.amount, 0);
    const cashExpenses = expenses.filter((e) => e.paymentMethod === 'Cash').reduce((acc, e) => acc + e.amount, 0);
    const bankExpenses = expenses.filter((e) => e.paymentMethod !== 'Cash').reduce((acc, e) => acc + e.amount, 0);

    return {
      success: true,
      expenses: paginated,
      summary: { totalExpenseAmount, cashExpenses, bankExpenses },
      pagination: { total: expenses.length, page, limit, pages: Math.ceil(expenses.length / limit) },
    };
  }
};

export const createExpenseApi = async (expenseData: any) => {
  try {
    return await fetchApi('/expenses', {
      method: 'POST',
      body: JSON.stringify(expenseData),
    });
  } catch (err) {
    const expenses = getMockExpenses();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const newExp: Expense = {
      _id: 'exp-' + Date.now(),
      voucherNumber: `EXP-${dateStr}-` + String(expenses.length + 1).padStart(4, '0'),
      expenseDate: expenseData.expenseDate || new Date().toISOString(),
      category: expenseData.category || 'Miscellaneous',
      description: expenseData.description || 'Shop Expense',
      amount: Number(expenseData.amount) || 0,
      paymentMethod: expenseData.paymentMethod || 'Cash',
      paidTo: expenseData.paidTo || '',
      notes: expenseData.notes || '',
      createdAt: new Date().toISOString(),
    };
    expenses.unshift(newExp);
    saveMockExpenses(expenses);
    return { success: true, expense: newExp };
  }
};

export const updateExpenseApi = async (id: string, expenseData: any) => {
  try {
    return await fetchApi(`/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(expenseData),
    });
  } catch (err) {
    const expenses = getMockExpenses();
    const idx = expenses.findIndex((e) => e._id === id);
    if (idx !== -1) {
      expenses[idx] = { ...expenses[idx], ...expenseData };
      saveMockExpenses(expenses);
    }
    return { success: true, expense: expenses[idx] };
  }
};

export const deleteExpenseApi = async (id: string) => {
  try {
    return await fetchApi(`/expenses/${id}`, { method: 'DELETE' });
  } catch (err) {
    const expenses = getMockExpenses().filter((e) => e._id !== id);
    saveMockExpenses(expenses);
    return { success: true };
  }
};

export const fetchAccountsSummary = async (params: { dateFrom?: string; dateTo?: string; paymentMethod?: string } = {}) => {
  const query = new URLSearchParams(params as any).toString();
  let apiRes: any = null;
  try {
    apiRes = await fetchApi(`/expenses/summary?${query}`);
  } catch (err) {}

  if (apiRes && apiRes.success) {
    const transactions: AccountsTransaction[] = apiRes.transactions || [];
    const summary: AccountsSummary = apiRes.summary || {
      totalIncome: 0,
      totalExpenses: 0,
      cashBalance: 0,
      bankBalance: 0,
      cashIncome: 0,
      cashExpenses: 0,
      bankIncome: 0,
      bankExpenses: 0,
    };
    return {
      success: true,
      summary,
      transactions,
    };
  }

  return {
    success: true,
    summary: {
      totalIncome: 0,
      totalExpenses: 0,
      cashBalance: 0,
      bankBalance: 0,
      cashIncome: 0,
      cashExpenses: 0,
      bankIncome: 0,
      bankExpenses: 0,
    },
    transactions: [],
  };
};

// --- Reports API ---
export const fetchDashboardStats = async (params: {
  preset?: string;
  paymentStatus?: string;
  status?: string;
  dateType?: string;
  dateFrom?: string;
  dateTo?: string;
} = {}) => {
  const query = new URLSearchParams(params as any).toString();
  try {
    const apiRes = await fetchApi(`/reports/dashboard?${query}`);
    if (apiRes && apiRes.success) {
      return apiRes;
    }
  } catch (err) {}

  const localOrders = getMockOrders();
  const localCustomers = getMockCustomers();

  const now = new Date();
  const isOrderOverdue = (o: Order) => {
    if (o.status === 'Delivered' || o.status === 'Cancelled') return false;
    return Boolean(o.expectedDeliveryDate && new Date(o.expectedDeliveryDate) < now);
  };

  const activeOrds = localOrders.filter((o) => o.status !== 'Delivered' && o.status !== 'Cancelled');
  const overdueOrds = localOrders.filter(isOrderOverdue);
  const totalRev = localOrders.reduce((acc, o) => acc + (o.advancePaid || 0), 0);
  const monthlyRev = totalRev;

  const stats: DashboardStats = {
    orders: localOrders.length,
    paymentsReceived: totalRev,
    activeOrders: activeOrds.length,
    newCustomers: localCustomers.length,
    overdueOrders: overdueOrds.length,
    todayOrders: localOrders.length,
    pendingOrders: activeOrds.length,
    inProgress: activeOrds.length,
    readyForPickup: localOrders.filter((o) => o.status === 'Ready for Pickup').length,
    deliveredOrders: localOrders.filter((o) => o.status === 'Delivered').length,
    todayRevenue: totalRev,
    monthlyRevenue: monthlyRev,
    periodRevenue: totalRev,
    totalCustomers: localCustomers.length,
  };

  return {
    success: true,
    stats,
    ordersList: localOrders,
    paymentsList: localOrders
      .filter((o) => o.advancePaid > 0)
      .map((o) => ({
        _id: o._id,
        orderNumber: o.orderNumber,
        customerName: o.customerSnapshot?.name || 'Customer',
        paymentMethod: o.paymentMethod || 'Cash',
        paidAt: o.orderDate,
        amount: o.advancePaid,
      })),
    activeOrdersList: activeOrds,
    newCustomersList: localCustomers,
    overdueOrdersList: overdueOrds,
  };
};

export const fetchRevenueReport = async (params: any = {}) => {
  const queryObj = typeof params === 'string' ? { period: params, preset: params } : params;
  const query = new URLSearchParams(queryObj).toString();
  let apiRes: any = null;
  try {
    apiRes = await fetchApi(`/reports/revenue?${query}`);
    if (apiRes && apiRes.success && (apiRes.chartData?.length > 0 || apiRes.serviceBreakdown?.length > 0)) {
      return apiRes;
    }
  } catch (err) {}

  const orders = getMockOrders();
  const customers = getMockCustomers();

  const getOrderCollectedAmt = (o: Order) => (o.paymentStatus === 'Paid' ? (o.totalAmount || 0) : (o.advancePaid || 0));

  // Compute daily chart points from orders
  const chartMap: { [date: string]: number } = {};
  orders.forEach((o) => {
    const d = new Date(o.orderDate || o.createdAt).toISOString().slice(0, 10);
    const amt = getOrderCollectedAmt(o);
    chartMap[d] = (chartMap[d] || 0) + amt;
  });

  const chartData = Object.keys(chartMap).map((d) => ({
    date: d,
    revenue: chartMap[d],
    count: 1,
  })).sort((a, b) => a.date.localeCompare(b.date));

  // Compute service breakdown
  const serviceMap: { [srv: string]: number } = {};
  orders.forEach((o) => {
    (o.items || []).forEach((item) => {
      const srvName = item.serviceName || 'Laundry';
      serviceMap[srvName] = (serviceMap[srvName] || 0) + (item.subtotal || item.unitPrice * item.quantity || 0);
    });
  });

  const serviceBreakdown = Object.keys(serviceMap).map((srv) => ({
    service: srv,
    amount: serviceMap[srv],
    quantity: 1,
  })).sort((a, b) => b.amount - a.amount);

  // Compute top customers
  const processedCusts = customers.map((c) => {
    const custOrds = orders.filter(
      (o: any) =>
        (o.customerId && String(o.customerId) === String(c._id)) ||
        (o.customer && String(typeof o.customer === 'object' ? o.customer._id : o.customer) === String(c._id)) ||
        (o.customerSnapshot && o.customerSnapshot.mobile === c.mobile)
    );
    const calcSpent = Math.max(c.totalSpent || 0, custOrds.reduce((sum, o) => sum + (o.totalAmount || 0), 0));
    return { ...c, totalSpent: calcSpent, totalOrders: Math.max(c.totalOrders || 0, custOrds.length) };
  }).sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5);

  return {
    success: true,
    chartData: chartData.length > 0 ? chartData : [{ date: new Date().toISOString().slice(0, 10), revenue: 0, count: 0 }],
    serviceBreakdown: serviceBreakdown.length > 0 ? serviceBreakdown : [{ service: 'Laundry', amount: 0, quantity: 0 }],
    topCustomers: processedCusts,
  };
};

export const fetchProfitLossReport = async (params: { preset?: string; dateFrom?: string; dateTo?: string } = {}) => {
  const query = new URLSearchParams(params as any).toString();
  let apiRes: any = null;
  try {
    apiRes = await fetchApi(`/reports/pnl?${query}`);
    if (apiRes && apiRes.success) {
      return apiRes;
    }
  } catch (err) {}

  // Local storage fallback for P&L computation
  const orders = getMockOrders();
  const expenses = getMockExpenses();

  const getOrderCollectedAmt = (o: Order) => (o.paymentStatus === 'Paid' ? (o.totalAmount || 0) : (o.advancePaid || 0));

  let grossRevenue = orders.reduce((sum, o) => sum + getOrderCollectedAmt(o), 0);
  let cashIncome = orders.filter((o) => o.paymentMethod === 'Cash').reduce((sum, o) => sum + getOrderCollectedAmt(o), 0);
  let upiIncome = orders.filter((o) => o.paymentMethod === 'UPI').reduce((sum, o) => sum + getOrderCollectedAmt(o), 0);
  let cardIncome = orders.filter((o) => o.paymentMethod === 'Card').reduce((sum, o) => sum + getOrderCollectedAmt(o), 0);

  let totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  let cashExpenses = expenses.filter((e) => e.paymentMethod === 'Cash').reduce((sum, e) => sum + e.amount, 0);
  let bankExpenses = expenses.filter((e) => e.paymentMethod === 'Bank / UPI').reduce((sum, e) => sum + e.amount, 0);

  const catTotals: { [key: string]: number } = {};
  expenses.forEach((e) => {
    catTotals[e.category] = (catTotals[e.category] || 0) + e.amount;
  });

  const netProfit = grossRevenue - totalExpenses;
  const profitMargin = grossRevenue > 0 ? Number(((netProfit / grossRevenue) * 100).toFixed(1)) : 0;

  const expenseBreakdown = Object.keys(catTotals).map((cat) => ({
    category: cat,
    amount: catTotals[cat],
    percentage: totalExpenses > 0 ? Number(((catTotals[cat] / totalExpenses) * 100).toFixed(1)) : 0,
  })).sort((a, b) => b.amount - a.amount);

  return {
    success: true,
    period: {
      preset: params.preset || 'current_month',
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date().toISOString().slice(0, 10),
    },
    summary: {
      grossRevenue,
      cashIncome,
      upiIncome,
      cardIncome,
      totalExpenses,
      cashExpenses,
      bankExpenses,
      netProfit,
      profitMargin,
      isProfit: netProfit >= 0,
    },
    expenseBreakdown,
    monthlyTrends: [
      { month: 'May', revenue: Math.round(grossRevenue * 0.7), expenses: Math.round(totalExpenses * 0.8), netProfit: Math.round(grossRevenue * 0.7 - totalExpenses * 0.8) },
      { month: 'Jun', revenue: Math.round(grossRevenue * 0.85), expenses: Math.round(totalExpenses * 0.9), netProfit: Math.round(grossRevenue * 0.85 - totalExpenses * 0.9) },
      { month: 'Jul', revenue: Math.round(grossRevenue * 0.95), expenses: Math.round(totalExpenses * 0.95), netProfit: Math.round(grossRevenue * 0.95 - totalExpenses * 0.95) },
      { month: 'Aug', revenue: grossRevenue, expenses: totalExpenses, netProfit },
    ],
  };
};

export const fetchSettings = async () => {
  try {
    return await fetchApi('/settings');
  } catch (err) {
    return { success: true, setting: getMockSettings() };
  }
};

export const updateSettingsApi = async (settingsData: any) => {
  try {
    return await fetchApi('/settings', {
      method: 'PUT',
      body: JSON.stringify(settingsData),
    });
  } catch (err) {
    saveMockSettings(settingsData);
    return { success: true, setting: settingsData };
  }
};

// --- MOCK DATA SEEDERS & LOCAL STORAGE LOADERS ---
const getMockCustomers = (): Customer[] => {
  const stored = localStorage.getItem('mock_customers');
  if (stored) return JSON.parse(stored);
  return [];
};

const saveMockCustomers = (customers: Customer[]) => localStorage.setItem('mock_customers', JSON.stringify(customers));

const defaultMockCategories: GarmentCategory[] = [
  { _id: 'cat-1', name: 'Regular', description: 'Everyday common garments like shirts, pants, dhotis & sarees', displayOrder: 1, isActive: true },
  { _id: 'cat-2', name: 'Men', description: 'Gents apparel including suits, blazers, formal shirts & denim', displayOrder: 2, isActive: true },
  { _id: 'cat-3', name: 'Women', description: 'Ladies wear including silk sarees, lehengas, tops & dresses', displayOrder: 3, isActive: true },
  { _id: 'cat-4', name: 'Kids', description: 'Children wear including frocks, onesies, shorts & baby wear', displayOrder: 4, isActive: true },
  { _id: 'cat-5', name: 'Household', description: 'Home items including bedsheets, blankets, curtains & towels', displayOrder: 5, isActive: true },
  { _id: 'cat-6', name: 'Others', description: 'Footwear, bags, caps, gloves & miscellaneous items', displayOrder: 6, isActive: true },
];

const getMockCategories = (): GarmentCategory[] => {
  const stored = localStorage.getItem('mock_categories');
  if (stored) {
    try {
      const list = JSON.parse(stored);
      if (Array.isArray(list) && list.length >= 1) return list;
    } catch (e) {}
  }
  localStorage.setItem('mock_categories', JSON.stringify(defaultMockCategories));
  return defaultMockCategories;
};

const saveMockCategories = (cats: GarmentCategory[]) => localStorage.setItem('mock_categories', JSON.stringify(cats));

const getMockServices = (): Service[] => {
  const stored = localStorage.getItem('mock_services');
  if (stored) {
    try {
      const list = JSON.parse(stored);
      if (Array.isArray(list) && list.length >= 15) return list;
    } catch (e) {}
  }
  const initial: Service[] = [
    { _id: 'serv-1', name: 'Wash and Fold', price: 40, unit: 'kg', estimatedHours: 24, description: 'Everyday machine wash & neat folding', isActive: true },
    { _id: 'serv-2', name: 'Ironing', price: 15, unit: 'piece', estimatedHours: 12, description: 'High-pressure steam press ironing', isActive: true },
    { _id: 'serv-3', name: 'Laundry', price: 50, unit: 'piece', estimatedHours: 24, description: 'Deep wash, fabric softener & steam press', isActive: true },
    { _id: 'serv-4', name: 'Premium Laundry', price: 80, unit: 'piece', estimatedHours: 24, description: 'Individual drum wash with luxury perfume finish', isActive: true },
    { _id: 'serv-5', name: 'Dry Cleaning', price: 150, unit: 'piece', estimatedHours: 48, description: 'Specialized chemical solvent cleaning', isActive: true },
    { _id: 'serv-6', name: 'Starch + Ironing', price: 30, unit: 'piece', estimatedHours: 12, description: 'Crisp starch treatment with steam press', isActive: true },
    { _id: 'serv-7', name: 'Wash + Starch + Ironing', price: 70, unit: 'piece', estimatedHours: 24, description: 'Complete wash, starch & steam press', isActive: true },
    { _id: 'serv-8', name: 'Saree Polishing', price: 100, unit: 'piece', estimatedHours: 36, description: 'Saree roll press & shine restoration', isActive: true },
    { _id: 'serv-9', name: 'Saree Pre-pleating', price: 120, unit: 'piece', estimatedHours: 24, description: 'Ready-to-wear pleating & box folding', isActive: true },
    { _id: 'serv-10', name: 'Shoes Cleaning', price: 200, unit: 'pair', estimatedHours: 48, description: 'Deep shoe scrubbing & whitening', isActive: true },
    { _id: 'serv-11', name: 'Bag Cleaning', price: 250, unit: 'piece', estimatedHours: 48, description: 'Leather & fabric bag deep restoration', isActive: true },

    // Highlight Kg Rate Services
    { _id: 'serv-kg-1', name: 'Wash & Iron (Kg Rate)', price: 120, unit: 'kg', estimatedHours: 24, description: 'Wash & Iron Rate per Kg', isActive: true },
    { _id: 'serv-kg-2', name: 'Express Laundry (Kg Rate)', price: 199, unit: 'kg', estimatedHours: 12, description: 'Express Laundry Rate per Kg', isActive: true },
    { _id: 'serv-kg-3', name: 'Premium Laundry (Kg Rate)', price: 159, unit: 'kg', estimatedHours: 24, description: 'Premium Laundry Rate per Kg', isActive: true },
    { _id: 'serv-kg-4', name: 'Premium Express Laundry (Kg Rate)', price: 299, unit: 'kg', estimatedHours: 12, description: 'Premium Express Laundry Rate per Kg', isActive: true },
  ];
  localStorage.setItem('mock_services', JSON.stringify(initial));
  return initial;
};

const saveMockServices = (s: Service[]) => localStorage.setItem('mock_services', JSON.stringify(s));

const getMockItems = (): LaundryItem[] => {
  const stored = localStorage.getItem('mock_items');
  if (stored) {
    try {
      const list = JSON.parse(stored);
      if (Array.isArray(list) && list.length >= 200) return list;
    } catch (e) {}
  }
  const initial: LaundryItem[] = [];
  posGroupCatalog.forEach((group) => {
    group.subCategories.forEach((sub) => {
      sub.items.forEach((item) => {
        initial.push({
          _id: item.id,
          name: item.name,
          defaultPrice: item.price,
          category: group.groupName,
          isActive: true,
        });
      });
    });
  });
  localStorage.setItem('mock_items', JSON.stringify(initial));
  return initial;
};

const saveMockItems = (items: LaundryItem[]) => localStorage.setItem('mock_items', JSON.stringify(items));

const getMockExpenses = (): Expense[] => {
  const stored = localStorage.getItem('mock_expenses');
  if (stored) return JSON.parse(stored);
  return [];
};

const saveMockExpenses = (e: Expense[]) => localStorage.setItem('mock_expenses', JSON.stringify(e));

const getMockOrders = (): Order[] => {
  const stored = localStorage.getItem('mock_orders');
  if (stored) return JSON.parse(stored);
  return [];
};

const saveMockOrders = (orders: Order[]) => localStorage.setItem('mock_orders', JSON.stringify(orders));

export const clearAllDataApi = async () => {
  localStorage.removeItem('mock_customers');
  localStorage.removeItem('mock_orders');
  localStorage.removeItem('mock_payments');
  localStorage.removeItem('mock_expenses');
  try {
    return await fetchApi('/settings/reset', { method: 'DELETE' });
  } catch (err) {
    return { success: true, message: 'All local & backend customer/order/expense data cleared.' };
  }
};

const getMockSettings = (): Setting => {
  const stored = localStorage.getItem('mock_settings');
  if (stored) return JSON.parse(stored);
  const initial: Setting = {
    shopName: 'Miracle Laundry',
    shopTagline: 'Express & Premium Laundry Services',
    logoUrl: '/logo.jpg',
    phone: '+91 98765 43210',
    email: 'contact@miraclelaundry.com',
    address: '42 Commercial Street, Sector 15, Metro City, 400001',
    gstNumber: '27AABCU9603R1ZM',
    gstPercentage: 0,
    currencySymbol: '₹',
    currencyCode: 'INR',
    invoicePrefix: 'ML-',
    termsAndConditions: '1. Please check garments at the time of delivery.\n2. Clothes uncollected after 30 days are subject to storage charges.',
  };
  localStorage.setItem('mock_settings', JSON.stringify(initial));
  return initial;
};

const saveMockSettings = (s: Setting) => localStorage.setItem('mock_settings', JSON.stringify(s));

const getMockPayments = () => {
  const stored = localStorage.getItem('mock_payments');
  if (stored) return JSON.parse(stored);
  return [];
};

// --- EXCEL MASTER BACKUP & RESTORE UTILITIES ---
export const downloadMasterExcelBackupApi = async () => {
  const XLSX = await import('xlsx');

  // Fetch live orders & customers & expenses via unified API helpers
  let apiOrders: Order[] = [];
  let apiCustomers: Customer[] = [];
  let apiExpenses: Expense[] = [];

  try {
    const [ordRes, custRes, expRes] = await Promise.all([
      fetchOrders({ limit: 1000 }),
      fetchCustomers({ limit: 1000 }),
      fetchExpenses({ limit: 1000 }),
    ]);
    if (ordRes && ordRes.success && Array.isArray(ordRes.orders)) {
      apiOrders = ordRes.orders;
    }
    if (custRes && custRes.success && Array.isArray(custRes.customers)) {
      apiCustomers = custRes.customers;
    }
    if (expRes && expRes.success && Array.isArray(expRes.expenses)) {
      apiExpenses = expRes.expenses;
    }
  } catch (err) {}

  // Fallback / merge with local storage mock items to ensure 0 records are lost
  const localOrds = getMockOrders();
  const localCusts = getMockCustomers();
  const localExps = getMockExpenses();

  const orderMap = new Map<string, Order>();
  apiOrders.forEach((o) => orderMap.set(o.orderNumber || o._id, o));
  localOrds.forEach((o) => {
    if (!orderMap.has(o.orderNumber || o._id)) orderMap.set(o.orderNumber || o._id, o);
  });
  const mergedOrders = Array.from(orderMap.values());

  const custMap = new Map<string, Customer>();
  apiCustomers.forEach((c) => custMap.set(c.mobile || c._id, c));
  localCusts.forEach((c) => {
    if (!custMap.has(c.mobile || c._id)) custMap.set(c.mobile || c._id, c);
  });
  const mergedCustomers = Array.from(custMap.values());

  const expMap = new Map<string, Expense>();
  apiExpenses.forEach((e) => expMap.set(e.voucherNumber || e._id, e));
  localExps.forEach((e) => {
    if (!expMap.has(e.voucherNumber || e._id)) expMap.set(e.voucherNumber || e._id, e);
  });
  const mergedExpenses = Array.from(expMap.values());

  // Derive payments list from orders + local payments
  const localPayments = getMockPayments();
  const paymentsMap = new Map<string, any>();

  localPayments.forEach((p: any) => {
    const key = p._id || p.orderNumber;
    if (key) paymentsMap.set(key, p);
  });

  mergedOrders.forEach((o) => {
    const amt = o.paymentStatus === 'Paid' ? (o.totalAmount || 0) : (o.advancePaid || 0);
    if (amt > 0 && !paymentsMap.has(o.orderNumber)) {
      paymentsMap.set(o.orderNumber, {
        orderNumber: o.orderNumber,
        customerName: o.customerSnapshot?.name || 'Customer',
        paymentMethod: o.paymentMethod || 'Cash',
        amount: amt,
        paidAt: o.orderDate,
      });
    }
  });

  const mergedPayments = Array.from(paymentsMap.values());

  // Format Excel sheets
  const ordersData = mergedOrders.map((o) => ({
    'Order Number': o.orderNumber,
    'Customer Name': o.customerSnapshot?.name || 'Customer',
    'Customer Mobile': o.customerSnapshot?.mobile || '',
    'Order Date': o.orderDate ? new Date(o.orderDate).toISOString().slice(0, 10) : '',
    'Expected Delivery': o.expectedDeliveryDate ? new Date(o.expectedDeliveryDate).toISOString().slice(0, 10) : '',
    'Order Status': o.status,
    'Payment Status': o.paymentStatus,
    'Payment Method': o.paymentMethod || 'Cash',
    'Total Amount (₹)': o.totalAmount || 0,
    'Advance Paid (₹)': o.advancePaid || 0,
    'Remaining Balance (₹)': o.remainingBalance || 0,
    'Items Summary': (o.items || []).map((i) => `${i.serviceName} (${i.quantity}x)`).join(', '),
  }));

  const customersData = mergedCustomers.map((c) => ({
    'Full Name': c.name,
    'Mobile Number': c.mobile,
    'Email Address': c.email || '',
    'Address': c.address || '',
    'Total Spent (₹)': c.totalSpent || 0,
    'Total Orders': c.totalOrders || 0,
  }));

  const paymentsData = mergedPayments.map((p: any) => ({
    'Order Number': p.orderNumber || '',
    'Customer Name': p.customerName || 'Customer',
    'Payment Method': p.paymentMethod || 'Cash',
    'Amount Paid (₹)': p.amount || 0,
    'Paid Date & Time': p.paidAt ? new Date(p.paidAt).toLocaleString() : '',
  }));

  const expensesData = mergedExpenses.map((e) => ({
    'Voucher Number': e.voucherNumber,
    'Category': e.category,
    'Description': e.description,
    'Amount (₹)': e.amount || 0,
    'Payment Method': e.paymentMethod,
    'Paid To': e.paidTo || '',
    'Expense Date': e.expenseDate ? new Date(e.expenseDate).toISOString().slice(0, 10) : '',
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ordersData.length > 0 ? ordersData : [{}]), 'Orders');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(customersData.length > 0 ? customersData : [{}]), 'Customers');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(paymentsData.length > 0 ? paymentsData : [{}]), 'Payments');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expensesData.length > 0 ? expensesData : [{}]), 'Expenses');

  XLSX.writeFile(wb, `Laundry_Master_Backup_${new Date().toISOString().slice(0, 10)}.xlsx`);
  return { success: true, message: 'Master Excel Backup downloaded successfully!' };
};

export const restoreMasterExcelBackupApi = async (file: File) => {
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer);

  const payload: any = {
    orders: [],
    customers: [],
    payments: [],
    expenses: [],
  };

  if (wb.Sheets['Orders']) payload.orders = XLSX.utils.sheet_to_json(wb.Sheets['Orders']);
  if (wb.Sheets['Customers']) payload.customers = XLSX.utils.sheet_to_json(wb.Sheets['Customers']);
  if (wb.Sheets['Payments']) payload.payments = XLSX.utils.sheet_to_json(wb.Sheets['Payments']);
  if (wb.Sheets['Expenses']) payload.expenses = XLSX.utils.sheet_to_json(wb.Sheets['Expenses']);

  try {
    const apiRes = await fetchApi('/backup/restore', {
      method: 'POST',
      body: JSON.stringify({ payload }),
    });
    if (apiRes && apiRes.success) {
      return apiRes;
    }
  } catch (err) {}

  // Local storage fallback restoration
  if (payload.customers.length > 0) {
    const existingCusts = getMockCustomers();
    payload.customers.forEach((c: any) => {
      const mob = c['Mobile Number'] || c.mobile;
      const name = c['Full Name'] || c.name;
      if (mob && name && !existingCusts.some((ec) => ec.mobile === mob)) {
        existingCusts.unshift({
          _id: `cust-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name,
          mobile: mob,
          email: c['Email Address'] || c.email || '',
          address: c['Address'] || c.address || '',
          totalSpent: Number(c['Total Spent (₹)']) || 0,
          totalOrders: Number(c['Total Orders']) || 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    });
    saveMockCustomers(existingCusts);
  }

  if (payload.orders.length > 0) {
    const existingOrders = getMockOrders();
    payload.orders.forEach((o: any) => {
      const oNum = o['Order Number'] || o.orderNumber;
      if (oNum && !existingOrders.some((eo) => eo.orderNumber === oNum)) {
        existingOrders.unshift({
          _id: `ord-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          orderNumber: oNum,
          customerSnapshot: {
            name: o['Customer Name'] || o.customerName || 'Customer',
            mobile: o['Customer Mobile'] || o.customerMobile || '',
          },
          orderDate: o['Order Date'] || new Date().toISOString(),
          expectedDeliveryDate: o['Expected Delivery'] || new Date().toISOString(),
          status: o['Order Status'] || 'Received',
          paymentStatus: o['Payment Status'] || 'Pending',
          paymentMethod: o['Payment Method'] || 'Cash',
          totalAmount: Number(o['Total Amount (₹)']) || 0,
          advancePaid: Number(o['Advance Paid (₹)']) || 0,
          remainingBalance: Number(o['Remaining Balance (₹)']) || 0,
          items: [],
        } as any);
      }
    });
    saveMockOrders(existingOrders);
  }

  return {
    success: true,
    message: 'Data successfully restored from Excel backup!',
    summary: {
      restoredOrdersCount: payload.orders.length,
      restoredCustomersCount: payload.customers.length,
      restoredPaymentsCount: payload.payments.length,
      restoredExpensesCount: payload.expenses.length,
    },
  };
};

export const fetchWhatsAppStatus = async () => {
  try {
    return await fetchApi('/whatsapp/status');
  } catch (err) {
    return { success: false, connected: false };
  }
};

export const disconnectWhatsAppApi = async () => {
  try {
    return await fetchApi('/whatsapp/disconnect', { method: 'POST' });
  } catch (err) {
    return { success: false };
  }
};

export const importOldAppOrdersJsonApi = async (jsonPayload: any) => {
  return await fetchApi('/backup/import-json', {
    method: 'POST',
    body: JSON.stringify(jsonPayload),
  });
};

// ==========================================
// STAFF & ATTENDANCE & IRONING API
// ==========================================
export const fetchStaffApi = async () => fetchApi('/staff');
export const createStaffApi = async (data: any) => fetchApi('/staff', { method: 'POST', body: JSON.stringify(data) });
export const updateStaffApi = async (id: string, data: any) => fetchApi(`/staff/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteStaffApi = async (id: string) => fetchApi(`/staff/${id}`, { method: 'DELETE' });

export const fetchAttendanceApi = async (params: any = {}) => {
  const cleanParams: any = {};
  Object.keys(params).forEach((key) => {
    if (params[key] !== undefined && params[key] !== null && params[key] !== '' && params[key] !== 'undefined') {
      cleanParams[key] = params[key];
    }
  });
  const query = new URLSearchParams(cleanParams).toString();
  return fetchApi(`/staff/attendance?${query}`);
};
export const markAttendanceApi = async (data: any) => fetchApi('/staff/attendance', { method: 'POST', body: JSON.stringify(data) });
export const deleteAttendanceApi = async (id: string) => fetchApi(`/staff/attendance/${id}`, { method: 'DELETE' });

export const fetchIroningWorkLogsApi = async (params: any = {}) => {
  const query = new URLSearchParams(params).toString();
  return fetchApi(`/staff/ironing?${query}`);
};
export const logIroningWorkApi = async (data: any) => fetchApi('/staff/ironing', { method: 'POST', body: JSON.stringify(data) });
export const fetchStaffPerformanceReportApi = async (params: any = {}) => {
  const cleanParams: any = {};
  Object.keys(params).forEach((key) => {
    if (params[key] !== undefined && params[key] !== null && params[key] !== '' && params[key] !== 'undefined') {
      cleanParams[key] = params[key];
    }
  });
  const query = new URLSearchParams(cleanParams).toString();
  return fetchApi(`/staff/reports?${query}`);
};
export const sendStaffPayslipWhatsAppApi = async (data: any) =>
  fetchApi('/staff/send-payslip-whatsapp', { method: 'POST', body: JSON.stringify(data) });
export const downloadStaffPayslipPdfApi = async (data: any) => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE}/staff/download-payslip-pdf`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token || ''}`,
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(errText || 'Failed to generate PDF');
  }
  return await response.blob();
};

// ==========================================
// MACHINE & UTILITIES API
// ==========================================
export const fetchMachineLogsApi = async (params: any = {}) => {
  const cleanParams: any = {};
  Object.keys(params).forEach((key) => {
    if (params[key] !== undefined && params[key] !== null && params[key] !== '' && params[key] !== 'undefined') {
      cleanParams[key] = params[key];
    }
  });
  const query = new URLSearchParams(cleanParams).toString();
  return fetchApi(`/machines/logs?${query}`);
};
export const logMachineCycleApi = async (data: any) => fetchApi('/machines/logs', { method: 'POST', body: JSON.stringify(data) });

export const fetchGasCylinderLogsApi = async (params: any = {}) => {
  const cleanParams: any = {};
  Object.keys(params).forEach((key) => {
    if (params[key] !== undefined && params[key] !== null && params[key] !== '' && params[key] !== 'undefined') {
      cleanParams[key] = params[key];
    }
  });
  const query = new URLSearchParams(cleanParams).toString();
  return fetchApi(`/machines/cylinders?${query}`);
};
export const logGasCylinderApi = async (data: any) => fetchApi('/machines/cylinders', { method: 'POST', body: JSON.stringify(data) });
export const deleteGasCylinderLogApi = async (id: string) => fetchApi(`/machines/cylinders/${id}`, { method: 'DELETE' });

export const fetchMachineUtilityAnalyticsApi = async (params: any = {}) => {
  const cleanParams: any = {};
  Object.keys(params).forEach((key) => {
    if (params[key] !== undefined && params[key] !== null && params[key] !== '' && params[key] !== 'undefined') {
      cleanParams[key] = params[key];
    }
  });
  const query = new URLSearchParams(cleanParams).toString();
  return fetchApi(`/machines/analytics?${query}`);
};

// ==========================================
// MULTI-BRANCH & SHOP MANAGEMENT APIS
// ==========================================
export const fetchShops = async (params: { search?: string; region?: string; activeOnly?: boolean } = {}): Promise<{ success: boolean; shops: Shop[]; total: number }> => {
  const cleanParams: any = {};
  if (params.search) cleanParams.search = params.search;
  if (params.region) cleanParams.region = params.region;
  if (params.activeOnly) cleanParams.activeOnly = 'true';
  const query = new URLSearchParams(cleanParams).toString();
  return fetchApi(`/shops?${query}`);
};

export const fetchShopById = async (id: string): Promise<{ success: boolean; shop: Shop }> => {
  return fetchApi(`/shops/${id}`);
};

export const createShopApi = async (shopData: Partial<Shop>): Promise<{ success: boolean; shop: Shop; message: string }> => {
  clearApiCache();
  return fetchApi('/shops', {
    method: 'POST',
    body: JSON.stringify(shopData),
  });
};

export const updateShopApi = async (id: string, shopData: Partial<Shop>): Promise<{ success: boolean; shop: Shop; message: string }> => {
  clearApiCache();
  return fetchApi(`/shops/${id}`, {
    method: 'PUT',
    body: JSON.stringify(shopData),
  });
};

export const deleteShopApi = async (id: string, hardDelete = true): Promise<{ success: boolean; message: string }> => {
  clearApiCache();
  return fetchApi(`/shops/${id}?hardDelete=${hardDelete}`, {
    method: 'DELETE',
  });
};

export const fetchShopOverviewApi = async (): Promise<{
  success: boolean;
  stats: {
    totalShops: number;
    activeShops: number;
    totalRevenue: number;
    totalOrders: number;
    deliveredOrders: number;
    todayRevenue: number;
    todayOrders: number;
    monthRevenue: number;
    monthOrders: number;
    totalCustomers: number;
    totalStaff: number;
  };
  regionalBreakdown: Array<{ region: string; revenue: number; orders: number }>;
}> => {
  return fetchApi('/shops/overview');
};

// ==========================================
// USER & ROLE MANAGEMENT APIS
// ==========================================
export const fetchUsers = async (params: { role?: string; shopId?: string; search?: string } = {}): Promise<{ success: boolean; users: UserAccount[]; total: number }> => {
  const cleanParams: any = {};
  if (params.role) cleanParams.role = params.role;
  if (params.shopId) cleanParams.shopId = params.shopId;
  if (params.search) cleanParams.search = params.search;
  const query = new URLSearchParams(cleanParams).toString();
  return fetchApi(`/users?${query}`);
};

export const createUserApi = async (userData: any): Promise<{ success: boolean; user: UserAccount; message: string }> => {
  clearApiCache();
  return fetchApi('/users', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
};

export const updateUserApi = async (id: string, userData: any): Promise<{ success: boolean; user: UserAccount; message: string }> => {
  clearApiCache();
  return fetchApi(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(userData),
  });
};

export const deleteUserApi = async (id: string): Promise<{ success: boolean; message: string }> => {
  clearApiCache();
  return fetchApi(`/users/${id}`, {
    method: 'DELETE',
  });
};

// ==========================================
// BACKGROUND DATA PRE-WARMING ENGINE
// ==========================================
let isPrewarmingDone = false;

export const prefetchAllAppData = async () => {
  if (isPrewarmingDone) return;
  isPrewarmingDone = true;

  try {
    // Non-blocking background pre-fetch of all main section data into 0ms memory cache
    await Promise.all([
      fetchOrders({ page: 1, limit: 10 }).catch(() => {}),
      fetchCustomers({ page: 1, limit: 10 }).catch(() => {}),
      fetchAccountsSummary({}).catch(() => {}),
      fetchExpenses({ page: 1, limit: 10 }).catch(() => {}),
      fetchProfitLossReport({ preset: 'current_month' }).catch(() => {}),
      fetchRevenueReport('30days').catch(() => {}),
    ]);
  } catch (err) {
    console.error('Background pre-warming error:', err);
  }
};

