import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IDeposit extends Document {
  memberId: Types.ObjectId;
  amount: number;
  paymentMethod: 'bkash' | 'cash' | 'bank_transfer' | 'nagad' | 'rocket';
  status: 'verified' | 'pending' | 'rejected';
  verifiedBy?: Types.ObjectId;
  date: Date;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const depositSchema = new Schema<IDeposit>(
  {
    memberId: {
      type: Schema.Types.ObjectId,
      ref: 'Member',
      required: [true, 'Member ID is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    paymentMethod: {
      type: String,
      enum: ['bkash', 'cash', 'bank_transfer', 'nagad', 'rocket'],
      required: [true, 'Payment method is required'],
    },
    status: {
      type: String,
      enum: ['verified', 'pending', 'rejected'],
      default: 'pending',
    },
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
      default: Date.now,
    },
    note: {
      type: String,
      trim: true,
      maxlength: [500, 'Note cannot exceed 500 characters'],
    },
  },
  {
    timestamps: true,
  }
);

const Deposit = mongoose.model<IDeposit>('Deposit', depositSchema);
export default Deposit;
