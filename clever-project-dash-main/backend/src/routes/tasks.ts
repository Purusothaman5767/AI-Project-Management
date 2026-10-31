// backend/src/routes/tasks.ts
import express, { Response } from 'express';
import { Types } from 'mongoose';
import { verifyAccessToken, AuthRequest } from '../middleware/auth';
import { loadProject, authorizeProject } from '../middleware/authorizeProject';
import {
  createTask,
  getAllTasks,
  getTasksByProject,
  getTaskById,
  updateTask,
  deleteTask,
} from '../services/taskService';
import { createTaskSchema, updateTaskSchema } from '../validation/task';
import { isLeadRole } from '../models/User';

const router = express.Router();

/**
 * GET /api/tasks
 * Fetch all tasks visible to the authenticated user across their accessible projects.
 * Supports query filters: projectId, status, priority, assignee, search.
 */
router.get('/tasks', verifyAccessToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id as string;
    const role = req.user?.role as string;
    const { projectId, status, priority, assignee, search } = req.query;

    const tasks = await getAllTasks(userId, role, {
      projectId: typeof projectId === 'string' ? projectId : undefined,
      status: typeof status === 'string' ? status : undefined,
      priority: typeof priority === 'string' ? priority : undefined,
      assignee: typeof assignee === 'string' ? assignee : undefined,
      search: typeof search === 'string' ? search : undefined,
    });

    return res.status(200).json(tasks);
  } catch (err: any) {
    console.error('Error in GET /api/tasks:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * GET /api/projects/:projectId/tasks
 * List tasks belonging to a specific project.
 */
router.get(
  '/projects/:projectId/tasks',
  verifyAccessToken,
  loadProject,
  authorizeProject('view'),
  async (req: AuthRequest, res: Response) => {
    try {
      const projectId = req.params.projectId as string;
      const userId = req.user?.id as string;
      const role = req.user?.role as string;
      const tasks = await getTasksByProject(projectId, userId, role);
      return res.status(200).json(tasks);
    } catch (err: any) {
      console.error('Error in GET /api/projects/:projectId/tasks:', err);
      if (err.message?.includes('Invalid')) return res.status(400).json({ message: err.message });
      if (err.message?.includes('Forbidden')) return res.status(403).json({ message: err.message });
      if (err.message?.includes('not found')) return res.status(404).json({ message: err.message });
      return res.status(500).json({ message: 'Server error' });
    }
  }
);

/**
 * POST /api/projects/:projectId/tasks
 * Create a new task within a specified project.
 */
router.post(
  '/projects/:projectId/tasks',
  verifyAccessToken,
  loadProject,
  authorizeProject('edit'),
  async (req: AuthRequest, res: Response) => {
    try {
      const userRole = req.user?.role as string;
      const project = (req as any).project;
      const isOwner = project && (project.owner?._id ? project.owner._id.toString() : project.owner?.toString()) === req.user?.id;
      if (!isLeadRole(userRole) && !isOwner) {
        return res.status(403).json({ message: 'Forbidden: Only Team Leads can create and assign tasks' });
      }

      const parseResult = createTaskSchema.safeParse(req.body);
      if (!parseResult.success) {
        const errors = parseResult.error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        }));
        return res.status(400).json({ message: 'Invalid request body', errors });
      }

      const validated = parseResult.data;
      const transformed = {
        ...validated,
        assignee: validated.assignee ? new Types.ObjectId(validated.assignee) : undefined,
        dueDate: validated.dueDate ? new Date(validated.dueDate) : undefined,
      } as any;

      const creatorId = req.user?.id as string;
      const task = await createTask(req.params.projectId, transformed, creatorId);
      return res.status(201).json(task);
    } catch (err: any) {
      console.error('Error in POST /api/projects/:projectId/tasks:', err);
      if (err.message?.includes('Invalid')) return res.status(400).json({ message: err.message });
      if (err.message?.includes('Forbidden')) return res.status(403).json({ message: err.message });
      if (err.message?.includes('not found')) return res.status(404).json({ message: err.message });
      return res.status(500).json({ message: 'Server error' });
    }
  }
);

/**
 * POST /api/tasks
 * Generic endpoint to create a task when projectId or project is passed in body.
 */
