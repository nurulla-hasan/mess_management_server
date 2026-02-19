import { z } from 'zod';

export const addMemberSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone must be at least 10 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['admin', 'member']).default('member'),
  joinDate: z.string().optional(),
});

export const updateMemberSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(10).optional(),
  role: z.enum(['admin', 'member']).optional(),
  isActive: z.boolean().optional(),
  joinDate: z.string().optional(),
});

export const mealOffSchema = z.object({
  date: z.string().min(1, 'Date is required'), // ISO date string
});
