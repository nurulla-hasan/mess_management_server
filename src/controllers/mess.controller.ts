import { Request, Response } from 'express';
import crypto from 'crypto';
import Mess from '../models/Mess';
import User from '../models/User';
import Member from '../models/Member';
import MessSettings from '../models/MessSettings';
import { sendSuccess, sendError } from '../utils/helpers';

// @desc    Create a new mess
// @route   POST /api/v1/messes
export const createMess = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, address, phone } = req.body;
    const managerId = req.user?._id;

    if (!managerId) {
      sendError(res, 'User not authenticated', 401);
      return;
    }

    // Check if user already manages a mess or is part of one
    const user = await User.findById(managerId);
    if (user?.messId) {
      sendError(res, 'User is already associated with a mess', 400);
      return;
    }

    // Generate random 6-character invite code
    const inviteCode = crypto.randomBytes(3).toString('hex').toUpperCase();

    // Create the mess
    const mess = await Mess.create({
      name,
      address,
      phone,
      managerId,
      inviteCode,
    });

    // Update user's messId and role
    await User.findByIdAndUpdate(managerId, {
      messId: mess._id,
      role: 'admin', // The creator becomes the admin/manager
    });

    // Create member record for the manager
    await Member.create({
      userId: managerId,
      messId: mess._id,
      status: 'active',
    });

    // Create default settings for the mess
    await MessSettings.create({
      messId: mess._id,
      messName: name,
      messManagerId: managerId,
      monthlyBudget: 0,
      totalSpent: 0,
      totalFundCollected: 0,
      mealRateCalculation: 'variable',
    });

    sendSuccess(res, mess, 'Mess created successfully', 201);
  } catch (error) {
    sendError(res, (error as Error).message);
  }
};

// @desc    Get mess details
// @route   GET /api/v1/messes/me
export const getMyMess = async (req: Request, res: Response): Promise<void> => {
  try {
    const messId = req.user?.messId;

    if (!messId) {
      sendError(res, 'User is not associated with any mess', 404);
      return;
    }

    const mess = await Mess.findById(messId).populate('managerId', 'fullName email phone');
    if (!mess) {
      sendError(res, 'Mess not found', 404);
      return;
    }

    sendSuccess(res, mess, 'Mess details fetched');
  } catch (error) {
    sendError(res, (error as Error).message);
  }
};

// @desc    Update mess details
// @route   PUT /api/v1/messes/me
export const updateMess = async (req: Request, res: Response): Promise<void> => {
  try {
    const messId = req.user?.messId;
    const userId = req.user?._id;

    if (!messId) {
      sendError(res, 'User is not associated with any mess', 404);
      return;
    }

    const mess = await Mess.findById(messId);
    if (!mess) {
      sendError(res, 'Mess not found', 404);
      return;
    }

    // Only manager can update mess details
    if (mess.managerId.toString() !== userId?.toString()) {
      sendError(res, 'Only mess manager can update mess details', 403);
      return;
    }

    const { name, address, phone, isActive } = req.body;
    
    if (name) mess.name = name;
    if (address) mess.address = address;
    if (phone) mess.phone = phone;
    if (isActive !== undefined) mess.isActive = isActive;

    await mess.save();

    sendSuccess(res, mess, 'Mess details updated');
  } catch (error) {
    sendError(res, (error as Error).message);
  }
};

// @desc    Join a mess using invite code
// @route   POST /api/v1/messes/join
export const joinMess = async (req: Request, res: Response): Promise<void> => {
  try {
    const { inviteCode } = req.body;
    const userId = req.user?._id;

    if (!inviteCode) {
      sendError(res, 'Invite code is required', 400);
      return;
    }

    const mess = await Mess.findOne({ inviteCode: inviteCode.toUpperCase(), isActive: true });
    if (!mess) {
      sendError(res, 'Invalid or inactive invite code', 404);
      return;
    }

    // Check if user is already in a mess
    const user = await User.findById(userId);
    if (user?.messId) {
      sendError(res, 'User is already associated with a mess', 400);
      return;
    }

    // Update user's messId
    await User.findByIdAndUpdate(userId, {
      messId: mess._id,
      role: 'member',
    });

    // Create member record
    await Member.create({
      userId,
      messId: mess._id,
      status: 'active',
    });

    sendSuccess(res, mess, 'Joined mess successfully');
  } catch (error) {
    sendError(res, (error as Error).message);
  }
};
