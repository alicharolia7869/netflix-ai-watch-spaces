import express from 'express';
import { ChatMessage } from '../models/ChatMessage.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/parties/:partyId/messages
router.get('/:partyId/messages', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 200);
    const messages = await ChatMessage.find({ partyId: req.params.partyId.toLowerCase() })
      .sort({ createdAt: 1 })
      .limit(limit)
      .lean();

    return res.json({ messages });
  } catch (err) {
    console.error('Error fetching chat messages:', err);
    return res.status(500).json({ message: 'Error retrieving chat messages.' });
  }
});

// POST /api/parties/:partyId/messages
router.post('/:partyId/messages', requireAuth, async (req, res) => {
  try {
    const { message, videoTime, type } = req.body || {};
    let sanitizedMessage = String(message || '').trim().slice(0, 500);
    sanitizedMessage = sanitizedMessage.replace(/[<>]/g, '');
    if (!sanitizedMessage) {
      return res.status(400).json({ message: 'Valid message content is required.' });
    }

    const pId = req.params.partyId.toLowerCase();
    const newMessage = await ChatMessage.create({
      partyId: pId,
      userId: req.user._id,
      userName: req.user.name,
      userAvatar: req.user.avatar,
      message: sanitizedMessage,
      videoTime: Number(videoTime) || 0,
      type: type || 'chat',
    });

    const io = req.app.get('io');
    if (io) {
      io.to(pId).emit('chat:message', newMessage);
    }

    return res.status(201).json(newMessage);
  } catch (err) {
    console.error('Error creating chat message:', err);
    return res.status(500).json({ message: 'Error saving chat message.' });
  }
});

export default router;
