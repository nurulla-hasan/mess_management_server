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
exports.getDashboardOverview = exports.getSettlement = exports.getExpenseDistribution = exports.getMemberDashboard = exports.getMealRateTrend = void 0;
const Meal_1 = __importDefault(require("../models/Meal"));
const Expense_1 = __importDefault(require("../models/Expense"));
const Member_1 = __importDefault(require("../models/Member"));
const Deposit_1 = __importDefault(require("../models/Deposit"));
const helpers_1 = require("../utils/helpers");
// @desc    Get monthly meal rate trend (last N months)
// @route   GET /api/reports/meal-rate-trend?months=6&month=10&year=2023
const getMealRateTrend = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const monthsBack = parseInt(req.query.months) || 6;
        // Determine reference date (default to current date if not provided)
        let refDate = new Date();
        if (req.query.month && req.query.year) {
            const m = parseInt(req.query.month);
            const y = parseInt(req.query.year);
            refDate = new Date(y, m - 1, 1);
        }
        const trend = [];
        for (let i = monthsBack - 1; i >= 0; i--) {
            const date = new Date(refDate.getFullYear(), refDate.getMonth() - i, 1);
            const month = date.getMonth() + 1;
            const year = date.getFullYear();
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0, 23, 59, 59);
            const meals = yield Meal_1.default.find({ date: { $gte: startDate, $lte: endDate } });
            const totalMeals = meals.reduce((sum, m) => sum + m.totalMeals, 0);
            const expenses = yield Expense_1.default.find({
                date: { $gte: startDate, $lte: endDate },
                category: { $in: ['meat_fish', 'vegetables', 'groceries'] },
            });
            const totalBazar = expenses.reduce((sum, e) => sum + e.amount, 0);
            const rate = totalMeals > 0 ? totalBazar / totalMeals : 0;
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            trend.push({
                month: monthNames[month - 1],
                year,
                rate: Math.round(rate * 100) / 100,
            });
        }
        (0, helpers_1.sendSuccess)(res, trend, 'Meal rate trend fetched');
    }
    catch (error) {
        (0, helpers_1.sendError)(res, error.message);
    }
});
exports.getMealRateTrend = getMealRateTrend;
// @desc    Get member dashboard overview data
// @route   GET /api/reports/member-dashboard
const getMemberDashboard = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const member = yield Member_1.default.findOne({ userId }).populate('userId', 'fullName profilePicture');
        if (!member) {
            (0, helpers_1.sendError)(res, 'Member profile not found', 404);
            return;
        }
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);
        // 1. Calculate Meal Rate
        const allMeals = yield Meal_1.default.find({ date: { $gte: startDate, $lte: endDate } });
        const totalAllMeals = allMeals.reduce((sum, m) => sum + m.totalMeals, 0);
        const expenses = yield Expense_1.default.find({ date: { $gte: startDate, $lte: endDate } });
        const bazarCost = expenses
            .filter((e) => ['meat_fish', 'vegetables', 'groceries'].includes(e.category))
            .reduce((sum, e) => sum + e.amount - e.adjustment, 0);
        const mealRate = totalAllMeals > 0 ? bazarCost / totalAllMeals : 0;
        // 2. Member Meal Stats
        let memberMeals = 0;
        allMeals.forEach((meal) => {
            const entry = meal.entries.find((e) => e.memberId.toString() === member._id.toString());
            if (entry) {
                memberMeals += entry.breakfast + entry.lunch + entry.dinner + entry.guest;
            }
        });
        // 3. Fixed Costs Share
        const fixedExpenses = expenses
            .filter((e) => ['rent', 'gas', 'utility', 'other'].includes(e.category))
            .reduce((sum, e) => sum + e.amount - e.adjustment, 0);
        const activeMembersCount = yield Member_1.default.countDocuments({ status: 'active' });
        const fixedShare = activeMembersCount > 0 ? fixedExpenses / activeMembersCount : 0;
        // 4. Financials
        const estimatedCost = (memberMeals * mealRate) + fixedShare;
        // Get total deposited this month
        const deposits = yield Deposit_1.default.find({
            memberId: member._id,
            status: 'approved',
            date: { $gte: startDate, $lte: endDate },
        });
        let totalDeposited = deposits.reduce((sum, d) => sum + d.amount, 0);
        // Add personal expenses as deposit
        const personalExpenses = yield Expense_1.default.find({
            buyerId: member._id,
            paymentSource: 'personal',
            date: { $gte: startDate, $lte: endDate },
        });
        totalDeposited += personalExpenses.reduce((sum, e) => sum + e.amount - e.adjustment, 0);
        // 5. Recent Activity
        const recentMeals = yield Meal_1.default.find({
            'entries.memberId': member._id,
            date: { $gte: startDate, $lte: endDate }
        }).sort({ date: -1 }).limit(5);
        const recentDeposits = yield Deposit_1.default.find({
            memberId: member._id
        }).sort({ createdAt: -1 }).limit(5);
        (0, helpers_1.sendSuccess)(res, {
            memberInfo: {
                fullName: member.userId.fullName,
                profilePicture: member.userId.profilePicture,
                role: (_b = req.user) === null || _b === void 0 ? void 0 : _b.role
            },
            mealStats: {
                totalMeals: memberMeals,
                mealRate: Math.round(mealRate * 100) / 100,
                estimatedCost: Math.round(estimatedCost * 100) / 100
            },
            financials: {
                totalDeposited: Math.round(totalDeposited * 100) / 100,
                totalLiability: Math.round(estimatedCost * 100) / 100,
                currentBalance: Math.round((totalDeposited - estimatedCost) * 100) / 100
            },
            recentMeals: recentMeals.map(m => {
                const entry = m.entries.find(e => e.memberId.toString() === member._id.toString());
                return {
                    date: m.date,
                    breakfast: (entry === null || entry === void 0 ? void 0 : entry.breakfast) || 0,
                    lunch: (entry === null || entry === void 0 ? void 0 : entry.lunch) || 0,
                    dinner: (entry === null || entry === void 0 ? void 0 : entry.dinner) || 0,
                    guest: (entry === null || entry === void 0 ? void 0 : entry.guest) || 0
                };
            }),
            recentDeposits,
            month: startDate.toLocaleString('default', { month: 'long' })
        });
    }
    catch (error) {
        (0, helpers_1.sendError)(res, error.message);
    }
});
exports.getMemberDashboard = getMemberDashboard;
// @desc    Get expense distribution for a month
// @route   GET /api/reports/expense-distribution?month=10&year=2023
const getExpenseDistribution = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const month = parseInt(req.query.month) || new Date().getMonth() + 1;
        const year = parseInt(req.query.year) || new Date().getFullYear();
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);
        const expenses = yield Expense_1.default.find({
            date: { $gte: startDate, $lte: endDate },
        });
        const total = expenses.reduce((sum, e) => sum + e.amount, 0);
        // Group by broader categories for pie chart
        const groups = {
            Market: 0,
            Rent: 0,
            'Gas/Utility': 0,
            Other: 0,
        };
        expenses.forEach((e) => {
            switch (e.category) {
                case 'meat_fish':
                case 'vegetables':
                case 'groceries':
                    groups.Market += e.amount;
                    break;
                case 'rent':
                    groups.Rent += e.amount;
                    break;
                case 'gas':
                case 'utility':
                    groups['Gas/Utility'] += e.amount;
                    break;
                default:
                    groups.Other += e.amount;
            }
        });
        const distribution = Object.entries(groups)
            .filter(([_, value]) => value > 0)
            .map(([name, value]) => ({
            name,
            value,
            percentage: total > 0 ? Math.round((value / total) * 100) : 0,
        }));
        (0, helpers_1.sendSuccess)(res, { total, distribution }, 'Expense distribution fetched');
    }
    catch (error) {
        (0, helpers_1.sendError)(res, error.message);
    }
});
exports.getExpenseDistribution = getExpenseDistribution;
// @desc    Get monthly settlement data
// @route   GET /api/reports/settlement?month=10&year=2023
const getSettlement = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const month = parseInt(req.query.month) || new Date().getMonth() + 1;
        const year = parseInt(req.query.year) || new Date().getFullYear();
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);
        // Get all active members
        const members = yield Member_1.default.find({ status: 'active' }).populate('userId', 'fullName profilePicture');
        const activeCount = members.length;
        // Get all meals for the month
        const meals = yield Meal_1.default.find({ date: { $gte: startDate, $lte: endDate } });
        // Get all expenses
        const expenses = yield Expense_1.default.find({ date: { $gte: startDate, $lte: endDate } });
        // Calculate total bazar and fixed costs
        const bazarExpenses = expenses.filter((e) => ['meat_fish', 'vegetables', 'groceries'].includes(e.category));
        const fixedExpenses = expenses.filter((e) => ['rent', 'gas', 'utility', 'other'].includes(e.category));
        const totalBazar = bazarExpenses.reduce((sum, e) => sum + e.amount - e.adjustment, 0);
        const totalFixed = fixedExpenses.reduce((sum, e) => sum + e.amount - e.adjustment, 0);
        const totalAllMeals = meals.reduce((sum, m) => sum + m.totalMeals, 0);
        const mealRate = totalAllMeals > 0 ? totalBazar / totalAllMeals : 0;
        const fixedSharePerMember = activeCount > 0 ? totalFixed / activeCount : 0;
        // Get deposits for each member
        const settlement = yield Promise.all(members.map((member) => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b;
            // Count this member's meals
            let memberMeals = 0;
            meals.forEach((meal) => {
                const entry = meal.entries.find((e) => e.memberId.toString() === member._id.toString());
                if (entry) {
                    memberMeals += entry.breakfast + entry.lunch + entry.dinner + entry.guest;
                }
            });
            const mealCost = memberMeals * mealRate;
            const totalLiability = mealCost + fixedSharePerMember;
            // Get deposits for this member in this month
            const deposits = yield Deposit_1.default.find({
                memberId: member._id,
                status: 'approved',
                date: { $gte: startDate, $lte: endDate },
            });
            let deposited = deposits.reduce((sum, d) => sum + d.amount, 0);
            // Get personal expenses for this member (treated as deposit)
            const personalExpenses = yield Expense_1.default.find({
                buyerId: member._id,
                paymentSource: 'personal',
                date: { $gte: startDate, $lte: endDate },
            });
            const personalExpenseAmount = personalExpenses.reduce((sum, e) => sum + e.amount - e.adjustment, 0);
            deposited += personalExpenseAmount;
            const balance = deposited - totalLiability;
            return {
                memberId: member._id,
                memberName: ((_a = member.userId) === null || _a === void 0 ? void 0 : _a.fullName) || 'Unknown Member',
                profilePicture: ((_b = member.userId) === null || _b === void 0 ? void 0 : _b.profilePicture) || '',
                meals: memberMeals,
                mealCost: Math.round(mealCost * 100) / 100,
                fixedShare: Math.round(fixedSharePerMember * 100) / 100,
                totalLiability: Math.round(totalLiability * 100) / 100,
                deposited,
                balance: Math.round(balance * 100) / 100,
            };
        })));
        // Totals
        const totals = settlement.reduce((acc, s) => ({
            totalMembersCount: acc.totalMembersCount + 1,
            totalMeals: acc.totalMeals + s.meals,
            totalMealCost: acc.totalMealCost + s.mealCost,
            totalFixedShare: acc.totalFixedShare + s.fixedShare,
            totalLiability: acc.totalLiability + s.totalLiability,
            totalDeposited: acc.totalDeposited + s.deposited,
            totalBalance: acc.totalBalance + s.balance,
        }), {
            totalMembersCount: 0,
            totalMeals: 0,
            totalMealCost: 0,
            totalFixedShare: 0,
            totalLiability: 0,
            totalDeposited: 0,
            totalBalance: 0,
        });
        (0, helpers_1.sendSuccess)(res, {
            mealRate: Math.round(mealRate * 100) / 100,
            settlement,
            totals,
        }, 'Settlement data fetched');
    }
    catch (error) {
        (0, helpers_1.sendError)(res, error.message);
    }
});
exports.getSettlement = getSettlement;
// @desc    Get admin dashboard overview data
// @route   GET /api/reports/dashboard
const getDashboardOverview = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);
        // Active members
        const activeMembers = yield Member_1.default.countDocuments({ status: 'active' });
        // Total balance (mess fund)
        const members = yield Member_1.default.find({ status: 'active' });
        const messBalance = members.reduce((sum, m) => sum + m.currentBalance, 0);
        // Total expenses this month
        const expenses = yield Expense_1.default.find({ date: { $gte: startDate, $lte: endDate } });
        const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
        // Current meal rate
        const meals = yield Meal_1.default.find({ date: { $gte: startDate, $lte: endDate } });
        const totalMeals = meals.reduce((sum, m) => sum + m.totalMeals, 0);
        const bazarCost = expenses
            .filter((e) => ['meat_fish', 'vegetables', 'groceries'].includes(e.category))
            .reduce((sum, e) => sum + e.amount, 0);
        const currentMealRate = totalMeals > 0 ? bazarCost / totalMeals : 0;
        // Recent activities (last 10 expenses + deposits)
        const recentExpenses = yield Expense_1.default.find()
            .populate({
            path: 'buyerId',
            populate: { path: 'userId', select: 'fullName profilePicture' },
        })
            .sort({ createdAt: -1 })
            .limit(5);
        const recentDeposits = yield Deposit_1.default.find()
            .populate({
            path: 'memberId',
            populate: { path: 'userId', select: 'fullName profilePicture' },
        })
            .sort({ createdAt: -1 })
            .limit(5);
        // Payment alerts (members with negative balance)
        const paymentAlerts = members
            .filter((m) => m.currentBalance < 0)
            .map((m) => ({
            memberId: m._id,
            amount: Math.abs(m.currentBalance),
        }));
        // Populate payment alerts with user info
        const alertsPopulated = yield Promise.all(paymentAlerts.map((alert) => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b;
            const member = yield Member_1.default.findById(alert.memberId).populate('userId', 'fullName profilePicture');
            return Object.assign(Object.assign({}, alert), { memberName: ((_a = member === null || member === void 0 ? void 0 : member.userId) === null || _a === void 0 ? void 0 : _a.fullName) || 'Unknown', profilePicture: ((_b = member === null || member === void 0 ? void 0 : member.userId) === null || _b === void 0 ? void 0 : _b.profilePicture) || '' });
        })));
        (0, helpers_1.sendSuccess)(res, {
            activeMembers,
            messBalance: Math.round(messBalance * 100) / 100,
            totalExpenses,
            currentMealRate: Math.round(currentMealRate * 100) / 100,
            recentExpenses,
            recentDeposits,
            paymentAlerts: alertsPopulated,
        });
    }
    catch (error) {
        (0, helpers_1.sendError)(res, error.message);
    }
});
exports.getDashboardOverview = getDashboardOverview;
