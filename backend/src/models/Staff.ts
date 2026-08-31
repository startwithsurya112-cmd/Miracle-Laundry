import mongoose, { Schema, Document } from 'mongoose';

export interface IStaff extends Document {
  shopId?: mongoose.Types.ObjectId;
  name: string;
  mobile: string;
  role: string;
  assignedTable: string;
  dailyWage: number;
  status: 'Active' | 'Inactive';
  removeDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const StaffSchema: Schema = new Schema(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', index: true },
    name: { type: String, required: true },
    mobile: { type: String, default: '' },
    role: { type: String, default: 'Ironing Staff' },
    assignedTable: { type: String, default: '' },
    dailyWage: { type: Number, default: 0 },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    removeDate: { type: Date },
  },
  { timestamps: true }
);

StaffSchema.index({ shopId: 1, status: 1 });

export default mongoose.model<IStaff>('Staff', StaffSchema);
