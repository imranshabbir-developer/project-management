import mongoose from 'mongoose';

const missionSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      index: true,
    },
    budget: {
      type: Number,
      required: true,
      min: 0,
    },
    deadline: {
      type: Date,
      default: null,
    },
    location: {
      type: String,
      trim: true,
      maxlength: 200,
      default: null,
    },
    isRemote: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['open', 'in_discussion', 'in_progress', 'completed', 'cancelled'],
      default: 'open',
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'released', 'refunded'],
      default: 'pending',
    },
    completedAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancellationReason: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for faster queries
missionSchema.index({ clientId: 1, status: 1 });
missionSchema.index({ status: 1, createdAt: -1 });
missionSchema.index({ category: 1, status: 1 });

const Mission = mongoose.model('Mission', missionSchema);

export default Mission;

