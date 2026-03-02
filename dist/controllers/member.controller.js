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
exports.toggleMealOff = exports.getMyDashboard = exports.getMemberStats = exports.deleteMember = exports.updateMember = exports.createMember = exports.getMemberById = exports.getAllMembers = void 0;
const Member_1 = __importDefault(require("../models/Member"));
const User_1 = __importDefault(require("../models/User"));
const helpers_1 = require("../utils/helpers");
// @desc    Get all members
// @route   GET /api/members
const getAllMembers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const search = req.query.search;
        let query = {};
        if (search) {
            const users = yield User_1.default.find({
                $or: [
                    { fullName: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } },
                    { phone: { $regex: search, $options: 'i' } },
                ],
            }).select('_id');
            const userIds = users.map(user => user._id);
            query.userId = { $in: userIds };
        }
        const members = yield Member_1.default.find(query)
            .populate('userId', 'fullName email phone role profilePicture isActive joinDate')
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });
        const total = yield Member_1.default.countDocuments(query);
        (0, helpers_1.sendSuccess)(res, {
            members,
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
exports.getAllMembers = getAllMembers;
// @desc    Get single member
// @route   GET /api/members/:id
const getMemberById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const member = yield Member_1.default.findById(req.params.id).populate('userId', '-password');
        if (!member) {
            (0, helpers_1.sendError)(res, 'Member not found', 404);
            return;
        }
        (0, helpers_1.sendSuccess)(res, { member });
    }
    catch (error) {
        (0, helpers_1.sendError)(res, error.message);
    }
});
exports.getMemberById = getMemberById;
// @desc    Create new member (Admin only)
// @route   POST /api/members
const createMember = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { fullName, email, phone, password, role, isActive } = req.body;
        const existingUser = yield User_1.default.findOne({ email });
        if (existingUser) {
            (0, helpers_1.sendError)(res, 'User already exists', 400);
            return;
        }
        const user = yield User_1.default.create({
            fullName,
            email,
            phone,
            password,
            role: role || 'member',
            isActive: isActive !== undefined ? isActive : true,
            isVerified: true
        });
        const member = yield Member_1.default.create({
            userId: user._id
        });
        (0, helpers_1.sendSuccess)(res, { member, user }, 'Member created successfully', 201);
    }
    catch (error) {
        (0, helpers_1.sendError)(res, error.message);
    }
});
exports.createMember = createMember;
// @desc    Update member
// @route   PUT /api/members/:id
const updateMember = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { fullName, email, phone, role, isActive, status } = req.body;
        const member = yield Member_1.default.findById(req.params.id);
        if (!member) {
            (0, helpers_1.sendError)(res, 'Member not found', 404);
            return;
        }
        // Update User details
        const user = yield User_1.default.findById(member.userId);
        if (user) {
            if (fullName)
                user.fullName = fullName;
            if (email)
                user.email = email;
            if (phone)
                user.phone = phone;
            if (role)
                user.role = role;
            if (isActive !== undefined)
                user.isActive = isActive;
            yield user.save();
        }
        // Update Member details
        if (status)
            member.status = status;
        yield member.save();
        (0, helpers_1.sendSuccess)(res, { member }, 'Member updated successfully');
    }
    catch (error) {
        (0, helpers_1.sendError)(res, error.message);
    }
});
exports.updateMember = updateMember;
// @desc    Delete member (Soft delete)
// @route   DELETE /api/members/:id
const deleteMember = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const member = yield Member_1.default.findById(req.params.id);
        if (!member) {
            (0, helpers_1.sendError)(res, 'Member not found', 404);
            return;
        }
        const user = yield User_1.default.findById(member.userId);
        if (user) {
            user.isActive = false;
            yield user.save();
        }
        member.status = 'inactive';
        yield member.save();
        (0, helpers_1.sendSuccess)(res, null, 'Member deactivated successfully');
    }
    catch (error) {
        (0, helpers_1.sendError)(res, error.message);
    }
});
exports.deleteMember = deleteMember;
// @desc    Get member stats (Admin)
// @route   GET /api/members/stats
const getMemberStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const totalMembers = yield Member_1.default.countDocuments({ status: 'active' });
        const stats = {
            totalMembers,
            totalBalance: 0,
            pendingSettlements: 0
        };
        const balanceAgg = yield Member_1.default.aggregate([
            { $match: { status: 'active' } },
            { $group: { _id: null, total: { $sum: '$currentBalance' } } }
        ]);
        if (balanceAgg.length > 0) {
            stats.totalBalance = balanceAgg[0].total;
        }
        (0, helpers_1.sendSuccess)(res, { stats });
    }
    catch (error) {
        (0, helpers_1.sendError)(res, error.message);
    }
});
exports.getMemberStats = getMemberStats;
// @desc    Get dashboard data (Member)
// @route   GET /api/members/me/dashboard
const getMyDashboard = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const member = yield Member_1.default.findOne({ userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a._id });
        if (!member) {
            (0, helpers_1.sendError)(res, 'Member profile not found', 404);
            return;
        }
        const dashboardData = {
            member,
            recentMeals: [],
            recentDeposits: []
        };
        (0, helpers_1.sendSuccess)(res, { dashboardData });
    }
    catch (error) {
        (0, helpers_1.sendError)(res, error.message);
    }
});
exports.getMyDashboard = getMyDashboard;
// @desc    Toggle meal off
// @route   PUT /api/members/me/meal-off
const toggleMealOff = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { date, isOff } = req.body;
        if (!date) {
            (0, helpers_1.sendError)(res, 'Date is required', 400);
            return;
        }
        const member = yield Member_1.default.findOne({ userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a._id });
        if (!member) {
            (0, helpers_1.sendError)(res, 'Member profile not found', 404);
            return;
        }
        if (member.status !== 'active') {
            (0, helpers_1.sendError)(res, 'Member is not active', 403);
            return;
        }
        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);
        const now = new Date();
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        // Check date constraints
        if (targetDate < today) {
            (0, helpers_1.sendError)(res, 'Cannot change meal status for past dates', 400);
            return;
        }
        if (targetDate.getTime() === today.getTime()) {
            (0, helpers_1.sendError)(res, 'Cannot change meal status for today. Please contact manager.', 400);
            return;
        }
        // If target is tomorrow, check 10 PM deadline
        if (targetDate.getTime() === tomorrow.getTime()) {
            const currentHour = now.getHours();
            // Deadline: 10 PM (22:00)
            if (currentHour >= 22) {
                (0, helpers_1.sendError)(res, 'Meal off deadline (10:00 PM) has passed for tomorrow.', 400);
                return;
            }
        }
        // Toggle logic
        if (isOff) {
            // Add date if not exists
            const exists = member.mealOffDates.some(d => new Date(d).getTime() === targetDate.getTime());
            if (!exists) {
                member.mealOffDates.push(targetDate);
            }
        }
        else {
            // Remove date
            member.mealOffDates = member.mealOffDates.filter(d => new Date(d).getTime() !== targetDate.getTime());
        }
        yield member.save();
        (0, helpers_1.sendSuccess)(res, { mealOffDates: member.mealOffDates }, 'Meal status updated');
    }
    catch (error) {
        (0, helpers_1.sendError)(res, error.message);
    }
});
exports.toggleMealOff = toggleMealOff;
