import Profile from '../models/Profile.js';
import StudentProfile from '../models/StudentProfile.js';
import User from '../models/User.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { getFileUrl } from '../config/multer.js';

/**
 * @desc    Get user profile
 * @route   GET /api/onboarding/profile
 * @access  Private
 */
export const getProfile = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  let profile = await Profile.findOne({ userId }).populate('userId', 'email fullName role avatarUrl');

  // If profile doesn't exist, create a basic one
  if (!profile) {
    profile = await Profile.create({ userId });
    profile = await Profile.findOne({ userId }).populate('userId', 'email fullName role avatarUrl');
  }

  // If user is a student, get student profile
  let studentProfile = null;
  if (req.user.role === 'student') {
    studentProfile = await StudentProfile.findOne({ userId });
    if (!studentProfile) {
      studentProfile = await StudentProfile.create({ userId });
    }
  }

  res.status(200).json({
    success: true,
    data: {
      profile,
      studentProfile,
    },
  });
});

/**
 * @desc    Update profile (Step 1)
 * @route   PUT /api/onboarding/profile
 * @access  Private
 */
export const updateProfile = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { bio, phone, location, avatarUrl } = req.body;

  // Find or create profile
  let profile = await Profile.findOne({ userId });

  if (!profile) {
    profile = await Profile.create({ userId });
  }

  // Update profile fields
  if (bio !== undefined) profile.bio = bio;
  if (phone !== undefined) profile.phone = phone;
  if (location !== undefined) profile.location = location;
  if (avatarUrl !== undefined) profile.avatarUrl = avatarUrl;

  // Check if profile is complete (basic fields filled)
  profile.isProfileComplete = !!(bio && location);

  await profile.save();

  // Also update user's avatarUrl if provided
  if (avatarUrl) {
    await User.findByIdAndUpdate(userId, { avatarUrl });
  }

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      profile,
    },
  });
});

/**
 * @desc    Update student profile (Step 2)
 * @route   PUT /api/onboarding/student-profile
 * @access  Private (Student only)
 */
export const updateStudentProfile = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Check if user is a student
  if (req.user.role !== 'student') {
    return res.status(403).json({
      success: false,
      message: 'Only students can update student profile',
    });
  }

  const { skills, hourlyRate, categories, portfolioImages } = req.body;

  // Find or create student profile
  let studentProfile = await StudentProfile.findOne({ userId });

  if (!studentProfile) {
    studentProfile = await StudentProfile.create({ userId });
  }

  // Update student profile fields
  if (skills !== undefined) studentProfile.skills = skills;
  if (hourlyRate !== undefined) studentProfile.hourlyRate = hourlyRate ? parseFloat(hourlyRate) : null;
  if (categories !== undefined) studentProfile.categories = categories;
  if (portfolioImages !== undefined) studentProfile.portfolioImages = portfolioImages;

  // Check if student profile is complete
  studentProfile.isStudentProfileComplete = !!(
    studentProfile.skills.length > 0 &&
    studentProfile.categories.length > 0
  );

  await studentProfile.save();

  res.status(200).json({
    success: true,
    message: 'Student profile updated successfully',
    data: {
      studentProfile,
    },
  });
});

/**
 * @desc    Complete onboarding
 * @route   POST /api/onboarding/complete
 * @access  Private
 */
export const completeOnboarding = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Get profile
  const profile = await Profile.findOne({ userId });
  if (!profile) {
    return res.status(404).json({
      success: false,
      message: 'Profile not found. Please complete step 1 first.',
    });
  }

  // If student, check student profile
  if (req.user.role === 'student') {
    const studentProfile = await StudentProfile.findOne({ userId });
    if (!studentProfile) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found. Please complete step 2 first.',
      });
    }

    if (!studentProfile.isStudentProfileComplete) {
      return res.status(400).json({
        success: false,
        message: 'Please complete all required fields in student profile.',
      });
    }
  }

  // Mark profile as complete
  profile.isProfileComplete = true;
  await profile.save();

  res.status(200).json({
    success: true,
    message: 'Onboarding completed successfully',
    data: {
      profile,
    },
  });
});

/**
 * @desc    Upload avatar
 * @route   POST /api/onboarding/avatar
 * @access  Private
 */
export const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No file uploaded',
    });
  }

  const userId = req.user.id;
  const fileUrl = getFileUrl('onboarding', req.file.filename);

  // Update profile
  let profile = await Profile.findOne({ userId });
  if (!profile) {
    profile = await Profile.create({ userId });
  }
  profile.avatarUrl = fileUrl;
  await profile.save();

  // Update user avatar
  await User.findByIdAndUpdate(userId, { avatarUrl: fileUrl });

  res.status(200).json({
    success: true,
    message: 'Avatar uploaded successfully',
    data: {
      avatarUrl: fileUrl,
    },
  });
});

/**
 * @desc    Upload portfolio images
 * @route   POST /api/onboarding/portfolio
 * @access  Private (Student only)
 */
export const uploadPortfolio = asyncHandler(async (req, res) => {
  if (req.user.role !== 'student') {
    return res.status(403).json({
      success: false,
      message: 'Only students can upload portfolio images',
    });
  }

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No files uploaded',
    });
  }

  const userId = req.user.id;
  const imageUrls = req.files.map(file => getFileUrl('onboarding', file.filename));

  // Get or create student profile
  let studentProfile = await StudentProfile.findOne({ userId });
  if (!studentProfile) {
    studentProfile = await StudentProfile.create({ userId });
  }

  // Add new images to portfolio (max 10)
  const currentImages = studentProfile.portfolioImages || [];
  const newImages = [...currentImages, ...imageUrls].slice(0, 10);
  studentProfile.portfolioImages = newImages;
  await studentProfile.save();

  res.status(200).json({
    success: true,
    message: 'Portfolio images uploaded successfully',
    data: {
      portfolioImages: studentProfile.portfolioImages,
    },
  });
});

