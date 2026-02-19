import { z } from 'zod';

export const createMemberSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(11, 'Phone number must be at least 11 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['admin', 'member']).optional(),
  isActive: z.boolean().optional(),
});

export const updateMemberSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters').optional(),
  email: z.string().email('Invalid email address').optional(),
  phone: z.string().min(11, 'Phone number must be at least 11 characters').optional(),
  role: z.enum(['admin', 'member']).optional(),
  isActive: z.boolean().optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export const toggleMealOffSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  isOff: z.boolean(),
});
