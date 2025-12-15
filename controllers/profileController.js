import Profile from '../models/Profile.js';
import StudentProfile from '../models/StudentProfile.js';
import User from '../models/User.js';
import { asyncHandler } from '../middleware/errorHandler.js';

/**
 * @desc    Search student profiles
 * @route   GET /api/profiles/search
 * @access  Public
 */
export const searchProfiles = asyncHandler(async (req, res) => {
  const {
    category,
    availabilityStatus,
    minRate,
    maxRate,
    location,
    skill,
    search,
    include,
  } = req.query;

  // Build query for StudentProfile
  const studentQuery = {};

  // Filter by category
  if (category) {
    // Match if the category exists in the categories array
    studentQuery.categories = { $in: [category] };
  }

  // Filter by availability status
  if (availabilityStatus) {
    studentQuery.availabilityStatus = availabilityStatus;
  }

  // Filter by hourly rate range
  if (minRate || maxRate) {
    studentQuery.hourlyRate = {};
    if (minRate) {
      studentQuery.hourlyRate.$gte = parseFloat(minRate);
    }
    if (maxRate) {
      studentQuery.hourlyRate.$lte = parseFloat(maxRate);
    }
  }

  // Filter by skill
  if (skill) {
    studentQuery.skills = { $in: [skill] };
  }

  // Get all student profiles matching the query
  const studentProfiles = await StudentProfile.find(studentQuery).populate('userId', 'fullName email avatarUrl role');

  // Get user IDs from student profiles
  const userIds = studentProfiles.map(sp => sp.userId._id);

  // Build query for Profile
  const profileQuery = { userId: { $in: userIds } };

  // Filter by location if provided
  if (location) {
    profileQuery.location = { $regex: location, $options: 'i' };
  }

  // Get profiles
  let profiles = await Profile.find(profileQuery).populate('userId', 'fullName email avatarUrl');

  // Filter by search term if provided (search in name, bio, skills)
  let filteredProfiles = profiles;
  if (search) {
    const searchLower = search.toLowerCase();
    const matchingUserIds = new Set();

    // Search in profile fields
    profiles.forEach(profile => {
      const fullName = profile.userId?.fullName?.toLowerCase() || '';
      const bio = profile.bio?.toLowerCase() || '';
      if (fullName.includes(searchLower) || bio.includes(searchLower)) {
        matchingUserIds.add(profile.userId._id.toString());
      }
    });

    // Search in student profile skills and categories
    studentProfiles.forEach(sp => {
      const skills = (sp.skills || []).join(' ').toLowerCase();
      const categories = (sp.categories || []).join(' ').toLowerCase();
      if (skills.includes(searchLower) || categories.includes(searchLower)) {
        matchingUserIds.add(sp.userId._id.toString());
      }
    });

    filteredProfiles = profiles.filter(p => matchingUserIds.has(p.userId._id.toString()));
  }

  // Combine student profiles with user profiles
  const result = filteredProfiles.map(profile => {
    const studentProfile = studentProfiles.find(sp => 
      sp.userId._id.toString() === profile.userId._id.toString()
    );

    if (!studentProfile) return null;

    // Format response to match frontend expectations
    const response = {
      id: profile.userId._id.toString(),
      user_id: profile.userId._id.toString(),
      skills: studentProfile.skills || [],
      hourly_rate: studentProfile.hourlyRate || 0,
      categories: studentProfile.categories || [],
      portfolio_images: studentProfile.portfolioImages || [],
      availability_status: studentProfile.availabilityStatus || 'available',
    };

    // Include profile data if requested
    if (include === 'profiles' || include?.includes('profiles')) {
      response.profiles = {
        id: profile.userId._id.toString(),
        full_name: profile.userId.fullName || '',
        avatar_url: profile.avatarUrl || profile.userId.avatarUrl || '',
        location: profile.location || '',
        phone: profile.phone || '',
        bio: profile.bio || '',
        average_rating: 0, // TODO: Calculate from reviews if reviews system exists
      };
    }

    return response;
  }).filter(Boolean);

  res.status(200).json({
    success: true,
    data: result,
    count: result.length,
  });
});

/**
 * @desc    Get profile by user ID
 * @route   GET /api/profiles/:id
 * @access  Public
 */
export const getProfile = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // First check if user exists
  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  // Find or create profile by userId
  let profile = await Profile.findOne({ userId: id }).populate('userId', 'fullName email avatarUrl role');

  if (!profile) {
    // Create a default profile if it doesn't exist
    profile = await Profile.create({ userId: id });
    await profile.populate('userId', 'fullName email avatarUrl role');
  }

  // Format response to match frontend expectations
  const response = {
    id: profile.userId._id.toString(),
    full_name: profile.userId.fullName || '',
    avatar_url: profile.avatarUrl || profile.userId.avatarUrl || '',
    location: profile.location || '',
    phone: profile.phone || '',
    bio: profile.bio || '',
    average_rating: 0, // TODO: Calculate from reviews if reviews system exists
  };

  res.status(200).json({
    success: true,
    data: response,
  });
});

