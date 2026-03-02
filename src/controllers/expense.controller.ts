import { Request, Response } from 'express';
import Expense from '../models/Expense';
import MessSettings from '../models/MessSettings';
import { sendSuccess, sendError, sendPaginated, getPagination } from '../utils/helpers';
import { uploadToCloudinary } from '../utils/cloudinary';

// @desc    Create a new expense
// @route   POST /api/expenses
export const createExpense = async (req: Request, res: Response): Promise<void> => {
  try {
    const { date, buyerId, category, items, amount, paymentSource, adjustment } = req.body;
    const messId = req.user?.messId;

    if (!messId) {
      sendError(res, 'User is not associated with any mess', 400);
      return;
    }

    let receiptUrl = '';

    // Handle file upload if present
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, 'mess_receipts');
      receiptUrl = result.url;
    }

    // Determine status based on role
    const status = req.user?.role === 'admin' ? 'approved' : 'pending';
    const verifiedBy = req.user?.role === 'admin' ? req.user._id : undefined;

    // Handle buyerId: if not provided and user is member, use their memberId
    let finalBuyerId = buyerId;
    if (!finalBuyerId) {
      if (req.user?.role === 'member') {
        const Member = (await import('../models/Member')).default;
        const member = await Member.findOne({ userId: req.user._id, messId });
        if (member) {
          finalBuyerId = member._id;
        }
      }
    }

    if (!finalBuyerId) {
        sendError(res, 'Buyer ID is required', 400);
        return;
    }

    const expense = await Expense.create({
      date: new Date(date),
      messId,
      buyerId: finalBuyerId,
      category,
      items,
      amount,
      receiptUrl,
      paymentSource: paymentSource || 'mess_fund',
      adjustment: adjustment || 0,
      addedBy: req.user?._id,
      status,
      verifiedBy,
    });

    // Update mess settings total spent ONLY if approved
    if (status === 'approved') {
      await MessSettings.findOneAndUpdate(
        { messId },
        { $inc: { totalSpent: amount - (adjustment || 0) } }
      );
    }

    const populatedExpense = await Expense.findById(expense._id)
      .populate({
        path: 'buyerId',
        populate: { path: 'userId', select: 'fullName profilePicture' },
      })
      .populate('addedBy', 'fullName');

    const message = status === 'approved' ? 'Expense added successfully' : 'Expense request submitted for approval';
    sendSuccess(res, populatedExpense, message, 201);
  } catch (error) {
    sendError(res, (error as Error).message);
  }
};

// @desc    Update expense status (Admin)
// @route   PUT /api/expenses/:id/status
export const updateExpenseStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.body;
    const expenseId = req.params.id;
    const adminId = req.user?._id;
    const messId = req.user?.messId;

    if (!messId) {
      sendError(res, 'User is not associated with any mess', 400);
      return;
    }

    const expense = await Expense.findOne({ _id: expenseId, messId });
    if (!expense) {
      sendError(res, 'Expense not found or not authorized', 404);
      return;
    }

    const oldStatus = expense.status;

    // If status is same, do nothing
    if (oldStatus === status) {
      sendSuccess(res, { expense }, 'Status unchanged');
      return;
    }

    // Handle status change
    if (status === 'approved' && oldStatus !== 'approved') {
      // Add to total spent
      await MessSettings.findOneAndUpdate(
        { messId },
        { $inc: { totalSpent: expense.amount - (expense.adjustment || 0) } }
      );
      expense.verifiedBy = adminId;
    } else if (oldStatus === 'approved' && status !== 'approved') {
      // Remove from total spent if un-approving
      await MessSettings.findOneAndUpdate(
        { messId },
        { $inc: { totalSpent: -(expense.amount - (expense.adjustment || 0)) } }
      );
      if (status === 'rejected') {
        expense.verifiedBy = adminId;
      } else {
        expense.verifiedBy = undefined;
      }
    }

    expense.status = status;
    await expense.save();

    sendSuccess(res, { expense }, 'Expense status updated successfully');
  } catch (error) {
    sendError(res, (error as Error).message);
  }
};

