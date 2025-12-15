import express from 'express';
import {
  searchProfiles,
  getProfile,
  getStudentProfile,
  updateProfile,
  updateStudentProfile,
} from '../controllers/profileController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/search', searchProfiles);
router.get('/:id', getProfile);
router.get('/:id/student', getStudentProfile);

// Protected routes
router.put('/:id', protect, updateProfile);
router.put('/:id/student', protect, updateStudentProfile);

export default router;

