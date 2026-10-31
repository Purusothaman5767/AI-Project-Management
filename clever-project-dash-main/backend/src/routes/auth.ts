// backend/src/routes/auth.ts
import express from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { User, IUser, UserRole } from '../models/User';
import { generateAccessToken, generateRefreshToken, setAuthCookies, clearAuthCookies, verifyRefreshToken } from '../utils/auth';
import { verifyAccessToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Helper for user initials
function getInitials(name?: string): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0];
  if (!first) return '??';
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  const last = parts[parts.length - 1];
  const lastChar = last ? last.charAt(0) : '';
  return (first.charAt(0) + lastChar).toUpperCase();
}

// Zod schemas
const RegisterSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
  confirmPassword: z.string().min(8).max(128),
  role: z.nativeEnum(UserRole).optional(),
});

const LoginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1).max(128),
});

// Helper to sanitize user object
const sanitizeUser = (user: IUser) => ({
  id: user._id,
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  initials: getInitials(user.name),
});

// Register
router.post('/register', async (req, res) => {
  const parse = RegisterSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ message: 'Invalid input' });
  const { name, email, password, confirmPassword } = parse.data;
  if (password !== confirmPassword)
    return res.status(400).json({ message: 'Passwords do not match' });
  const normalizedEmail = email.trim().toLowerCase();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) return res.status(409).json({ message: 'Email already in use' });

  const passwordHash = await bcrypt.hash(password, 12);
  const isFirstUser = (await User.countDocuments()) === 0;
  const role = parse.data.role || (isFirstUser ? UserRole.ADMIN : UserRole.TEAM_MEMBER);

  const user = await User.create({ name: name.trim(), email: normalizedEmail, passwordHash, role });
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  // Store hash of refresh token for rotation
  const refreshTokenHash = await bcrypt.hash(refreshToken, 12);
  user.refreshTokenHash = refreshTokenHash;
  await user.save();
  setAuthCookies(res, accessToken, refreshToken);
  res.status(201).json({ user: sanitizeUser(user), accessToken });
});

// Login
router.post('/login', async (req, res) => {
  const parse = LoginSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ message: 'Invalid input' });
  const { email, password } = parse.data;
  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ message: 'Invalid credentials' });
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  const refreshTokenHash = await bcrypt.hash(refreshToken, 12);
  user.refreshTokenHash = refreshTokenHash;
  await user.save();
  setAuthCookies(res, accessToken, refreshToken);
  res.json({ user: sanitizeUser(user), accessToken });
});

// Logout
router.post('/logout', async (req, res) => {
  const userId = (req as AuthRequest).user?.id;
  if (userId) {
    await User.findByIdAndUpdate(userId, { refreshTokenHash: null });
  }
  clearAuthCookies(res);
  res.json({ message: 'Logged out' });
});

// Refresh token endpoint
router.post('/refresh', async (req, res) => {
  const userId = verifyRefreshToken(req, res);
  if (!userId) return res.status(401).json({ message: 'Invalid refresh token' });
  const user = await User.findById(userId);
  if (!user || !user.refreshTokenHash) return res.status(401).json({ message: 'Invalid session' });
  const sentRefreshToken = req.cookies?.refreshToken;
  const match = await bcrypt.compare(sentRefreshToken, user.refreshTokenHash);
  if (!match) return res.status(401).json({ message: 'Refresh token revoked' });
  // Rotation: generate new tokens, replace stored hash
  const newAccessToken = generateAccessToken(user);
  const newRefreshToken = generateRefreshToken(user);
  user.refreshTokenHash = await bcrypt.hash(newRefreshToken, 12);
  await user.save();
  setAuthCookies(res, newAccessToken, newRefreshToken);
  res.json({ user: sanitizeUser(user), accessToken: newAccessToken });
});

// Me – return current user (protected)
router.get('/me', verifyAccessToken, async (req, res) => {
  const userId = (req as AuthRequest).user?.id;
  if (!userId) return res.status(401).json({ message: 'Unauthenticated' });
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({ user: sanitizeUser(user) });
});

export default router;
