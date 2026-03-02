"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateMealSchema = exports.createMealSchema = void 0;
const zod_1 = require("zod");
const mealEntrySchema = zod_1.z.object({
    memberId: zod_1.z.string().min(1, 'Member ID is required'),
    breakfast: zod_1.z.number().min(0).max(5).default(0),
    lunch: zod_1.z.number().min(0).max(5).default(0),
    dinner: zod_1.z.number().min(0).max(5).default(0),
    guest: zod_1.z.number().min(0).default(0),
});
exports.createMealSchema = zod_1.z.object({
    date: zod_1.z.string().min(1, 'Date is required'),
    entries: zod_1.z.array(mealEntrySchema).min(1, 'At least one meal entry is required'),
});
exports.updateMealSchema = zod_1.z.object({
    entries: zod_1.z.array(mealEntrySchema).min(1).optional(),
});
