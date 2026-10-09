import mongoose, { Schema, Document } from 'mongoose';

export interface IStaff extends Document {
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

export default mongoose.model<IStaff>('Staff', StaffSchema);
