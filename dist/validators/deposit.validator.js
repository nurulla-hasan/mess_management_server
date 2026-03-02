"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateDepositStatusSchema = exports.createDepositSchema = void 0;
const zod_1 = require("zod");
exports.createDepositSchema = zod_1.z.object({
    amount: zod_1.z.number().min(1, 'Amount must be greater than 0'),
    paymentMethod: zod_1.z.enum(['bkash', 'cash', 'bank_transfer', 'nagad', 'rocket', 'other']),
    date: zod_1.z.string().optional().refine((val) => !val || !isNaN(Date.parse(val)), {
        message: "Invalid date format",
    }),
    note: zod_1.z.string().optional(),
    memberId: zod_1.z.string().optional(), // Allow memberId for admin operations
});
exports.updateDepositStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(['pending', 'approved', 'rejected']),
});
