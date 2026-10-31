// backend/src/services/taskService.ts
import { Types } from 'mongoose';
import { Task, ITask } from '../models/Task';
import { Project } from '../models/Project';
import { User, UserRole, isLeadRole } from '../models/User';

/** Helper to check if a user can view a project */
const canViewProject = (project: any, userId: string, role: string): boolean => {
  if (role === UserRole.ADMIN || role === 'ADMIN') return true;
  const ownerStr = project.owner?._id ? project.owner._id.toString() : project.owner?.toString();
  if (ownerStr === userId) return true;
  const isMember = (project.members || []).some((m: any) => {
    const memberId = m?._id ? m._id.toString() : m?.toString();
    return memberId === userId;
  });
  return isMember;
};

/** Helper to check if a user can edit a project (create / update / delete tasks) */
const canEditProject = (project: any, userId: string, role: string): boolean => {
  if (role === UserRole.ADMIN || role === 'ADMIN') return true;
  const ownerStr = project.owner?._id ? project.owner._id.toString() : project.owner?.toString();
  if (ownerStr === userId) return true;
  const isMember = (project.members || []).some((m: any) => {
    const memberId = m?._id ? m._id.toString() : m?.toString();
    return memberId === userId;
  });
  return isMember;
};

/** Helper to verify if an assignee is allowed on a project (must be the owner or a member) */
const isValidAssignee = (project: any, assigneeId: Types.ObjectId | string): boolean => {
  const assigneeStr = assigneeId.toString();
  const ownerStr = project.owner?._id ? project.owner._id.toString() : project.owner?.toString();
  if (ownerStr && ownerStr === assigneeStr) {
    return true;
  }
  const isMember = (project.members || []).some((m: any) => {
    const memberIdStr = m?._id ? m._id.toString() : m?.toString();
    return memberIdStr === assigneeStr;
  });
  return isMember;
};

export interface TaskFilterOptions {
  projectId?: string;
  status?: string;
  priority?: string;
  assignee?: string;
  search?: string;
}

/** Get all tasks visible to a user across projects with optional filters */
export const getAllTasks = async (
  userId: string,
  role: string,
  filters: TaskFilterOptions = {}
) => {
  let projectIds: Types.ObjectId[] = [];

  if (role === UserRole.ADMIN || role === 'ADMIN') {
    if (filters.projectId && Types.ObjectId.isValid(filters.projectId)) {
      projectIds = [new Types.ObjectId(filters.projectId)];
    } else {
      const allProjects = await Project.find().select('_id').exec();
      projectIds = allProjects.map((p) => p._id as Types.ObjectId);
    }
  } else {
    // Non-admin can only see tasks from projects they own or belong to
    const accessibleProjects = await Project.find({
      $or: [{ owner: userId }, { members: userId }],
    }).select('_id').exec();
    const accessibleIds = accessibleProjects.map((p) => p._id.toString());

    if (filters.projectId) {
      if (!accessibleIds.includes(filters.projectId)) {
        return [];
      }
      projectIds = [new Types.ObjectId(filters.projectId)];
    } else {
      projectIds = accessibleProjects.map((p) => p._id as Types.ObjectId);
    }
  }

  const query: any = { project: { $in: projectIds } };

  if (filters.status) {
    query.status = filters.status;
  }
  if (filters.priority) {
    query.priority = filters.priority;
  }
  if (filters.assignee && Types.ObjectId.isValid(filters.assignee)) {
    query.assignee = new Types.ObjectId(filters.assignee);
  }
  if (filters.search) {
    query.title = { $regex: filters.search.trim(), $options: 'i' };
  }

  return await Task.find(query)
    .populate('creator', '-passwordHash -refreshTokenHash -__v')
    .populate('assignee', '-passwordHash -refreshTokenHash -__v')
    .populate('project', 'name status deadline')
    .sort({ dueDate: 1, createdAt: -1 })
    .exec();
};

/** Create a new task within a project */
export const createTask = async (
  projectId: string,
  data: Omit<ITask, 'creator' | 'project' | 'createdAt' | 'updatedAt' | '_id'>,
  creatorId: string,
) => {
  if (!Types.ObjectId.isValid(projectId)) throw new Error('Invalid project ID');
  const project = await Project.findById(projectId)
    .populate('members', '-passwordHash -refreshTokenHash -__v')
    .exec();
  if (!project) throw new Error('Project not found');

  const creator = await User.findById(creatorId).select('role').exec();
  const role = creator?.role as string;
  const isOwner = (project.owner?._id ? project.owner._id.toString() : project.owner?.toString()) === creatorId;
  if (!isLeadRole(role) && !isOwner) {
    throw new Error('Forbidden: Only Team Leads can create and assign tasks');
  }

  // Verify assignee (if any) exists
  if (data.assignee) {
    const assigneeUser = await User.findById(data.assignee).exec();
    if (!assigneeUser) {
      throw new Error('Assignee user not found');
    }
    // If assignee is not already in project members or owner, automatically add them
    if (!isValidAssignee(project, data.assignee)) {
      await Project.findByIdAndUpdate(projectId, { $addToSet: { members: data.assignee } }).exec();
    }
  }

  const task = await Task.create({
    ...data,
    project: projectId,
    creator: creatorId,
  });

  return await Task.findById(task._id)
    .populate('creator', '-passwordHash -refreshTokenHash -__v')
    .populate('assignee', '-passwordHash -refreshTokenHash -__v')
    .populate('project', 'name status')
    .exec();
};

