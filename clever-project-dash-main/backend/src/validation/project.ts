import { z } from 'zod';
import { Types } from 'mongoose';

// Helper schema for MongoDB ObjectId strings
const objectIdSchema = z.string().refine((val) => Types.ObjectId.isValid(val), {
  message: 'Invalid ObjectId',
});

// -------------------------------------------------------------------
// Create Project Schema
// -------------------------------------------------------------------
export const createProjectSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    description: z.string().max(500).optional(),
    startDate: z.preprocess((arg) => {
      if (typeof arg === 'string' || arg instanceof Date) return new Date(arg as any);
      return arg;
    }, z.date()),
    deadline: z.preprocess((arg) => {
      if (typeof arg === 'string' || arg instanceof Date) return new Date(arg as any);
      return arg;
    }, z.date()),
    status: z
      .enum([
        'PLANNING',
        'IN_PROGRESS',
        'ON_HOLD',
        'COMPLETED',
        'CANCELLED',
      ])
      .optional(),
    priority: z
      .enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
      .optional(),
    members: z
      .array(objectIdSchema)
      .optional()
      .refine((arr) => !arr || new Set(arr).size === arr.length, {
        message: 'Duplicate member IDs',
      }),
  })
  .refine(
    (data) => data.deadline >= data.startDate,
    {
      message: 'Deadline cannot be earlier than startDate',
      path: ['deadline'],
    }
  );

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

// -------------------------------------------------------------------
// Update Project Schema
// -------------------------------------------------------------------
export const updateProjectSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    startDate: z
      .preprocess((arg) => {
        if (typeof arg === 'string' || arg instanceof Date) return new Date(arg as any);
        return arg;
      }, z.date())
      .optional(),
    deadline: z
      .preprocess((arg) => {
        if (typeof arg === 'string' || arg instanceof Date) return new Date(arg as any);
        return arg;
      }, z.date())
      .optional(),
    status: z
      .enum([
        'PLANNING',
        'IN_PROGRESS',
        'ON_HOLD',
        'COMPLETED',
        'CANCELLED',
      ])
      .optional(),
    priority: z
      .enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
      .optional(),
    members: z
      .array(objectIdSchema)
      .optional()
      .refine((arr) => !arr || new Set(arr).size === arr.length, {
        message: 'Duplicate member IDs',
      }),
  })
  .refine(
    (data) => {
      if (data.startDate && data.deadline) {
        return data.deadline >= data.startDate;
      }
      return true;
    },
    {
      message: 'Deadline cannot be earlier than startDate',
      path: ['deadline'],
    }
  );

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

// -------------------------------------------------------------------
// Add Member Schema
// -------------------------------------------------------------------
export const addMemberSchema = z.object({
  userId: objectIdSchema,
});

export type AddMemberInput = z.infer<typeof addMemberSchema>;
