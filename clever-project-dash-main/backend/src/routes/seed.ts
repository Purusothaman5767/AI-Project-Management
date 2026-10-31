// backend/src/routes/seed.ts
import express, { Request, Response } from 'express';
import { seedDatabase } from '../services/seedService';

const router = express.Router();

/**
 * POST /api/seed
 * Seed sample demo projects, tasks, and users in the database.
 * Supports { force: true } in request body to reset and reseed.
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const force = Boolean(req.body?.force);
    const result = await seedDatabase(force);
    return res.status(200).json(result);
  } catch (err: any) {
    console.error('Error seeding database:', err);
    return res.status(500).json({ message: 'Failed to seed database', error: err?.message });
  }
});

export default router;
