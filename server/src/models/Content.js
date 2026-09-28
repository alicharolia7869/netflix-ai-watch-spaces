import mongoose from 'mongoose';

const sceneSchema = new mongoose.Schema(
  {
    sceneId: { type: String, required: true },
    startTime: { type: Number, required: true }, // in seconds
    endTime: { type: Number, required: true },   // in seconds
    title: { type: String, required: true },
    summary: { type: String, required: true },
    characters: [{ type: String }],
    context: [{ type: String }],
    keyDialogue: [{ speaker: String, line: String }],
  },
  { _id: false }
);

const triviaSchema = new mongoose.Schema(
  {
    sceneId: { type: String, default: null },
    category: {
      type: String,
      enum: ['Behind the Scenes', 'Filmmaking', 'Characters', 'Story', 'Easter Egg'],
      default: 'Story',
    },
    fact: { type: String, required: true },
    timestamp: { type: Number, default: 0 },
  },
  { _id: false }
);

const variationOptionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    text: { type: String, required: true },
    badge: { type: String, default: 'Standard' },
  },
  { _id: false }
);

const variationSchema = new mongoose.Schema(
  {
    variationId: { type: String, required: true },
    sceneId: { type: String, required: true },
    triggerTime: { type: Number, required: true }, // in seconds
    question: { type: String, required: true },
    options: [variationOptionSchema],
  },
  { _id: false }
);

const contentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
    },
    genre: [{ type: String, index: true }],
    duration: {
      type: Number,
      required: true, // in seconds
    },
    thumbnailUrl: {
      type: String,
      required: true,
    },
    videoUrl: {
      type: String,
      required: true,
    },
    releaseYear: {
      type: Number,
      default: 2024,
    },
    rating: {
      type: String,
      default: 'PG-13',
    },
    featured: {
      type: Boolean,
      default: false,
    },
    scenes: [sceneSchema],
    trivia: [triviaSchema],
    variations: [variationSchema],
  },
  {
    timestamps: true,
  }
);

export const Content = mongoose.model('Content', contentSchema);
