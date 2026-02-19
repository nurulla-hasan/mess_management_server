import { Request, Response } from 'express';
import User from '../models/User';
import Member from '../models/Member';
import { generateToken } from '../utils/jwt';
import { sendSuccess, sendError } from '../utils/helpers';

// @desc    Register a new user
// @route   POST /api/auth/register
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fullName, email, phone, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      sendError(res, 'User already exists with this email', 400);
      return;
    }

    // Create user
    const user = await User.create({
      fullName,
      email,
      phone,
      password,
      role: role || 'member',
    });

    // Create member record
    await Member.create({
      userId: user._id,
    });

    // Generate token
    const token = generateToken(user._id.toString(), user.role);

    sendSuccess(
      res,
      {
        user: {
          _id: user._id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          role: user.role,
          profilePicture: user.profilePicture,
          isActive: user.isActive,
          joinDate: user.joinDate,
        },
        token,
      },
      'Registration successful',
      201
    );
  } catch (error) {
    sendError(res, (error as Error).message);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Find user with password
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      sendError(res, 'Invalid email or password', 401);
      return;
    }

    if (!user.isActive) {
      sendError(res, 'Account is deactivated. Contact admin.', 403);
      return;
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      sendError(res, 'Invalid email or password', 401);
      return;
    }

    // Generate token
    const token = generateToken(user._id.toString(), user.role);

    sendSuccess(res, {
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        profilePicture: user.profilePicture,
        isActive: user.isActive,
        joinDate: user.joinDate,
      },
      token,
    }, 'Login successful');
  } catch (error) {
    sendError(res, (error as Error).message);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      sendError(res, 'User not found', 404);
      return;
    }

    // Get member data too
    const member = await Member.findOne({ userId: user._id });

    sendSuccess(res, {
      user,
      member,
    });
  } catch (error) {
    sendError(res, (error as Error).message);
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user?._id).select('+password');
    if (!user) {
      sendError(res, 'User not found', 404);
      return;
    }

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      sendError(res, 'Current password is incorrect', 400);
      return;
    }

    // Update password
    user.password = newPassword;
    await user.save();

    sendSuccess(res, null, 'Password changed successfully');
  } catch (error) {
    sendError(res, (error as Error).message);
  }
};

// @desc    Update profile
// @route   PUT /api/auth/profile
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fullName, email, phone } = req.body;

    const updates: any = {};
    if (fullName) updates.fullName = fullName;
    if (email) updates.email = email;
    if (phone) updates.phone = phone;

    // Check if email is taken
    if (email) {
      const existing = await User.findOne({ email, _id: { $ne: req.user?._id } });
      if (existing) {
        sendError(res, 'Email already in use', 400);
        return;
      }
    }

    const user = await User.findByIdAndUpdate(req.user?._id, updates, {
      new: true,
      runValidators: true,
    });

    sendSuccess(res, { user }, 'Profile updated successfully');
  } catch (error) {
    sendError(res, (error as Error).message);
  }
};
