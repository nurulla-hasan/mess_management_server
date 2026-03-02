import { Request, Response } from 'express';
import MessSettings from '../models/MessSettings';
import User from '../models/User';
import { sendSuccess, sendError } from '../utils/helpers';
import { uploadToCloudinary } from '../utils/cloudinary';

// @desc    Get mess settings
// @route   GET /api/settings
export const getSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const messId = req.user?.messId;

    if (!messId) {
      sendError(res, 'User is not associated with any mess', 400);
      return;
    }

    let settings = await MessSettings.findOne({ messId })
      .populate({
        path: 'bazarManagerToday',
        populate: { path: 'userId', select: 'fullName profilePicture' },
      })
      .populate('messManagerId', 'fullName profilePicture');

    // Create default settings if none exist (this shouldn't happen if Mess creation is handled correctly)
    if (!settings) {
      settings = await MessSettings.create({ messId });
    }

    sendSuccess(res, settings);
  } catch (error) {
    sendError(res, (error as Error).message);
  }
};

// @desc    Update mess settings (Admin only)
// @route   PUT /api/settings
export const updateSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const messId = req.user?.messId;

    if (!messId) {
      sendError(res, 'User is not associated with any mess', 400);
      return;
    }

    const allowedFields = [
      'messName',
      'mealRateCalculation',
      'fixedMealRate',
      'defaultCurrency',
      'notificationReminders',
      'monthlyBudget',
      'bazarManagerToday',
      'messManagerId',
      'mealOffDeadlineHour',
    ];

    const updates: any = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    let settings = await MessSettings.findOne({ messId });
    if (!settings) {
      settings = await MessSettings.create({ ...updates, messId });
    } else {
      settings = await MessSettings.findOneAndUpdate({ messId }, updates, {
        new: true,
        runValidators: true,
      });
    }

    sendSuccess(res, settings, 'Settings updated');
  } catch (error) {
    sendError(res, (error as Error).message);
  }
};

// @desc    Update user profile (with picture upload)
// @route   PUT /api/settings/profile
export const updateSettingsProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const updates: any = {};

    if (req.body.fullName) updates.fullName = req.body.fullName;
    if (req.body.phone) updates.phone = req.body.phone;
    if (req.body.email) {
      // Check uniqueness
      const existing = await User.findOne({ email: req.body.email, _id: { $ne: req.user?._id } });
      if (existing) {
        sendError(res, 'Email already in use', 400);
        return;
      }
      updates.email = req.body.email;
    }

    // Handle profile picture upload
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, 'mess_profiles');
      updates.profilePicture = result.url;
    }

    // Handle profile picture removal
    if (req.body.removeProfilePicture === 'true') {
      updates.profilePicture = '';
    }

    const user = await User.findByIdAndUpdate(req.user?._id, updates, {
      new: true,
      runValidators: true,
    }).select('-password');

    sendSuccess(res, { user }, 'Profile updated');
  } catch (error) {
    sendError(res, (error as Error).message);
  }
};
