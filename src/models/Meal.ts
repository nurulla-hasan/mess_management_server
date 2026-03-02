import mongoose, { Schema, Types } from 'mongoose';

export interface IMealEntry {
  memberId: Types.ObjectId;
  breakfast: number;
  lunch: number;
  dinner: number;
  guest: number;
}

export interface IMeal {
  date: Date;
  messId: Types.ObjectId;
  entries: IMealEntry[];
  totalMeals: number;
  addedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const mealEntrySchema = new Schema<IMealEntry>(
  {
    memberId: {
      type: Schema.Types.ObjectId,
      ref: 'Member',
      required: true,
    },
    breakfast: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    lunch: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    dinner: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    guest: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false }
);

const mealSchema = new Schema<IMeal>(
  {
    date: {
      type: Date,
      required: [true, 'Date is required'],
    },
    messId: {
      type: Schema.Types.ObjectId,
      ref: 'Mess',
      required: true,
    },
    entries: {
      type: [mealEntrySchema],
      default: [],
    },
    totalMeals: {
      type: Number,
      default: 0,
    },
    addedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for date and messId to ensure unique entry per mess per day
mealSchema.index({ date: 1, messId: 1 }, { unique: true });

// Calculate totalMeals before saving
mealSchema.pre('save', function () {
  this.totalMeals = this.entries.reduce((sum, entry) => {
    return sum + entry.breakfast + entry.lunch + entry.dinner + entry.guest;
  }, 0);
});

const Meal = mongoose.model<IMeal>('Meal', mealSchema);
export default Meal;