router.post('/tasks', verifyAccessToken, async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user?.role as string;
    if (!isLeadRole(userRole)) {
      return res.status(403).json({ message: 'Forbidden: Only Team Leads can create and assign tasks' });
    }

    const projectId = req.body.projectId || req.body.project;
    if (!projectId || !Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ message: 'Valid projectId is required in request body' });
    }

    const parseResult = createTaskSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errors = parseResult.error.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      }));
      return res.status(400).json({ message: 'Invalid request body', errors });
    }

    const validated = parseResult.data;
    const transformed = {
      ...validated,
      assignee: validated.assignee ? new Types.ObjectId(validated.assignee) : undefined,
      dueDate: validated.dueDate ? new Date(validated.dueDate) : undefined,
    } as any;

    const creatorId = req.user?.id as string;
    const task = await createTask(projectId, transformed, creatorId);
    return res.status(201).json(task);
  } catch (err: any) {
    console.error('Error in POST /api/tasks:', err);
    if (err.message?.includes('Invalid')) return res.status(400).json({ message: err.message });
    if (err.message?.includes('Forbidden')) return res.status(403).json({ message: err.message });
    if (err.message?.includes('not found')) return res.status(404).json({ message: err.message });
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * GET /api/tasks/:taskId
 * Fetch a single task by ID.
 */
router.get('/tasks/:taskId', verifyAccessToken, async (req: AuthRequest, res: Response) => {
  try {
    const taskId = req.params.taskId as string;
    const userId = req.user?.id as string;
    const role = req.user?.role as string;
    const task = await getTaskById(taskId, userId, role);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    return res.status(200).json(task);
  } catch (err: any) {
    console.error('Error in GET /api/tasks/:taskId:', err);
    if (err.message?.includes('Invalid')) return res.status(400).json({ message: err.message });
    if (err.message?.includes('Forbidden')) return res.status(403).json({ message: err.message });
    if (err.message?.includes('not found')) return res.status(404).json({ message: err.message });
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * PUT /api/tasks/:taskId
 * Update an existing task.
 */
router.put('/tasks/:taskId', verifyAccessToken, async (req: AuthRequest, res: Response) => {
  try {
    const parseResult = updateTaskSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errors = parseResult.error.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      }));
      return res.status(400).json({ message: 'Invalid request body', errors });
    }

    const validated = parseResult.data;
    const transformed: any = {};
    if (validated.title !== undefined) transformed.title = validated.title;
    if (validated.description !== undefined) transformed.description = validated.description;
    if (validated.status !== undefined) transformed.status = validated.status;
    if (validated.priority !== undefined) transformed.priority = validated.priority;
    if (validated.assignee !== undefined) {
      transformed.assignee = validated.assignee ? new Types.ObjectId(validated.assignee) : null;
    }
    if (validated.dueDate !== undefined) {
      transformed.dueDate = validated.dueDate ? new Date(validated.dueDate) : null;
    }

    const taskId = req.params.taskId as string;
    const userId = req.user?.id as string;
    const role = req.user?.role as string;
    const updated = await updateTask(taskId, transformed, userId, role);
    if (!updated) return res.status(404).json({ message: 'Task not found' });
    return res.status(200).json(updated);
  } catch (err: any) {
    console.error('Error in PUT /api/tasks/:taskId:', err);
    if (err.message?.includes('Invalid')) return res.status(400).json({ message: err.message });
    if (err.message?.includes('Forbidden')) return res.status(403).json({ message: err.message });
    if (err.message?.includes('not found')) return res.status(404).json({ message: err.message });
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * PATCH /api/tasks/:taskId
 * Patch an existing task (supports partial updates like status).
 */
router.patch('/tasks/:taskId', verifyAccessToken, async (req: AuthRequest, res: Response) => {
  try {
    const parseResult = updateTaskSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errors = parseResult.error.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      }));
      return res.status(400).json({ message: 'Invalid request body', errors });
    }

    const validated = parseResult.data;
    const transformed: any = {};
    if (validated.title !== undefined) transformed.title = validated.title;
    if (validated.description !== undefined) transformed.description = validated.description;
    if (validated.status !== undefined) transformed.status = validated.status;
    if (validated.priority !== undefined) transformed.priority = validated.priority;
    if (validated.assignee !== undefined) {
      transformed.assignee = validated.assignee ? new Types.ObjectId(validated.assignee) : null;
    }
    if (validated.dueDate !== undefined) {
      transformed.dueDate = validated.dueDate ? new Date(validated.dueDate) : null;
    }

    const taskId = req.params.taskId as string;
    const userId = req.user?.id as string;
    const role = req.user?.role as string;
    const updated = await updateTask(taskId, transformed, userId, role);
    if (!updated) return res.status(404).json({ message: 'Task not found' });
    return res.status(200).json(updated);
  } catch (err: any) {
    console.error('Error in PATCH /api/tasks/:taskId:', err);
    if (err.message?.includes('Invalid')) return res.status(400).json({ message: err.message });
    if (err.message?.includes('Forbidden')) return res.status(403).json({ message: err.message });
    if (err.message?.includes('not found')) return res.status(404).json({ message: err.message });
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * DELETE /api/tasks/:taskId
 * Delete an existing task.
 */
router.delete('/tasks/:taskId', verifyAccessToken, async (req: AuthRequest, res: Response) => {
  try {
    const taskId = req.params.taskId as string;
    const userId = req.user?.id as string;
    const role = req.user?.role as string;
    const deleted = await deleteTask(taskId, userId, role);
    if (!deleted) return res.status(404).json({ message: 'Task not found' });
    return res.status(200).json({ message: 'Task deleted successfully' });
  } catch (err: any) {
    console.error('Error in DELETE /api/tasks/:taskId:', err);
    if (err.message?.includes('Invalid')) return res.status(400).json({ message: err.message });
    if (err.message?.includes('Forbidden')) return res.status(403).json({ message: err.message });
    if (err.message?.includes('not found')) return res.status(404).json({ message: err.message });
    return res.status(500).json({ message: 'Server error' });
  }
});

export default router;
