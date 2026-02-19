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

    let query: any = {};

    if (search) {
      const users = await User.find({
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
    const member = await Member.findById(req.params.id).populate('userId', '-password');

    if (!member) {
      sendError(res, 'Member not found', 404);
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
            isActive: isActive !== undefined ? isActive : true,
            isVerified: true
        });

        const member = await Member.create({
            userId: user._id
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
    
    const member = await Member.findById(req.params.id);
    if (!member) {
      sendError(res, 'Member not found', 404);
      return;
    }

    // Update User details
    const user = await User.findById(member.userId);
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
    const member = await Member.findById(req.params.id);
    if (!member) {
      sendError(res, 'Member not found', 404);
      return;
    }

    const user = await User.findById(member.userId);
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
        const totalMembers = await Member.countDocuments({ status: 'active' });
        
        const stats = {
            totalMembers,
            totalBalance: 0,
            pendingSettlements: 0
        };

        const balanceAgg = await Member.aggregate([
            { $match: { status: 'active' } },
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
        const member = await Member.findOne({ userId: req.user?._id });
        if (!member) {
            sendError(res, 'Member profile not found', 404);
            return;
        }

        const dashboardData = {
            member,
            recentMeals: [], 
            recentDeposits: [] 
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
        
        if (!date) {
            sendError(res, 'Date is required', 400);
            return;
        }

        const member = await Member.findOne({ userId: req.user?._id });
        if (!member) {
            sendError(res, 'Member profile not found', 404);
            return;
        }

        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (targetDate < today) {
             sendError(res, 'Cannot change meal status for past dates', 400);
             return;
        }

        if (isOff) {
            const exists = member.mealOffDates.some(d => new Date(d).getTime() === targetDate.getTime());
            if (!exists) {
                member.mealOffDates.push(targetDate);
            }
        } else {
            member.mealOffDates = member.mealOffDates.filter(d => new Date(d).getTime() !== targetDate.getTime());
        }

        await member.save();

        sendSuccess(res, { mealOffDates: member.mealOffDates }, 'Meal status updated');
    } catch (error) {
        sendError(res, (error as Error).message);
    }
}
