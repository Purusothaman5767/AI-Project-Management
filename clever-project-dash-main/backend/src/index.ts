// src/index.ts
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db';
import authRouter from './routes/auth';
import tasksRouter from './routes/tasks';
import projectsRouter from './routes/projects';
import usersRouter, { getTeamHandler } from './routes/users';
import dashboardRouter from './routes/dashboard';
import aiRouter from './routes/ai';
import seedRouter from './routes/seed';
import { verifyAccessToken } from './middleware/auth';
import { notFoundHandler, errorHandler } from './middleware/errorHandler';

dotenv.config({ path: '.env' });

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Connect to DB
connectDB();

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/projects', verifyAccessToken, projectsRouter);
app.use('/api/users', verifyAccessToken, usersRouter);
app.get('/api/team', verifyAccessToken, getTeamHandler);
app.use('/api/dashboard', verifyAccessToken, dashboardRouter);
app.use('/api/ai', verifyAccessToken, aiRouter);
app.use('/api/seed', seedRouter);
app.use('/api', tasksRouter);

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: 'Nimbus PM API',
  });
});

app.get('/', (_req, res) => {
  res.send('Nimbus PM Backend API is running');
});

// 404 Handler for unknown routes (must be after all routes)
app.use(notFoundHandler);

// Centralized Error Handler (must be the very last middleware with 4 parameters)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});