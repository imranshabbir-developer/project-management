import express from 'express';
import {
  register,
  login,
  getMe,
  refreshToken,
  logout,
} from '../controllers/authController.js';
import {
  verifyGoogleToken,
  getFirebaseConfig,
} from '../controllers/googleAuthController.js';
import { protect } from '../middleware/auth.js';
import { validateRegister, validateLogin } from '../middleware/validation.js';

const router = express.Router();

// Public routes
router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.post('/refresh', refreshToken);
router.post('/google', verifyGoogleToken);
router.get('/google/config', getFirebaseConfig);

// Protected routes
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

export default router;

