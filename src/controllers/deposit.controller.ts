import { Request, Response } from 'express';
import Deposit from '../models/Deposit';
import Member from '../models/Member';
import { sendSuccess, sendError, sendPaginated, getPagination } from '../utils/helpers';

// @desc    Create a new deposit
// @route   POST /api/deposits
export const createDeposit = async (req: Request, res: Response): Promise<void> => {
  try {
    const { memberId, amount, paymentMethod, date, note } = req.body;

    // Verify member exists
    const member = await Member.findById(memberId);
    if (!member) {
      sendError(res, 'Member not found', 404);
      return;
    }

    const deposit = await Deposit.create({
      memberId,
      amount,
      paymentMethod,
      date: date ? new Date(date) : new Date(),
      note,
      status: req.user?.role === 'admin' ? 'verified' : 'pending',
      verifiedBy: req.user?.role === 'admin' ? req.user._id : undefined,
    });

    // If admin created and auto-verified, update member balance
    if (req.user?.role === 'admin') {
      member.totalDeposits += amount;
      member.currentBalance += amount;
      await member.save();
    }

    sendSuccess(res, deposit, 'Deposit recorded successfully', 201);
  } catch (error) {
    sendError(res, (error as Error).message);
  }
};

// @desc    Get deposits (all or filtered)
// @route   GET /api/deposits
export const getDeposits = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const memberId = req.query.memberId as string;
    const month = parseInt(req.query.month as string);
    const year = parseInt(req.query.year as string);

    const filter: any = {};
    if (memberId) filter.memberId = memberId;

    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      filter.date = { $gte: startDate, $lte: endDate };
    }

    const total = await Deposit.countDocuments(filter);
    const deposits = await Deposit.find(filter)
      .populate({
        path: 'memberId',
        populate: { path: 'userId', select: 'fullName email phone profilePicture' },
      })
      .populate('verifiedBy', 'fullName')
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);

    sendPaginated(res, deposits, total, page, limit, 'Deposits fetched');
  } catch (error) {
    sendError(res, (error as Error).message);
  }
};

// @desc    Get my deposits (member panel)
// @route   GET /api/deposits/me
export const getMyDeposits = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page, limit, skip } = getPagination(req.query);

    const member = await Member.findOne({ userId: req.user?._id });
    if (!member) {
      sendError(res, 'Member not found', 404);
      return;
    }

    const filter = { memberId: member._id };
    const total = await Deposit.countDocuments(filter);
    const deposits = await Deposit.find(filter)
      .populate('verifiedBy', 'fullName')
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);

    sendPaginated(res, deposits, total, page, limit, 'My deposits fetched');
  } catch (error) {
    sendError(res, (error as Error).message);
  }
};

// @desc    Verify a deposit (Admin)
// @route   PUT /api/deposits/:id/verify
export const verifyDeposit = async (req: Request, res: Response): Promise<void> => {
  try {
    const deposit = await Deposit.findById(req.params.id);
    if (!deposit) {
      sendError(res, 'Deposit not found', 404);
      return;
    }

    if (deposit.status === 'verified') {
      sendError(res, 'Deposit already verified', 400);
      return;
    }

    deposit.status = 'verified';
    deposit.verifiedBy = req.user?._id;
    await deposit.save();

    // Update member balance
    const member = await Member.findById(deposit.memberId);
    if (member) {
      member.totalDeposits += deposit.amount;
      member.currentBalance += deposit.amount;
      await member.save();
    }

    sendSuccess(res, deposit, 'Deposit verified successfully');
  } catch (error) {
    sendError(res, (error as Error).message);
  }
};

// @desc    Request verification for a deposit (Member)
// @route   PUT /api/deposits/:id/request-verification
export const requestVerification = async (req: Request, res: Response): Promise<void> => {
  try {
    const deposit = await Deposit.findById(req.params.id);
    if (!deposit) {
      sendError(res, 'Deposit not found', 404);
      return;
    }

    // Verify ownership
    const member = await Member.findOne({ userId: req.user?._id });
    if (!member || deposit.memberId.toString() !== member._id.toString()) {
      sendError(res, 'Not authorized for this deposit', 403);
      return;
    }

    if (deposit.status === 'verified') {
      sendError(res, 'Deposit is already verified', 400);
      return;
    }

    deposit.status = 'pending';
    await deposit.save();

    sendSuccess(res, deposit, 'Verification requested');
  } catch (error) {
    sendError(res, (error as Error).message);
  }
};
