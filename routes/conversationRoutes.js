import express from 'express';
import {
  createOrGetConversation,
  getConversations,
  getConversation,
  getMessages,
  sendMessage,
} from '../controllers/conversationController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Create or get conversation
router.post('/', createOrGetConversation);

// Get all conversations
router.get('/', getConversations);

// Get single conversation
router.get('/:id', getConversation);

// Get messages for a conversation
router.get('/:id/messages', getMessages);

// Send message in a conversation
router.post('/:id/messages', sendMessage);

export default router;

