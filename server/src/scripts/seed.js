import dotenv from 'dotenv';
import { connectDB, disconnectDB } from '../config/db.js';
import { seedDatabaseIfEmpty } from '../services/seedService.js';

dotenv.config();

async function runSeed() {
  console.log('🌱 Starting Netflix AI Watch Spaces database seed...');
  try {
    await connectDB();
    await seedDatabaseIfEmpty();
    console.log('✅ Seeding completed successfully.');
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    process.exit(1);
  } finally {
    await disconnectDB();
    process.exit(0);
  }
}

runSeed();
