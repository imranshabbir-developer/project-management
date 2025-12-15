import express from 'express';
import {
  createMission,
  getMissions,
  getMission,
  getMissionApplications,
  updateMission,
  deleteMission,
} from '../controllers/missionController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Get all missions (public or filtered)
router.get('/', getMissions);

// Get single mission (public)
router.get('/:id', getMission);

// Get applications for a mission (protected)
router.get('/:id/applications', protect, getMissionApplications);

// All routes below require authentication
router.use(protect);

// Create mission (customer only)
router.post('/', createMission);

// Update mission (owner only)
router.put('/:id', updateMission);

// Delete mission (owner only)
router.delete('/:id', deleteMission);

export default router;

