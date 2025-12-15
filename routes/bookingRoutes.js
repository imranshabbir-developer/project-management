import express from 'express';
import {
  createBooking,
  getBookings,
  getBooking,
  updateBooking,
  getBookingStats,
} from '../controllers/bookingController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get booking statistics
router.get('/stats', getBookingStats);

// Create booking
router.post('/', createBooking);

// Get all bookings
router.get('/', getBookings);

// Get single booking
router.get('/:id', getBooking);

// Update booking
router.put('/:id', updateBooking);

export default router;

