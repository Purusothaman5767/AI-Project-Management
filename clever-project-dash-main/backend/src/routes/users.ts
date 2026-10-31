// backend/src/routes/users.ts
import express, { Response } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { User, IUser, UserRole } from '../models/User';
import { Task } from '../models/Task';
import { verifyAccessToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

function getInitials(name?: string): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0];
  if (!first) return '??';
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  const last = parts[parts.length - 1];
  const lastChar = last ? last.charAt(0) : '';
  return (first.charAt(0) + lastChar).toUpperCase();
}

/**
 * GET /api/users
 * Returns list of all active users in the system (sanitized, excluding passwords/hashes).
 * Accessible to any authenticated user.
 */
router.get('/', verifyAccessToken, async (_req: AuthRequest, res: Response) => {
  try {
    const users = await User.find()
      .select('_id name email role createdAt')
      .sort({ name: 1 })
      .lean()
      .exec();

    const formatted = users.map((u) => ({
      _id: u._id.toString(),
      name: u.name,
      email: u.email,
      role: u.role,
      initials: getInitials(u.name),
      createdAt: u.createdAt,
    }));

    return res.status(200).json(formatted);
  } catch (err: any) {
    console.error('Error fetching users:', err);
    return res.status(500).json({ message: 'Failed to fetch users' });
  }
});

/**
 * Calculates real-time team workload and assigned task metrics from MongoDB.
 */
export const getTeamHandler = async (_req: AuthRequest, res: Response) => {
  try {
    const users = await User.find()
      .select('_id name email role createdAt')
      .sort({ name: 1 })
      .lean()
      .exec();

    const tasks = await Task.find()
      .select('_id assignee status priority dueDate')
      .lean()
      .exec();

    const now = new Date();

    // Group task stats by assignee
    const statsMap: Record<
      string,
      {
        assignedTasks: number;
        completedTasks: number;
        pendingTasks: number;
        overdueTasks: number;
        workloadScore: number;
      }
    > = {};

    for (const u of users) {
      statsMap[u._id.toString()] = {
        assignedTasks: 0,
        completedTasks: 0,
        pendingTasks: 0,
        overdueTasks: 0,
        workloadScore: 0,
      };
    }

    for (const t of tasks) {
      if (t.assignee) {
        const aId = t.assignee.toString();
        if (statsMap[aId]) {
          statsMap[aId].assignedTasks += 1;
          if (t.status === 'DONE') {
            statsMap[aId].completedTasks += 1;
          } else {
            statsMap[aId].pendingTasks += 1;
            // Weighted workload contribution based on task priority
            const weight =
              t.priority === 'CRITICAL' ? 30 : t.priority === 'HIGH' ? 22 : t.priority === 'MEDIUM' ? 15 : 10;
            statsMap[aId].workloadScore += weight;

            if (t.dueDate && new Date(t.dueDate).getTime() < now.getTime()) {
              statsMap[aId].overdueTasks += 1;
            }
          }
        }
      }
    }

    const teamList = users.map((u) => {
      const stats = statsMap[u._id.toString()] || {
        assignedTasks: 0,
        completedTasks: 0,
        pendingTasks: 0,
        overdueTasks: 0,
        workloadScore: 0,
      };

      // Normalize workload into a percentage (max 100%)
      // 0 tasks = 0%, 1-2 small tasks ~ 20-35%, 3-4 tasks ~ 50-70%, 5+ high priority ~ 85-100%
      let workloadPercent = Math.min(Math.round(stats.workloadScore * 1.2), 100);
      if (stats.pendingTasks === 0) {
        workloadPercent = 0;
      } else if (workloadPercent < 20) {
        workloadPercent = 20;
      }

      return {
        _id: u._id.toString(),
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        role: u.role,
        initials: getInitials(u.name),
        assignedTasks: stats.assignedTasks,
        completedTasks: stats.completedTasks,
        pendingTasks: stats.pendingTasks,
        overdueTasks: stats.overdueTasks,
        workload: workloadPercent,
      };
    });

    return res.status(200).json(teamList);
  } catch (err: any) {
    console.error('Error fetching team:', err);
    return res.status(500).json({ message: 'Failed to fetch team data' });
  }
};

router.get('/team', verifyAccessToken, getTeamHandler);

/**
 * GET /api/users/me
 * Returns current authenticated user profile
 */
router.get('/me', verifyAccessToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthenticated' });
    const user = await User.findById(userId).select('-passwordHash -refreshTokenHash -__v').exec();
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      initials: getInitials(user.name),
      createdAt: user.createdAt,
    });
  } catch (err: any) {
    console.error('Error fetching profile:', err);
    return res.status(500).json({ message: 'Failed to fetch profile' });
  }
});

const UpdateRoleSchema = z.object({
  role: z.nativeEnum(UserRole),
});

/**
 * PATCH /api/users/:id/role
 * Allows ADMIN to update user role
 */
router.patch('/:id/role', verifyAccessToken, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== UserRole.ADMIN && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden: only an administrator can change user roles' });
    }
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    const parse = UpdateRoleSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ message: 'Invalid role provided' });
    }

    const updated = await User.findByIdAndUpdate(
      id,
      { role: parse.data.role },
      { new: true }
    ).select('-passwordHash -refreshTokenHash -__v');

    if (!updated) return res.status(404).json({ message: 'User not found' });
    return res.status(200).json(updated);
  } catch (err: any) {
    console.error('Error updating user role:', err);
    return res.status(500).json({ message: 'Failed to update user role' });
  }
});

export default router;