/**
 * @desc    Update profile by user ID
 * @route   PUT /api/profiles/:id
 * @access  Private (Owner only)
 */
export const updateProfile = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { bio, phone, location, avatar_url, full_name } = req.body;
  const userId = req.user.id;

  // Check if user is updating their own profile
  if (id !== userId && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to update this profile',
    });
  }

  // Find or create profile
  let profile = await Profile.findOne({ userId: id });

  if (!profile) {
    profile = await Profile.create({ userId: id });
  }

  // Update profile fields
  if (bio !== undefined) profile.bio = bio;
  if (phone !== undefined) profile.phone = phone;
  if (location !== undefined) profile.location = location;
  if (avatar_url !== undefined) profile.avatarUrl = avatar_url;

  // Check if profile is complete
  profile.isProfileComplete = !!(bio && location);

  await profile.save();

  // Update user's fullName and avatarUrl if provided
  const userUpdates = {};
  if (full_name !== undefined) {
    userUpdates.fullName = full_name;
  }
  if (avatar_url !== undefined) {
    userUpdates.avatarUrl = avatar_url;
  }

  if (Object.keys(userUpdates).length > 0) {
    await User.findByIdAndUpdate(id, userUpdates);
  }

  // Populate user data
  await profile.populate('userId', 'fullName email avatarUrl role');

  // Format response
  const response = {
    id: profile.userId._id.toString(),
    full_name: profile.userId.fullName || '',
    avatar_url: profile.avatarUrl || profile.userId.avatarUrl || '',
    location: profile.location || '',
    phone: profile.phone || '',
    bio: profile.bio || '',
    is_profile_complete: profile.isProfileComplete,
  };

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: response,
  });
});

/**
 * @desc    Get student profile by user ID
 * @route   GET /api/profiles/:id/student
 * @access  Public
 */
export const getStudentProfile = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Find student profile by userId
  const studentProfile = await StudentProfile.findOne({ userId: id }).populate('userId', 'fullName email avatarUrl role');

  if (!studentProfile) {
    return res.status(404).json({
      success: false,
      message: 'Student profile not found',
    });
  }

  // Format response to match frontend expectations
  const response = {
    user_id: studentProfile.userId._id.toString(),
    skills: studentProfile.skills || [],
    hourly_rate: studentProfile.hourlyRate || 0,
    categories: studentProfile.categories || [],
    portfolio_images: studentProfile.portfolioImages || [],
    availability_status: studentProfile.availabilityStatus || 'available',
  };

  res.status(200).json({
    success: true,
    data: response,
  });
});

/**
 * @desc    Update student profile by user ID
 * @route   PUT /api/profiles/:id/student
 * @access  Private (Owner only)
 */
export const updateStudentProfile = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { skills, hourly_rate, categories, portfolio_images } = req.body;
  const userId = req.user.id;

  // Check if user is updating their own profile
  if (id !== userId && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to update this profile',
    });
  }

  // Check if user is a student
  const user = await User.findById(id);
  if (!user || user.role !== 'student') {
    return res.status(403).json({
      success: false,
      message: 'Only students can update student profile',
    });
  }

  // Find or create student profile
  let studentProfile = await StudentProfile.findOne({ userId: id });

  if (!studentProfile) {
    studentProfile = await StudentProfile.create({ userId: id });
  }

  // Update student profile fields
  if (skills !== undefined) studentProfile.skills = skills;
  if (hourly_rate !== undefined) studentProfile.hourlyRate = hourly_rate ? parseFloat(hourly_rate) : null;
  if (categories !== undefined) studentProfile.categories = categories;
  if (portfolio_images !== undefined) studentProfile.portfolioImages = portfolio_images;

  // Check if student profile is complete
  studentProfile.isStudentProfileComplete = !!(
    studentProfile.skills.length > 0 &&
    studentProfile.categories.length > 0
  );

  await studentProfile.save();

  // Format response
  const response = {
    user_id: studentProfile.userId.toString(),
    skills: studentProfile.skills || [],
    hourly_rate: studentProfile.hourlyRate || 0,
    categories: studentProfile.categories || [],
    portfolio_images: studentProfile.portfolioImages || [],
    availability_status: studentProfile.availabilityStatus || 'available',
    is_student_profile_complete: studentProfile.isStudentProfileComplete,
  };

  res.status(200).json({
    success: true,
    message: 'Student profile updated successfully',
    data: response,
  });
});

