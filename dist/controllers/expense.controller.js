"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExpenseStats = exports.deleteExpense = exports.updateExpense = exports.getExpenses = exports.updateExpenseStatus = exports.createExpense = void 0;
const Expense_1 = __importDefault(require("../models/Expense"));
const MessSettings_1 = __importDefault(require("../models/MessSettings"));
const helpers_1 = require("../utils/helpers");
const cloudinary_1 = require("../utils/cloudinary");
// @desc    Create a new expense
// @route   POST /api/expenses
const createExpense = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const { date, buyerId, category, items, amount, paymentSource, adjustment } = req.body;
        let receiptUrl = '';
        // Handle file upload if present
        if (req.file) {
            const result = yield (0, cloudinary_1.uploadToCloudinary)(req.file.buffer, 'mess_receipts');
            receiptUrl = result.url;
        }
        // Determine status based on role
        const status = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) === 'admin' ? 'approved' : 'pending';
        const verifiedBy = ((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) === 'admin' ? req.user._id : undefined;
        // Handle buyerId: if not provided and user is member, use their memberId
        let finalBuyerId = buyerId;
        if (!finalBuyerId) {
            if (((_c = req.user) === null || _c === void 0 ? void 0 : _c.role) === 'member') {
                const Member = (yield Promise.resolve().then(() => __importStar(require('../models/Member')))).default;
                const member = yield Member.findOne({ userId: req.user._id });
                if (member) {
                    finalBuyerId = member._id;
                }
                else {
                    // Fallback or error if member profile not found? 
                    // Usually member profile exists if they are logged in as member
                }
            }
        }
        if (!finalBuyerId) {
            (0, helpers_1.sendError)(res, 'Buyer ID is required', 400);
            return;
        }
        const expense = yield Expense_1.default.create({
            date: new Date(date),
            buyerId: finalBuyerId,
            category,
            items,
            amount,
            receiptUrl,
            paymentSource: paymentSource || 'mess_fund',
            adjustment: adjustment || 0,
            addedBy: (_d = req.user) === null || _d === void 0 ? void 0 : _d._id,
            status,
            verifiedBy,
        });
        // Update mess settings total spent ONLY if approved
        if (status === 'approved') {
            yield MessSettings_1.default.findOneAndUpdate({}, { $inc: { totalSpent: amount - (adjustment || 0) } });
        }
        const populatedExpense = yield Expense_1.default.findById(expense._id)
            .populate({
            path: 'buyerId',
            populate: { path: 'userId', select: 'fullName profilePicture' },
        })
            .populate('addedBy', 'fullName');
        const message = status === 'approved' ? 'Expense added successfully' : 'Expense request submitted for approval';
        (0, helpers_1.sendSuccess)(res, populatedExpense, message, 201);
    }
    catch (error) {
        (0, helpers_1.sendError)(res, error.message);
    }
});
exports.createExpense = createExpense;
// @desc    Update expense status (Admin)
// @route   PUT /api/expenses/:id/status
const updateExpenseStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { status } = req.body;
        const expenseId = req.params.id;
        const adminId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const expense = yield Expense_1.default.findById(expenseId);
        if (!expense) {
            (0, helpers_1.sendError)(res, 'Expense not found', 404);
            return;
        }
        const oldStatus = expense.status;
        // If status is same, do nothing
        if (oldStatus === status) {
            (0, helpers_1.sendSuccess)(res, { expense }, 'Status unchanged');
            return;
        }
        // Handle status change
        if (status === 'approved' && oldStatus !== 'approved') {
            // Add to total spent
            yield MessSettings_1.default.findOneAndUpdate({}, { $inc: { totalSpent: expense.amount - (expense.adjustment || 0) } });
            expense.verifiedBy = adminId;
        }
        else if (oldStatus === 'approved' && status !== 'approved') {
            // Remove from total spent if un-approving
            yield MessSettings_1.default.findOneAndUpdate({}, { $inc: { totalSpent: -(expense.amount - (expense.adjustment || 0)) } });
            if (status === 'rejected') {
                expense.verifiedBy = adminId;
            }
            else {
                expense.verifiedBy = undefined;
            }
        }
        expense.status = status;
        yield expense.save();
        (0, helpers_1.sendSuccess)(res, { expense }, 'Expense status updated successfully');
    }
    catch (error) {
        (0, helpers_1.sendError)(res, error.message);
    }
});
exports.updateExpenseStatus = updateExpenseStatus;
// @desc    Get expenses (paginated, filterable)
// @route   GET /api/expenses
const getExpenses = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { page, limit, skip } = (0, helpers_1.getPagination)(req.query);
        const category = req.query.category;
        const month = parseInt(req.query.month);
        const year = parseInt(req.query.year);
        const search = req.query.search;
        const buyerId = req.query.buyerId;
        const filter = {};
        if (category)
            filter.category = category;
        if (buyerId)
            filter.buyerId = buyerId;
        // Allow filtering by status
        const status = req.query.status;
        if (status)
            filter.status = status;
        if (month && year) {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0, 23, 59, 59);
            filter.date = { $gte: startDate, $lte: endDate };
        }
        if (search) {
            filter.items = { $regex: search, $options: 'i' };
        }
        const total = yield Expense_1.default.countDocuments(filter);
        const expenses = yield Expense_1.default.find(filter)
            .populate({
            path: 'buyerId',
            populate: { path: 'userId', select: 'fullName profilePicture' },
        })
            .populate('addedBy', 'fullName')
            .sort({ date: -1 })
            .skip(skip)
            .limit(limit);
        (0, helpers_1.sendPaginated)(res, expenses, total, page, limit, 'Expenses fetched');
    }
    catch (error) {
        (0, helpers_1.sendError)(res, error.message);
    }
});
exports.getExpenses = getExpenses;
// @desc    Update an expense
// @route   PUT /api/expenses/:id
const updateExpense = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const expense = yield Expense_1.default.findById(req.params.id);
        if (!expense) {
            (0, helpers_1.sendError)(res, 'Expense not found', 404);
            return;
        }
        const oldAmount = expense.amount - expense.adjustment;
        const updates = {};
        const fields = ['date', 'buyerId', 'category', 'items', 'amount', 'paymentSource', 'adjustment'];
        fields.forEach((field) => {
            if (req.body[field] !== undefined) {
                updates[field] = field === 'date' ? new Date(req.body[field]) : req.body[field];
            }
        });
        // Handle receipt upload
        if (req.file) {
            const result = yield (0, cloudinary_1.uploadToCloudinary)(req.file.buffer, 'mess_receipts');
            updates.receiptUrl = result.url;
        }
        const updatedExpense = yield Expense_1.default.findByIdAndUpdate(req.params.id, updates, {
            new: true,
            runValidators: true,
        })
            .populate({
            path: 'buyerId',
            populate: { path: 'userId', select: 'fullName profilePicture' },
        })
            .populate('addedBy', 'fullName');
        // Adjust mess settings totalSpent
        if (updatedExpense && updatedExpense.status === 'approved') {
            const newAmount = updatedExpense.amount - (updatedExpense.adjustment || 0);
            const diff = newAmount - oldAmount;
            if (diff !== 0) {
                yield MessSettings_1.default.findOneAndUpdate({}, { $inc: { totalSpent: diff } });
            }
        }
        (0, helpers_1.sendSuccess)(res, updatedExpense, 'Expense updated');
    }
    catch (error) {
        (0, helpers_1.sendError)(res, error.message);
    }
});
exports.updateExpense = updateExpense;
// @desc    Delete an expense
// @route   DELETE /api/expenses/:id
const deleteExpense = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const expense = yield Expense_1.default.findById(req.params.id);
        if (!expense) {
            (0, helpers_1.sendError)(res, 'Expense not found', 404);
            return;
        }
        // Adjust mess settings totalSpent
        if (expense.status === 'approved') {
            const netAmount = expense.amount - (expense.adjustment || 0);
            yield MessSettings_1.default.findOneAndUpdate({}, { $inc: { totalSpent: -netAmount } });
        }
        yield Expense_1.default.findByIdAndDelete(req.params.id);
        (0, helpers_1.sendSuccess)(res, null, 'Expense deleted');
    }
    catch (error) {
        (0, helpers_1.sendError)(res, error.message);
    }
});
exports.deleteExpense = deleteExpense;
// @desc    Get expense stats
// @route   GET /api/expenses/stats
const getExpenseStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const month = parseInt(req.query.month) || new Date().getMonth() + 1;
        const year = parseInt(req.query.year) || new Date().getFullYear();
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);
        const expenses = yield Expense_1.default.find({
            date: { $gte: startDate, $lte: endDate },
            status: 'approved',
        });
        const totalExpense = expenses.reduce((sum, e) => sum + e.amount - (e.adjustment || 0), 0);
        // Category breakdown
        const categoryBreakdown = {};
        expenses.forEach((e) => {
            categoryBreakdown[e.category] = (categoryBreakdown[e.category] || 0) + e.amount - e.adjustment;
        });
        // Get budget from settings
        const settings = yield MessSettings_1.default.findOne();
        const remainingBudget = ((settings === null || settings === void 0 ? void 0 : settings.monthlyBudget) || 0) - totalExpense;
        (0, helpers_1.sendSuccess)(res, {
            totalExpense,
            remainingBudget,
            monthlyBudget: (settings === null || settings === void 0 ? void 0 : settings.monthlyBudget) || 0,
            categoryBreakdown,
            totalEntries: expenses.length,
        });
    }
    catch (error) {
        (0, helpers_1.sendError)(res, error.message);
    }
});
exports.getExpenseStats = getExpenseStats;
