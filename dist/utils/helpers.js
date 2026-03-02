"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPagination = exports.sendPaginated = exports.sendError = exports.sendSuccess = void 0;
// Standard success response
const sendSuccess = (res, data, message = 'Success', statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
    });
};
exports.sendSuccess = sendSuccess;
// Standard error response
const sendError = (res, message = 'Something went wrong', statusCode = 500) => {
    return res.status(statusCode).json({
        success: false,
        message,
    });
};
exports.sendError = sendError;
// Paginated response
const sendPaginated = (res, data, total, page, limit, message = 'Success') => {
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
exports.sendPaginated = sendPaginated;
// Parse pagination query params
const getPagination = (query) => {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(query.limit) || 10));
    const skip = (page - 1) * limit;
    return { page, limit, skip };
};
exports.getPagination = getPagination;
