import admin from '../config/firebase.js';
import User from '../models/User.js';
import { generateToken, generateRefreshToken } from '../utils/jwt.js';
import { asyncHandler } from '../middleware/errorHandler.js';

/**
 * @desc    Verify Firebase ID token and create/login user
 * @route   POST /api/auth/google
 * @access  Public
 */
export const verifyGoogleToken = asyncHandler(async (req, res) => {
  const { idToken, role } = req.body;

  if (!idToken) {
    return res.status(400).json({
      success: false,
      message: 'ID token is required',
    });
  }

  // Check if Firebase Admin is initialized
  if (!admin.apps.length) {
    return res.status(500).json({
      success: false,
      message: 'Firebase Admin SDK not initialized. Check server configuration.',
    });
  }

  try {
    // Verify the Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    // Extract user information from token
    const {
      uid: firebaseUid,
      email,
      name: fullName,
      picture: avatarUrl,
      email_verified: isEmailVerified,
    } = decodedToken;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email not found in token',
      });
    }

    // Check if user exists with Firebase UID
    let user = await User.findOne({ googleId: firebaseUid });

    if (user) {
      // Update last login and user info
      user.lastLogin = new Date();
      if (avatarUrl && !user.avatarUrl) {
        user.avatarUrl = avatarUrl;
      }
      if (fullName && !user.fullName) {
        user.fullName = fullName;
      }
      user.isEmailVerified = isEmailVerified || user.isEmailVerified;
      await user.save();
    } else {
      // Check if user exists with email
      user = await User.findOne({ email: email.toLowerCase() });

      if (user) {
        // Link Google account to existing user
        user.googleId = firebaseUid;
        user.avatarUrl = avatarUrl || user.avatarUrl;
        if (!user.fullName && fullName) {
          user.fullName = fullName;
        }
        user.isEmailVerified = isEmailVerified || user.isEmailVerified;
        user.lastLogin = new Date();
        await user.save();
      } else {
        // Create new user
        user = await User.create({
          googleId: firebaseUid,
          email: email.toLowerCase(),
          fullName: fullName || null,
          avatarUrl: avatarUrl || null,
          isEmailVerified: isEmailVerified || false,
          role: role || 'student', // Use provided role or default to 'student'
          lastLogin: new Date(),
        });
      }
    }

    // Generate JWT tokens
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Google authentication successful',
      data: {
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          avatarUrl: user.avatarUrl,
          isEmailVerified: user.isEmailVerified,
          createdAt: user.createdAt,
        },
        token,
        refreshToken,
      },
    });
  } catch (error) {
    // Only log errors in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Firebase token verification error:', error.message);
    }

    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({
        success: false,
        message: 'ID token has expired',
      });
    }

    if (error.code === 'auth/argument-error') {
      return res.status(400).json({
        success: false,
        message: 'Invalid ID token format',
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid or expired ID token',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * @desc    Get Firebase configuration for frontend
 * @route   GET /api/auth/google/config
 * @access  Public
 */
export const getFirebaseConfig = (req, res) => {
  // Return Firebase config that frontend needs
  // Note: This should only return public config, not sensitive keys
  res.status(200).json({
    success: true,
    message: 'Use Firebase SDK config from your Firebase console',
    data: {
      note: 'Add your Firebase web app config to your frontend .env file',
      requiredEnvVars: [
        'VITE_FIREBASE_API_KEY',
        'VITE_FIREBASE_AUTH_DOMAIN',
        'VITE_FIREBASE_PROJECT_ID',
        'VITE_FIREBASE_STORAGE_BUCKET',
        'VITE_FIREBASE_MESSAGING_SENDER_ID',
        'VITE_FIREBASE_APP_ID',
      ],
    },
  });
};
