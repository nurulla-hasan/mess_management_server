"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const member_controller_1 = require("../controllers/member.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
const member_validator_1 = require("../validators/member.validator");
const router = express_1.default.Router();
// Protect all routes
router.use(auth_middleware_1.requireAuth);
// Dashboard & Stats
router.get('/stats', auth_middleware_1.requireAdmin, member_controller_1.getMemberStats);
router.get('/me/dashboard', member_controller_1.getMyDashboard);
// Member actions
router.put('/me/meal-off', (0, validate_middleware_1.validate)(member_validator_1.toggleMealOffSchema), member_controller_1.toggleMealOff);
// CRUD
router.route('/')
    .get(member_controller_1.getAllMembers)
    .post(auth_middleware_1.requireAdmin, (0, validate_middleware_1.validate)(member_validator_1.createMemberSchema), member_controller_1.createMember);
router.route('/:id')
    .get(member_controller_1.getMemberById)
    .put(auth_middleware_1.requireAdmin, (0, validate_middleware_1.validate)(member_validator_1.updateMemberSchema), member_controller_1.updateMember)
    .delete(auth_middleware_1.requireAdmin, member_controller_1.deleteMember);
exports.default = router;
