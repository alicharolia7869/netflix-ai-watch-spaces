import express from 'express';
import mongoose from 'mongoose';
import { Content } from '../models/Content.js';

const router = express.Router();

async function findContentByIdOrSlug(id) {
  if (!id) return null;
  if (mongoose.isValidObjectId(id)) {
    const doc = await Content.findById(id);
    if (doc) return doc;
  }
  const cleanId = String(id).toLowerCase().trim();
  if (cleanId === 'tos-001') return await Content.findOne({ title: /Tears of Steel/i });
  if (cleanId === 'sintel-002') return await Content.findOne({ title: /Sintel/i });
  if (cleanId === 'bbb-003') return await Content.findOne({ title: /Big Buck Bunny/i });
  return await Content.findOne({ title: new RegExp(cleanId.replace(/[-_]/g, ' '), 'i') });
}

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
    const item = await findContentByIdOrSlug(req.params.id);
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
    const item = await findContentByIdOrSlug(req.params.id);
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
