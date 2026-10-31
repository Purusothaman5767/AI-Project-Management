// src/utils/auth.ts
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { User, IUser, UserRole } from '../models/User';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || '15m';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
const JWT_SECRET = process.env.JWT_SECRET || '';

if (!JWT_SECRET) {
  console.error('JWT_SECRET is not set');
  process.exit(1);
}

export interface JwtPayload {
  sub: string; // user id
  role: UserRole;
  iat: number;
  exp: number;
}

export const generateAccessToken = (user: IUser) => {
  const payload = { sub: user._id.toString(), role: user.role };
  return jwt.sign(payload, JWT_SECRET as string, { expiresIn: ACCESS_TOKEN_EXPIRES_IN } as import('jsonwebtoken').SignOptions);
};

export const generateRefreshToken = (user: IUser) => {
  const payload = { sub: user._id.toString() };
  return jwt.sign(payload, JWT_SECRET as string, { expiresIn: REFRESH_TOKEN_EXPIRES_IN } as import('jsonwebtoken').SignOptions);
};

export const setAuthCookies = (res: Response, accessToken: string, refreshToken: string) => {
  const isProd = process.env.NODE_ENV === 'production';
  const cookieOpts = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'strict' as const : 'lax' as const,
    path: '/',
  } as const;

  // Access token cookie
  res.cookie('accessToken', accessToken, {
    ...cookieOpts,
    maxAge: 15 * 60 * 1000, // 15 minutes in ms
  });
  // Refresh token cookie
  res.cookie('refreshToken', refreshToken, {
    ...cookieOpts,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  });
};

export const clearAuthCookies = (res: Response) => {
  const isProd = process.env.NODE_ENV === 'production';
  const opts = { httpOnly: true, secure: isProd, sameSite: isProd ? 'strict' : 'lax', path: '/' } as const;
  res.clearCookie('accessToken', opts);
  res.clearCookie('refreshToken', opts);
};

interface AuthenticatedRequest extends Request {
  user?: { id: string; role: UserRole };
}

export const verifyAccessToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const token = req.cookies?.accessToken;
  if (!token) return res.status(401).json({ message: 'Access token missing' });
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    // attach user info to request
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired access token' });
  }
};

export const verifyRefreshToken = (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    return payload.sub; // user id
  } catch {
    return null;
  }
};
