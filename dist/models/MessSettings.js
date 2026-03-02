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
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const messSettingsSchema = new mongoose_1.Schema({
    messName: {
        type: String,
        default: 'Mess Manager',
        trim: true,
    },
    mealRateCalculation: {
        type: String,
        enum: ['variable', 'fixed'],
        default: 'variable',
    },
    fixedMealRate: {
        type: Number,
        default: 0,
    },
    defaultCurrency: {
        type: String,
        default: 'BDT',
    },
    notificationReminders: {
        type: Boolean,
        default: true,
    },
    currentMonth: {
        type: Number,
        default: () => new Date().getMonth() + 1,
    },
    currentYear: {
        type: Number,
        default: () => new Date().getFullYear(),
    },
    totalFundCollected: {
        type: Number,
        default: 0,
    },
    totalSpent: {
        type: Number,
        default: 0,
    },
    monthlyBudget: {
        type: Number,
        default: 0,
    },
    bazarManagerToday: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Member',
    },
    messManagerId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
    },
    mealOffDeadlineHour: {
        type: Number,
        default: 22, // 10:00 PM
        min: 0,
        max: 23,
    },
}, {
    timestamps: true,
});
const MessSettings = mongoose_1.default.model('MessSettings', messSettingsSchema);
exports.default = MessSettings;
