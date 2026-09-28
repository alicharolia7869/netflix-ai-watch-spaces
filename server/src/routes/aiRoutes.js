import express from 'express';
import { askCoPilot, getTriviaContext, getSceneContext } from '../services/aiService.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// POST /api/ai/ask - Ask Co-Pilot Scene-Grounded Question
router.post('/ask', optionalAuth, async (req, res) => {
  try {
    const { contentId, currentTime, question } = req.body;
    if (!contentId || !question) {
      return res.status(400).json({ message: 'contentId and question are required.' });
    }

    const result = await askCoPilot({
      contentId,
      currentTime: Number(currentTime) || 0,
      question,
    });

    return res.json(result);
  } catch (err) {
    console.error('AI Co-Pilot error:', err);
    return res.status(500).json({ message: err.message || 'Error processing AI question.' });
  }
});

// POST /api/ai/trivia - Fetch Contextual Trivia
router.post('/trivia', async (req, res) => {
  try {
    const { contentId, currentTime } = req.body;
    if (!contentId) {
      return res.status(400).json({ message: 'contentId is required.' });
    }

    const trivia = await getTriviaContext({
      contentId,
      currentTime: Number(currentTime) || 0,
    });

    return res.json(trivia);
  } catch (err) {
    console.error('Trivia retrieval error:', err);
    return res.status(500).json({ message: 'Error retrieving scene trivia.' });
  }
});

// GET /api/ai/context - Current Scene Breakdown
router.get('/context', async (req, res) => {
  try {
    const { contentId, currentTime } = req.query;
    if (!contentId) {
      return res.status(400).json({ message: 'contentId query parameter is required.' });
    }

    const context = await getSceneContext(contentId, Number(currentTime) || 0);
    return res.json(context);
  } catch (err) {
    return res.status(500).json({ message: 'Error retrieving scene context.' });
  }
});

export default router;
