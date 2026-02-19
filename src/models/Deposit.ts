import mongoose, { Schema, Document } from 'mongoose';

export interface IDeposit extends Document {
  memberId: mongoose.Types.ObjectId;
  amount: number;
  paymentMethod: 'bkash' | 'cash' | 'bank_transfer' | 'nagad' | 'rocket';
  status: 'pending' | 'approved' | 'rejected';
  verifiedBy?: mongoose.Types.ObjectId;
  date: Date;
  note?: string;
}

const DepositSchema: Schema = new Schema(
  {
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    paymentMethod: {
      type: String,
      enum: ['bkash', 'cash', 'bank_transfer', 'nagad', 'rocket'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    date: {
      type: Date,
      default: Date.now,
    },
    note: {
      type: String,
    },
  },
  { timestamps: true }
);

export default mongoose.model<IDeposit>('Deposit', DepositSchema);
