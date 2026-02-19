import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IMember extends Document {
  userId: Types.ObjectId;
  totalMeals: number;
  totalDeposits: number;
  currentBalance: number;
  status: 'active' | 'inactive';
  mealOffDates: Date[]; // Dates when member has opted out of meals
  createdAt: Date;
  updatedAt: Date;
}

const memberSchema = new Schema<IMember>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
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

const Member = mongoose.model<IMember>('Member', memberSchema);
export default Member;
