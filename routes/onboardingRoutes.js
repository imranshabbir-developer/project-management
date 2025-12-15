import express from 'express';
import {
  getProfile,
  updateProfile,
  updateStudentProfile,
  completeOnboarding,
  uploadAvatar,
  uploadPortfolio,
} from '../controllers/onboardingController.js';
import { protect } from '../middleware/auth.js';
import { createMulterUpload } from '../config/multer.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get profile
router.get('/profile', getProfile);

// Update profile (Step 1)
router.put('/profile', updateProfile);

// Update student profile (Step 2)
router.put('/student-profile', updateStudentProfile);

// Complete onboarding
router.post('/complete', completeOnboarding);

// Upload avatar (single file)
router.post('/avatar', createMulterUpload('onboarding', { maxFileSize: 5 * 1024 * 1024 }).single('avatar'), uploadAvatar);

// Upload portfolio images (multiple files, max 10)
router.post('/portfolio', createMulterUpload('onboarding', { maxFileSize: 10 * 1024 * 1024 }).array('portfolio', 10), uploadPortfolio);

export default router;

