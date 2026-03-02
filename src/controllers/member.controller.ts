import { Request, Response } from 'express';
import Member from '../models/Member';
import User from '../models/User';
import { sendSuccess, sendError } from '../utils/helpers';

// @desc    Get all members
// @route   GET /api/members
export const getAllMembers = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search as string;
    const messId = req.user?.messId;

    if (!messId) {
      sendError(res, 'User is not associated with any mess', 400);
      return;
    }

    let query: any = { messId };

    if (search) {
      const users = await User.find({
        messId,
        $or: [
          { fullName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
        ],
      }).select('_id');
      
      const userIds = users.map(user => user._id);
      query.userId = { $in: userIds };
    }

    const members = await Member.find(query)
      .populate('userId', 'fullName email phone role profilePicture isActive joinDate')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Member.countDocuments(query);

    sendSuccess(res, {
      members,
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

// @desc    Get single member
// @route   GET /api/members/:id
export const getMemberById = async (req: Request, res: Response): Promise<void> => {
  try {
    const messId = req.user?.messId;
    const member = await Member.findOne({
      _id: req.params.id,
      messId,
    }).populate('userId', '-password');

    if (!member) {
      sendError(res, 'Member not found or not authorized', 404);
      return;
    }

    sendSuccess(res, { member });
  } catch (error) {
    sendError(res, (error as Error).message);
  }
};

// @desc    Create new member (Admin only)
// @route   POST /api/members
export const createMember = async (req: Request, res: Response): Promise<void> => {
    try {
        const { fullName, email, phone, password, role, isActive } = req.body;
        const messId = req.user?.messId;

        if (!messId) {
            sendError(res, 'User is not associated with any mess', 400);
            return;
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            sendError(res, 'User already exists', 400);
            return;
        }

        const user = await User.create({
            fullName,
            email,
            phone,
            password,
            role: role || 'member',
            messId,
            isActive: isActive !== undefined ? isActive : true,
            isVerified: true
        });

        const member = await Member.create({
            userId: user._id,
            messId
        });

        sendSuccess(res, { member, user }, 'Member created successfully', 201);
    } catch (error) {
        sendError(res, (error as Error).message);
    }
};


// @desc    Update member
// @route   PUT /api/members/:id
export const updateMember = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fullName, email, phone, role, isActive, status } = req.body;
    const messId = req.user?.messId;
    
    const member = await Member.findOne({ _id: req.params.id, messId });
    if (!member) {
      sendError(res, 'Member not found or not authorized', 404);
      return;
    }

    // Update User details
    const user = await User.findOne({ _id: member.userId, messId });
    if (user) {
        if (fullName) user.fullName = fullName;
        if (email) user.email = email;
        if (phone) user.phone = phone;
        if (role) user.role = role;
        if (isActive !== undefined) user.isActive = isActive;
        await user.save();
    }

    // Update Member details
    if (status) member.status = status;
    await member.save();

    sendSuccess(res, { member }, 'Member updated successfully');
  } catch (error) {
    sendError(res, (error as Error).message);
  }
};

// @desc    Delete member (Soft delete)
// @route   DELETE /api/members/:id
export const deleteMember = async (req: Request, res: Response): Promise<void> => {
  try {
    const messId = req.user?.messId;
    const member = await Member.findOne({ _id: req.params.id, messId });
    if (!member) {
      sendError(res, 'Member not found or not authorized', 404);
      return;
    }

    const user = await User.findOne({ _id: member.userId, messId });
    if (user) {
        user.isActive = false;
        await user.save();
    }

    member.status = 'inactive';
    await member.save();

    sendSuccess(res, null, 'Member deactivated successfully');
  } catch (error) {
    sendError(res, (error as Error).message);
  }
};

// @desc    Get member stats (Admin)
// @route   GET /api/members/stats
export const getMemberStats = async (req: Request, res: Response): Promise<void> => {
    try {
        const messId = req.user?.messId;
        const totalMembers = await Member.countDocuments({ status: 'active', messId });
        
        const stats = {
            totalMembers,
            totalBalance: 0,
            pendingSettlements: 0
        };

        const balanceAgg = await Member.aggregate([
            { $match: { status: 'active', messId } },
            { $group: { _id: null, total: { $sum: '$currentBalance' } } }
        ]);

        if (balanceAgg.length > 0) {
            stats.totalBalance = balanceAgg[0].total;
        }

        sendSuccess(res, { stats });
    } catch (error) {
        sendError(res, (error as Error).message);
    }
}

// @desc    Get dashboard data (Member)
// @route   GET /api/members/me/dashboard
export const getMyDashboard = async (req: Request, res: Response): Promise<void> => {
    try {
        const messId = req.user?.messId;
        if (!messId) {
            sendError(res, 'User is not associated with any mess', 400);
            return;
        }

        const member = await Member.findOne({ userId: req.user?._id, messId });
        if (!member) {
            sendError(res, 'Member profile not found', 404);
            return;
        }

        const recentMeals = await (await import('../models/Meal')).default.find({
            messId,
            'entries.memberId': member._id,
        }).sort({ date: -1 }).limit(10);

        const recentDeposits = await (await import('../models/Deposit')).default.find({
            messId,
            memberId: member._id,
        }).sort({ date: -1 }).limit(10);

        const dashboardData = {
            member,
            recentMeals, 
            recentDeposits 
        };

        sendSuccess(res, { dashboardData });
    } catch (error) {
        sendError(res, (error as Error).message);
    }
}

// @desc    Toggle meal off
// @route   PUT /api/members/me/meal-off
export const toggleMealOff = async (req: Request, res: Response): Promise<void> => {
    try {
        const { date, isOff } = req.body; 
        const messId = req.user?.messId;
        
        if (!messId) {
            sendError(res, 'User is not associated with any mess', 400);
            return;
        }

        if (!date) {
            sendError(res, 'Date is required', 400);
            return;
        }

        const member = await Member.findOne({ userId: req.user?._id, messId });
        if (!member) {
            sendError(res, 'Member profile not found', 404);
            return;
        }

        if (member.status !== 'active') {
            sendError(res, 'Member is not active', 403);
            return;
        }

        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);

        const now = new Date();
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Check date constraints
        if (targetDate < today) {
             sendError(res, 'Cannot change meal status for past dates', 400);
             return;
        }

        if (targetDate.getTime() === today.getTime()) {
             sendError(res, 'Cannot change meal status for today. Please contact manager.', 400);
             return;
        }

        // If target is tomorrow, check deadline from settings
        if (targetDate.getTime() === tomorrow.getTime()) {
            const settings = await (await import('../models/MessSettings')).default.findOne({ messId });
            const deadline = settings?.mealOffDeadlineHour || 22; // Default 10 PM
            
            const currentHour = now.getHours();
            if (currentHour >= deadline) {
                sendError(res, `Meal off deadline (${deadline % 12 || 12}:00 ${deadline >= 12 ? 'PM' : 'AM'}) has passed for tomorrow.`, 400);
                return;
            }
        }

        // Toggle logic
        if (isOff) {
            // Add date if not exists
            const exists = member.mealOffDates.some(d => new Date(d).getTime() === targetDate.getTime());
            if (!exists) {
                member.mealOffDates.push(targetDate);
            }
        } else {
            // Remove date
            member.mealOffDates = member.mealOffDates.filter(d => new Date(d).getTime() !== targetDate.getTime());
        }

        await member.save();

        sendSuccess(res, { mealOffDates: member.mealOffDates }, 'Meal status updated');
    } catch (error) {
        sendError(res, (error as Error).message);
    }
}
