import mongoose, { Schema, Document } from 'mongoose';

export interface ILaundryItem extends Document {
  name: string;
  defaultPrice: number;
  category: string; // Clothes, Household, Dry Clean, Accessories, etc.
  servicePrices?: Record<string, number>;
  icon?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const LaundryItemSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    defaultPrice: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, trim: true, default: 'Clothes' },
    servicePrices: { type: Map, of: Number, default: {} },
    icon: { type: String, default: 'Shirt' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<ILaundryItem>('LaundryItem', LaundryItemSchema);
