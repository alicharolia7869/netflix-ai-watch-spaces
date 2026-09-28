import express from 'express';
import { Vote } from '../models/Vote.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/parties/:partyId/votes - Get Tally for all variations in party
router.get('/:partyId/votes', async (req, res) => {
  try {
    const partyId = req.params.partyId.toLowerCase();
    const votes = await Vote.find({ partyId }).lean();

    // Aggregate votes by variationId and optionId
    const tallies = {};
    votes.forEach((v) => {
      if (!tallies[v.variationId]) {
        tallies[v.variationId] = { total: 0, options: {} };
      }
      tallies[v.variationId].total += 1;
      tallies[v.variationId].options[v.optionId] = (tallies[v.variationId].options[v.optionId] || 0) + 1;
    });

    return res.json({ tallies, totalVotes: votes.length });
  } catch (err) {
    console.error('Error fetching votes:', err);
    return res.status(500).json({ message: 'Error retrieving party votes.' });
  }
});

// POST /api/parties/:partyId/vote - Cast Vote
router.post('/:partyId/vote', requireAuth, async (req, res) => {
  try {
    const partyId = req.params.partyId.toLowerCase();
    const { variationId, optionId } = req.body;

    if (!variationId || !optionId) {
      return res.status(400).json({ message: 'variationId and optionId are required.' });
    }

    // Upsert vote or prevent duplicate
    const existing = await Vote.findOne({
      partyId,
      userId: req.user._id,
      variationId,
    });

    if (existing) {
      existing.optionId = optionId;
      await existing.save();
    } else {
      await Vote.create({
        partyId,
        userId: req.user._id,
        userName: req.user.name,
        variationId,
        optionId,
      });
    }

    // Recalculate tally for this variation
    const variationVotes = await Vote.find({ partyId, variationId }).lean();
    const optionsTally = {};
    variationVotes.forEach((v) => {
      optionsTally[v.optionId] = (optionsTally[v.optionId] || 0) + 1;
    });

    return res.json({
      message: 'Vote recorded successfully',
      variationId,
      userChoice: optionId,
      totalVotes: variationVotes.length,
      optionsTally,
    });
  } catch (err) {
    console.error('Error recording vote:', err);
    return res.status(500).json({ message: 'Error recording vote.' });
  }
});

export default router;
