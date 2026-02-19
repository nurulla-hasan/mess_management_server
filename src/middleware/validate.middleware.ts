import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

// Validate request body against a Zod schema
export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
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
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Invalid request data',
      });
    }
  };
};

// Validate query params
export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
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
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Invalid query parameters',
      });
    }
  };
};
