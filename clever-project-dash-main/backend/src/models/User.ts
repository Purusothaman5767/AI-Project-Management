// backend/src/models/User.ts

export enum UserRole {
  ADMIN = 'ADMIN',
  TEAM_LEAD = 'TEAM_LEAD',
  PROJECT_MANAGER = 'PROJECT_MANAGER',
  TEAM_MEMBER = 'TEAM_MEMBER',
}

export function isLeadRole(role?: string): boolean {
  if (!role) return false;
  const r = role.toUpperCase();
  return (
    r === UserRole.TEAM_LEAD ||
    r === UserRole.PROJECT_MANAGER ||
    r === UserRole.ADMIN ||
    r === 'TEAM_LEAD' ||
    r === 'PROJECT_MANAGER' ||
    r === 'ADMIN'
  );
}
import { Schema, model, Document } from 'mongoose';


export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  refreshTokenHash?: string; // store hashed refresh token for rotation
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.TEAM_MEMBER,
    },
    refreshTokenHash: { type: String, default: null },
  },
  { timestamps: true }
);

export const User = model<IUser>('User', userSchema);
