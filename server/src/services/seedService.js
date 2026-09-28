import { Content } from '../models/Content.js';
import { User } from '../models/User.js';
import { sampleCatalog } from '../data/seedContent.js';

export async function seedDatabaseIfEmpty() {
  try {
    const contentCount = await Content.countDocuments();
    if (contentCount === 0) {
      console.log('Seeding initial open-licensed movie catalog with scene breakdowns...');
      await Content.insertMany(sampleCatalog);
      console.log(`Seeded ${sampleCatalog.length} movies successfully.`);
    }

    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('Creating demo user account...');
      const passwordHash = await User.hashPassword('Password123!');
      await User.create({
        name: 'Alex Mercer',
        email: 'alex@netflix.ai',
        passwordHash,
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
        preferences: {
          preferredGenres: ['Sci-Fi', 'Action'],
          defaultAudio: 'English [Original]',
          defaultSubtitles: 'English',
        },
      });
      console.log('Demo user created (alex@netflix.ai / Password123!).');
    }
  } catch (err) {
    console.error('Error during initial database seeding:', err.message);
  }
}
