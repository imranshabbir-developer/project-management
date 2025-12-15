import Booking from '../models/Booking.js';
import User from '../models/User.js';
import { asyncHandler } from '../middleware/errorHandler.js';

/**
 * @desc    Create a new booking
 * @route   POST /api/bookings
 * @access  Private
 */
export const createBooking = asyncHandler(async (req, res) => {
  const { studentId, date, hours, description, hourlyRate } = req.body;
  const clientId = req.user.id;

  // Validation
  if (!studentId || !date || !hours || !description || !hourlyRate) {
    return res.status(400).json({
      success: false,
      message: 'Please provide all required fields: studentId, date, hours, description, hourlyRate',
    });
  }

  // Check if student exists and is a student
  const student = await User.findById(studentId);
  if (!student || student.role !== 'student') {
    return res.status(404).json({
      success: false,
      message: 'Student not found',
    });
  }

  // Check if client is trying to book themselves
  if (clientId === studentId) {
    return res.status(400).json({
      success: false,
      message: 'You cannot book yourself',
    });
  }

  // Calculate total amount
  const totalAmount = hourlyRate * hours;

  // Create booking
  const booking = await Booking.create({
    clientId,
    studentId,
    date: new Date(date),
    hours,
    description,
    hourlyRate,
    totalAmount,
    status: 'pending',
  });

  // Populate user data
  await booking.populate('clientId', 'fullName email avatarUrl');
  await booking.populate('studentId', 'fullName email avatarUrl');

  res.status(201).json({
    success: true,
    message: 'Booking created successfully',
    data: booking,
  });
});

/**
 * @desc    Get all bookings for the current user
 * @route   GET /api/bookings
 * @access  Private
 */
export const getBookings = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { status, role } = req.query;

  // Build query based on user role
  let query = {};
  if (req.user.role === 'student') {
    query.studentId = userId;
  } else if (req.user.role === 'customer') {
    query.clientId = userId;
  } else {
    // Admin or other roles - can see all
    query = {};
  }

  // Filter by status if provided
  if (status) {
    query.status = status;
  }

  const bookings = await Booking.find(query)
    .populate('clientId', 'fullName email avatarUrl')
    .populate('studentId', 'fullName email avatarUrl')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: bookings,
    count: bookings.length,
  });
});

/**
 * @desc    Get a single booking by ID
 * @route   GET /api/bookings/:id
 * @access  Private
 */
export const getBooking = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const booking = await Booking.findById(id)
    .populate('clientId', 'fullName email avatarUrl')
    .populate('studentId', 'fullName email avatarUrl');

  if (!booking) {
    return res.status(404).json({
      success: false,
      message: 'Booking not found',
    });
  }

  // Check if user has access to this booking
  if (
    booking.clientId._id.toString() !== userId &&
    booking.studentId._id.toString() !== userId &&
    req.user.role !== 'admin'
  ) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to access this booking',
    });
  }

  res.status(200).json({
    success: true,
    data: booking,
  });
});

/**
 * @desc    Update booking status
 * @route   PUT /api/bookings/:id
 * @access  Private
 */
export const updateBooking = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, cancellationReason } = req.body;
  const userId = req.user.id;

  const booking = await Booking.findById(id);

  if (!booking) {
    return res.status(404).json({
      success: false,
      message: 'Booking not found',
    });
  }

  // Check authorization
  const isClient = booking.clientId.toString() === userId;
  const isStudent = booking.studentId.toString() === userId;

  if (!isClient && !isStudent) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to update this booking',
    });
  }

  // Update status
  if (status) {
    // Validate status transitions
    const validTransitions = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['completed', 'cancelled'],
      completed: [],
      cancelled: [],
    };

    if (!validTransitions[booking.status]?.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change status from ${booking.status} to ${status}`,
      });
    }

    // Only student can confirm, both can cancel
    if (status === 'confirmed' && !isStudent) {
      return res.status(403).json({
        success: false,
        message: 'Only the student can confirm a booking',
      });
    }

    booking.status = status;

    // Set timestamps
    if (status === 'confirmed') {
      booking.confirmedAt = new Date();
    } else if (status === 'completed') {
      booking.completedAt = new Date();
    } else if (status === 'cancelled') {
      booking.cancelledAt = new Date();
      if (cancellationReason) {
        booking.cancellationReason = cancellationReason;
      }
    }
  }

  await booking.save();

  // Populate user data
  await booking.populate('clientId', 'fullName email avatarUrl');
  await booking.populate('studentId', 'fullName email avatarUrl');

  res.status(200).json({
    success: true,
    message: 'Booking updated successfully',
    data: booking,
  });
});

/**
 * @desc    Get booking statistics for the current user
 * @route   GET /api/bookings/stats
 * @access  Private
 */
export const getBookingStats = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Build query based on user role
  let query = {};
  if (req.user.role === 'student') {
    query.studentId = userId;
  } else if (req.user.role === 'customer') {
    query.clientId = userId;
  } else {
    // Admin or other roles - can see all
    query = {};
  }

  // Get all bookings for stats
  const allBookings = await Booking.find(query);

  // Calculate statistics
  const stats = {
    total: allBookings.length,
    pending: allBookings.filter(b => b.status === 'pending').length,
    confirmed: allBookings.filter(b => b.status === 'confirmed').length,
    completed: allBookings.filter(b => b.status === 'completed').length,
    cancelled: allBookings.filter(b => b.status === 'cancelled').length,
    totalEarnings: req.user.role === 'student'
      ? allBookings
          .filter(b => b.status === 'completed')
          .reduce((sum, b) => sum + (b.totalAmount || 0), 0)
      : 0,
    totalSpent: req.user.role === 'customer'
      ? allBookings
          .filter(b => b.status === 'completed' || b.status === 'confirmed')
          .reduce((sum, b) => sum + (b.totalAmount || 0), 0)
      : 0,
    upcomingBookings: allBookings.filter(b => 
      (b.status === 'pending' || b.status === 'confirmed') && 
      new Date(b.date) >= new Date()
    ).length,
  };

  res.status(200).json({
    success: true,
    data: stats,
  });
});

