import mongoose, { Schema, Document } from 'mongoose';

export interface IService extends Document {
  shopId?: mongoose.Types.ObjectId;
  name: string;
  price: number;
  unit: string; // e.g. 'piece', 'kg', 'pair'
  estimatedHours: number;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ServiceSchema: Schema = new Schema(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', index: true, default: null },
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    unit: { type: String, default: 'piece', trim: true },
    estimatedHours: { type: Number, default: 24 },
    description: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ServiceSchema.index({ shopId: 1, isActive: 1 });

export default mongoose.model<IService>('Service', ServiceSchema);
