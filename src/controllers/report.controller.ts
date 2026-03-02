import { Request, Response } from 'express';
import Meal from '../models/Meal';
import Expense from '../models/Expense';
import Member from '../models/Member';
import Deposit from '../models/Deposit';
import Mess from '../models/Mess';
import { sendSuccess, sendError } from '../utils/helpers';

// @desc    Get monthly meal rate trend (last N months)
// @route   GET /api/reports/meal-rate-trend?months=6&month=10&year=2023
export const getMealRateTrend = async (req: Request, res: Response): Promise<void> => {
  try {
    const monthsBack = parseInt(req.query.months as string) || 6;
    const messId = req.user?.messId;

    if (!messId) {
      sendError(res, 'User is not associated with any mess', 400);
      return;
    }
    
    // Determine reference date (default to current date if not provided)
    let refDate = new Date();
    if (req.query.month && req.query.year) {
      const m = parseInt(req.query.month as string);
      const y = parseInt(req.query.year as string);
      refDate = new Date(y, m - 1, 1);
    }

    const trend: Array<{ month: string; year: number; rate: number }> = [];

    for (let i = monthsBack - 1; i >= 0; i--) {
      const date = new Date(refDate.getFullYear(), refDate.getMonth() - i, 1);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      const meals = await Meal.find({ messId, date: { $gte: startDate, $lte: endDate } });
      const totalMeals = meals.reduce((sum, m) => sum + m.totalMeals, 0);

      const expenses = await Expense.find({
        messId,
        date: { $gte: startDate, $lte: endDate },
        status: 'approved',
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

// @desc    Get member dashboard overview data
// @route   GET /api/reports/member-dashboard
export const getMemberDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    const messId = req.user?.messId;

    if (!messId) {
      sendError(res, 'User is not associated with any mess', 400);
      return;
    }

    const member = await Member.findOne({ userId, messId }).populate('userId', 'fullName profilePicture');
    
    if (!member) {
      sendError(res, 'Member profile not found', 404);
      return;
    }

    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // 1. Calculate Meal Rate
    const allMeals = await Meal.find({ messId, date: { $gte: startDate, $lte: endDate } });
    const totalAllMeals = allMeals.reduce((sum, m) => sum + m.totalMeals, 0);
    
    const expenses = await Expense.find({ messId, date: { $gte: startDate, $lte: endDate }, status: 'approved' });
    const bazarCost = expenses
      .filter((e) => ['meat_fish', 'vegetables', 'groceries'].includes(e.category))
      .reduce((sum, e) => sum + e.amount - e.adjustment, 0);
    
    const mealRate = totalAllMeals > 0 ? bazarCost / totalAllMeals : 0;

    // 2. Member Meal Stats
    let memberMeals = 0;
    allMeals.forEach((meal) => {
      const entry = meal.entries.find((e) => e.memberId.toString() === member._id.toString());
      if (entry) {
        memberMeals += entry.breakfast + entry.lunch + entry.dinner + entry.guest;
      }
    });

    // 3. Fixed Costs Share
    const fixedExpenses = expenses
      .filter((e) => ['rent', 'gas', 'utility', 'other'].includes(e.category))
      .reduce((sum, e) => sum + e.amount - e.adjustment, 0);
    
    const activeMembersCount = await Member.countDocuments({ messId, status: 'active' });
    const fixedShare = activeMembersCount > 0 ? fixedExpenses / activeMembersCount : 0;

    // 4. Financials
    const estimatedCost = (memberMeals * mealRate) + fixedShare;
    
    // Get total deposited this month
    const deposits = await Deposit.find({
      memberId: member._id,
      messId,
      status: 'approved',
      date: { $gte: startDate, $lte: endDate },
    });
    let totalDeposited = deposits.reduce((sum, d) => sum + d.amount, 0);

    // Add personal expenses as deposit
    const personalExpenses = await Expense.find({
        buyerId: member._id,
        messId,
        paymentSource: 'personal',
        date: { $gte: startDate, $lte: endDate },
    });
    totalDeposited += personalExpenses.reduce((sum, e) => sum + e.amount - e.adjustment, 0);

    // 5. Recent Activity
    const recentMeals = await Meal.find({
        messId,
        'entries.memberId': member._id,
        date: { $gte: startDate, $lte: endDate }
    }).sort({ date: -1 }).limit(5);

    const recentDeposits = await Deposit.find({
        memberId: member._id,
        messId
    }).sort({ createdAt: -1 }).limit(5);

    const mess = await Mess.findById(messId).select('name');

    sendSuccess(res, {
      messName: mess?.name || 'My Mess',
      memberInfo: {
        fullName: (member.userId as any).fullName,
        profilePicture: (member.userId as any).profilePicture,
        role: req.user?.role
      },
      mealStats: {
        totalMeals: memberMeals,
        mealRate: Math.round(mealRate * 100) / 100,
        estimatedCost: Math.round(estimatedCost * 100) / 100
      },
      financials: {
        totalDeposited: Math.round(totalDeposited * 100) / 100,
        totalLiability: Math.round(estimatedCost * 100) / 100,
        currentBalance: Math.round((totalDeposited - estimatedCost) * 100) / 100
      },
      recentMeals: recentMeals.map(m => {
          const entry = m.entries.find(e => e.memberId.toString() === member._id.toString());
          return {
              date: m.date,
              breakfast: entry?.breakfast || 0,
              lunch: entry?.lunch || 0,
              dinner: entry?.dinner || 0,
              guest: entry?.guest || 0
          };
      }),
      recentDeposits,
      month: startDate.toLocaleString('default', { month: 'long' })
    });

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
    const messId = req.user?.messId;

    if (!messId) {
      sendError(res, 'User is not associated with any mess', 400);
      return;
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // Get all active members for this mess
    const members = await Member.find({ messId, status: 'active' }).populate('userId', 'fullName profilePicture');
    const activeCount = members.length;

    // Get all meals for the month and mess
    const meals = await Meal.find({ messId, date: { $gte: startDate, $lte: endDate } });

    // Get all expenses for this mess
    const expenses = await Expense.find({ messId, date: { $gte: startDate, $lte: endDate }, status: 'approved' });

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
          messId,
          status: 'approved',
          date: { $gte: startDate, $lte: endDate },
        });
        
        let deposited = deposits.reduce((sum, d) => sum + d.amount, 0);

        // Get personal expenses for this member (treated as deposit)
        const personalExpenses = await Expense.find({
            buyerId: member._id,
            messId,
            paymentSource: 'personal',
            date: { $gte: startDate, $lte: endDate },
        });
        const personalExpenseAmount = personalExpenses.reduce((sum, e) => sum + e.amount - e.adjustment, 0);
        deposited += personalExpenseAmount;

        const balance = deposited - totalLiability;

        return {
          memberId: member._id,
          memberName: (member.userId as any)?.fullName || 'Unknown Member',
          profilePicture: (member.userId as any)?.profilePicture || '',
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
    const messId = req.user?.messId;
    if (!messId) {
      sendError(res, 'User is not associated with any mess', 400);
      return;
    }

    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // Active members
    const activeMembers = await Member.countDocuments({ messId, status: 'active' });

    // Total balance (mess fund)
    const members = await Member.find({ messId, status: 'active' });
    const messBalance = members.reduce((sum, m) => sum + m.currentBalance, 0);

    // Total expenses this month
    const expenses = await Expense.find({ messId, date: { $gte: startDate, $lte: endDate }, status: 'approved' });
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    // Current meal rate
    const meals = await Meal.find({ messId, date: { $gte: startDate, $lte: endDate } });
    const totalMeals = meals.reduce((sum, m) => sum + m.totalMeals, 0);
    const bazarCost = expenses
      .filter((e) => ['meat_fish', 'vegetables', 'groceries'].includes(e.category))
      .reduce((sum, e) => sum + e.amount, 0);
    const currentMealRate = totalMeals > 0 ? bazarCost / totalMeals : 0;

    // Recent activities (last 10 expenses + deposits)
    const recentExpenses = await Expense.find({ messId })
      .populate({
        path: 'buyerId',
        populate: { path: 'userId', select: 'fullName profilePicture' },
      })
      .sort({ createdAt: -1 })
      .limit(5);

    const recentDeposits = await Deposit.find({ messId })
      .populate({
        path: 'memberId',
        populate: { path: 'userId', select: 'fullName profilePicture' },
      })
      .sort({ createdAt: -1 })
      .limit(5);

    // Payment alerts (members with negative balance)
    const alertsPopulated = await Promise.all(
      members
        .filter((m) => m.currentBalance < 0)
        .map(async (m) => {
          const member = await Member.findById(m._id).populate('userId', 'fullName profilePicture');
          return {
            memberId: m._id,
            amount: Math.abs(m.currentBalance),
            memberName: (member?.userId as any)?.fullName || 'Unknown',
            profilePicture: (member?.userId as any)?.profilePicture || '',
          };
        })
    );

    const mess = await Mess.findById(messId).select('name inviteCode');

    sendSuccess(res, {
      mess: {
        name: mess?.name || 'My Mess',
        inviteCode: mess?.inviteCode || '',
      },
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
