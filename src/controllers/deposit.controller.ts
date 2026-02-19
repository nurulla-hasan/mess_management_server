import { Request, Response } from 'express';
import Deposit from '../models/Deposit';
import Member from '../models/Member';
import { sendSuccess, sendError } from '../utils/helpers';

// @desc    Create new deposit request
// @route   POST /api/deposits
export const createDeposit = async (req: Request, res: Response): Promise<void> => {
  try {
    const { amount, paymentMethod, date, note } = req.body;
    const userId = req.user?._id;

    const member = await Member.findOne({ userId });
    if (!member) {
      sendError(res, 'Member profile not found', 404);
      return;
    }

    const deposit = await Deposit.create({
      memberId: member._id,
      amount,
      paymentMethod,
      date: date || new Date(),
      note,
      status: 'pending',
    });

    sendSuccess(res, { deposit }, 'Deposit request created successfully', 201);
  } catch (error) {
    sendError(res, (error as Error).message);
  }
};

// @desc    Get all deposits (Admin)
// @route   GET /api/deposits
export const getAllDeposits = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const status = req.query.status as string;
    const memberId = req.query.memberId as string;

    let query: any = {};
    if (status) query.status = status;
    if (memberId) query.memberId = memberId;

    const deposits = await Deposit.find(query)
      .populate({
        path: 'memberId',
        populate: { path: 'userId', select: 'fullName email phone' }
      })
      .populate('verifiedBy', 'fullName email')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Deposit.countDocuments(query);

    sendSuccess(res, {
      deposits,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    sendError(res, (error as Error).message);
  }
};

// @desc    Get my deposits (Member)
// @route   GET /api/deposits/my-deposits
export const getMyDeposits = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    const member = await Member.findOne({ userId });
    
    if (!member) {
      sendError(res, 'Member profile not found', 404);
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const deposits = await Deposit.find({ memberId: member._id })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Deposit.countDocuments({ memberId: member._id });

    sendSuccess(res, {
      deposits,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    sendError(res, (error as Error).message);
  }
};

// @desc    Update deposit status (Admin)
// @route   PUT /api/deposits/:id/status
export const updateDepositStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.body;
    const depositId = req.params.id;
    const adminId = req.user?._id;

    const deposit = await Deposit.findById(depositId);
    if (!deposit) {
      sendError(res, 'Deposit not found', 404);
      return;
    }

    const oldStatus = deposit.status;
    
    // If status is same, do nothing
    if (oldStatus === status) {
      sendSuccess(res, { deposit }, 'Status unchanged');
      return;
    }

    // Update deposit
    deposit.status = status;
    if (status === 'approved' || status === 'rejected') {
      deposit.verifiedBy = adminId;
    }
    await deposit.save();

    // Update Member Balance Logic
    const member = await Member.findById(deposit.memberId);
    if (member) {
      let balanceChange = 0;

      // Logic: 
      // If moving TO approved: +amount
      // If moving FROM approved: -amount
      
      if (status === 'approved' && oldStatus !== 'approved') {
        balanceChange = deposit.amount;
      } else if (oldStatus === 'approved' && status !== 'approved') {
        balanceChange = -deposit.amount;
      }

      if (balanceChange !== 0) {
        member.totalDeposits += balanceChange;
        member.currentBalance += balanceChange;
        await member.save();
      }
    }

    sendSuccess(res, { deposit }, 'Deposit status updated successfully');
  } catch (error) {
    sendError(res, (error as Error).message);
  }
};

// @desc    Delete deposit (Admin)
// @route   DELETE /api/deposits/:id
export const deleteDeposit = async (req: Request, res: Response): Promise<void> => {
  try {
    const deposit = await Deposit.findById(req.params.id);
    if (!deposit) {
      sendError(res, 'Deposit not found', 404);
      return;
    }

    // If deleting an approved deposit, revert balance
    if (deposit.status === 'approved') {
      const member = await Member.findById(deposit.memberId);
      if (member) {
        member.totalDeposits -= deposit.amount;
        member.currentBalance -= deposit.amount;
        await member.save();
      }
    }

    await deposit.deleteOne();
    sendSuccess(res, null, 'Deposit deleted successfully');
  } catch (error) {
    sendError(res, (error as Error).message);
  }
};
