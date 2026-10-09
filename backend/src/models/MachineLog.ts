import mongoose, { Schema, Document } from 'mongoose';

export type MachineType = 'Washer Extractor' | 'Dryer';

export interface IMachineLog extends Document {
  machineType: MachineType;
  date: Date;
  programName: string; // e.g. "Heavy Stain Wash (60m)", "Normal Wash (45m)", "Quick Wash (30m)", "Dryer Standard (30m)"
  durationMinutes: number;
  cyclesCount: number;
  operatorName?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MachineLogSchema: Schema = new Schema(
  {
    machineType: {
      type: String,
      enum: ['Washer Extractor', 'Dryer'],
      required: true,
    },
    date: { type: Date, required: true, default: Date.now },
    programName: { type: String, required: true },
    durationMinutes: { type: Number, required: true, default: 30 },
    cyclesCount: { type: Number, required: true, default: 1 },
    operatorName: { type: String, default: '' },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model<IMachineLog>('MachineLog', MachineLogSchema);
