import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IMessSettings extends Document {
  messName: string;
  mealRateCalculation: 'variable' | 'fixed';
  fixedMealRate?: number;
  defaultCurrency: string;
  ramadanMode: boolean;
  notificationReminders: boolean;
  currentMonth: number;
  currentYear: number;
  totalFundCollected: number;
  totalSpent: number;
  monthlyBudget: number;
  bazarManagerToday?: Types.ObjectId;
  messManagerId?: Types.ObjectId;
  mealOffDeadlineHour: number; // e.g., 22 for 10:00 PM
  createdAt: Date;
  updatedAt: Date;
}

const messSettingsSchema = new Schema<IMessSettings>(
  {
    messName: {
      type: String,
      default: 'Mess Manager',
      trim: true,
    },
    mealRateCalculation: {
      type: String,
      enum: ['variable', 'fixed'],
      default: 'variable',
    },
    fixedMealRate: {
      type: Number,
      default: 0,
    },
    defaultCurrency: {
      type: String,
      default: 'BDT',
    },
    ramadanMode: {
      type: Boolean,
      default: false,
    },
    notificationReminders: {
      type: Boolean,
      default: true,
    },
    currentMonth: {
      type: Number,
      default: () => new Date().getMonth() + 1,
    },
    currentYear: {
      type: Number,
      default: () => new Date().getFullYear(),
    },
    totalFundCollected: {
      type: Number,
      default: 0,
    },
    totalSpent: {
      type: Number,
      default: 0,
    },
    monthlyBudget: {
      type: Number,
      default: 0,
    },
    bazarManagerToday: {
      type: Schema.Types.ObjectId,
      ref: 'Member',
    },
    messManagerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    mealOffDeadlineHour: {
      type: Number,
      default: 22, // 10:00 PM
      min: 0,
      max: 23,
    },
  },
  {
    timestamps: true,
  }
);

const MessSettings = mongoose.model<IMessSettings>('MessSettings', messSettingsSchema);
export default MessSettings;
