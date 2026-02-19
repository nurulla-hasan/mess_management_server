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

    let receiptUrl = '';

    // Handle file upload if present
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, 'mess_receipts');
      receiptUrl = result.url;
    }

    const expense = await Expense.create({
      date: new Date(date),
      buyerId,
      category,
      items,
      amount,
      receiptUrl,
      paymentSource: paymentSource || 'mess_fund',
      adjustment: adjustment || 0,
      addedBy: req.user?._id,
    });

    // Update mess settings total spent
    await MessSettings.findOneAndUpdate(
      {},
      { $inc: { totalSpent: amount - (adjustment || 0) } }
    );

    const populatedExpense = await Expense.findById(expense._id)
      .populate({
        path: 'buyerId',
        populate: { path: 'userId', select: 'fullName profilePicture' },
      })
      .populate('addedBy', 'fullName');

    sendSuccess(res, populatedExpense, 'Expense added successfully', 201);
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

    const filter: any = {};

    if (category) filter.category = category;

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
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      sendError(res, 'Expense not found', 404);
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

    const updatedExpense = await Expense.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    })
      .populate({
        path: 'buyerId',
        populate: { path: 'userId', select: 'fullName profilePicture' },
      })
      .populate('addedBy', 'fullName');

    // Adjust mess settings totalSpent
    if (updatedExpense) {
      const newAmount = updatedExpense.amount - updatedExpense.adjustment;
      const diff = newAmount - oldAmount;
      if (diff !== 0) {
        await MessSettings.findOneAndUpdate({}, { $inc: { totalSpent: diff } });
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
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      sendError(res, 'Expense not found', 404);
      return;
    }

    // Adjust mess settings totalSpent
    const netAmount = expense.amount - expense.adjustment;
    await MessSettings.findOneAndUpdate({}, { $inc: { totalSpent: -netAmount } });

    await Expense.findByIdAndDelete(req.params.id);
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

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const expenses = await Expense.find({
      date: { $gte: startDate, $lte: endDate },
    });

    const totalExpense = expenses.reduce((sum, e) => sum + e.amount - e.adjustment, 0);

    // Category breakdown
    const categoryBreakdown: Record<string, number> = {};
    expenses.forEach((e) => {
      categoryBreakdown[e.category] = (categoryBreakdown[e.category] || 0) + e.amount - e.adjustment;
    });

    // Get budget from settings
    const settings = await MessSettings.findOne();
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
