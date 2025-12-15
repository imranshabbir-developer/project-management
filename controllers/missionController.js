import Mission from '../models/Mission.js';
import Application from '../models/Application.js';
import User from '../models/User.js';
import { asyncHandler } from '../middleware/errorHandler.js';

/**
 * @desc    Create a new mission
 * @route   POST /api/missions
 * @access  Private (Customer only)
 */
export const createMission = asyncHandler(async (req, res) => {
  const { client_id, title, description, category, budget, deadline, location, is_remote } = req.body;
  const clientId = req.user.id;

  // Check if user is a customer
  if (req.user.role !== 'customer') {
    return res.status(403).json({
      success: false,
      message: 'Only customers can create missions',
    });
  }

  // Validation
  if (!title || !description || !category || !budget) {
    return res.status(400).json({
      success: false,
      message: 'Please provide all required fields: title, description, category, budget',
    });
  }

  // Create mission
  const mission = await Mission.create({
    clientId: client_id || clientId,
    title: title.trim(),
    description: description.trim(),
    category: category.trim(),
    budget: parseFloat(budget),
    deadline: deadline ? new Date(deadline) : null,
    location: is_remote ? null : (location?.trim() || null),
    isRemote: is_remote || false,
    status: 'open',
  });

  // Populate client data
  await mission.populate('clientId', 'fullName email avatarUrl');

  res.status(201).json({
    success: true,
    message: 'Mission created successfully',
    data: mission,
  });
});

/**
 * @desc    Get all missions
 * @route   GET /api/missions
 * @access  Public (or Private with filters)
 */
export const getMissions = asyncHandler(async (req, res) => {
  const { clientId, status, category, sort, ids, fields } = req.query;

  // Build query
  const query = {};

  if (clientId) {
    query.clientId = clientId;
  }

  if (status) {
    query.status = status;
  }

  if (category) {
    query.category = category;
  }

  // Handle ids filter (for fetching multiple missions by IDs)
  if (ids) {
    const idArray = ids.split(',').map(id => id.trim());
    query._id = { $in: idArray };
  }

  // Build sort
  let sortOption = { createdAt: -1 };
  if (sort) {
    if (sort === '-created_at') {
      sortOption = { createdAt: -1 };
    } else if (sort === 'created_at') {
      sortOption = { createdAt: 1 };
    }
  }

  let missions = await Mission.find(query)
    .populate('clientId', 'fullName email avatarUrl')
    .sort(sortOption);

  // If fields specified, filter response
  if (fields) {
    const fieldArray = fields.split(',').map(f => f.trim());
    missions = missions.map(mission => {
      const missionObj = mission.toObject();
      const filtered = {};
      fieldArray.forEach(field => {
        if (missionObj[field] !== undefined) {
          filtered[field] = missionObj[field];
        }
      });
      return filtered;
    });
  }

  res.status(200).json({
    success: true,
    data: missions,
    count: missions.length,
  });
});

/**
 * @desc    Get a single mission by ID
 * @route   GET /api/missions/:id
 * @access  Public
 */
export const getMission = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const mission = await Mission.findById(id)
    .populate('clientId', 'fullName email avatarUrl');

  if (!mission) {
    return res.status(404).json({
      success: false,
      message: 'Mission not found',
    });
  }

  res.status(200).json({
    success: true,
    data: mission,
  });
});

/**
 * @desc    Get applications for a mission
 * @route   GET /api/missions/:id/applications
 * @access  Private
 */
export const getMissionApplications = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.query;
  const userId = req.user.id;

  // Check if mission exists
  const mission = await Mission.findById(id);
  if (!mission) {
    return res.status(404).json({
      success: false,
      message: 'Mission not found',
    });
  }

  // Check authorization - only mission owner or applicants can see applications
  const isOwner = mission.clientId.toString() === userId;
  if (!isOwner && req.user.role !== 'admin') {
    // Students can only see their own applications
    const query = { missionId: id, studentId: userId };
    if (status) {
      query.status = status;
    }
    const applications = await Application.find(query)
      .populate('studentId', 'fullName email avatarUrl')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: applications,
      count: applications.length,
    });
  }

  // Mission owner can see all applications
  const query = { missionId: id };
  if (status) {
    query.status = status;
  }

  const applications = await Application.find(query)
    .populate('studentId', 'fullName email avatarUrl')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: applications,
    count: applications.length,
  });
});

/**
 * @desc    Update a mission
 * @route   PUT /api/missions/:id
 * @access  Private (Owner only)
 */
export const updateMission = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, description, category, budget, deadline, location, is_remote, status } = req.body;
  const userId = req.user.id;

  const mission = await Mission.findById(id);

  if (!mission) {
    return res.status(404).json({
      success: false,
      message: 'Mission not found',
    });
  }

  // Check if user is the owner
  if (mission.clientId.toString() !== userId && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to update this mission',
    });
  }

  // Update fields
  if (title !== undefined) mission.title = title.trim();
  if (description !== undefined) mission.description = description.trim();
  if (category !== undefined) mission.category = category.trim();
  if (budget !== undefined) mission.budget = parseFloat(budget);
  if (deadline !== undefined) mission.deadline = deadline ? new Date(deadline) : null;
  if (location !== undefined) mission.location = is_remote ? null : (location?.trim() || null);
  if (is_remote !== undefined) mission.isRemote = is_remote;
  if (status !== undefined) {
    mission.status = status;
    if (status === 'completed') {
      mission.completedAt = new Date();
    } else if (status === 'cancelled') {
      mission.cancelledAt = new Date();
    }
  }

  await mission.save();

  // Populate client data
  await mission.populate('clientId', 'fullName email avatarUrl');

  res.status(200).json({
    success: true,
    message: 'Mission updated successfully',
    data: mission,
  });
});

/**
 * @desc    Delete a mission
 * @route   DELETE /api/missions/:id
 * @access  Private (Owner only)
 */
export const deleteMission = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const mission = await Mission.findById(id);

  if (!mission) {
    return res.status(404).json({
      success: false,
      message: 'Mission not found',
    });
  }

  // Check if user is the owner
  if (mission.clientId.toString() !== userId && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to delete this mission',
    });
  }

  await Mission.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: 'Mission deleted successfully',
  });
});
