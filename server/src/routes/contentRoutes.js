import express from 'express';
import mongoose from 'mongoose';
import { Content } from '../models/Content.js';
import { sampleCatalog } from '../data/seedContent.js';

const router = express.Router();

function escapeRegex(str) {
  return String(str).replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}

async function findContentByIdOrSlug(id) {
  if (!id) return null;
  if (mongoose.connection.readyState === 1) {
    if (mongoose.isValidObjectId(id)) {
      const doc = await Content.findById(id);
      if (doc) return doc;
    }
    const cleanId = String(id).toLowerCase().trim();
    if (cleanId === 'tos-001') return await Content.findOne({ title: /Tears of Steel/i });
    if (cleanId === 'sintel-002') return await Content.findOne({ title: /Sintel/i });
    if (cleanId === 'bbb-003') return await Content.findOne({ title: /Big Buck Bunny/i });
    const escaped = escapeRegex(cleanId.replace(/[-_]/g, ' '));
    const byTitle = await Content.findOne({ title: new RegExp(escaped, 'i') });
    if (byTitle) return byTitle;
  }

  // Graceful fallback to verified sample catalog if DB is connecting or degraded
  const cleanId = String(id).toLowerCase().trim();
  if (cleanId === 'tos-001') return sampleCatalog.find((c) => /Tears of Steel/i.test(c.title));
  if (cleanId === 'sintel-002') return sampleCatalog.find((c) => /Sintel/i.test(c.title));
  if (cleanId === 'bbb-003') return sampleCatalog.find((c) => /Big Buck Bunny/i.test(c.title));
  return sampleCatalog.find((c) =>
    (c._id && String(c._id) === id) || (c.id && String(c.id) === id) || new RegExp(escapeRegex(cleanId.replace(/[-_]/g, ' ')), 'i').test(c.title)
  ) || null;
}

// GET /api/content
router.get('/', async (req, res) => {
  try {
    const { genre, search, featured } = req.query;

    // If MongoDB is not yet connected, return sample catalog directly so catalog never fails
    if (mongoose.connection.readyState !== 1) {
      let filtered = [...sampleCatalog];
      if (genre && genre !== 'All') {
        filtered = filtered.filter((c) => (c.genre || []).includes(genre));
      }
      if (featured === 'true') {
        filtered = filtered.filter((c) => c.featured);
      }
      if (search) {
        const s = search.toLowerCase();
        filtered = filtered.filter((c) =>
          c.title.toLowerCase().includes(s) || c.description.toLowerCase().includes(s)
        );
      }
      return res.json({ items: filtered, count: filtered.length });
    }

    const query = {};

    if (genre && genre !== 'All') {
      query.genre = genre;
    }

    if (featured === 'true') {
      query.featured = true;
    }

    if (search) {
      const escaped = escapeRegex(search);
      query.$or = [
        { title: { $regex: escaped, $options: 'i' } },
        { description: { $regex: escaped, $options: 'i' } },
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
