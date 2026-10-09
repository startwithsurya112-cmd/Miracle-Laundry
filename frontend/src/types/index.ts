export type OrderStatus =
  | 'Received'
  | 'Washing'
  | 'Drying'
  | 'Ironing'
  | 'Packing'
  | 'Ready for Delivery'
  | 'Ready for Pickup'
  | 'Delivered'
  | 'Cancelled';

export type PaymentStatus = 'Paid' | 'Partially Paid' | 'Pending';
export type PaymentMethod = 'Cash' | 'UPI' | 'Card' | 'Pending';

export interface Admin {
  id: string;
  username: string;
  name: string;
  email: string;
}

export interface Customer {
  _id: string;
  name: string;
  mobile: string;
  address: string;
  email?: string;
  notes?: string;
  totalOrders: number;
  totalSpent: number;
  createdAt: string;
  updatedAt: string;
}

export interface Service {
  _id: string;
  name: string;
  price: number;
  unit: string;
  estimatedHours: number;
  description?: string;
  isActive: boolean;
  createdAt?: string;
}

export interface LaundryItem {
  _id: string;
  name: string;
  defaultPrice: number;
  category: string;
  servicePrices?: Record<string, number>;
  icon?: string;
  isActive: boolean;
  createdAt?: string;
}

export interface GarmentCategory {
  _id: string;
  name: string;
  description?: string;
  icon?: string;
  displayOrder?: number;
  itemCount?: number;
  isActive: boolean;
  createdAt?: string;
}

export interface OrderItem {
  itemId?: string;
  itemName: string;
  serviceId?: string;
  serviceName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface StatusHistory {
  status: OrderStatus;
  timestamp: string;
  note?: string;
}

export interface Order {
  _id: string;
  orderNumber: string;
  customer: Customer | string;
  customerSnapshot: {
    name: string;
    mobile: string;
    address: string;
    email?: string;
  };
  items: OrderItem[];
  status: OrderStatus;
  statusHistory: StatusHistory[];
  orderDate: string;
  expectedDeliveryDate: string;
  deliveredAt?: string;
  discount: number;
  taxPercent: number;
  taxAmount: number;
  subtotal: number;
  totalAmount: number;
  advancePaid: number;
  remainingBalance: number;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  notes?: string;
  qrCodeUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  _id: string;
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  amount: number;
  paymentMethod: 'Cash' | 'UPI' | 'Card';
  transactionId?: string;
  note?: string;
  paidAt: string;
}

export interface Setting {
  _id?: string;
  shopName: string;
  shopTagline?: string;
  logoUrl?: string;
  phone: string;
  email: string;
  address: string;
  gstNumber?: string;
  gstPercentage: number;
  currencySymbol: string;
  currencyCode: string;
  invoicePrefix: string;
  termsAndConditions?: string;
  upiId?: string;
  gpayNumber?: string;
  paymentQrUrl?: string;
}

export interface DashboardStats {
  orders: number;
  totalOrders?: number;
  paymentsReceived: number;
  activeOrders: number;
  newCustomers: number;
  overdueOrders: number;
  todayOrders?: number;
  pendingOrders?: number;
  inProgress?: number;
  readyForPickup?: number;
  deliveredOrders?: number;
  deliveredRevenue?: number;
  todayRevenue?: number;
  monthlyRevenue?: number;
  periodRevenue?: number;
  totalCustomers?: number;
}

export type ExpenseCategory = string;

export interface Expense {
  _id: string;
  voucherNumber: string;
  expenseDate: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  paymentMethod: 'Cash' | 'Bank / UPI' | 'Card';
  paidTo?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AccountsTransaction {
  id: string;
  refNumber: string;
  date: string;
  type: 'Income' | 'Expense';
  category: string;
  description: string;
  paymentMethod: string;
  amount: number;
}

export interface AccountsSummary {
  totalIncome: number;
  totalExpenses: number;
  cashBalance: number;
  bankBalance: number;
  cashIncome: number;
  cashExpenses: number;
  bankIncome: number;
  bankExpenses: number;
}

