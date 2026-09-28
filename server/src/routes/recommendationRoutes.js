import express from 'express';
import { getRecommendationsForUser } from '../services/recommendationService.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/recommendations
router.get('/', optionalAuth, async (req, res) => {
  try {
    const userId = req.user ? req.user._id : null;
    const items = await getRecommendationsForUser(userId);
    return res.json({ items });
  } catch (err) {
    console.error('Recommendation route error:', err);
    return res.status(500).json({ message: 'Error retrieving recommendations.' });
  }
});

export default router;
