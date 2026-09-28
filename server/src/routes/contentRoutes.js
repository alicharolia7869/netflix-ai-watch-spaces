import express from 'express';
import { Content } from '../models/Content.js';

const router = express.Router();

// GET /api/content
router.get('/', async (req, res) => {
  try {
    const { genre, search, featured } = req.query;
    const query = {};

    if (genre && genre !== 'All') {
      query.genre = genre;
    }

    if (featured === 'true') {
      query.featured = true;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const items = await Content.find(query).select('-scenes.keyDialogue').lean();
    return res.json({ items, count: items.length });
  } catch (err) {
    console.error('Error fetching content:', err);
    return res.status(500).json({ message: 'Error retrieving catalog content.' });
  }
});

// GET /api/content/:id
router.get('/:id', async (req, res) => {
  try {
    const item = await Content.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Content item not found.' });
    }
    return res.json(item);
  } catch (err) {
    return res.status(500).json({ message: 'Error retrieving movie details.' });
  }
});

// GET /api/content/:id/scenes
router.get('/:id/scenes', async (req, res) => {
  try {
    const item = await Content.findById(req.params.id).select('scenes title duration');
    if (!item) {
      return res.status(404).json({ message: 'Content item not found.' });
    }
    return res.json({
      contentId: item._id,
      title: item.title,
      duration: item.duration,
      scenes: item.scenes || [],
    });
  } catch (err) {
    return res.status(500).json({ message: 'Error retrieving scene breakdown.' });
  }
});

export default router;
