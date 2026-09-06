import mongoose, { Schema, Document } from 'mongoose';

export interface IShop extends Document {
  name: string;
  code: string;
  region: string;
  phone: string;
  email: string;
  address: string;
  invoicePrefix: string;
  gstNumber?: string;
  gstPercentage: number;
  currencySymbol: string;
  currencyCode: string;
  upiId?: string;
  gpayNumber?: string;
  paymentQrUrl?: string;
  logoUrl?: string;
  termsAndConditions?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ShopSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    region: { type: String, required: true, trim: true, default: 'General' },
    phone: { type: String, required: true, trim: true, default: '+91 98765 43210' },
    email: { type: String, required: true, trim: true, default: 'contact@miraclelaundry.com' },
    address: { type: String, required: true, trim: true, default: '123 Sparkle Avenue' },
    invoicePrefix: { type: String, required: true, trim: true, default: 'ORD-' },
    gstNumber: { type: String, default: '' },
    gstPercentage: { type: Number, default: 0 },
    currencySymbol: { type: String, default: '₹' },
    currencyCode: { type: String, default: 'INR' },
    upiId: { type: String, default: '' },
    gpayNumber: { type: String, default: '' },
    paymentQrUrl: { type: String, default: '' },
    logoUrl: { type: String, default: '' },
    termsAndConditions: {
      type: String,
      default:
        '1. Please inspect clothes upon delivery.\n2. Clothes not collected within 30 days are subject to storage charges.\n3. Report any discrepancies within 24 hours of pickup.',
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ShopSchema.index({ region: 1 });
ShopSchema.index({ isActive: 1 });

export default mongoose.model<IShop>('Shop', ShopSchema);
