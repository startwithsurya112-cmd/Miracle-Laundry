import mongoose, { Schema, Document } from 'mongoose';

export interface ICustomer extends Document {
  name: string;
  mobile: string;
  address: string;
  email?: string;
  notes?: string;
  totalOrders: number;
  totalSpent: number;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, unique: true, trim: true },
    address: { type: String, required: true, trim: true },
    email: { type: String, trim: true, default: '' },
    notes: { type: String, default: '' },
    totalOrders: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
  },
  { timestamps: true }
);

CustomerSchema.index({ name: 'text', mobile: 'text' });
CustomerSchema.index({ createdAt: -1, _id: -1 });
CustomerSchema.index({ name: 1 });

export default mongoose.model<ICustomer>('Customer', CustomerSchema);
