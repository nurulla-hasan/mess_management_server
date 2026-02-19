import { upload } from '../utils/cloudinary';

// Single file upload middleware
export const uploadSingle = (fieldName: string = 'file') => upload.single(fieldName);

// Multiple file upload middleware
export const uploadMultiple = (fieldName: string = 'files', maxCount: number = 5) =>
  upload.array(fieldName, maxCount);
