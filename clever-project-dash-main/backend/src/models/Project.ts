// backend/src/models/Project.ts
import { Schema, model, Document, Types } from 'mongoose';

export enum ProjectStatus {
  PLANNING = 'PLANNING',
  IN_PROGRESS = 'IN_PROGRESS',
  ON_HOLD = 'ON_HOLD',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum ProjectPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface IProject extends Document {
  name: string;
  description?: string;
  owner: Types.ObjectId;
  members: Types.ObjectId[];
  startDate?: Date;
  deadline?: Date;
  status: ProjectStatus;
  priority: ProjectPriority;
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<IProject>(
  {
    name: { type: String, required: true },
    description: { type: String },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    startDate: { type: Date },
    deadline: { type: Date },
    status: { type: String, enum: Object.values(ProjectStatus), default: ProjectStatus.PLANNING },
    priority: { type: String, enum: Object.values(ProjectPriority), default: ProjectPriority.MEDIUM },
  },
  { timestamps: true }
);

export const Project = model<IProject>('Project', projectSchema);
