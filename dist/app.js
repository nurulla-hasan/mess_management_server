"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
// Route imports
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const member_routes_1 = __importDefault(require("./routes/member.routes"));
const deposit_routes_1 = __importDefault(require("./routes/deposit.routes"));
const meal_routes_1 = __importDefault(require("./routes/meal.routes"));
const expense_routes_1 = __importDefault(require("./routes/expense.routes"));
const report_routes_1 = __importDefault(require("./routes/report.routes"));
const settings_routes_1 = __importDefault(require("./routes/settings.routes"));
const app = (0, express_1.default)();
// Middleware
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cors_1.default)());
app.use((0, helmet_1.default)());
app.use((0, morgan_1.default)('dev'));
// Health check
app.get('/', (req, res) => {
    res.json({ success: true, message: 'Mess Management API is running...' });
});
// API Routes
app.use('/api/v1/auth', auth_routes_1.default);
app.use('/api/v1/members', member_routes_1.default);
app.use('/api/v1/deposits', deposit_routes_1.default);
app.use('/api/v1/meals', meal_routes_1.default);
app.use('/api/v1/expenses', expense_routes_1.default);
app.use('/api/v1/reports', report_routes_1.default);
app.use('/api/v1/settings', settings_routes_1.default);
// 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});
// Global error handler
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(500).json({
        success: false,
        message: err.message || 'Internal Server Error',
    });
});
exports.default = app;
