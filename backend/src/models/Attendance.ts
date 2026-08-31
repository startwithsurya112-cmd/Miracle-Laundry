import mongoose, { Schema, Document } from 'mongoose';

export type AttendanceStatus = 'Present' | 'Half Day' | 'Absent' | 'Leave';

export interface IAttendance extends Document {
  shopId?: mongoose.Types.ObjectId;
  staff: mongoose.Types.ObjectId;
  staffName: string;
  date: Date;
  status: AttendanceStatus;
  clockIn?: string;
  clockOut?: string;
  overtimeHours: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema: Schema = new Schema(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', index: true },
    staff: { type: Schema.Types.ObjectId, ref: 'Staff', required: true },
    staffName: { type: String, required: true },
    date: { type: Date, required: true },
    status: {
      type: String,
      enum: ['Present', 'Half Day', 'Absent', 'Leave'],
      default: 'Present',
    },
    clockIn: { type: String, default: '09:00 AM' },
    clockOut: { type: String, default: '06:00 PM' },
    overtimeHours: { type: Number, default: 0 },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

AttendanceSchema.index({ shopId: 1, date: 1 });
AttendanceSchema.index({ staff: 1, date: 1 }, { unique: true });

export default mongoose.model<IAttendance>('Attendance', AttendanceSchema);
