"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const deposit_controller_1 = require("../controllers/deposit.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
const deposit_validator_1 = require("../validators/deposit.validator");
const router = express_1.default.Router();
// Public/Member routes
router.get('/summary', auth_middleware_1.requireAuth, deposit_controller_1.getDepositSummary);
router.post('/', auth_middleware_1.requireAuth, (0, validate_middleware_1.validate)(deposit_validator_1.createDepositSchema), deposit_controller_1.createDeposit);
router.get('/my-deposits', auth_middleware_1.requireAuth, deposit_controller_1.getMyDeposits);
// Admin routes
router.get('/', auth_middleware_1.requireAuth, auth_middleware_1.requireAdmin, deposit_controller_1.getAllDeposits);
router.put('/:id/status', auth_middleware_1.requireAuth, auth_middleware_1.requireAdmin, (0, validate_middleware_1.validate)(deposit_validator_1.updateDepositStatusSchema), deposit_controller_1.updateDepositStatus);
router.delete('/:id', auth_middleware_1.requireAuth, auth_middleware_1.requireAdmin, deposit_controller_1.deleteDeposit);
exports.default = router;
