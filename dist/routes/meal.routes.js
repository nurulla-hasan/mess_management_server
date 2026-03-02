"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const meal_controller_1 = require("../controllers/meal.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
const meal_validator_1 = require("../validators/meal.validator");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.requireAuth);
// Summary route (before dynamic routes)
router.get('/summary', meal_controller_1.getMealSummary);
router.get('/', meal_controller_1.getMeals);
router.get('/:date', meal_controller_1.getMealByDate);
router.post('/', auth_middleware_1.requireAdmin, (0, validate_middleware_1.validate)(meal_validator_1.createMealSchema), meal_controller_1.createMeal);
router.put('/:id', auth_middleware_1.requireAdmin, (0, validate_middleware_1.validate)(meal_validator_1.updateMealSchema), meal_controller_1.updateMeal);
exports.default = router;
