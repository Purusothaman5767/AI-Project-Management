// backend/src/scripts/seed.ts
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectDB } from '../config/db';
import { seedDatabase } from '../services/seedService';

dotenv.config({ path: '.env' });

const run = async () => {
  console.log('Connecting to MongoDB for seeding...');
  await connectDB();
  console.log('Seeding demo data...');
  const result = await seedDatabase(true);
  console.log('Seed result:', result);
  await mongoose.disconnect();
  console.log('Disconnected. Seeding complete!');
  process.exit(0);
};

run().catch((err) => {
  console.error('Seed script error:', err);
  process.exit(1);
});
