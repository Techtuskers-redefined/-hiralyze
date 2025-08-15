import express from 'express';
import ChatLog from '../models/ChatLog.js';
import { authenticate } from '../middleware/auth.js';
import { processWithGroqGemini } from '../services/aiService.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Send message to chatbot
router.post('/message', authenticate, async (req, res) => {
  try {
    const { message, sessionId, context } = req.body;
    const userId = req.user._id;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    // Generate session ID if not provided
    const currentSessionId = sessionId || uuidv4();

    // Find or create chat log
    let chatLog = await ChatLog.findOne({ 
      userId, 
      sessionId: currentSessionId,
      isActive: true 
    });

    if (!chatLog) {
      chatLog = new ChatLog({
        userId,
        sessionId: currentSessionId,
        messages: [],
        context: context || {}
      });
    }

    // Add user message
    chatLog.messages.push({
      role: 'user',
      content: message.trim(),
      timestamp: new Date()
    });

    // Prepare context for AI
    const conversationHistory = chatLog.messages.slice(-10); // Last 10 messages
    const userRole = req.user.role;
    
    // Process with GROQ + GEMINI AI
    const aiResponse = await processWithGroqGemini({
      message: message.trim(),
      conversationHistory,
      userRole,
      context: chatLog.context
    });

    // Add AI response
    chatLog.messages.push({
      role: 'assistant',
      content: aiResponse.response,
      timestamp: new Date(),
      metadata: {
        intent: aiResponse.intent,
        confidence: aiResponse.confidence,
        entities: aiResponse.entities
      }
    });

    // Update context if needed
    if (aiResponse.updatedContext) {
      chatLog.context = { ...chatLog.context, ...aiResponse.updatedContext };
    }

    await chatLog.save();

    res.json({
      response: aiResponse.response,
      sessionId: currentSessionId,
      intent: aiResponse.intent,
      confidence: aiResponse.confidence
    });
  } catch (error) {
    console.error('Chatbot message error:', error);
    res.status(500).json({ 
      message: 'Failed to process message',
      response: "I'm sorry, I'm having trouble responding right now. Please try again later."
    });
  }
});

// Get chat history
router.get('/history', authenticate, async (req, res) => {
  try {
    const { sessionId, limit = 50 } = req.query;
    const userId = req.user._id;

    const query = { userId };
    if (sessionId) {
      query.sessionId = sessionId;
    }

    const chatLogs = await ChatLog.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    const formattedHistory = chatLogs.map(log => ({
      sessionId: log.sessionId,
      messages: log.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp
      })),
      createdAt: log.createdAt,
      isActive: log.isActive
    }));

    res.json(formattedHistory);
  } catch (error) {
    console.error('Chat history error:', error);
    res.status(500).json({ message: 'Failed to fetch chat history' });
  }
});

// End chat session
router.post('/end-session', authenticate, async (req, res) => {
  try {
    const { sessionId, satisfaction } = req.body;
    const userId = req.user._id;

    const chatLog = await ChatLog.findOne({ userId, sessionId });
    if (!chatLog) {
      return res.status(404).json({ message: 'Chat session not found' });
    }

    chatLog.isActive = false;
    chatLog.endedAt = new Date();
    
    if (satisfaction) {
      chatLog.satisfaction = satisfaction;
    }

    await chatLog.save();

    res.json({ message: 'Chat session ended successfully' });
  } catch (error) {
    console.error('End session error:', error);
    res.status(500).json({ message: 'Failed to end chat session' });
  }
});

// Get chat analytics (HR only)
router.get('/analytics', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'hr') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Total conversations
    const totalConversations = await ChatLog.countDocuments({
      createdAt: { $gte: startDate }
    });

    // Active conversations
    const activeConversations = await ChatLog.countDocuments({
      isActive: true,
      createdAt: { $gte: startDate }
    });

    // Average messages per conversation
    const avgMessagesAgg = await ChatLog.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $project: { messageCount: { $size: '$messages' } } },
      { $group: { _id: null, avgMessages: { $avg: '$messageCount' } } }
    ]);
    const avgMessages = Math.round(avgMessagesAgg[0]?.avgMessages || 0);

    // Top intents
    const topIntents = await ChatLog.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $unwind: '$messages' },
      { $match: { 'messages.metadata.intent': { $exists: true } } },
      { $group: { _id: '$messages.metadata.intent', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $project: { intent: '$_id', count: 1, _id: 0 } }
    ]);

    // Satisfaction ratings
    const satisfactionAgg = await ChatLog.aggregate([
      { 
        $match: { 
          createdAt: { $gte: startDate },
          'satisfaction.rating': { $exists: true }
        } 
      },
      { 
        $group: { 
          _id: null, 
          avgRating: { $avg: '$satisfaction.rating' },
          totalRatings: { $sum: 1 }
        } 
      }
    ]);
    const satisfaction = satisfactionAgg[0] || { avgRating: 0, totalRatings: 0 };

    res.json({
      totalConversations,
      activeConversations,
      avgMessages,
      topIntents,
      satisfaction: {
        averageRating: Math.round(satisfaction.avgRating * 10) / 10,
        totalRatings: satisfaction.totalRatings
      }
    });
  } catch (error) {
    console.error('Chat analytics error:', error);
    res.status(500).json({ message: 'Failed to fetch chat analytics' });
  }
});

export default router;