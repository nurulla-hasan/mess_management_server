"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadMultiple = exports.uploadSingle = void 0;
const cloudinary_1 = require("../utils/cloudinary");
// Single file upload middleware
const uploadSingle = (fieldName = 'file') => cloudinary_1.upload.single(fieldName);
exports.uploadSingle = uploadSingle;
// Multiple file upload middleware
const uploadMultiple = (fieldName = 'files', maxCount = 5) => cloudinary_1.upload.array(fieldName, maxCount);
exports.uploadMultiple = uploadMultiple;
