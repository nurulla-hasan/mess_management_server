import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IExpense extends Document {
  date: Date;
  messId: Types.ObjectId;
  buyerId: Types.ObjectId;
  category: 'meat_fish' | 'vegetables' | 'groceries' | 'utility' | 'rent' | 'gas' | 'other';
  items: string;
  amount: number;
  receiptUrl?: string;
  paymentSource: 'mess_fund' | 'personal';
  adjustment: number; // Change returned
  addedBy: Types.ObjectId;
  status: 'pending' | 'approved' | 'rejected';
  verifiedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const expenseSchema = new Schema<IExpense>(
  {
    date: {
      type: Date,
      required: [true, 'Date is required'],
      default: Date.now,
    },
    messId: {
      type: Schema.Types.ObjectId,
      ref: 'Mess',
      required: true,
    },
    buyerId: {
      type: Schema.Types.ObjectId,
      ref: 'Member',
      required: [true, 'Buyer is required'],
    },
    category: {
      type: String,
      enum: ['meat_fish', 'vegetables', 'groceries', 'utility', 'rent', 'gas', 'other'],
      required: [true, 'Category is required'],
    },
    items: {
      type: String,
      required: [true, 'Items description is required'],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    receiptUrl: {
      type: String,
      default: '',
    },
    paymentSource: {
      type: String,
      enum: ['mess_fund', 'personal'],
      default: 'mess_fund',
    },
    adjustment: {
      type: Number,
      default: 0,
    },
    addedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

const Expense = mongoose.model<IExpense>('Expense', expenseSchema);
export default Expense;
