import mongoose, { Schema, Document } from 'mongoose';

export type UserRole = 'super_admin' | 'branch_admin' | 'staff';

export interface IAdmin extends Document {
  username: string;
  password: string;
  email: string;
  name: string;
  phone?: string;
  role: UserRole;
  shopId?: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AdminSchema: Schema = new Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    email: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, default: '' },
    role: {
      type: String,
      enum: ['super_admin', 'branch_admin', 'staff'],
      default: 'super_admin',
    },
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

AdminSchema.index({ role: 1 });
AdminSchema.index({ shopId: 1 });

export default mongoose.model<IAdmin>('Admin', AdminSchema);

