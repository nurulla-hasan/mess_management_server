"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateQuery = exports.validate = void 0;
// Validate request body against a Zod schema
const validate = (schema) => {
    return (req, res, next) => {
        try {
            const result = schema.safeParse(req.body);
            if (!result.success) {
                const errors = result.error.issues.map((issue) => ({
                    field: issue.path.join('.'),
                    message: issue.message,
                }));
                res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors,
                });
                return;
            }
            req.body = result.data;
            next();
        }
        catch (error) {
            res.status(400).json({
                success: false,
                message: 'Invalid request data',
            });
        }
    };
};
exports.validate = validate;
// Validate query params
const validateQuery = (schema) => {
    return (req, res, next) => {
        try {
            const result = schema.safeParse(req.query);
            if (!result.success) {
                const errors = result.error.issues.map((issue) => ({
                    field: issue.path.join('.'),
                    message: issue.message,
                }));
                res.status(400).json({
                    success: false,
                    message: 'Invalid query parameters',
                    errors,
                });
                return;
            }
            next();
        }
        catch (error) {
            res.status(400).json({
                success: false,
                message: 'Invalid query parameters',
            });
        }
    };
};
exports.validateQuery = validateQuery;