/** Get all tasks for a given project */
export const getTasksByProject = async (projectId: string, userId: string, role: string) => {
  if (!Types.ObjectId.isValid(projectId)) throw new Error('Invalid project ID');
  const project = await Project.findById(projectId)
    .populate('members', '-passwordHash -refreshTokenHash -__v')
    .exec();
  if (!project) throw new Error('Project not found');
  if (!canViewProject(project, userId, role)) throw new Error('Forbidden');

  return await Task.find({ project: projectId })
    .populate('creator', '-passwordHash -refreshTokenHash -__v')
    .populate('assignee', '-passwordHash -refreshTokenHash -__v')
    .sort({ dueDate: 1, createdAt: -1 })
    .exec();
};

/** Get a single task by its ID */
export const getTaskById = async (taskId: string, userId: string, role: string) => {
  if (!Types.ObjectId.isValid(taskId)) throw new Error('Invalid task ID');
  const task = await Task.findById(taskId).populate('project').exec();
  if (!task) throw new Error('Task not found');
  const project = await Project.findById(task.project)
    .populate('members', '-passwordHash -refreshTokenHash -__v')
    .exec();
  if (!project) throw new Error('Project not found');
  if (!canViewProject(project, userId, role)) throw new Error('Forbidden');

  return await Task.findById(taskId)
    .populate('creator', '-passwordHash -refreshTokenHash -__v')
    .populate('assignee', '-passwordHash -refreshTokenHash -__v')
    .populate('project', 'name status')
    .exec();
};

/** Update a task */
export const updateTask = async (
  taskId: string,
  updates: Partial<Omit<ITask, 'creator' | 'project' | 'createdAt' | 'updatedAt' | '_id'>>,
  userId: string,
  role: string,
) => {
  if (!Types.ObjectId.isValid(taskId)) throw new Error('Invalid task ID');
  const task = await Task.findById(taskId).populate('project').exec();
  if (!task) throw new Error('Task not found');
  const project = await Project.findById(task.project)
    .populate('members', '-passwordHash -refreshTokenHash -__v')
    .exec();
  if (!project) throw new Error('Project not found');

  const isOwner = project.owner.toString() === userId;
  const isCreator = task.creator.toString() === userId;
  const isMember = (project.members || []).some((m: any) => {
    const memberId = m?._id ? m._id.toString() : m?.toString();
    return memberId === userId;
  });

  const isLead = isLeadRole(role);
  // ADMIN, Team Lead, project owner or task creator can update any field including assignee
  if (isLead || isOwner || isCreator) {
    // Full update allowed
  } else if (isMember) {
    // Team Members can update status, description, priority, or dueDate, but CANNOT assign or reassign tasks
    if (updates.assignee !== undefined) {
      throw new Error('Forbidden: Only Team Leads can assign or reassign tasks');
    }
    const allowedFields = ['status', 'priority', 'description', 'dueDate'];
    const keys = Object.keys(updates);
    const hasDisallowed = keys.some((k) => !allowedFields.includes(k));
    if (hasDisallowed) {
      throw new Error('Forbidden: insufficient permissions to update restricted fields');
    }
  } else {
    throw new Error('Forbidden: not a project member');
  }

  // If changing assignee, verify and ensure added to project members
  if (updates.assignee) {
    const assigneeUser = await User.findById(updates.assignee).exec();
    if (!assigneeUser) {
      throw new Error('Assignee user not found');
    }
    if (!isValidAssignee(project, updates.assignee)) {
      await Project.findByIdAndUpdate(project._id, { $addToSet: { members: updates.assignee } }).exec();
    }
  }

  const updated = await Task.findByIdAndUpdate(taskId, updates as any, { new: true, runValidators: true })
    .populate('creator', '-passwordHash -refreshTokenHash -__v')
    .populate('assignee', '-passwordHash -refreshTokenHash -__v')
    .populate('project', 'name status')
    .exec();
  if (!updated) throw new Error('Task not found');
  return updated;
};

/** Delete a task */
export const deleteTask = async (taskId: string, userId: string, role: string) => {
  if (!Types.ObjectId.isValid(taskId)) throw new Error('Invalid task ID');
  const task = await Task.findById(taskId).populate('project').exec();
  if (!task) throw new Error('Task not found');
  const project = await Project.findById(task.project)
    .populate('members', '-passwordHash -refreshTokenHash -__v')
    .exec();
  if (!project) throw new Error('Project not found');

  const isOwner = project.owner.toString() === userId;
  const isCreator = task.creator.toString() === userId;

  if (role === UserRole.ADMIN || role === 'ADMIN' || isOwner || isCreator) {
    const deleted = await Task.findByIdAndDelete(taskId).exec();
    return deleted;
  }
  throw new Error('Forbidden: only task creator, project owner, or admin can delete this task');
};
