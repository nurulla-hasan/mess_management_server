"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPasswordSchema = exports.forgotPasswordSchema = exports.updateProfileSchema = exports.changePasswordSchema = exports.loginSchema = exports.verifyEmailSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
exports.registerSchema = zod_1.z.object({
    fullName: zod_1.z.string().min(2, 'Name must be at least 2 characters').max(100),
    email: zod_1.z.string().email('Invalid email address'),
    phone: zod_1.z.string().min(10, 'Phone must be at least 10 characters'),
    password: zod_1.z.string().min(6, 'Password must be at least 6 characters'),
    role: zod_1.z.enum(['admin', 'member']).default('member'),
});
exports.verifyEmailSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    code: zod_1.z.string().length(6, 'Verification code must be 6 digits'),
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(1, 'Password is required'),
});
exports.changePasswordSchema = zod_1.z.object({
    currentPassword: zod_1.z.string().min(1, 'Current password is required'),
    newPassword: zod_1.z.string().min(6, 'New password must be at least 6 characters'),
    confirmPassword: zod_1.z.string().min(1, 'Confirm password is required'),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
});
exports.updateProfileSchema = zod_1.z.object({
    fullName: zod_1.z.string().min(2).max(100).optional(),
    email: zod_1.z.string().email().optional(),
    phone: zod_1.z.string().min(10).optional(),
});
exports.forgotPasswordSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
});
exports.resetPasswordSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    code: zod_1.z.string().length(6, 'Reset code must be 6 digits'),
    password: zod_1.z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: zod_1.z.string().min(6, 'Confirm password must be at least 6 characters'),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
});
