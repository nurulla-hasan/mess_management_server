import { z } from 'zod';

const mealEntrySchema = z.object({
  memberId: z.string().min(1, 'Member ID is required'),
  breakfast: z.number().min(0).max(5).default(0),
  lunch: z.number().min(0).max(5).default(0),
  dinner: z.number().min(0).max(5).default(0),
  guest: z.number().min(0).default(0),
});

export const createMealSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  entries: z.array(mealEntrySchema).min(1, 'At least one meal entry is required'),
});

export const updateMealSchema = z.object({
  entries: z.array(mealEntrySchema).min(1).optional(),
});
