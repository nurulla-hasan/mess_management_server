"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleMealOffSchema = exports.updateMemberSchema = exports.createMemberSchema = void 0;
const zod_1 = require("zod");
exports.createMemberSchema = zod_1.z.object({
    fullName: zod_1.z.string().min(2, 'Name must be at least 2 characters'),
    email: zod_1.z.string().email('Invalid email address'),
    phone: zod_1.z.string().min(11, 'Phone number must be at least 11 characters'),
    password: zod_1.z.string().min(6, 'Password must be at least 6 characters'),
    role: zod_1.z.enum(['admin', 'member']).optional(),
    isActive: zod_1.z.boolean().optional(),
});
exports.updateMemberSchema = zod_1.z.object({
    fullName: zod_1.z.string().min(2, 'Name must be at least 2 characters').optional(),
    email: zod_1.z.string().email('Invalid email address').optional(),
    phone: zod_1.z.string().min(11, 'Phone number must be at least 11 characters').optional(),
    role: zod_1.z.enum(['admin', 'member']).optional(),
    isActive: zod_1.z.boolean().optional(),
    status: zod_1.z.enum(['active', 'inactive']).optional(),
});
exports.toggleMealOffSchema = zod_1.z.object({
    date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
    isOff: zod_1.z.boolean(),
});
