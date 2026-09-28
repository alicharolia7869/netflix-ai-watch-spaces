import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema(
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
      required: true,
    },
    userAvatar: {
      type: String,
      default: '',
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    videoTime: {
      type: Number,
      default: 0,
    },
    type: {
      type: String,
      enum: ['chat', 'system', 'ai', 'trivia'],
      default: 'chat',
    },
  },
  {
    timestamps: true,
  }
);

chatMessageSchema.index({ partyId: 1, createdAt: 1 });

export const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);
