import mongoose, { Schema, Document } from 'mongoose';

export interface IGarmentCategory extends Document {
  shopId?: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  icon?: string;
  displayOrder?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const GarmentCategorySchema: Schema = new Schema(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', index: true, default: null },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    icon: { type: String, default: 'Tag' },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

GarmentCategorySchema.index({ shopId: 1, name: 1 });

export default mongoose.model<IGarmentCategory>('GarmentCategory', GarmentCategorySchema);
