import { z } from 'zod';

export const createDepositSchema = z.object({
  amount: z.number().min(1, 'Amount must be greater than 0'),
  paymentMethod: z.enum(['bkash', 'cash', 'bank_transfer', 'nagad', 'rocket', 'other']),
  date: z.string().optional().refine((val) => !val || !isNaN(Date.parse(val)), {
    message: "Invalid date format",
  }),
  note: z.string().optional(),
  memberId: z.string().optional(), // Allow memberId for admin operations
});

export const updateDepositStatusSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']),
});
