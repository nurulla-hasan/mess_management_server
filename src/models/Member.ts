import mongoose, { Schema, Document } from 'mongoose';

export interface IMember extends Document {
  userId: mongoose.Types.ObjectId;
  messId: mongoose.Types.ObjectId;
  totalMeals: number;
  totalDeposits: number;
  currentBalance: number;
  status: 'active' | 'inactive';
  mealOffDates: Date[];
}

const MemberSchema: Schema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    messId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Mess',
      required: true,
    },
    totalMeals: {
      type: Number,
      default: 0,
    },
    totalDeposits: {
      type: Number,
      default: 0,
    },
    currentBalance: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    mealOffDates: {
      type: [Date],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IMember>('Member', MemberSchema);
