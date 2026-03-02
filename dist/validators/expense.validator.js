"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDepositSchema = exports.updateExpenseSchema = exports.createExpenseSchema = void 0;
const zod_1 = require("zod");
exports.createExpenseSchema = zod_1.z.object({
    date: zod_1.z.string().min(1, 'Date is required'),
    buyerId: zod_1.z.string().optional(),
    category: zod_1.z.enum(['meat_fish', 'vegetables', 'groceries', 'utility', 'rent', 'gas', 'other']),
    items: zod_1.z.string().min(1, 'Items description is required'),
    amount: zod_1.z.coerce.number().positive('Amount must be positive'),
    paymentSource: zod_1.z.enum(['mess_fund', 'personal']).default('mess_fund'),
    adjustment: zod_1.z.coerce.number().default(0),
});
exports.updateExpenseSchema = zod_1.z.object({
    date: zod_1.z.string().optional(),
    buyerId: zod_1.z.string().optional(),
    category: zod_1.z.enum(['meat_fish', 'vegetables', 'groceries', 'utility', 'rent', 'gas', 'other']).optional(),
    items: zod_1.z.string().min(1).optional(),
    amount: zod_1.z.coerce.number().positive().optional(),
    paymentSource: zod_1.z.enum(['mess_fund', 'personal']).optional(),
    adjustment: zod_1.z.coerce.number().optional(),
});
exports.createDepositSchema = zod_1.z.object({
    memberId: zod_1.z.string().min(1, 'Member ID is required'),
    amount: zod_1.z.number().positive('Amount must be positive'),
    paymentMethod: zod_1.z.enum(['bkash', 'cash', 'bank_transfer', 'nagad', 'rocket']),
    date: zod_1.z.string().optional(),
    note: zod_1.z.string().max(500).optional(),
});
