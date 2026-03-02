"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFromCloudinary = exports.uploadToCloudinary = exports.upload = void 0;
const cloudinary_1 = require("cloudinary");
const multer_1 = __importDefault(require("multer"));
// Configure Cloudinary
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
    api_key: process.env.CLOUDINARY_API_KEY || '',
    api_secret: process.env.CLOUDINARY_API_SECRET || '',
});
// Multer storage (in-memory for Cloudinary upload)
const storage = multer_1.default.memoryStorage();
exports.upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max
    },
    fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
            cb(null, true);
        }
        else {
            cb(new Error('Only image and PDF files are allowed'));
        }
    },
});
// Upload buffer to Cloudinary
const uploadToCloudinary = (fileBuffer, folder = 'mess_management') => {
    return new Promise((resolve, reject) => {
        cloudinary_1.v2.uploader
            .upload_stream({
            folder,
            resource_type: 'auto',
        }, (error, result) => {
            if (error || !result) {
                reject(error || new Error('Upload failed'));
            }
            else {
                resolve({
                    url: result.secure_url,
                    publicId: result.public_id,
                });
            }
        })
            .end(fileBuffer);
    });
};
exports.uploadToCloudinary = uploadToCloudinary;
// Delete from Cloudinary
const deleteFromCloudinary = (publicId) => __awaiter(void 0, void 0, void 0, function* () {
    yield cloudinary_1.v2.uploader.destroy(publicId);
});
exports.deleteFromCloudinary = deleteFromCloudinary;
exports.default = cloudinary_1.v2;
