import mongoose from 'mongoose';
import { Content } from '../models/Content.js';
import { User } from '../models/User.js';
import { sampleCatalog } from '../data/seedContent.js';

export async function getRecommendationsForUser(userId) {
  let allContent = [];
  if (mongoose.connection.readyState === 1) {
    allContent = await Content.find().lean();
  }
  if (!allContent || allContent.length === 0) {
    allContent = [...sampleCatalog];
  }

  let preferredGenres = ['Sci-Fi', 'Action', 'Animation'];
  let watchedIds = new Set();

  if (userId) {
    const user = await User.findById(userId).lean();
    if (user) {
      if (user.preferences?.preferredGenres?.length) {
        preferredGenres = user.preferences.preferredGenres;
      }
      if (user.watchHistory?.length) {
        user.watchHistory.forEach((item) => {
          if (item.contentId) {
            watchedIds.add(item.contentId.toString());
          }
        });
      }
    }
  }

  // Calculate content-based score
  const scoredItems = allContent.map((item) => {
    let score = 0;
    const matchedGenres = (item.genre || []).filter((g) => preferredGenres.includes(g));
    score += matchedGenres.length * 2.5;

    // Feature booster
    if (item.featured) {
      score += 1.5;
    }

    // Unwatched booster
    const hasWatched = watchedIds.has(item._id.toString());
    if (!hasWatched) {
      score += 1.0;
    }

    const reason = matchedGenres.length > 0
      ? `Matches your interest in ${matchedGenres.join(' & ')}`
      : 'Popular in AI Watch Spaces';

    return {
      content: item,
      score: Math.round(score * 10) / 10,
      reason,
      hasWatched,
    };
  });

  // Sort descending by score
  scoredItems.sort((a, b) => b.score - a.score);

  return scoredItems;
}
