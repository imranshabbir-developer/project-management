import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    missionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Mission',
      default: null,
      index: true,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    lastMessage: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for faster queries
conversationSchema.index({ clientId: 1, studentId: 1 });
conversationSchema.index({ studentId: 1, clientId: 1 });
conversationSchema.index({ lastMessageAt: -1 });

// Ensure unique conversation between client and student (for same mission or no mission)
conversationSchema.index({ clientId: 1, studentId: 1, missionId: 1 }, { unique: true, sparse: true });

const Conversation = mongoose.model('Conversation', conversationSchema);

export default Conversation;

