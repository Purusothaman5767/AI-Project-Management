// backend/src/validation/task.ts
import { z } from 'zod';
import { Types } from 'mongoose';
import { TaskStatus, TaskPriority } from '../models/Task';

const objectIdString = z
  .string()
  .trim()
  .refine((val) => val === '' || Types.ObjectId.isValid(val), { message: 'Invalid ObjectId' })
  .transform((val) => (val === '' ? undefined : val))
  .optional();

const optionalDateString = z
  .string()
  .trim()
  .refine((val) => val === '' || !isNaN(Date.parse(val)), { message: 'Invalid date' })
  .transform((val) => (val === '' ? undefined : val))
  .optional();

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, 'Task title cannot be empty').max(200),
  description: z.string().max(1000).optional(),
  assignee: objectIdString,
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  dueDate: optionalDateString,
});

export const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  assignee: objectIdString,
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  dueDate: optionalDateString,
});

