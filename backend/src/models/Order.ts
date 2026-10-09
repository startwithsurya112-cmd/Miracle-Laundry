import mongoose, { Schema, Document } from 'mongoose';

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

export interface IOrderItem {
  itemId?: string;
  itemName: string;
  serviceId?: string;
  serviceName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface IStatusHistory {
  status: OrderStatus;
  timestamp: Date;
  note?: string;
}

export interface IOrder extends Document {
  orderNumber: string;
  customer: mongoose.Types.ObjectId;
  customerSnapshot: {
    name: string;
    mobile: string;
    address: string;
    email?: string;
  };
  items: IOrderItem[];
  status: OrderStatus;
  statusHistory: IStatusHistory[];
  orderDate: Date;
  expectedDeliveryDate: Date;
  deliveredAt?: Date;
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
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema({
  itemId: { type: Schema.Types.Mixed },
  itemName: { type: String, required: true },
  serviceId: { type: Schema.Types.Mixed },
  serviceName: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  subtotal: { type: Number, required: true, min: 0 },
});

const StatusHistorySchema = new Schema({
  status: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  note: { type: String, default: '' },
});

const OrderSchema: Schema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true, trim: true },
    customer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    customerSnapshot: {
      name: { type: String, required: true },
      mobile: { type: String, required: true },
      address: { type: String, required: true },
      email: { type: String, default: '' },
    },
    items: [OrderItemSchema],
    status: {
      type: String,
      enum: [
        'Received',
        'Washing',
        'Drying',
        'Ironing',
        'Packing',
        'Ready for Delivery',
        'Ready for Pickup',
        'Delivered',
        'Cancelled',
      ],
      default: 'Received',
    },
    statusHistory: [StatusHistorySchema],
    orderDate: { type: Date, default: Date.now },
    expectedDeliveryDate: { type: Date, required: true },
    deliveredAt: { type: Date },
    discount: { type: Number, default: 0 },
    taxPercent: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    subtotal: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    advancePaid: { type: Number, default: 0 },
    remainingBalance: { type: Number, default: 0 },
    paymentStatus: {
      type: String,
      enum: ['Paid', 'Partially Paid', 'Pending'],
      default: 'Pending',
    },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'UPI', 'Card', 'Pending'],
      default: 'Pending',
    },
    notes: { type: String, default: '' },
    qrCodeUrl: { type: String, default: '' },
  },
  { timestamps: true }
);

OrderSchema.index({ orderNumber: 'text', 'customerSnapshot.name': 'text', 'customerSnapshot.mobile': 'text' });
OrderSchema.index({ orderDate: -1, createdAt: -1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ paymentStatus: 1 });
OrderSchema.index({ customer: 1 });
OrderSchema.index({ expectedDeliveryDate: 1 });

export default mongoose.model<IOrder>('Order', OrderSchema);
