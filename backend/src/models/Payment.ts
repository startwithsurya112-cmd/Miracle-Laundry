import mongoose, { Schema, Document } from 'mongoose';

export interface IPayment extends Document {
  orderId: mongoose.Types.ObjectId;
  orderNumber: string;
  customerId: mongoose.Types.ObjectId;
  customerName: string;
  amount: number;
  paymentMethod: 'Cash' | 'UPI' | 'Card';
  transactionId?: string;
  note?: string;
  paidAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema: Schema = new Schema(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    orderNumber: { type: String, required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    customerName: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, enum: ['Cash', 'UPI', 'Card'], required: true },
    transactionId: { type: String, default: '' },
    note: { type: String, default: '' },
    paidAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

PaymentSchema.index({ paidAt: -1 });
PaymentSchema.index({ orderId: 1 });
PaymentSchema.index({ customerId: 1 });

export default mongoose.model<IPayment>('Payment', PaymentSchema);
