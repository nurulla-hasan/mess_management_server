import { Request, Response } from 'express';
import Meal from '../models/Meal';
import Expense from '../models/Expense';
import Member from '../models/Member';
import Deposit from '../models/Deposit';
import { sendSuccess, sendError } from '../utils/helpers';

// @desc    Get monthly meal rate trend (last N months)
// @route   GET /api/reports/meal-rate-trend?months=6
export const getMealRateTrend = async (req: Request, res: Response): Promise<void> => {
  try {
    const monthsBack = parseInt(req.query.months as string) || 6;
    const now = new Date();
    const trend: Array<{ month: string; year: number; rate: number }> = [];

    for (let i = monthsBack - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      const meals = await Meal.find({ date: { $gte: startDate, $lte: endDate } });
      const totalMeals = meals.reduce((sum, m) => sum + m.totalMeals, 0);

      const expenses = await Expense.find({
        date: { $gte: startDate, $lte: endDate },
        category: { $in: ['meat_fish', 'vegetables', 'groceries'] },
      });
      const totalBazar = expenses.reduce((sum, e) => sum + e.amount, 0);

      const rate = totalMeals > 0 ? totalBazar / totalMeals : 0;

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      trend.push({
        month: monthNames[month - 1],
        year,
        rate: Math.round(rate * 100) / 100,
      });
    }

    sendSuccess(res, trend, 'Meal rate trend fetched');
  } catch (error) {
    sendError(res, (error as Error).message);
  }
};

// @desc    Get expense distribution for a month
// @route   GET /api/reports/expense-distribution?month=10&year=2023
export const getExpenseDistribution = async (req: Request, res: Response): Promise<void> => {
  try {
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year as string) || new Date().getFullYear();

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const expenses = await Expense.find({
      date: { $gte: startDate, $lte: endDate },
    });

    const total = expenses.reduce((sum, e) => sum + e.amount, 0);

    // Group by broader categories for pie chart
    const groups: Record<string, number> = {
      Market: 0,
      Rent: 0,
      'Gas/Utility': 0,
      Other: 0,
    };

    expenses.forEach((e) => {
      switch (e.category) {
        case 'meat_fish':
        case 'vegetables':
        case 'groceries':
          groups.Market += e.amount;
          break;
        case 'rent':
          groups.Rent += e.amount;
          break;
        case 'gas':
        case 'utility':
          groups['Gas/Utility'] += e.amount;
          break;
        default:
          groups.Other += e.amount;
      }
    });

    const distribution = Object.entries(groups)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({
        name,
        value,
        percentage: total > 0 ? Math.round((value / total) * 100) : 0,
      }));

    sendSuccess(res, { total, distribution }, 'Expense distribution fetched');
  } catch (error) {
    sendError(res, (error as Error).message);
  }
};

