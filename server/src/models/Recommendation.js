import mongoose from 'mongoose';

const recommendationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    items: [
      {
        contentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Content',
          required: true,
        },
        score: {
          type: Number,
          default: 1.0,
        },
        reason: {
          type: String,
          default: 'Recommended based on your favorite genres and watch history',
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const Recommendation = mongoose.model('Recommendation', recommendationSchema);
