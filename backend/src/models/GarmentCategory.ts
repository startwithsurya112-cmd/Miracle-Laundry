import mongoose, { Schema, Document } from 'mongoose';

export interface IGarmentCategory extends Document {
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
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: '' },
    icon: { type: String, default: 'Tag' },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<IGarmentCategory>('GarmentCategory', GarmentCategorySchema);
