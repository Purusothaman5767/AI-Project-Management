import { Types } from 'mongoose';
import { Project, IProject } from '../models/Project';
import { User } from '../models/User';
import { Task } from '../models/Task';

/**
 * Create a new project.
 * @param data - Validated project data (excluding owner and members)
 * @param ownerId - Authenticated user ID to set as owner
 */
export const createProject = async (
  data: Omit<IProject, 'owner' | 'createdAt' | 'updatedAt' | '_id'> & { members?: Types.ObjectId[] },
  ownerId: string,
) => {
  // Ensure owner exists (should always be true, but guard anyway)
  const owner = await User.findById(ownerId).exec();
  if (!owner) throw new Error('Owner not found');

  // Validate members (if any) exist and are unique, excluding the owner
  const memberIds = (data.members ?? [])
    .map((id: Types.ObjectId | string) => id.toString())
    .filter((id: string) => id !== ownerId);
  const uniqueMemberIds = Array.from(new Set(memberIds));

  if (uniqueMemberIds.length > 0) {
    const existing = await User.find({ _id: { $in: uniqueMemberIds } }).select('_id').exec();
    if (existing.length !== uniqueMemberIds.length) {
      throw new Error('One or more member IDs are invalid');
    }
  }

  const project = await Project.create({
    ...data,
    owner: ownerId,
    members: uniqueMemberIds,
  });

  const created = await Project.findById(project._id)
    .populate('owner', '-passwordHash -refreshTokenHash -__v')
    .populate('members', '-passwordHash -refreshTokenHash -__v')
    .exec();
  return created!;
};

/**
 * Get projects visible to a user.
 * @param userId - Authenticated user's ID
 * @param role - User role (enum string)
 */
export const getProjects = async (userId: string, role: string) => {
  if (role === 'ADMIN') {
    return await Project.find()
      .populate('owner', '-passwordHash -refreshTokenHash -__v')
      .populate('members', '-passwordHash -refreshTokenHash -__v')
      .sort({ updatedAt: -1 })
      .exec();
  }
  return await Project.find({
    $or: [{ owner: userId }, { members: userId }],
  })
    .populate('owner', '-passwordHash -refreshTokenHash -__v')
    .populate('members', '-passwordHash -refreshTokenHash -__v')
    .sort({ updatedAt: -1 })
    .exec();
};

/**
 * Retrieve a single project by its ID.
 */
export const getProjectById = async (projectId: string) => {
  if (!Types.ObjectId.isValid(projectId)) return null;
  const project = await Project.findById(projectId)
    .populate('owner', '-passwordHash -refreshTokenHash -__v')
    .populate('members', '-passwordHash -refreshTokenHash -__v')
    .exec();
  return project ?? null;
};

/**
 * Update allowed fields of a project.
 * Owner cannot be changed via this function.
 */
export const updateProject = async (
  projectId: string,
  updates: Partial<Omit<IProject, 'owner' | 'createdAt' | 'updatedAt' | '_id'>>,
) => {
  if (!Types.ObjectId.isValid(projectId)) throw new Error('Invalid project ID');

  // Prevent accidental owner overwrite if supplied
  const { owner, ...safeUpdates } = updates as any;

  const updated = await Project.findByIdAndUpdate(projectId, safeUpdates, {
    new: true,
    runValidators: true,
  })
    .populate('owner', '-passwordHash -refreshTokenHash -__v')
    .populate('members', '-passwordHash -refreshTokenHash -__v')
    .exec();

  if (!updated) throw new Error('Project not found');
  return updated;
};

/**
 * Delete a project and cascade-delete its associated tasks.
 */
export const deleteProject = async (projectId: string) => {
  if (!Types.ObjectId.isValid(projectId)) throw new Error('Invalid project ID');
  const deleted = await Project.findByIdAndDelete(projectId).exec();
  if (deleted) {
    // Cascade delete all tasks belonging to this project to avoid orphaned documents
    await Task.deleteMany({ project: projectId }).exec();
  }
  return deleted; // may be null if not found
};

/**
 * Add a member to a project.
 */
export const addMember = async (projectId: string, memberId: string) => {
  if (!Types.ObjectId.isValid(projectId) || !Types.ObjectId.isValid(memberId)) {
    throw new Error('Invalid ID(s)');
  }
  const [project, user] = await Promise.all([
    Project.findById(projectId).exec(),
    User.findById(memberId).exec(),
  ]);
  if (!project) throw new Error('Project not found');
  if (!user) throw new Error('User not found');

  const isOwner = project.owner.toString() === memberId;
  if (isOwner) {
    
  }

  // Use $addToSet to avoid duplicates
  await Project.findByIdAndUpdate(projectId, { $addToSet: { members: memberId } }).exec();

  const refreshed = await Project.findById(projectId)
    .populate('owner', '-passwordHash -refreshTokenHash -__v')
    .populate('members', '-passwordHash -refreshTokenHash -__v')
    .exec();
  return refreshed!;
};

/**
 * Remove a member from a project.
 */
export const removeMember = async (projectId: string, memberId: string) => {
  if (!Types.ObjectId.isValid(projectId) || !Types.ObjectId.isValid(memberId)) {
    throw new Error('Invalid ID(s)');
  }
  const project = await Project.findById(projectId).exec();
  if (!project) throw new Error('Project not found');

  const isOwner = project.owner.toString() === memberId;
  if (isOwner) {
    throw new Error('Cannot remove the project owner');
  }

  await Project.findByIdAndUpdate(projectId, { $pull: { members: memberId } }).exec();

  const refreshed = await Project.findById(projectId)
    .populate('owner', '-passwordHash -refreshTokenHash -__v')
    .populate('members', '-passwordHash -refreshTokenHash -__v')
    .exec();
  return refreshed!;
};
