import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import { asyncHandler } from '../middleware/errorHandler.js';

/**
 * @desc    Create or get existing conversation
 * @route   POST /api/conversations
 * @access  Private
 */
export const createOrGetConversation = asyncHandler(async (req, res) => {
  // Support both camelCase and snake_case
  const { studentId, student_id, clientId, client_id, missionId, mission_id } = req.body;
  const userId = req.user.id;

  // Normalize to camelCase
  const finalStudentId = studentId || student_id;
  const finalClientId = clientId || client_id;
  const finalMissionId = missionId || mission_id;

  // Determine client and student IDs based on user role
  let resolvedClientId = finalClientId;
  let resolvedStudentId = finalStudentId;

  // If user is a student, they're the student, otherwise they're the client
  if (req.user.role === 'student') {
    resolvedStudentId = userId;
    if (!finalClientId) {
      return res.status(400).json({
        success: false,
        message: 'Client ID is required when creating conversation as student',
      });
    }
    resolvedClientId = finalClientId;
  } else {
    resolvedClientId = userId;
    if (!finalStudentId) {
      return res.status(400).json({
        success: false,
        message: 'Student ID is required when creating conversation as client',
      });
    }
    resolvedStudentId = finalStudentId;
  }

  // Check if student exists
  const student = await User.findById(resolvedStudentId);
  if (!student || student.role !== 'student') {
    return res.status(404).json({
      success: false,
      message: 'Student not found',
    });
  }

  // Check if client exists
  const client = await User.findById(resolvedClientId);
  if (!client || client.role !== 'customer') {
    return res.status(404).json({
      success: false,
      message: 'Client not found',
    });
  }

  // Try to find existing conversation
  let conversation = await Conversation.findOne({
    clientId: resolvedClientId,
    studentId: resolvedStudentId,
    missionId: finalMissionId || null,
  })
    .populate('clientId', 'fullName email avatarUrl')
    .populate('studentId', 'fullName email avatarUrl');

  // If conversation doesn't exist, create it
  if (!conversation) {
    conversation = await Conversation.create({
      clientId: resolvedClientId,
      studentId: resolvedStudentId,
      missionId: finalMissionId || null,
    });

    await conversation.populate('clientId', 'fullName email avatarUrl');
    await conversation.populate('studentId', 'fullName email avatarUrl');
  }

  res.status(200).json({
    success: true,
    data: conversation,
  });
});

/**
 * @desc    Get all conversations for the current user
 * @route   GET /api/conversations
 * @access  Private
 */
export const getConversations = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { sort } = req.query;

  // Find conversations where user is either client or student
  const conversations = await Conversation.find({
    $or: [{ clientId: userId }, { studentId: userId }],
  })
    .populate('clientId', 'fullName email avatarUrl')
    .populate('studentId', 'fullName email avatarUrl')
    .sort(sort === '-updated_at' ? { lastMessageAt: -1 } : { createdAt: -1 });

  res.status(200).json({
    success: true,
    data: conversations,
    count: conversations.length,
  });
});

/**
 * @desc    Get a single conversation by ID
 * @route   GET /api/conversations/:id
 * @access  Private
 */
export const getConversation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const conversation = await Conversation.findById(id)
    .populate('clientId', 'fullName email avatarUrl')
    .populate('studentId', 'fullName email avatarUrl');

  if (!conversation) {
    return res.status(404).json({
      success: false,
      message: 'Conversation not found',
    });
  }

  // Check if user has access to this conversation
  if (
    conversation.clientId._id.toString() !== userId &&
    conversation.studentId._id.toString() !== userId
  ) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to access this conversation',
    });
  }

  res.status(200).json({
    success: true,
    data: conversation,
  });
});

/**
 * @desc    Get messages for a conversation
 * @route   GET /api/conversations/:id/messages
 * @access  Private
 */
export const getMessages = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  // Check if conversation exists and user has access
  const conversation = await Conversation.findById(id);

  if (!conversation) {
    return res.status(404).json({
      success: false,
      message: 'Conversation not found',
    });
  }

  if (
    conversation.clientId.toString() !== userId &&
    conversation.studentId.toString() !== userId
  ) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to access this conversation',
    });
  }

  // Get messages
  const messages = await Message.find({ conversationId: id })
    .populate('senderId', 'fullName email avatarUrl')
    .sort({ createdAt: 1 });

  // Mark messages as read for the current user
  await Message.updateMany(
    {
      conversationId: id,
      senderId: { $ne: userId },
      read: false,
    },
    {
      read: true,
      readAt: new Date(),
    }
  );

  res.status(200).json({
    success: true,
    data: messages,
    count: messages.length,
  });
});

/**
 * @desc    Send a message in a conversation
 * @route   POST /api/conversations/:id/messages
 * @access  Private
 */
export const sendMessage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  const userId = req.user.id;

  if (!content || !content.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Message content is required',
    });
  }

  // Check if conversation exists and user has access
  const conversation = await Conversation.findById(id);

  if (!conversation) {
    return res.status(404).json({
      success: false,
      message: 'Conversation not found',
    });
  }

  if (
    conversation.clientId.toString() !== userId &&
    conversation.studentId.toString() !== userId
  ) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to send messages in this conversation',
    });
  }

  // Create message
  const message = await Message.create({
    conversationId: id,
    senderId: userId,
    content: content.trim(),
  });

  // Update conversation's last message
  conversation.lastMessage = content.trim();
  conversation.lastMessageAt = new Date();
  await conversation.save();

  // Populate sender data
  await message.populate('senderId', 'fullName email avatarUrl');

  res.status(201).json({
    success: true,
    message: 'Message sent successfully',
    data: message,
  });
});

