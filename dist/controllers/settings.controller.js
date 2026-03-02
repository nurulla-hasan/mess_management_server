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
exports.updateSettingsProfile = exports.updateSettings = exports.getSettings = void 0;
const MessSettings_1 = __importDefault(require("../models/MessSettings"));
const User_1 = __importDefault(require("../models/User"));
const helpers_1 = require("../utils/helpers");
const cloudinary_1 = require("../utils/cloudinary");
// @desc    Get mess settings
// @route   GET /api/settings
const getSettings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let settings = yield MessSettings_1.default.findOne()
            .populate({
            path: 'bazarManagerToday',
            populate: { path: 'userId', select: 'fullName profilePicture' },
        })
            .populate('messManagerId', 'fullName profilePicture');
        // Create default settings if none exist
        if (!settings) {
            settings = yield MessSettings_1.default.create({});
        }
        (0, helpers_1.sendSuccess)(res, settings);
    }
    catch (error) {
        (0, helpers_1.sendError)(res, error.message);
    }
});
exports.getSettings = getSettings;
// @desc    Update mess settings (Admin only)
// @route   PUT /api/settings
const updateSettings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const allowedFields = [
            'messName',
            'mealRateCalculation',
            'fixedMealRate',
            'defaultCurrency',
            'notificationReminders',
            'monthlyBudget',
            'bazarManagerToday',
            'messManagerId',
            'mealOffDeadlineHour',
        ];
        const updates = {};
        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });
        let settings = yield MessSettings_1.default.findOne();
        if (!settings) {
            settings = yield MessSettings_1.default.create(updates);
        }
        else {
            settings = yield MessSettings_1.default.findOneAndUpdate({}, updates, {
                new: true,
                runValidators: true,
            });
        }
        (0, helpers_1.sendSuccess)(res, settings, 'Settings updated');
    }
    catch (error) {
        (0, helpers_1.sendError)(res, error.message);
    }
});
exports.updateSettings = updateSettings;
// @desc    Update user profile (with picture upload)
// @route   PUT /api/settings/profile
const updateSettingsProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const updates = {};
        if (req.body.fullName)
            updates.fullName = req.body.fullName;
        if (req.body.phone)
            updates.phone = req.body.phone;
        if (req.body.email) {
            // Check uniqueness
            const existing = yield User_1.default.findOne({ email: req.body.email, _id: { $ne: (_a = req.user) === null || _a === void 0 ? void 0 : _a._id } });
            if (existing) {
                (0, helpers_1.sendError)(res, 'Email already in use', 400);
                return;
            }
            updates.email = req.body.email;
        }
        // Handle profile picture upload
        if (req.file) {
            const result = yield (0, cloudinary_1.uploadToCloudinary)(req.file.buffer, 'mess_profiles');
            updates.profilePicture = result.url;
        }
        // Handle profile picture removal
        if (req.body.removeProfilePicture === 'true') {
            updates.profilePicture = '';
        }
        const user = yield User_1.default.findByIdAndUpdate((_b = req.user) === null || _b === void 0 ? void 0 : _b._id, updates, {
            new: true,
            runValidators: true,
        }).select('-password');
        (0, helpers_1.sendSuccess)(res, { user }, 'Profile updated');
    }
    catch (error) {
        (0, helpers_1.sendError)(res, error.message);
    }
});
exports.updateSettingsProfile = updateSettingsProfile;
