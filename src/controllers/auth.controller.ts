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

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationCodeExpire = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user
    const user = await User.create({
      fullName,
      email,
      phone,
      password,
      role: 'member', // Force role to be member for public registration
      verificationCode,
      verificationCodeExpire,
      isVerified: false
    });

    // Generate tokens
    const tokenPayload = {
      userId: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      profilePicture: user.profilePicture,
    };
    const accessToken = generateToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Send verification email
    const message = `
      <h1>Email Verification</h1>
      <p>Your verification code is:</p>
      <h2 style="color: #4F46E5; font-size: 24px; letter-spacing: 2px;">${verificationCode}</h2>
      <p>This code will expire in 24 hours.</p>
    `;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Mess Management - Email Verification Code',
        message: `Your verification code is: ${verificationCode}`,
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
      'Registration successful. Please check your email for the verification code.',
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
    const { email, code } = req.body;

    if (!code) {
      sendError(res, 'Verification code is required', 400);
      return;
    }

    const user = await User.findOne({
      email,
      verificationCode: code,
      verificationCodeExpire: { $gt: Date.now() },
    });

    if (!user) {
      sendError(res, 'Invalid or expired verification code', 400);
      return;
    }

    user.isVerified = true;
    user.verificationCode = undefined;
    user.verificationCodeExpire = undefined;

    await user.save();

    sendSuccess(res, null, 'Email verified successfully', 200);
  } catch (error) {
    sendError(res, (error as Error).message);
  }
};

// @desc    Forgot Password
// @route   POST /api/auth/forgot-password
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      sendError(res, 'User not found with this email', 404);
      return;
    }

    // Generate 6-digit code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Set code and expire
    user.resetPasswordToken = resetCode;
    user.resetPasswordExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await user.save({ validateBeforeSave: false });

    const message = `
      <h1>Password Reset Code</h1>
      <p>You have requested a password reset. Your verification code is:</p>
      <h2 style="color: #4F46E5; font-size: 24px; letter-spacing: 2px;">${resetCode}</h2>
      <p>This code will expire in 10 minutes.</p>
    `;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Password Reset Verification Code',
        message: `Your password reset code is: ${resetCode}`,
        html: message,
      });

      sendSuccess(res, null, 'Reset code sent to email', 200);
    } catch (error) {
      console.error(error);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;

      await user.save({ validateBeforeSave: false });

      sendError(res, 'Email could not be sent', 500);
    }
  } catch (error) {
    sendError(res, (error as Error).message);
  }
};

// @desc    Reset Password
// @route   POST /api/auth/reset-password
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, code, password } = req.body;

    const user = await User.findOne({
      email,
      resetPasswordToken: code,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      sendError(res, 'Invalid code or email, or code expired', 400);
      return;
    }

    // Set new password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    sendSuccess(res, null, 'Password updated successfully', 200);
  } catch (error) {
    sendError(res, (error as Error).message);
  }
};

// @desc    Resend verification code
// @route   POST /api/auth/resend-code
export const resendVerificationCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      sendError(res, 'Email is required', 400);
      return;
    }

    const user = await User.findOne({ email });
    if (!user) {
      sendError(res, 'User not found', 404);
      return;
    }

    if (user.isVerified) {
      sendError(res, 'Email is already verified', 400);
      return;
    }

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationCodeExpire = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    user.verificationCode = verificationCode;
    user.verificationCodeExpire = verificationCodeExpire;
    await user.save();

    // Send verification email
    const message = `
      <h1>Email Verification</h1>
      <p>Your new verification code is:</p>
      <h2 style="color: #4F46E5; font-size: 24px; letter-spacing: 2px;">${verificationCode}</h2>
      <p>This code will expire in 24 hours.</p>
    `;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Mess Management - Resend Email Verification Code',
        message: `Your new verification code is: ${verificationCode}`,
        html: message,
      });
    } catch (error) {
      console.error('Email send error:', error);
      sendError(res, 'Email could not be sent', 500);
      return;
    }

    sendSuccess(res, null, 'Verification code resent successfully');
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
    const tokenPayload = {
      userId: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      profilePicture: user.profilePicture,
      messId: user.messId?.toString(),
    };
    const accessToken = generateToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

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
    const tokenPayload = {
      userId: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      profilePicture: user.profilePicture,
      messId: user.messId?.toString(),
    };
    const accessToken = generateToken(tokenPayload);

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
