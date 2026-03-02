"use strict";
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
exports.deleteDeposit = exports.updateDepositStatus = exports.getMyDeposits = exports.getDepositSummary = exports.getAllDeposits = exports.createDeposit = void 0;
const Deposit_1 = __importDefault(require("../models/Deposit"));
const Member_1 = __importDefault(require("../models/Member"));
const helpers_1 = require("../utils/helpers");
// @desc    Create new deposit request
// @route   POST /api/deposits
const createDeposit = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { amount, paymentMethod, date, note, memberId: bodyMemberId } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        // Allow admin to specify memberId
        let memberId = bodyMemberId;
        let status = 'pending';
        let verifiedBy = undefined;
        if (((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) === 'admin') {
            // If admin is creating, it's automatically approved
            status = 'approved';
            verifiedBy = req.user._id;
            if (!memberId) {
                const member = yield Member_1.default.findOne({ userId });
                if (!member) {
                    (0, helpers_1.sendError)(res, 'Member ID is required', 400);
                    return;
                }
                memberId = member._id;
            }
        }
        else {
            // Regular user or admin creating for self (default)
            const member = yield Member_1.default.findOne({ userId });
            if (!member) {
                (0, helpers_1.sendError)(res, 'Member profile not found', 404);
                return;
            }
            memberId = member._id;
        }
        const deposit = yield Deposit_1.default.create({
            memberId,
            amount,
            paymentMethod,
            date: date || new Date(),
            note,
            status,
            verifiedBy
        });
        // If approved, update member balance
        if (status === 'approved') {
            const member = yield Member_1.default.findById(memberId);
            if (member) {
                member.totalDeposits += amount;
                member.currentBalance += amount;
                yield member.save();
            }
        }
        (0, helpers_1.sendSuccess)(res, { deposit }, 'Deposit request created successfully', 201);
    }
    catch (error) {
        (0, helpers_1.sendError)(res, error.message);
    }
});
exports.createDeposit = createDeposit;
// @desc    Get all deposits (Admin)
// @route   GET /api/deposits
const getAllDeposits = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const status = req.query.status;
        const memberId = req.query.memberId;
        let query = {};
        if (status)
            query.status = status;
        if (memberId)
            query.memberId = memberId;
        const deposits = yield Deposit_1.default.find(query)
            .populate({
            path: 'memberId',
            populate: { path: 'userId', select: 'fullName email phone' }
        })
            .populate('verifiedBy', 'fullName email')
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });
        const total = yield Deposit_1.default.countDocuments(query);
        (0, helpers_1.sendSuccess)(res, {
            deposits,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    }
    catch (error) {
        (0, helpers_1.sendError)(res, error.message);
    }
});
exports.getAllDeposits = getAllDeposits;
// @desc    Get monthly deposit summary
// @route   GET /api/deposits/summary?month=10&year=2023
const getDepositSummary = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const month = parseInt(req.query.month) || new Date().getMonth() + 1;
        const year = parseInt(req.query.year) || new Date().getFullYear();
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);
        const deposits = yield Deposit_1.default.find({
            date: { $gte: startDate, $lte: endDate },
            status: 'approved',
        });
        const totalCollected = deposits.reduce((sum, d) => sum + d.amount, 0);
        (0, helpers_1.sendSuccess)(res, {
            month,
            year,
            totalCollected,
            count: deposits.length,
        });
    }
    catch (error) {
        (0, helpers_1.sendError)(res, error.message);
    }
});
exports.getDepositSummary = getDepositSummary;
// @desc    Get my deposits (Member)
// @route   GET /api/deposits/my-deposits
const getMyDeposits = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const member = yield Member_1.default.findOne({ userId });
        if (!member) {
            (0, helpers_1.sendError)(res, 'Member profile not found', 404);
            return;
        }
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const deposits = yield Deposit_1.default.find({ memberId: member._id })
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });
        const total = yield Deposit_1.default.countDocuments({ memberId: member._id });
        (0, helpers_1.sendSuccess)(res, {
            deposits,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    }
    catch (error) {
        (0, helpers_1.sendError)(res, error.message);
    }
});
exports.getMyDeposits = getMyDeposits;
// @desc    Update deposit status (Admin)
// @route   PUT /api/deposits/:id/status
const updateDepositStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { status } = req.body;
        const depositId = req.params.id;
        const adminId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const deposit = yield Deposit_1.default.findById(depositId);
        if (!deposit) {
            (0, helpers_1.sendError)(res, 'Deposit not found', 404);
            return;
        }
        const oldStatus = deposit.status;
        // If status is same, do nothing
        if (oldStatus === status) {
            (0, helpers_1.sendSuccess)(res, { deposit }, 'Status unchanged');
            return;
        }
        // Update deposit
        deposit.status = status;
        if (status === 'approved' || status === 'rejected') {
            deposit.verifiedBy = adminId;
        }
        yield deposit.save();
        // Update Member Balance Logic
        const member = yield Member_1.default.findById(deposit.memberId);
        if (member) {
            let balanceChange = 0;
            // Logic: 
            // If moving TO approved: +amount
            // If moving FROM approved: -amount
            if (status === 'approved' && oldStatus !== 'approved') {
                balanceChange = deposit.amount;
            }
            else if (oldStatus === 'approved' && status !== 'approved') {
                balanceChange = -deposit.amount;
            }
            if (balanceChange !== 0) {
                member.totalDeposits += balanceChange;
                member.currentBalance += balanceChange;
                yield member.save();
            }
        }
        (0, helpers_1.sendSuccess)(res, { deposit }, 'Deposit status updated successfully');
    }
    catch (error) {
        (0, helpers_1.sendError)(res, error.message);
    }
});
exports.updateDepositStatus = updateDepositStatus;
// @desc    Delete deposit (Admin)
// @route   DELETE /api/deposits/:id
const deleteDeposit = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const deposit = yield Deposit_1.default.findById(req.params.id);
        if (!deposit) {
            (0, helpers_1.sendError)(res, 'Deposit not found', 404);
            return;
        }
        // If deleting an approved deposit, revert balance
        if (deposit.status === 'approved') {
            const member = yield Member_1.default.findById(deposit.memberId);
            if (member) {
                member.totalDeposits -= deposit.amount;
                member.currentBalance -= deposit.amount;
                yield member.save();
            }
        }
        yield deposit.deleteOne();
        (0, helpers_1.sendSuccess)(res, null, 'Deposit deleted successfully');
    }
    catch (error) {
        (0, helpers_1.sendError)(res, error.message);
    }
});
exports.deleteDeposit = deleteDeposit;
