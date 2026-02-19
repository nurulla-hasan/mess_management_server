import { Request, Response } from 'express';
import crypto from 'crypto';
import User from '../models/User';
import Member from '../models/Member';
import { generateToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { sendSuccess, sendError } from '../utils/helpers';
import sendEmail from '../utils/sendEmail';

// @desc    Register a new user
// @route   POST /api/auth/register
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fullName, email, phone, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      sendError(res, 'User already exists with this email', 400);
      return;
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(20).toString('hex');
    const verificationTokenExpire = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user
    const user = await User.create({
      fullName,
      email,
      phone,
      password,
      role: 'member', // Force role to be member for public registration
      verificationToken,
      verificationTokenExpire,
      isVerified: false
    });

    // Create member record
    await Member.create({
      userId: user._id,
    });

    // Generate tokens
    const accessToken = generateToken(user._id.toString(), user.role);
    const refreshToken = generateRefreshToken(user._id.toString(), user.role);

    // Send verification email
    const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    const message = `
      <h1>Email Verification</h1>
      <p>Please click the link below to verify your email address:</p>
      <a href="${verifyUrl}" clicktracking=off>${verifyUrl}</a>
    `;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Mess Management - Email Verification',
        message: `Please click the link below to verify your email address: ${verifyUrl}`,
        html: message,
      });
    } catch (error) {
      console.error('Email send error:', error);
      // We don't want to fail registration if email fails, but we should log it
    }

    sendSuccess(
      res,
      {
        accessToken,
        refreshToken,
      },
      'Registration successful. Please check your email to verify your account.',
      201
    );
  } catch (error) {
    sendError(res, (error as Error).message);
  }
};

// @desc    Verify email
// @route   POST /api/auth/verify-email
export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.body;

    if (!token) {
      sendError(res, 'Invalid verification token', 400);
      return;
    }

    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpire: { $gt: Date.now() },
    });

    if (!user) {
      sendError(res, 'Invalid or expired verification token', 400);
      return;
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpire = undefined;
    await user.save();

    sendSuccess(res, null, 'Email verified successfully');
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

    // Generate tokens
    const accessToken = generateToken(user._id.toString(), user.role);
    const refreshToken = generateRefreshToken(user._id.toString(), user.role);

    sendSuccess(res, {
      accessToken,
      refreshToken,
    }, 'Login successful');
  } catch (error) {
    sendError(res, (error as Error).message);
  }
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh-token
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      sendError(res, 'Refresh token is required', 400);
      return;
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    
    // Check if user exists
    const user = await User.findById(decoded.userId);
    if (!user) {
      sendError(res, 'User not found', 404);
      return;
    }

    if (!user.isActive) {
      sendError(res, 'Account is deactivated', 403);
      return;
    }

    // Generate new access token
    const accessToken = generateToken(user._id.toString(), user.role);

    sendSuccess(res, { accessToken }, 'Token refreshed successfully');
  } catch (error) {
    sendError(res, 'Invalid refresh token', 401);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user?._id);

    sendSuccess(res, { user });
  } catch (error) {
    sendError(res, (error as Error).message);
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Get user with password
    const user = await User.findById(req.user?._id).select('+password');
    if (!user) {
      sendError(res, 'User not found', 404);
      return;
    }

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      sendError(res, 'Incorrect current password', 400);
      return;
    }

    // Update password
    user.password = newPassword;
    await user.save();

    sendSuccess(res, null, 'Password updated successfully');
  } catch (error) {
    sendError(res, (error as Error).message);
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fullName, email, phone } = req.body;
    
    const user = await User.findById(req.user?._id);
    if (!user) {
      sendError(res, 'User not found', 404);
      return;
    }

    if (fullName) user.fullName = fullName;
    if (email) user.email = email;
    if (phone) user.phone = phone;

    await user.save();

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
      }
    }, 'Profile updated successfully');
  } catch (error) {
    sendError(res, (error as Error).message);
  }
};