// @desc    Get expenses (paginated, filterable)
// @route   GET /api/expenses
export const getExpenses = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const category = req.query.category as string;
    const month = parseInt(req.query.month as string);
    const year = parseInt(req.query.year as string);
    const search = req.query.search as string;
    const buyerId = req.query.buyerId as string;
    const messId = req.user?.messId;

    if (!messId) {
      sendError(res, 'User is not associated with any mess', 400);
      return;
    }

    const filter: any = { messId };

    if (category) filter.category = category;
    if (buyerId) filter.buyerId = buyerId;
    
    // Allow filtering by status
    const status = req.query.status as string;
    if (status) filter.status = status;

    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      filter.date = { $gte: startDate, $lte: endDate };
    }

    if (search) {
      filter.items = { $regex: search, $options: 'i' };
    }

    const total = await Expense.countDocuments(filter);
    const expenses = await Expense.find(filter)
      .populate({
        path: 'buyerId',
        populate: { path: 'userId', select: 'fullName profilePicture' },
      })
      .populate('addedBy', 'fullName')
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);

    sendPaginated(res, expenses, total, page, limit, 'Expenses fetched');
  } catch (error) {
    sendError(res, (error as Error).message);
  }
};

// @desc    Update an expense
// @route   PUT /api/expenses/:id
export const updateExpense = async (req: Request, res: Response): Promise<void> => {
  try {
    const messId = req.user?.messId;
    const expense = await Expense.findOne({ _id: req.params.id, messId });
    if (!expense) {
      sendError(res, 'Expense not found or not authorized', 404);
      return;
    }

    const oldAmount = expense.amount - expense.adjustment;

    const updates: any = {};
    const fields = ['date', 'buyerId', 'category', 'items', 'amount', 'paymentSource', 'adjustment'];
    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = field === 'date' ? new Date(req.body[field]) : req.body[field];
      }
    });

    // Handle receipt upload
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, 'mess_receipts');
      updates.receiptUrl = result.url;
    }

    const updatedExpense = await Expense.findOneAndUpdate({ _id: req.params.id, messId }, updates, {
      new: true,
      runValidators: true,
    })
      .populate({
        path: 'buyerId',
        populate: { path: 'userId', select: 'fullName profilePicture' },
      })
      .populate('addedBy', 'fullName');

    // Adjust mess settings totalSpent
    if (updatedExpense && updatedExpense.status === 'approved') {
      const newAmount = updatedExpense.amount - (updatedExpense.adjustment || 0);
      const diff = newAmount - oldAmount;
      if (diff !== 0) {
        await MessSettings.findOneAndUpdate(
          { messId },
          { $inc: { totalSpent: diff } }
        );
      }
    }

    sendSuccess(res, updatedExpense, 'Expense updated');
  } catch (error) {
    sendError(res, (error as Error).message);
  }
};

// @desc    Delete an expense
// @route   DELETE /api/expenses/:id
export const deleteExpense = async (req: Request, res: Response): Promise<void> => {
  try {
    const messId = req.user?.messId;
    const expense = await Expense.findOne({ _id: req.params.id, messId });
    if (!expense) {
      sendError(res, 'Expense not found or not authorized', 404);
      return;
    }

    // Adjust mess settings totalSpent
    if (expense.status === 'approved') {
      const netAmount = expense.amount - (expense.adjustment || 0);
      await MessSettings.findOneAndUpdate({ messId }, { $inc: { totalSpent: -netAmount } });
    }

    await Expense.findOneAndDelete({ _id: req.params.id, messId });
    sendSuccess(res, null, 'Expense deleted');
  } catch (error) {
    sendError(res, (error as Error).message);
  }
};

// @desc    Get expense stats
// @route   GET /api/expenses/stats
export const getExpenseStats = async (req: Request, res: Response): Promise<void> => {
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

    const expenses = await Expense.find({
      messId,
      date: { $gte: startDate, $lte: endDate },
      status: 'approved',
    });

    const totalExpense = expenses.reduce((sum, e) => sum + e.amount - (e.adjustment || 0), 0);

    // Category breakdown
    const categoryBreakdown: Record<string, number> = {};
    expenses.forEach((e) => {
      categoryBreakdown[e.category] = (categoryBreakdown[e.category] || 0) + e.amount - e.adjustment;
    });

    // Get budget from settings
    const settings = await MessSettings.findOne({ messId });
    const remainingBudget = (settings?.monthlyBudget || 0) - totalExpense;

    sendSuccess(res, {
      totalExpense,
      remainingBudget,
      monthlyBudget: settings?.monthlyBudget || 0,
      categoryBreakdown,
      totalEntries: expenses.length,
    });
  } catch (error) {
    sendError(res, (error as Error).message);
  }
};