// @desc    Get monthly settlement data
// @route   GET /api/reports/settlement?month=10&year=2023
export const getSettlement = async (req: Request, res: Response): Promise<void> => {
  try {
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year as string) || new Date().getFullYear();

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // Get all active members
    const members = await Member.find({ status: 'active' }).populate('userId', 'fullName profilePicture');
    const activeCount = members.length;

    // Get all meals for the month
    const meals = await Meal.find({ date: { $gte: startDate, $lte: endDate } });

    // Get all expenses
    const expenses = await Expense.find({ date: { $gte: startDate, $lte: endDate } });

    // Calculate total bazar and fixed costs
    const bazarExpenses = expenses.filter((e) =>
      ['meat_fish', 'vegetables', 'groceries'].includes(e.category)
    );
    const fixedExpenses = expenses.filter((e) =>
      ['rent', 'gas', 'utility', 'other'].includes(e.category)
    );

    const totalBazar = bazarExpenses.reduce((sum, e) => sum + e.amount - e.adjustment, 0);
    const totalFixed = fixedExpenses.reduce((sum, e) => sum + e.amount - e.adjustment, 0);
    const totalAllMeals = meals.reduce((sum, m) => sum + m.totalMeals, 0);
    const mealRate = totalAllMeals > 0 ? totalBazar / totalAllMeals : 0;
    const fixedSharePerMember = activeCount > 0 ? totalFixed / activeCount : 0;

    // Get deposits for each member
    const settlement = await Promise.all(
      members.map(async (member) => {
        // Count this member's meals
        let memberMeals = 0;
        meals.forEach((meal) => {
          const entry = meal.entries.find(
            (e) => e.memberId.toString() === member._id.toString()
          );
          if (entry) {
            memberMeals += entry.breakfast + entry.lunch + entry.dinner + entry.guest;
          }
        });

        const mealCost = memberMeals * mealRate;
        const totalLiability = mealCost + fixedSharePerMember;

        // Get deposits for this member in this month
        const deposits = await Deposit.find({
          memberId: member._id,
          status: 'verified',
          date: { $gte: startDate, $lte: endDate },
        });
        const deposited = deposits.reduce((sum, d) => sum + d.amount, 0);

        const balance = deposited - totalLiability;

        return {
          memberId: member._id,
          memberName: (member.userId as any).fullName,
          profilePicture: (member.userId as any).profilePicture,
          meals: memberMeals,
          mealCost: Math.round(mealCost * 100) / 100,
          fixedShare: Math.round(fixedSharePerMember * 100) / 100,
          totalLiability: Math.round(totalLiability * 100) / 100,
          deposited,
          balance: Math.round(balance * 100) / 100,
        };
      })
    );

    // Totals
    const totals = settlement.reduce(
      (acc, s) => ({
        totalMembersCount: acc.totalMembersCount + 1,
        totalMeals: acc.totalMeals + s.meals,
        totalMealCost: acc.totalMealCost + s.mealCost,
        totalFixedShare: acc.totalFixedShare + s.fixedShare,
        totalLiability: acc.totalLiability + s.totalLiability,
        totalDeposited: acc.totalDeposited + s.deposited,
        totalBalance: acc.totalBalance + s.balance,
      }),
      {
        totalMembersCount: 0,
        totalMeals: 0,
        totalMealCost: 0,
        totalFixedShare: 0,
        totalLiability: 0,
        totalDeposited: 0,
        totalBalance: 0,
      }
    );

    sendSuccess(res, {
      mealRate: Math.round(mealRate * 100) / 100,
      settlement,
      totals,
    }, 'Settlement data fetched');
  } catch (error) {
    sendError(res, (error as Error).message);
  }
};

// @desc    Get admin dashboard overview data
// @route   GET /api/reports/dashboard
export const getDashboardOverview = async (req: Request, res: Response): Promise<void> => {
  try {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // Active members
    const activeMembers = await Member.countDocuments({ status: 'active' });

    // Total balance (mess fund)
    const members = await Member.find({ status: 'active' });
    const messBalance = members.reduce((sum, m) => sum + m.currentBalance, 0);

    // Total expenses this month
    const expenses = await Expense.find({ date: { $gte: startDate, $lte: endDate } });
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    // Current meal rate
    const meals = await Meal.find({ date: { $gte: startDate, $lte: endDate } });
    const totalMeals = meals.reduce((sum, m) => sum + m.totalMeals, 0);
    const bazarCost = expenses
      .filter((e) => ['meat_fish', 'vegetables', 'groceries'].includes(e.category))
      .reduce((sum, e) => sum + e.amount, 0);
    const currentMealRate = totalMeals > 0 ? bazarCost / totalMeals : 0;

    // Recent activities (last 10 expenses + deposits)
    const recentExpenses = await Expense.find()
      .populate({
        path: 'buyerId',
        populate: { path: 'userId', select: 'fullName profilePicture' },
      })
      .sort({ createdAt: -1 })
      .limit(5);

    const recentDeposits = await Deposit.find()
      .populate({
        path: 'memberId',
        populate: { path: 'userId', select: 'fullName profilePicture' },
      })
      .sort({ createdAt: -1 })
      .limit(5);

    // Payment alerts (members with negative balance)
    const paymentAlerts = members
      .filter((m) => m.currentBalance < 0)
      .map((m) => ({
        memberId: m._id,
        amount: Math.abs(m.currentBalance),
      }));

    // Populate payment alerts with user info
    const alertsPopulated = await Promise.all(
      paymentAlerts.map(async (alert) => {
        const member = await Member.findById(alert.memberId).populate('userId', 'fullName profilePicture');
        return {
          ...alert,
          memberName: (member?.userId as any)?.fullName || 'Unknown',
          profilePicture: (member?.userId as any)?.profilePicture || '',
        };
      })
    );

    sendSuccess(res, {
      activeMembers,
      messBalance: Math.round(messBalance * 100) / 100,
      totalExpenses,
      currentMealRate: Math.round(currentMealRate * 100) / 100,
      recentExpenses,
      recentDeposits,
      paymentAlerts: alertsPopulated,
    });
  } catch (error) {
    sendError(res, (error as Error).message);
  }
};
