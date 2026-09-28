import mongoose from 'mongoose';

const voteSchema = new mongoose.Schema(
  {
    partyId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    userName: {
      type: String,
      default: 'Participant',
    },
    variationId: {
      type: String,
      required: true,
    },
    optionId: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate voting on the same variation in the same watch party
voteSchema.index({ partyId: 1, userId: 1, variationId: 1 }, { unique: true });

export const Vote = mongoose.model('Vote', voteSchema);
