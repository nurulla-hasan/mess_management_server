import { Request, Response } from 'express';
import User from '../models/User';
import Member from '../models/Member';
import Deposit from '../models/Deposit';
import Meal from '../models/Meal';
import { sendSuccess, sendError, sendPaginated, getPagination } from '../utils/helpers';

// @desc    Get all members
// @route   GET /api/members
export const getMembers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const search = (req.query.search as string) || '';

    // Build search query on User fields
    let userFilter: any = {};
    if (search) {
      userFilter = {
        $or: [
          { fullName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
        ],
      };
    }

    // Find matching user IDs
    const matchingUsers = search
      ? await User.find(userFilter).select('_id')
      : null;

    const memberFilter: any = {};
    if (matchingUsers) {
      memberFilter.userId = { $in: matchingUsers.map((u) => u._id) };
    }

    const total = await Member.countDocuments(memberFilter);
    const members = await Member.find(memberFilter)
      .populate('userId', '-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    sendPaginated(res, members, total, page, limit, 'Members fetched successfully');
  } catch (error) {
    sendError(res, (error as Error).message);
  }
};

// @desc    Get single member
// @route   GET /api/members/:id
export const getMember = async (req: Request, res: Response): Promise<void> => {
  try {
    const member = await Member.findById(req.params.id).populate('userId', '-password');
    if (!member) {
      sendError(res, 'Member not found', 404);
      return;
    }
    sendSuccess(res, member);
  } catch (error) {
    sendError(res, (error as Error).message);
  }
};

// @desc    Add new member (creates user + member)
// @route   POST /api/members
export const addMember = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fullName, email, phone, password, role, joinDate } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      sendError(res, 'User already exists with this email', 400);
      return;
    }

    // Create user
    const user = await User.create({
      fullName,
      email,
      phone,
      password,
      role: role || 'member',
      joinDate: joinDate ? new Date(joinDate) : new Date(),
    });

    // Create member record
    const member = await Member.create({
      userId: user._id,
    });

    const populatedMember = await Member.findById(member._id).populate('userId', '-password');
    sendSuccess(res, populatedMember, 'Member added successfully', 201);
  } catch (error) {
    sendError(res, (error as Error).message);
  }
};

// @desc    Update member
// @route   PUT /api/members/:id
export const updateMember = async (req: Request, res: Response): Promise<void> => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) {
      sendError(res, 'Member not found', 404);
      return;
    }

    const { fullName, email, phone, role, isActive, joinDate } = req.body;

    // Update user fields
    const userUpdates: any = {};
    if (fullName) userUpdates.fullName = fullName;
    if (email) userUpdates.email = email;
    if (phone) userUpdates.phone = phone;
    if (role) userUpdates.role = role;
    if (typeof isActive === 'boolean') userUpdates.isActive = isActive;
    if (joinDate) userUpdates.joinDate = new Date(joinDate);

    if (Object.keys(userUpdates).length > 0) {
      // Check email uniqueness
      if (email) {
        const existing = await User.findOne({ email, _id: { $ne: member.userId } });
        if (existing) {
          sendError(res, 'Email already in use', 400);
          return;
        }
      }
      await User.findByIdAndUpdate(member.userId, userUpdates, { runValidators: true });
    }

    // Update member status
    if (typeof isActive === 'boolean') {
      member.status = isActive ? 'active' : 'inactive';
      await member.save();
    }

    const updatedMember = await Member.findById(req.params.id).populate('userId', '-password');
    sendSuccess(res, updatedMember, 'Member updated successfully');
  } catch (error) {
    sendError(res, (error as Error).message);
  }
};

// @desc    Delete (deactivate) member
// @route   DELETE /api/members/:id
export const deleteMember = async (req: Request, res: Response): Promise<void> => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) {
      sendError(res, 'Member not found', 404);
      return;
    }

    // Soft delete - deactivate
    member.status = 'inactive';
    await member.save();
    await User.findByIdAndUpdate(member.userId, { isActive: false });

    sendSuccess(res, null, 'Member deactivated successfully');
  } catch (error) {
    sendError(res, (error as Error).message);
  }
};

// @desc    Get member stats (for admin bottom bar)
// @route   GET /api/members/stats
export const getMemberStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const activeMembers = await Member.countDocuments({ status: 'active' });
    const members = await Member.find({ status: 'active' });

    const totalBalance = members.reduce((sum, m) => sum + m.currentBalance, 0);
    const totalDeposits = members.reduce((sum, m) => sum + m.totalDeposits, 0);
    const totalMeals = members.reduce((sum, m) => sum + m.totalMeals, 0);
    const avgMealCost = totalMeals > 0 ? totalDeposits / totalMeals : 0;

    const pendingSettlements = members
      .filter((m) => m.currentBalance < 0)
      .reduce((sum, m) => sum + Math.abs(m.currentBalance), 0);

    sendSuccess(res, {
      activeMembers,
      totalBalance,
      avgMealCost: Math.round(avgMealCost * 100) / 100,
      pendingSettlements,
    });
  } catch (error) {
    sendError(res, (error as Error).message);
  }
};

// @desc    Get my dashboard data (for member panel)
// @route   GET /api/members/me/dashboard
export const getMyDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const member = await Member.findOne({ userId: req.user?._id });
    if (!member) {
      sendError(res, 'Member not found', 404);
      return;
    }

    // Get recent meals
    const recentMeals = await Meal.find({
      'entries.memberId': member._id,
    })
      .sort({ date: -1 })
      .limit(10);

    // Extract my meal entries
    const myMealHistory = recentMeals.map((meal) => {
      const myEntry = meal.entries.find(
        (e) => e.memberId.toString() === member._id.toString()
      );
      return {
        date: meal.date,
        breakfast: myEntry?.breakfast || 0,
        lunch: myEntry?.lunch || 0,
        dinner: myEntry?.dinner || 0,
        total: (myEntry?.breakfast || 0) + (myEntry?.lunch || 0) + (myEntry?.dinner || 0) + (myEntry?.guest || 0),
      };
    });

    // Get recent deposits
    const recentDeposits = await Deposit.find({ memberId: member._id })
      .sort({ date: -1 })
      .limit(10);

    // Get all active members count
    const totalActiveMembers = await Member.countDocuments({ status: 'active' });

    sendSuccess(res, {
      member,
      user: req.user,
      myMealHistory,
      recentDeposits,
      totalActiveMembers,
    });
  } catch (error) {
    sendError(res, (error as Error).message);
  }
};

// @desc    Toggle meal off for a specific date
// @route   PUT /api/members/me/meal-off
export const toggleMealOff = async (req: Request, res: Response): Promise<void> => {
  try {
    const { date } = req.body;
    const targetDate = new Date(date);

    const member = await Member.findOne({ userId: req.user?._id });
    if (!member) {
      sendError(res, 'Member not found', 404);
      return;
    }

    // Check if date is already in mealOffDates
    const existingIndex = member.mealOffDates.findIndex(
      (d) => d.toDateString() === targetDate.toDateString()
    );

    if (existingIndex > -1) {
      // Remove from meal off (re-enable meals)
      member.mealOffDates.splice(existingIndex, 1);
      await member.save();
      sendSuccess(res, { mealOff: false, date: targetDate }, 'Meals re-enabled for this date');
    } else {
      // Add to meal off
      member.mealOffDates.push(targetDate);
      await member.save();
      sendSuccess(res, { mealOff: true, date: targetDate }, 'Meals turned off for this date');
    }
  } catch (error) {
    sendError(res, (error as Error).message);
  }
};
