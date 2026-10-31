import express, { Request, Response } from 'express';
import { Types } from 'mongoose';
import { verifyAccessToken, AuthRequest } from '../middleware/auth';
import { loadProject, authorizeProject } from '../middleware/authorizeProject';
import { createProject, getProjects, getProjectById, updateProject, deleteProject, addMember, removeMember } from '../services/projectService';
import { ProjectStatus, ProjectPriority } from '../models/Project';
import { isLeadRole } from '../models/User';
import { createProjectSchema, updateProjectSchema, addMemberSchema } from '../validation/project';

// No validation schemas currently exist in backend/src/validation/project.ts
// Validation should be added later when schema becomes available.

const router = express.Router();

// GET / - list projects visible to the user
router.get('/', verifyAccessToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id as string;
    const role = req.user?.role as string;
    const projects = await getProjects(userId, role);
    return res.status(200).json(projects);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST / - create a new project (restricted to Team Leads / Admin)
router.post('/', verifyAccessToken, async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user?.role as string;
    if (!isLeadRole(userRole)) {
      return res.status(403).json({ message: 'Forbidden: Only Team Leads can create projects' });
    }

    const parseResult = createProjectSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errors = parseResult.error.errors.map((e) => ({ path: e.path.join('.'), message: e.message }));
      return res.status(400).json({ message: 'Invalid request body', errors });
    }
    // Convert validated fields to types expected by the service
    const validated = parseResult.data;
    const transformed = {
      ...validated,
      members: validated.members?.map((id) => new Types.ObjectId(id)),
      status: validated.status as ProjectStatus | undefined,
      priority: validated.priority as ProjectPriority | undefined,
    };
    const ownerId = req.user?.id as string;
    if (!ownerId) {
      return res.status(401).json({ message: 'Unauthenticated' });
    }
    const project = await createProject(transformed as Parameters<typeof createProject>[0], ownerId);
    return res.status(201).json(project);
  } catch (err: any) {
    console.error(err);
    if (err.message?.includes('Duplicate')) {
      return res.status(409).json({ message: err.message });
    }
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /:id/members - add a member to a project (must be before /:id routes)
router.post('/:id/members', verifyAccessToken, loadProject, authorizeProject('manageMembers'), async (req: AuthRequest, res: Response) => {
  try {
    const parseResult = addMemberSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errors = parseResult.error.errors.map((e) => ({ path: e.path.join('.'), message: e.message }));
      return res.status(400).json({ message: 'Invalid request body', errors });
    }
    const { userId } = parseResult.data;
    const projectId = req.params.id as string;
    const updated = await addMember(projectId, userId);
    return res.status(200).json(updated);
  } catch (err: any) {
    console.error(err);
    if (err.message?.includes('User not found')) {
      return res.status(404).json({ message: err.message });
    }
    if (err.message?.includes('Project not found')) {
      return res.status(404).json({ message: err.message });
    }
    return res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /:id/members/:userId - remove a member from a project
router.delete('/:id/members/:userId', verifyAccessToken, loadProject, authorizeProject('manageMembers'), async (req: AuthRequest, res: Response) => {
  try {
    const projectId = req.params.id as string;
    const memberId = req.params.userId as string;
    const updated = await removeMember(projectId, memberId);
    return res.status(200).json(updated);
  } catch (err: any) {
    console.error(err);
    if (err.message?.includes('Cannot remove the project owner')) {
      return res.status(400).json({ message: err.message });
    }
    if (err.message?.includes('Project not found')) {
      return res.status(404).json({ message: err.message });
    }
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /:id - get a single project
router.get('/:id', verifyAccessToken, loadProject, authorizeProject('view'), async (req: AuthRequest, res: Response) => {
  try {
    const project = await getProjectById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    return res.status(200).json(project);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// PUT /:id - update a project
router.put('/:id', verifyAccessToken, loadProject, authorizeProject('edit'), async (req: AuthRequest, res: Response) => {
  try {
    const parseResult = updateProjectSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errors = parseResult.error.errors.map((e) => ({ path: e.path.join('.'), message: e.message }));
      return res.status(400).json({ message: 'Invalid request body', errors });
    }
    const validated = parseResult.data;
    const transformed = {
      ...validated,
      members: validated.members?.map((id) => new Types.ObjectId(id)),
      status: validated.status as ProjectStatus | undefined,
      priority: validated.priority as ProjectPriority | undefined,
    };
    const updated = await updateProject(req.params.id, transformed as Parameters<typeof updateProject>[1]);
    return res.status(200).json(updated);
  } catch (err: any) {
    console.error(err);
    if (err.message?.includes('Project not found')) {
      return res.status(404).json({ message: err.message });
    }
    return res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /:id - delete a project
router.delete('/:id', verifyAccessToken, loadProject, authorizeProject('delete'), async (req: AuthRequest, res: Response) => {
  try {
    const deleted = await deleteProject(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Project not found' });
    return res.status(200).json({ message: 'Project deleted' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

export default router;
