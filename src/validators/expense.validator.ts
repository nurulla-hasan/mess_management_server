import { z } from 'zod';

export const createExpenseSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  buyerId: z.string().optional(),
  category: z.enum(['meat_fish', 'vegetables', 'groceries', 'utility', 'rent', 'gas', 'other']),
  items: z.string().min(1, 'Items description is required'),
  amount: z.coerce.number().positive('Amount must be positive'),
  paymentSource: z.enum(['mess_fund', 'personal']).default('mess_fund'),
  adjustment: z.coerce.number().default(0),
});

export const updateExpenseSchema = z.object({
  date: z.string().optional(),
  buyerId: z.string().optional(),
  category: z.enum(['meat_fish', 'vegetables', 'groceries', 'utility', 'rent', 'gas', 'other']).optional(),
  items: z.string().min(1).optional(),
  amount: z.coerce.number().positive().optional(),
  paymentSource: z.enum(['mess_fund', 'personal']).optional(),
  adjustment: z.coerce.number().optional(),
});

export const createDepositSchema = z.object({
  memberId: z.string().min(1, 'Member ID is required'),
  amount: z.number().positive('Amount must be positive'),
  paymentMethod: z.enum(['bkash', 'cash', 'bank_transfer', 'nagad', 'rocket']),
  date: z.string().optional(),
  note: z.string().max(500).optional(),
});
