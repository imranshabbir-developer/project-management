import express from 'express';
import {
  createApplication,
  getApplications,
  getApplication,
  updateApplication,
  acceptApplication,
  rejectApplication,
} from '../controllers/applicationController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Create application
router.post('/', createApplication);

// Get all applications
router.get('/', getApplications);

// Get single application
router.get('/:id', getApplication);

// Update application
router.put('/:id', updateApplication);

// Accept application
router.put('/:id/accept', acceptApplication);

// Reject application
router.put('/:id/reject', rejectApplication);

export default router;

