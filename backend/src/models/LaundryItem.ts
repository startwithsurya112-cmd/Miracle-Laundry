import mongoose, { Schema, Document } from 'mongoose';

export interface ILaundryItem extends Document {
  shopId?: mongoose.Types.ObjectId;
  name: string;
  defaultPrice: number;
  category: string; // Clothes, Household, Dry Clean, Accessories, etc.
  icon?: string;
  servicePrices?: Record<string, number>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const LaundryItemSchema: Schema = new Schema(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', index: true, default: null },
    name: { type: String, required: true, trim: true },
    defaultPrice: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, trim: true, default: 'Clothes' },
    icon: { type: String, default: 'Shirt' },
    servicePrices: { type: Schema.Types.Mixed, default: {} },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

LaundryItemSchema.index({ shopId: 1, isActive: 1 });

export default mongoose.model<ILaundryItem>('LaundryItem', LaundryItemSchema);
