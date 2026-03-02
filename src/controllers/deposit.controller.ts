import { Request, Response } from 'express';
import Deposit from '../models/Deposit';
import Member from '../models/Member';
import { sendSuccess, sendError } from '../utils/helpers';

// @desc    Create new deposit request
// @route   POST /api/deposits
export const createDeposit = async (req: Request, res: Response): Promise<void> => {
  try {
    const { amount, paymentMethod, date, note, memberId: bodyMemberId } = req.body;
    const userId = req.user?._id;
    const messId = req.user?.messId;

    if (!messId) {
      sendError(res, 'User is not associated with any mess', 400);
      return;
    }

    // Allow admin to specify memberId
    let memberId = bodyMemberId;
    let status = 'pending';
    let verifiedBy = undefined;
    
    if (req.user?.role === 'admin') {
       // If admin is creating, it's automatically approved
       status = 'approved';
       verifiedBy = req.user._id;
       
       if (!memberId) {
           const member = await Member.findOne({ userId, messId });
           if (!member) {
               sendError(res, 'Member ID is required', 400);
               return;
           }
           memberId = member._id;
       }
    } else {
       // Regular user or admin creating for self (default)
       const member = await Member.findOne({ userId, messId });
       if (!member) {
         sendError(res, 'Member profile not found', 404);
         return;
       }
       memberId = member._id;
    }

    const deposit = await Deposit.create({
      memberId,
      messId,
      amount,
      paymentMethod,
      date: date || new Date(),
      note,
      status,
      verifiedBy
    });

    // If approved, update member balance
    if (status === 'approved') {
        const member = await Member.findOne({ _id: memberId, messId });
        if (member) {
            member.totalDeposits += amount;
            member.currentBalance += amount;
            await member.save();
        }
    }

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
    const messId = req.user?.messId;

    if (!messId) {
      sendError(res, 'User is not associated with any mess', 400);
      return;
    }

    let query: any = { messId };
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

// @desc    Get monthly deposit summary
// @route   GET /api/deposits/summary?month=10&year=2023
export const getDepositSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const messId = req.user?.messId;

    if (!messId) {
      sendError(res, 'User is not associated with any mess', 400);
      return;
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const deposits = await Deposit.find({
      messId,
      date: { $gte: startDate, $lte: endDate },
      status: 'approved',
    });

    const totalCollected = deposits.reduce((sum, d) => sum + d.amount, 0);

    sendSuccess(res, {
      month,
      year,
      totalCollected,
      count: deposits.length,
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
    const messId = req.user?.messId;
    const member = await Member.findOne({ userId, messId });
    
    if (!member) {
      sendError(res, 'Member profile not found', 404);
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const deposits = await Deposit.find({ memberId: member._id, messId })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Deposit.countDocuments({ memberId: member._id, messId });

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
    const messId = req.user?.messId;

    if (!messId) {
      sendError(res, 'User is not associated with any mess', 400);
      return;
    }

    const deposit = await Deposit.findOne({ _id: depositId, messId });
    if (!deposit) {
      sendError(res, 'Deposit not found or not authorized', 404);
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

    // If status changed to approved, update member balance
    if (status === 'approved' && oldStatus !== 'approved') {
        const member = await Member.findOne({ _id: deposit.memberId, messId });
        if (member) {
            member.totalDeposits += deposit.amount;
            member.currentBalance += deposit.amount;
            await member.save();
        }
    }

    // If status changed from approved to something else, revert balance
    if (oldStatus === 'approved' && status !== 'approved') {
        const member = await Member.findOne({ _id: deposit.memberId, messId });
        if (member) {
            member.totalDeposits -= deposit.amount;
            member.currentBalance -= deposit.amount;
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
    const messId = req.user?.messId;

    if (!messId) {
      sendError(res, 'User is not associated with any mess', 400);
      return;
    }

    const deposit = await Deposit.findOne({ _id: req.params.id, messId });
    if (!deposit) {
      sendError(res, 'Deposit not found or not authorized', 404);
      return;
    }

    // If deleting an approved deposit, revert balance
    if (deposit.status === 'approved') {
      const member = await Member.findOne({ _id: deposit.memberId, messId });
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
