import mongoose, { Schema, Document } from 'mongoose';

export type ExpenseCategory =
  | 'Electricity Bill'
  | 'Labour & Salaries'
  | 'Detergents & Solvents'
  | 'Machinery & Maintenance'
  | 'Shop Rent'
  | 'Transport & Fuel'
  | 'Tea & Refreshments'
  | 'Miscellaneous';

export interface IExpense extends Document {
  voucherNumber: string;
  expenseDate: Date;
  category: ExpenseCategory;
  description: string;
  amount: number;
  paymentMethod: 'Cash' | 'Bank / UPI' | 'Card';
  paidTo?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema: Schema = new Schema(
  {
    voucherNumber: { type: String, required: true },
    expenseDate: { type: Date, required: true, default: Date.now },
    category: {
      type: String,
      required: true,
      default: 'Miscellaneous',
    },
    description: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'Bank / UPI', 'Card'],
      default: 'Cash',
    },
    paidTo: { type: String, default: '' },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model<IExpense>('Expense', ExpenseSchema);
