import { Request, Response } from 'express';
import Meal from '../models/Meal';
import Member from '../models/Member';
import Expense from '../models/Expense';
import { sendSuccess, sendError } from '../utils/helpers';

// @desc    Create/save daily meal entry
// @route   POST /api/meals
export const createMeal = async (req: Request, res: Response): Promise<void> => {
  try {
    const { date, entries, isRamadanMode } = req.body;
    const mealDate = new Date(date);

    // Check if meal already exists for this date
    let meal = await Meal.findOne({
      date: {
        $gte: new Date(mealDate.setHours(0, 0, 0, 0)),
        $lt: new Date(mealDate.setHours(23, 59, 59, 999)),
      },
    });

    if (meal) {
      // Update existing
      meal.entries = entries;
      meal.isRamadanMode = isRamadanMode || false;
      await meal.save(); // pre-save hook recalculates totalMeals
      sendSuccess(res, meal, 'Meal entry updated');
    } else {
      // Create new
      meal = await Meal.create({
        date: new Date(date),
        entries,
        addedBy: req.user?._id,
        isRamadanMode: isRamadanMode || false,
      });
      sendSuccess(res, meal, 'Meal entry created', 201);
    }
  } catch (error) {
    sendError(res, (error as Error).message);
  }
};

// @desc    Get meals for a month (calendar view)
// @route   GET /api/meals?month=10&year=2023
export const getMeals = async (req: Request, res: Response): Promise<void> => {
  try {
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year as string) || new Date().getFullYear();

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const meals = await Meal.find({
      date: { $gte: startDate, $lte: endDate },
    })
      .populate({
        path: 'entries.memberId',
        populate: { path: 'userId', select: 'fullName profilePicture' },
      })
      .sort({ date: 1 });

    sendSuccess(res, meals, 'Meals fetched');
  } catch (error) {
    sendError(res, (error as Error).message);
  }
};

// @desc    Get a specific date's meal data
// @route   GET /api/meals/:date
export const getMealByDate = async (req: Request, res: Response): Promise<void> => {
  try {
    const targetDate = new Date(req.params.date as string);
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    const meal = await Meal.findOne({
      date: { $gte: startOfDay, $lte: endOfDay },
    }).populate({
      path: 'entries.memberId',
      populate: { path: 'userId', select: 'fullName profilePicture' },
    });

    if (!meal) {
      // Return empty with all active members for form
      const members = await Member.find({ status: 'active' }).populate('userId', 'fullName profilePicture');
      
      const targetDateStr = targetDate.toISOString().split('T')[0];

      sendSuccess(res, {
        date: req.params.date,
        entries: members.map((m) => {
          const isMealOff = m.mealOffDates.some(d => 
            new Date(d).toISOString().split('T')[0] === targetDateStr
          );
          
          return {
            memberId: m._id,
            member: m,
            breakfast: 0,
            lunch: 0,
            dinner: 0,
            guest: 0,
            requestedOff: isMealOff
          };
        }),
        totalMeals: 0,
      });
      return;
    }

    sendSuccess(res, meal);
  } catch (error) {
    sendError(res, (error as Error).message);
  }
};

// @desc    Update a meal entry
// @route   PUT /api/meals/:id
export const updateMeal = async (req: Request, res: Response): Promise<void> => {
  try {
    const meal = await Meal.findById(req.params.id);
    if (!meal) {
      sendError(res, 'Meal not found', 404);
      return;
    }

    if (req.body.entries) meal.entries = req.body.entries;
    if (typeof req.body.isRamadanMode === 'boolean') meal.isRamadanMode = req.body.isRamadanMode;

    await meal.save(); // pre-save recalculates totalMeals
    sendSuccess(res, meal, 'Meal updated');
  } catch (error) {
    sendError(res, (error as Error).message);
  }
};

// @desc    Get monthly summary
// @route   GET /api/meals/summary?month=10&year=2023
export const getMealSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year as string) || new Date().getFullYear();

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // Get all meals for the month
    const meals = await Meal.find({
      date: { $gte: startDate, $lte: endDate },
    });

    const totalMeals = meals.reduce((sum, m) => sum + m.totalMeals, 0);

    // Get total expenses for the month (bazar/market costs)
    const expenses = await Expense.find({
      date: { $gte: startDate, $lte: endDate },
    });

    const totalBazar = expenses
      .filter((e) => ['meat_fish', 'vegetables', 'groceries'].includes(e.category))
      .reduce((sum, e) => sum + e.amount, 0);

    const extraCosts = expenses
      .filter((e) => ['utility', 'rent', 'gas', 'other'].includes(e.category))
      .reduce((sum, e) => sum + e.amount, 0);

    const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);
    const currentRate = totalMeals > 0 ? totalBazar / totalMeals : 0;

    sendSuccess(res, {
      month,
      year,
      totalMeals,
      totalBazar,
      currentRate: Math.round(currentRate * 100) / 100,
      extraCosts,
      totalExpense,
      daysWithMeals: meals.length,
    });
  } catch (error) {
    sendError(res, (error as Error).message);
  }
};
