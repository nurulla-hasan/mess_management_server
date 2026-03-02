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
exports.updateProfile = exports.changePassword = exports.getMe = exports.refreshToken = exports.login = exports.resendVerificationCode = exports.resetPassword = exports.forgotPassword = exports.verifyEmail = exports.register = void 0;
const User_1 = __importDefault(require("../models/User"));
const Member_1 = __importDefault(require("../models/Member"));
const jwt_1 = require("../utils/jwt");
const helpers_1 = require("../utils/helpers");
const sendEmail_1 = __importDefault(require("../utils/sendEmail"));
// @desc    Register a new user
// @route   POST /api/auth/register
const register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { fullName, email, phone, password } = req.body;
        // Check if user already exists
        const existingUser = yield User_1.default.findOne({ email });
        if (existingUser) {
            (0, helpers_1.sendError)(res, 'User already exists with this email', 400);
            return;
        }
        // Generate 6-digit verification code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const verificationCodeExpire = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        // Create user
        const user = yield User_1.default.create({
            fullName,
            email,
            phone,
            password,
            role: 'member', // Force role to be member for public registration
            verificationCode,
            verificationCodeExpire,
            isVerified: false
        });
        // Create member record
        yield Member_1.default.create({
            userId: user._id,
        });
        // Generate tokens
        const accessToken = (0, jwt_1.generateToken)(user._id.toString(), user.role);
        const refreshToken = (0, jwt_1.generateRefreshToken)(user._id.toString(), user.role);
        // Send verification email
        const message = `
      <h1>Email Verification</h1>
      <p>Your verification code is:</p>
      <h2 style="color: #4F46E5; font-size: 24px; letter-spacing: 2px;">${verificationCode}</h2>
      <p>This code will expire in 24 hours.</p>
    `;
        try {
            yield (0, sendEmail_1.default)({
                email: user.email,
                subject: 'Mess Management - Email Verification Code',
                message: `Your verification code is: ${verificationCode}`,
                html: message,
            });
        }
        catch (error) {
            console.error('Email send error:', error);
            // We don't want to fail registration if email fails, but we should log it
        }
        (0, helpers_1.sendSuccess)(res, {
            accessToken,
            refreshToken,
        }, 'Registration successful. Please check your email for the verification code.', 201);
    }
    catch (error) {
        (0, helpers_1.sendError)(res, error.message);
    }
});
exports.register = register;
// @desc    Verify email
// @route   POST /api/auth/verify-email
const verifyEmail = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, code } = req.body;
        if (!code) {
            (0, helpers_1.sendError)(res, 'Verification code is required', 400);
            return;
        }
        const user = yield User_1.default.findOne({
            email,
            verificationCode: code,
            verificationCodeExpire: { $gt: Date.now() },
        });
        if (!user) {
            (0, helpers_1.sendError)(res, 'Invalid or expired verification code', 400);
            return;
        }
        user.isVerified = true;
        user.verificationCode = undefined;
        user.verificationCodeExpire = undefined;
        yield user.save();
        (0, helpers_1.sendSuccess)(res, null, 'Email verified successfully', 200);
    }
    catch (error) {
        (0, helpers_1.sendError)(res, error.message);
    }
});
exports.verifyEmail = verifyEmail;
// @desc    Forgot Password
// @route   POST /api/auth/forgot-password
const forgotPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email } = req.body;
        const user = yield User_1.default.findOne({ email });
        if (!user) {
            (0, helpers_1.sendError)(res, 'User not found with this email', 404);
            return;
        }
        // Generate 6-digit code
        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
        // Set code and expire
        user.resetPasswordToken = resetCode;
        user.resetPasswordExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        yield user.save({ validateBeforeSave: false });
        const message = `
      <h1>Password Reset Code</h1>
      <p>You have requested a password reset. Your verification code is:</p>
      <h2 style="color: #4F46E5; font-size: 24px; letter-spacing: 2px;">${resetCode}</h2>
      <p>This code will expire in 10 minutes.</p>
    `;
        try {
            yield (0, sendEmail_1.default)({
                email: user.email,
                subject: 'Password Reset Verification Code',
                message: `Your password reset code is: ${resetCode}`,
                html: message,
            });
            (0, helpers_1.sendSuccess)(res, null, 'Reset code sent to email', 200);
        }
        catch (error) {
            console.error(error);
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;
            yield user.save({ validateBeforeSave: false });
            (0, helpers_1.sendError)(res, 'Email could not be sent', 500);
        }
    }
    catch (error) {
        (0, helpers_1.sendError)(res, error.message);
    }
});
exports.forgotPassword = forgotPassword;
// @desc    Reset Password
// @route   POST /api/auth/reset-password
const resetPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, code, password } = req.body;
        const user = yield User_1.default.findOne({
            email,
            resetPasswordToken: code,
            resetPasswordExpire: { $gt: Date.now() },
        });
        if (!user) {
            (0, helpers_1.sendError)(res, 'Invalid code or email, or code expired', 400);
            return;
        }
        // Set new password
        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        yield user.save();
        (0, helpers_1.sendSuccess)(res, null, 'Password updated successfully', 200);
    }
    catch (error) {
        (0, helpers_1.sendError)(res, error.message);
    }
});
exports.resetPassword = resetPassword;
// @desc    Resend verification code
// @route   POST /api/auth/resend-code
const resendVerificationCode = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email } = req.body;
        if (!email) {
            (0, helpers_1.sendError)(res, 'Email is required', 400);
            return;
        }
        const user = yield User_1.default.findOne({ email });
        if (!user) {
            (0, helpers_1.sendError)(res, 'User not found', 404);
            return;
        }
        if (user.isVerified) {
            (0, helpers_1.sendError)(res, 'Email is already verified', 400);
            return;
        }
        // Generate 6-digit verification code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const verificationCodeExpire = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        user.verificationCode = verificationCode;
        user.verificationCodeExpire = verificationCodeExpire;
        yield user.save();
        // Send verification email
        const message = `
      <h1>Email Verification</h1>
      <p>Your new verification code is:</p>
      <h2 style="color: #4F46E5; font-size: 24px; letter-spacing: 2px;">${verificationCode}</h2>
      <p>This code will expire in 24 hours.</p>
    `;
        try {
            yield (0, sendEmail_1.default)({
                email: user.email,
                subject: 'Mess Management - Resend Email Verification Code',
                message: `Your new verification code is: ${verificationCode}`,
                html: message,
            });
        }
        catch (error) {
            console.error('Email send error:', error);
            (0, helpers_1.sendError)(res, 'Email could not be sent', 500);
            return;
        }
        (0, helpers_1.sendSuccess)(res, null, 'Verification code resent successfully');
    }
    catch (error) {
        (0, helpers_1.sendError)(res, error.message);
    }
});
exports.resendVerificationCode = resendVerificationCode;
// @desc    Login user
// @route   POST /api/auth/login
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        // Find user with password
        const user = yield User_1.default.findOne({ email }).select('+password');
        if (!user) {
            (0, helpers_1.sendError)(res, 'Invalid email or password', 401);
            return;
        }
        if (!user.isActive) {
            (0, helpers_1.sendError)(res, 'Account is deactivated. Contact admin.', 403);
            return;
        }
        // Check password
        const isMatch = yield user.comparePassword(password);
        if (!isMatch) {
            (0, helpers_1.sendError)(res, 'Invalid email or password', 401);
            return;
        }
        // Generate tokens
        const accessToken = (0, jwt_1.generateToken)(user._id.toString(), user.role);
        const refreshToken = (0, jwt_1.generateRefreshToken)(user._id.toString(), user.role);
        (0, helpers_1.sendSuccess)(res, {
            accessToken,
            refreshToken,
        }, 'Login successful');
    }
    catch (error) {
        (0, helpers_1.sendError)(res, error.message);
    }
});
exports.login = login;
// @desc    Refresh access token
// @route   POST /api/auth/refresh-token
const refreshToken = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            (0, helpers_1.sendError)(res, 'Refresh token is required', 400);
            return;
        }
        // Verify refresh token
        const decoded = (0, jwt_1.verifyRefreshToken)(refreshToken);
        // Check if user exists
        const user = yield User_1.default.findById(decoded.userId);
        if (!user) {
            (0, helpers_1.sendError)(res, 'User not found', 404);
            return;
        }
        if (!user.isActive) {
            (0, helpers_1.sendError)(res, 'Account is deactivated', 403);
            return;
        }
        // Generate new access token
        const accessToken = (0, jwt_1.generateToken)(user._id.toString(), user.role);
        (0, helpers_1.sendSuccess)(res, { accessToken }, 'Token refreshed successfully');
    }
    catch (error) {
        (0, helpers_1.sendError)(res, 'Invalid refresh token', 401);
    }
});
exports.refreshToken = refreshToken;
// @desc    Get current logged in user
// @route   GET /api/auth/me
const getMe = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const user = yield User_1.default.findById((_a = req.user) === null || _a === void 0 ? void 0 : _a._id);
        (0, helpers_1.sendSuccess)(res, { user });
    }
    catch (error) {
        (0, helpers_1.sendError)(res, error.message);
    }
});
exports.getMe = getMe;
// @desc    Change password
// @route   PUT /api/auth/change-password
const changePassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { currentPassword, newPassword } = req.body;
        // Get user with password
        const user = yield User_1.default.findById((_a = req.user) === null || _a === void 0 ? void 0 : _a._id).select('+password');
        if (!user) {
            (0, helpers_1.sendError)(res, 'User not found', 404);
            return;
        }
        // Check current password
        const isMatch = yield user.comparePassword(currentPassword);
        if (!isMatch) {
            (0, helpers_1.sendError)(res, 'Incorrect current password', 400);
            return;
        }
        // Update password
        user.password = newPassword;
        yield user.save();
        (0, helpers_1.sendSuccess)(res, null, 'Password updated successfully');
    }
    catch (error) {
        (0, helpers_1.sendError)(res, error.message);
    }
});
exports.changePassword = changePassword;
// @desc    Update user profile
// @route   PUT /api/auth/profile
const updateProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { fullName, email, phone } = req.body;
        const user = yield User_1.default.findById((_a = req.user) === null || _a === void 0 ? void 0 : _a._id);
        if (!user) {
            (0, helpers_1.sendError)(res, 'User not found', 404);
            return;
        }
        if (fullName)
            user.fullName = fullName;
        if (email)
            user.email = email;
        if (phone)
            user.phone = phone;
        yield user.save();
        (0, helpers_1.sendSuccess)(res, {
            user: {
                _id: user._id,
                fullName: user.fullName,
                email: user.email,
                phone: user.phone,
                role: user.role,
                profilePicture: user.profilePicture,
                isActive: user.isActive,
                joinDate: user.joinDate,
            }
        }, 'Profile updated successfully');
    }
    catch (error) {
        (0, helpers_1.sendError)(res, error.message);
    }
});
exports.updateProfile = updateProfile;
