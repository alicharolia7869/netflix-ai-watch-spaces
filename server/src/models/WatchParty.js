import mongoose from 'mongoose';

const participantSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: { type: String, required: true },
    avatar: { type: String, default: '' },
    role: {
      type: String,
      enum: ['host', 'viewer'],
      default: 'viewer',
    },
    isOnline: {
      type: Boolean,
      default: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const watchPartySchema = new mongoose.Schema(
  {
    partyId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    hostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    contentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Content',
      required: true,
    },
    title: {
      type: String,
      default: 'Netflix AI Watch Space',
      trim: true,
    },
    playback: {
      currentTime: {
        type: Number,
        default: 0,
      },
      isPlaying: {
        type: Boolean,
        default: false,
      },
      updatedAt: {
        type: Number,
        default: () => Date.now(),
      },
    },
    participants: [participantSchema],
    status: {
      type: String,
      enum: ['active', 'ended'],
      default: 'active',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const WatchParty = mongoose.model('WatchParty', watchPartySchema);
