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
exports.requireAdmin = exports.requireAuth = void 0;
const jwt_1 = require("../utils/jwt");
const User_1 = __importDefault(require("../models/User"));
// Protect routes - verify JWT token
const requireAuth = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let token;
        // Get token from Authorization header
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        if (!token) {
            res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
            return;
        }
        // Verify token
        const decoded = (0, jwt_1.verifyToken)(token);
        // Find user
        const user = yield User_1.default.findById(decoded.userId).select('-password');
        if (!user) {
            res.status(401).json({ success: false, message: 'Not authorized, user not found' });
            return;
        }
        if (!user.isActive) {
            res.status(403).json({ success: false, message: 'Account is deactivated' });
            return;
        }
        req.user = user;
        next();
    }
    catch (error) {
        res.status(401).json({ success: false, message: 'Not authorized, invalid token' });
    }
});
exports.requireAuth = requireAuth;
// Require admin role
const requireAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    }
    else {
        res.status(403).json({ success: false, message: 'Access denied. Admin role required.' });
    }
};
exports.requireAdmin = requireAdmin;
