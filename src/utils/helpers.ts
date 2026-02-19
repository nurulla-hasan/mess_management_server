import { Response } from 'express';

// Standard success response
export const sendSuccess = (res: Response, data: any, message: string = 'Success', statusCode: number = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

// Standard error response
export const sendError = (res: Response, message: string = 'Something went wrong', statusCode: number = 500) => {
  return res.status(statusCode).json({
    success: false,
    message,
  });
};

// Paginated response
export const sendPaginated = (
  res: Response,
  data: any[],
  total: number,
  page: number,
  limit: number,
  message: string = 'Success'
) => {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    },
  });
};

// Parse pagination query params
export const getPagination = (query: any): { page: number; limit: number; skip: number } => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit) || 10));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};
