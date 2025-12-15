import Application from '../models/Application.js';
import Mission from '../models/Mission.js';
import User from '../models/User.js';
import { asyncHandler } from '../middleware/errorHandler.js';

/**
 * @desc    Create a new application
 * @route   POST /api/applications
 * @access  Private (Student only)
 */
export const createApplication = asyncHandler(async (req, res) => {
  const { mission_id, cover_letter } = req.body;
  const studentId = req.user.id;

  // Check if user is a student
  if (req.user.role !== 'student') {
    return res.status(403).json({
      success: false,
      message: 'Only students can create applications',
    });
  }

  // Validation
  if (!mission_id) {
    return res.status(400).json({
      success: false,
      message: 'Mission ID is required',
    });
  }

  // Check if mission exists
  const mission = await Mission.findById(mission_id);
  if (!mission) {
    return res.status(404).json({
      success: false,
      message: 'Mission not found',
    });
  }

  // Check if mission is open
  if (mission.status !== 'open') {
    return res.status(400).json({
      success: false,
      message: 'Mission is not open for applications',
    });
  }

  // Check if student already applied
  // Use ObjectId comparison for accurate matching
  const existingApplication = await Application.findOne({
    missionId: mission_id,
    studentId: studentId,
  });

  if (existingApplication) {
    return res.status(400).json({
      success: false,
      message: 'You have already applied to this mission',
    });
  }

  // Create application
  const application = await Application.create({
    missionId: mission_id,
    studentId: studentId,
    coverLetter: cover_letter?.trim() || '',
    status: 'pending',
  });

  // Populate data
  await application.populate('missionId', 'title category budget status');
  await application.populate('studentId', 'fullName email avatarUrl');

  res.status(201).json({
    success: true,
    message: 'Application created successfully',
    data: application,
  });
});

/**
 * @desc    Get all applications
 * @route   GET /api/applications
 * @access  Private
 */
export const getApplications = asyncHandler(async (req, res) => {
  const { studentId, missionId, status, sort, include } = req.query;
  const userId = req.user.id;

  // Build query
  const query = {};

  if (studentId && studentId !== 'undefined' && studentId !== 'null') {
    query.studentId = studentId;
  } else if (req.user.role === 'student') {
    // Students see only their own applications
    query.studentId = userId;
  }

  if (missionId && missionId !== 'undefined' && missionId !== 'null') {
    query.missionId = missionId;
  }

  if (status) {
    query.status = status;
  }

  // Build sort
  let sortOption = { createdAt: -1 };
  if (sort === '-created_at') {
    sortOption = { createdAt: -1 };
  } else if (sort === 'created_at') {
    sortOption = { createdAt: 1 };
  }

  const applications = await Application.find(query)
    .populate('missionId', 'title category budget status clientId')
    .populate('studentId', 'fullName email avatarUrl')
    .sort(sortOption);

  res.status(200).json({
    success: true,
    data: applications,
    count: applications.length,
  });
});

/**
 * @desc    Get a single application by ID
 * @route   GET /api/applications/:id
 * @access  Private
 */
export const getApplication = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const application = await Application.findById(id)
    .populate('missionId', 'title category budget status clientId')
    .populate('studentId', 'fullName email avatarUrl');

  if (!application) {
    return res.status(404).json({
      success: false,
      message: 'Application not found',
    });
  }

  // Check authorization
  const mission = await Mission.findById(application.missionId._id);
  const isOwner = mission?.clientId.toString() === userId;
  const isApplicant = application.studentId._id.toString() === userId;

  if (!isOwner && !isApplicant && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to access this application',
    });
  }

  res.status(200).json({
    success: true,
    data: application,
  });
});

/**
 * @desc    Update application status
 * @route   PUT /api/applications/:id
 * @access  Private
 */
export const updateApplication = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, cover_letter } = req.body;
  const userId = req.user.id;

  const application = await Application.findById(id)
    .populate('missionId');

  if (!application) {
    return res.status(404).json({
      success: false,
      message: 'Application not found',
    });
  }

  const mission = await Mission.findById(application.missionId._id);
  const isOwner = mission?.clientId.toString() === userId;
  const isApplicant = application.studentId.toString() === userId;

  // Update cover letter (only applicant can do this)
  if (cover_letter !== undefined && isApplicant) {
    application.coverLetter = cover_letter.trim();
  }

  // Update status
  if (status) {
    if (status === 'accepted' && !isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Only mission owner can accept applications',
      });
    }

    if (status === 'rejected' && !isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Only mission owner can reject applications',
      });
    }

    application.status = status;
    if (status === 'accepted') {
      application.acceptedAt = new Date();
      // Update mission status to in_discussion
      if (mission) {
        mission.status = 'in_discussion';
        await mission.save();
      }
    } else if (status === 'rejected') {
      application.rejectedAt = new Date();
    }
  }

  await application.save();

  // Populate data
  await application.populate('missionId', 'title category budget status');
  await application.populate('studentId', 'fullName email avatarUrl');

  res.status(200).json({
    success: true,
    message: 'Application updated successfully',
    data: application,
  });
});

/**
 * @desc    Accept an application
 * @route   PUT /api/applications/:id/accept
 * @access  Private (Mission owner only)
 */
export const acceptApplication = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const application = await Application.findById(id)
    .populate('missionId');

  if (!application) {
    return res.status(404).json({
      success: false,
      message: 'Application not found',
    });
  }

  const mission = await Mission.findById(application.missionId._id);
  if (!mission) {
    return res.status(404).json({
      success: false,
      message: 'Mission not found',
    });
  }

  // Check if user is the mission owner
  if (mission.clientId.toString() !== userId) {
    return res.status(403).json({
      success: false,
      message: 'Only mission owner can accept applications',
    });
  }

  // Update application
  application.status = 'accepted';
  application.acceptedAt = new Date();
  await application.save();

  // Update mission status
  mission.status = 'in_discussion';
  await mission.save();

  // Populate data
  await application.populate('missionId', 'title category budget status');
  await application.populate('studentId', 'fullName email avatarUrl');

  res.status(200).json({
    success: true,
    message: 'Application accepted successfully',
    data: application,
  });
});

/**
 * @desc    Reject an application
 * @route   PUT /api/applications/:id/reject
 * @access  Private (Mission owner only)
 */
export const rejectApplication = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rejection_reason } = req.body;
  const userId = req.user.id;

  const application = await Application.findById(id)
    .populate('missionId');

  if (!application) {
    return res.status(404).json({
      success: false,
      message: 'Application not found',
    });
  }

  const mission = await Mission.findById(application.missionId._id);
  if (!mission) {
    return res.status(404).json({
      success: false,
      message: 'Mission not found',
    });
  }

  // Check if user is the mission owner
  if (mission.clientId.toString() !== userId) {
    return res.status(403).json({
      success: false,
      message: 'Only mission owner can reject applications',
    });
  }

  // Update application
  application.status = 'rejected';
  application.rejectedAt = new Date();
  if (rejection_reason) {
    application.rejectionReason = rejection_reason.trim();
  }
  await application.save();

  // Populate data
  await application.populate('missionId', 'title category budget status');
  await application.populate('studentId', 'fullName email avatarUrl');

  res.status(200).json({
    success: true,
    message: 'Application rejected successfully',
    data: application,
  });
});

