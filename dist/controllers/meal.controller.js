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
exports.getMealSummary = exports.updateMeal = exports.getMealByDate = exports.getMeals = exports.createMeal = void 0;
const Meal_1 = __importDefault(require("../models/Meal"));
const Member_1 = __importDefault(require("../models/Member"));
const Expense_1 = __importDefault(require("../models/Expense"));
const helpers_1 = require("../utils/helpers");
// @desc    Create/save daily meal entry
// @route   POST /api/meals
const createMeal = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { date, entries } = req.body;
        const mealDate = new Date(date);
        // Check if meal already exists for this date
        let meal = yield Meal_1.default.findOne({
            date: {
                $gte: new Date(mealDate.setHours(0, 0, 0, 0)),
                $lt: new Date(mealDate.setHours(23, 59, 59, 999)),
            },
        });
        if (meal) {
            // Update existing
            meal.entries = entries;
            yield meal.save(); // pre-save hook recalculates totalMeals
            (0, helpers_1.sendSuccess)(res, meal, 'Meal entry updated');
        }
        else {
            // Create new
            meal = yield Meal_1.default.create({
                date: new Date(date),
                entries,
                addedBy: (_a = req.user) === null || _a === void 0 ? void 0 : _a._id,
            });
            (0, helpers_1.sendSuccess)(res, meal, 'Meal entry created', 201);
        }
    }
    catch (error) {
        (0, helpers_1.sendError)(res, error.message);
    }
});
exports.createMeal = createMeal;
// @desc    Get meals for a month (calendar view)
// @route   GET /api/meals?month=10&year=2023
const getMeals = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const month = parseInt(req.query.month) || new Date().getMonth() + 1;
        const year = parseInt(req.query.year) || new Date().getFullYear();
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);
        const meals = yield Meal_1.default.find({
            date: { $gte: startDate, $lte: endDate },
        })
            .populate({
            path: 'entries.memberId',
            populate: { path: 'userId', select: 'fullName profilePicture' },
        })
            .sort({ date: 1 });
        (0, helpers_1.sendSuccess)(res, meals, 'Meals fetched');
    }
    catch (error) {
        (0, helpers_1.sendError)(res, error.message);
    }
});
exports.getMeals = getMeals;
// @desc    Get a specific date's meal data
// @route   GET /api/meals/:date
const getMealByDate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const targetDate = new Date(req.params.date);
        const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
        const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
        const meal = yield Meal_1.default.findOne({
            date: { $gte: startOfDay, $lte: endOfDay },
        }).populate({
            path: 'entries.memberId',
            populate: { path: 'userId', select: 'fullName profilePicture' },
        });
        // Get all active members to ensure everyone is listed
        const activeMembers = yield Member_1.default.find({ status: 'active' }).populate('userId', 'fullName profilePicture');
        if (!meal) {
            // Return empty with all active members for form
            const targetDateStr = targetDate.toISOString().split('T')[0];
            (0, helpers_1.sendSuccess)(res, {
                date: req.params.date,
                entries: activeMembers.map((m) => {
                    const isMealOff = m.mealOffDates.some(d => new Date(d).toISOString().split('T')[0] === targetDateStr);
                    return {
                        memberId: m._id,
                        member: m,
                        breakfast: 0,
                        lunch: 0,
                        dinner: 0,
                        guest: 0,
                        requestedOff: isMealOff
                    };
                }),
                totalMeals: 0,
            });
            return;
        }
        // Merge existing entries with active members
        // This handles cases where new members were added after the meal record was created
        const existingEntriesMap = new Map(meal.entries.map((entry) => [entry.memberId._id.toString(), entry]));
        const activeMemberIds = new Set(activeMembers.map(m => m._id.toString()));
        const mergedEntries = activeMembers.map((m) => {
            const existingEntry = existingEntriesMap.get(m._id.toString());
            if (existingEntry) {
                return existingEntry;
            }
            // Default entry for active member not in the current meal record
            return {
                memberId: m, // Structure needs to match populated memberId in existing entries
                breakfast: 0,
                lunch: 0,
                dinner: 0,
                guest: 0,
            };
        });
        // Add existing entries for members who are no longer active (to preserve history)
        meal.entries.forEach((entry) => {
            if (!activeMemberIds.has(entry.memberId._id.toString())) {
                mergedEntries.push(entry);
            }
        });
        // We return a constructed object instead of the mongoose document directly
        // to include the merged entries
        const responseData = {
            _id: meal._id,
            date: meal.date,
            entries: mergedEntries,
            totalMeals: meal.totalMeals,
            addedBy: meal.addedBy,
            createdAt: meal.createdAt,
            updatedAt: meal.updatedAt
        };
        (0, helpers_1.sendSuccess)(res, responseData);
    }
    catch (error) {
        (0, helpers_1.sendError)(res, error.message);
    }
});
exports.getMealByDate = getMealByDate;
// @desc    Update a meal entry
// @route   PUT /api/meals/:id
const updateMeal = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const meal = yield Meal_1.default.findById(req.params.id);
        if (!meal) {
            (0, helpers_1.sendError)(res, 'Meal not found', 404);
            return;
        }
        if (req.body.entries)
            meal.entries = req.body.entries;
        yield meal.save(); // pre-save recalculates totalMeals
        (0, helpers_1.sendSuccess)(res, meal, 'Meal updated');
    }
    catch (error) {
        (0, helpers_1.sendError)(res, error.message);
    }
});
exports.updateMeal = updateMeal;
// @desc    Get monthly summary
// @route   GET /api/meals/summary?month=10&year=2023
const getMealSummary = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const month = parseInt(req.query.month) || new Date().getMonth() + 1;
        const year = parseInt(req.query.year) || new Date().getFullYear();
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);
        // Get all meals for the month
        const meals = yield Meal_1.default.find({
            date: { $gte: startDate, $lte: endDate },
        });
        const totalMeals = meals.reduce((sum, m) => sum + m.totalMeals, 0);
        // Get total expenses for the month (bazar/market costs)
        const expenses = yield Expense_1.default.find({
            date: { $gte: startDate, $lte: endDate },
        });
        const totalBazar = expenses
            .filter((e) => ['meat_fish', 'vegetables', 'groceries'].includes(e.category))
            .reduce((sum, e) => sum + e.amount, 0);
        const extraCosts = expenses
            .filter((e) => ['utility', 'rent', 'gas', 'other'].includes(e.category))
            .reduce((sum, e) => sum + e.amount, 0);
        const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);
        const currentRate = totalMeals > 0 ? totalBazar / totalMeals : 0;
        (0, helpers_1.sendSuccess)(res, {
            month,
            year,
            totalMeals,
            totalBazar,
            currentRate: Math.round(currentRate * 100) / 100,
            extraCosts,
            totalExpense,
            daysWithMeals: meals.length,
        });
    }
    catch (error) {
        (0, helpers_1.sendError)(res, error.message);
    }
});
exports.getMealSummary = getMealSummary;
