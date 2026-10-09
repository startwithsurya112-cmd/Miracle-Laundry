import mongoose, { Schema, Document } from 'mongoose';

export interface IGasCylinderLog extends Document {
  changeDate: Date;
  quantity: number;
  daysLasted: number;
  vendorName?: string;
  cylinderSize?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const GasCylinderLogSchema: Schema = new Schema(
  {
    changeDate: { type: Date, required: true, default: Date.now },
    quantity: { type: Number, required: true, default: 1 },
    daysLasted: { type: Number, default: 0 },
    vendorName: { type: String, default: 'LPG Gas Supplier' },
    cylinderSize: { type: String, default: '19kg Commercial' },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model<IGasCylinderLog>('GasCylinderLog', GasCylinderLogSchema);
