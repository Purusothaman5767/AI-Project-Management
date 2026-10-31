// backend/src/middleware/authorizeProject.ts
import { Request, Response, NextFunction } from 'express';
import { Project } from '../models/Project';
import { AuthRequest } from './auth';
import mongoose from 'mongoose';

/**
 * Helper to fetch project and attach to request.
 */
export const loadProject = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const projectId = req.params.projectId || req.params.id;
  if (!projectId || !mongoose.isValidObjectId(projectId)) {
    return res.status(400).json({ message: 'Invalid project ID' });
  }
  const project = await Project.findById(projectId).exec();
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }
  // @ts-ignore attach for later middleware
  (req as any).project = project;
  next();
};

/**
 * Authorization checks based on role and project ownership / membership.
 */
export const authorizeProject = (action: 'view' | 'edit' | 'manageMembers' | 'delete') => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) return res.status(401).json({ message: 'Unauthenticated' });
    const project = (req as any).project;
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const ownerId = project.owner?._id ? project.owner._id.toString() : project.owner?.toString();
    const isOwner = ownerId === user.id;
    const isMember = (project.members || []).some((m: any) => {
      const memberId = m?._id ? m._id.toString() : m?.toString();
      return memberId === user.id;
    });
    const role = user.role as string;

    // ADMIN or project owner has full access to all project actions
    if (role === 'ADMIN' || isOwner) {
      return next();
    }

    // Viewing: permitted for project members
    if (action === 'view') {
      if (isMember) return next();
      return res.status(403).json({ message: 'Forbidden: not a project member' });
    }

    // Editing tasks or details: permitted for project members
    if (action === 'edit') {
      if (isMember) return next();
      return res.status(403).json({ message: 'Forbidden: not a project member' });
    }

    // Managing members or deleting project: restricted to project owner or ADMIN
    if (action === 'manageMembers' || action === 'delete') {
      return res.status(403).json({ message: 'Forbidden: only the project owner or an administrator can manage members or delete this project' });
    }

    return res.status(403).json({ message: 'Forbidden' });
  };
};

