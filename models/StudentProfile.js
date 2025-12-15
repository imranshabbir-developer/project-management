import mongoose from 'mongoose';

const studentProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // unique automatically creates an index
    },
    skills: {
      type: [String],
      default: [],
    },
    hourlyRate: {
      type: Number,
      min: 0,
      default: null,
    },
    categories: {
      type: [String],
      default: [],
    },
    portfolioImages: {
      type: [String],
      default: [],
    },
    availabilityStatus: {
      type: String,
      enum: ['available', 'busy', 'unavailable'],
      default: 'available',
    },
    isStudentProfileComplete: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Index for faster queries (userId already indexed via unique: true)
studentProfileSchema.index({ skills: 1 });
studentProfileSchema.index({ categories: 1 });
studentProfileSchema.index({ availabilityStatus: 1 });

const StudentProfile = mongoose.model('StudentProfile', studentProfileSchema);

export default StudentProfile;

