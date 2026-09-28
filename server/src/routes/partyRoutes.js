import express from 'express';
import crypto from 'crypto';
import { WatchParty } from '../models/WatchParty.js';
import { Content } from '../models/Content.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

function generatePartyId() {
  return `wp-${crypto.randomBytes(3).toString('hex')}`;
}

// POST /api/parties - Create Party
router.post('/', requireAuth, async (req, res) => {
  try {
    const { contentId, title } = req.body;
    if (!contentId) {
      return res.status(400).json({ message: 'contentId is required to start a watch party.' });
    }

    const content = await Content.findById(contentId);
    if (!content) {
      return res.status(404).json({ message: 'Selected content does not exist.' });
    }

    let partyId = generatePartyId();
    // Ensure uniqueness
    while (await WatchParty.findOne({ partyId })) {
      partyId = generatePartyId();
    }

    const party = await WatchParty.create({
      partyId,
      hostId: req.user._id,
      contentId,
      title: title || `${content.title} Watch Party`,
      playback: {
        currentTime: 0,
        isPlaying: false,
        updatedAt: Date.now(),
      },
      participants: [
        {
          userId: req.user._id,
          name: req.user.name,
          avatar: req.user.avatar,
          role: 'host',
          isOnline: true,
          joinedAt: new Date(),
        },
      ],
      status: 'active',
    });

    const populated = await WatchParty.findById(party._id).populate('contentId');
    return res.status(201).json(populated);
  } catch (err) {
    console.error('Error creating watch party:', err);
    return res.status(500).json({ message: 'Error creating watch party.' });
  }
});

// GET /api/parties/:partyId - Get Party Details
router.get('/:partyId', async (req, res) => {
  try {
    const party = await WatchParty.findOne({ partyId: req.params.partyId.toLowerCase() }).populate('contentId');
    if (!party) {
      return res.status(404).json({ message: 'Watch party not found.' });
    }
    return res.json(party);
  } catch (err) {
    return res.status(500).json({ message: 'Error retrieving watch party.' });
  }
});

// POST /api/parties/:partyId/join - Join Party
router.post('/:partyId/join', requireAuth, async (req, res) => {
  try {
    const party = await WatchParty.findOne({ partyId: req.params.partyId.toLowerCase() }).populate('contentId');
    if (!party) {
      return res.status(404).json({ message: 'Watch party not found.' });
    }

    if (party.status === 'ended') {
      return res.status(400).json({ message: 'This watch party has already ended.' });
    }

    // Check if user is already a participant
    const existingIndex = party.participants.findIndex(
      (p) => p.userId.toString() === req.user._id.toString()
    );

    const isHost = party.hostId.toString() === req.user._id.toString();

    if (existingIndex > -1) {
      party.participants[existingIndex].isOnline = true;
      party.participants[existingIndex].name = req.user.name;
      party.participants[existingIndex].avatar = req.user.avatar;
    } else {
      party.participants.push({
        userId: req.user._id,
        name: req.user.name,
        avatar: req.user.avatar,
        role: isHost ? 'host' : 'viewer',
        isOnline: true,
        joinedAt: new Date(),
      });
    }

    await party.save();
    return res.json(party);
  } catch (err) {
    console.error('Error joining watch party:', err);
    return res.status(500).json({ message: 'Error joining watch party.' });
  }
});

// POST /api/parties/:partyId/leave - Leave Party
router.post('/:partyId/leave', requireAuth, async (req, res) => {
  try {
    const party = await WatchParty.findOne({ partyId: req.params.partyId.toLowerCase() });
    if (!party) {
      return res.status(404).json({ message: 'Watch party not found.' });
    }

    const participant = party.participants.find(
      (p) => p.userId.toString() === req.user._id.toString()
    );
    if (participant) {
      participant.isOnline = false;
      await party.save();
    }

    return res.json({ message: 'Left watch party successfully.' });
  } catch (err) {
    return res.status(500).json({ message: 'Error leaving watch party.' });
  }
});

// DELETE /api/parties/:partyId - End Party (Host Only)
router.delete('/:partyId', requireAuth, async (req, res) => {
  try {
    const party = await WatchParty.findOne({ partyId: req.params.partyId.toLowerCase() });
    if (!party) {
      return res.status(404).json({ message: 'Watch party not found.' });
    }

    if (party.hostId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the party host can end this watch space.' });
    }

    party.status = 'ended';
    await party.save();

    return res.json({ message: 'Watch party ended successfully.' });
  } catch (err) {
    return res.status(500).json({ message: 'Error ending watch party.' });
  }
});

export default router;
