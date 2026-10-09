import mongoose, { Schema, Document } from 'mongoose';

export interface IIroningWorkLog extends Document {
  staff?: mongoose.Types.ObjectId;
  staffName: string;
  tableName: string; // e.g. "Table 1", "Table 2", "Table 3"
  date: Date;
  itemName: string; // e.g. "Shirts", "Sarees", "Pants", "Suits"
  quantity: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const IroningWorkLogSchema: Schema = new Schema(
  {
    staff: { type: Schema.Types.ObjectId, ref: 'Staff' },
    staffName: { type: String, required: true },
    tableName: { type: String, required: true, default: 'Table 1' },
    date: { type: Date, required: true, default: Date.now },
    itemName: { type: String, required: true, default: 'Shirts' },
    quantity: { type: Number, required: true, min: 1 },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model<IIroningWorkLog>('IroningWorkLog', IroningWorkLogSchema);
