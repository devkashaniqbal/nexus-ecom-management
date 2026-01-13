import KnowledgeBase from '../models/KnowledgeBase.js';
import ChatHistory from '../models/ChatHistory.js';
import { AppError } from '../utils/appError.js';
import { v4 as uuidv4 } from 'uuid';

// Simple text similarity function (cosine similarity on word frequency)
const calculateSimilarity = (text1, text2) => {
  const words1 = text1.toLowerCase().split(/\s+/);
  const words2 = text2.toLowerCase().split(/\s+/);

  const allWords = [...new Set([...words1, ...words2])];

  const vector1 = allWords.map(word => words1.filter(w => w === word).length);
  const vector2 = allWords.map(word => words2.filter(w => w === word).length);

  const dotProduct = vector1.reduce((sum, val, i) => sum + val * vector2[i], 0);
  const magnitude1 = Math.sqrt(vector1.reduce((sum, val) => sum + val * val, 0));
  const magnitude2 = Math.sqrt(vector2.reduce((sum, val) => sum + val * val, 0));

  return magnitude1 && magnitude2 ? dotProduct / (magnitude1 * magnitude2) : 0;
};

// Search knowledge base for relevant documents
const searchKnowledgeBase = async (query, filters = {}) => {
  try {
    // Build search query
    const searchQuery = {
      isActive: true,
      $text: { $search: query },
    };

    if (filters.category) {
      searchQuery.category = filters.category;
    }

    if (filters.projectId) {
      searchQuery.projectId = filters.projectId;
    }

    // Search with text score
    const results = await KnowledgeBase.find(searchQuery, {
      score: { $meta: 'textScore' },
    })
      .sort({ score: { $meta: 'textScore' } })
      .limit(5)
      .populate('uploadedBy', 'firstName lastName')
      .populate('projectId', 'name');

    // Calculate relevance scores
    const rankedResults = results.map(doc => ({
      ...doc.toObject(),
      relevanceScore: calculateSimilarity(query, doc.content + ' ' + doc.title),
    }));

    return rankedResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
};

// Generate AI response based on knowledge base
const generateResponse = (query, knowledgeResults) => {
  if (knowledgeResults.length === 0) {
    return {
      response: `I don't have specific information about "${query}" in the Nexus Ecom knowledge base yet. Please add relevant documentation or project details to help me assist you better.`,
      sources: [],
    };
  }

  // Extract relevant information from top results
  const topResults = knowledgeResults.slice(0, 3);
  const context = topResults
    .map(result => `From "${result.title}": ${result.content.substring(0, 500)}`)
    .join('\n\n');

  // Generate a contextual response
  let response = `Based on Nexus Ecom's knowledge base:\n\n`;

  topResults.forEach((result, index) => {
    const snippet = result.content.substring(0, 200).trim();
    response += `${index + 1}. **${result.title}** (${result.category})\n${snippet}${snippet.length < result.content.length ? '...' : ''}\n\n`;
  });

  response += `\nFor more detailed information, please refer to the sources listed above.`;

  const sources = topResults.map(result => ({
    knowledgeBaseId: result._id,
    title: result.title,
    relevanceScore: result.relevanceScore,
  }));

  return { response, sources };
};

export const chat = async (req, res, next) => {
  try {
    const { message, sessionId, context = {} } = req.body;
    const userId = req.user._id;

    if (!message || !message.trim()) {
      return next(new AppError('Message is required', 400));
    }

    // Create or get session
    const currentSessionId = sessionId || uuidv4();

    // Search knowledge base
    const knowledgeResults = await searchKnowledgeBase(message, context);

    // Generate response
    const { response, sources } = generateResponse(message, knowledgeResults);

    // Save chat history
    let chatSession = await ChatHistory.findOne({
      userId,
      sessionId: currentSessionId,
    });

    if (!chatSession) {
      chatSession = new ChatHistory({
        userId,
        sessionId: currentSessionId,
        title: message.substring(0, 50),
        messages: [],
        context,
      });
    }

    // Add messages
    chatSession.messages.push({
      role: 'user',
      content: message,
    });

    chatSession.messages.push({
      role: 'assistant',
      content: response,
      sources,
    });

    await chatSession.save();

    res.status(200).json({
      status: 'success',
      data: {
        sessionId: currentSessionId,
        message: response,
        sources: knowledgeResults.slice(0, 3).map(r => ({
          id: r._id,
          title: r.title,
          category: r.category,
          relevanceScore: r.relevanceScore,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getChatHistory = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user._id;

    const chatSession = await ChatHistory.findOne({
      userId,
      sessionId,
    }).populate('context.projectIds', 'name');

    if (!chatSession) {
      return next(new AppError('Chat session not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        session: chatSession,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAllSessions = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { limit = 20, skip = 0 } = req.query;

    const sessions = await ChatHistory.find({
      userId,
      isActive: true,
    })
      .sort({ updatedAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .select('sessionId title updatedAt messages');

    const total = await ChatHistory.countDocuments({ userId, isActive: true });

    res.status(200).json({
      status: 'success',
      data: {
        sessions: sessions.map(s => ({
          sessionId: s.sessionId,
          title: s.title,
          lastMessage: s.messages[s.messages.length - 1]?.content?.substring(0, 100),
          updatedAt: s.updatedAt,
          messageCount: s.messages.length,
        })),
        total,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user._id;

    const session = await ChatHistory.findOneAndUpdate(
      { userId, sessionId },
      { isActive: false },
      { new: true }
    );

    if (!session) {
      return next(new AppError('Chat session not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

export const addKnowledge = async (req, res, next) => {
  try {
    const { title, content, category, tags, projectId } = req.body;
    const userId = req.user._id;

    if (!title || !content) {
      return next(new AppError('Title and content are required', 400));
    }

    const knowledge = await KnowledgeBase.create({
      title,
      content,
      category,
      tags: tags ? tags.split(',').map(t => t.trim()) : [],
      projectId: projectId || null,
      uploadedBy: userId,
    });

    await knowledge.populate('uploadedBy', 'firstName lastName');
    await knowledge.populate('projectId', 'name');

    res.status(201).json({
      status: 'success',
      data: {
        knowledge,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getKnowledge = async (req, res, next) => {
  try {
    const { category, projectId, search, limit = 20, skip = 0 } = req.query;

    const query = { isActive: true };

    if (category) {
      query.category = category;
    }

    if (projectId) {
      query.projectId = projectId;
    }

    if (search) {
      query.$text = { $search: search };
    }

    const knowledge = await KnowledgeBase.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .populate('uploadedBy', 'firstName lastName')
      .populate('projectId', 'name');

    const total = await KnowledgeBase.countDocuments(query);

    res.status(200).json({
      status: 'success',
      data: {
        knowledge,
        total,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateKnowledge = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, content, category, tags, projectId } = req.body;

    const knowledge = await KnowledgeBase.findById(id);

    if (!knowledge) {
      return next(new AppError('Knowledge base entry not found', 404));
    }

    // Check if user is admin or the uploader
    if (req.user.role !== 'admin' && knowledge.uploadedBy.toString() !== req.user._id.toString()) {
      return next(new AppError('You do not have permission to update this entry', 403));
    }

    knowledge.title = title || knowledge.title;
    knowledge.content = content || knowledge.content;
    knowledge.category = category || knowledge.category;
    knowledge.projectId = projectId !== undefined ? projectId : knowledge.projectId;

    if (tags) {
      knowledge.tags = tags.split(',').map(t => t.trim());
    }

    await knowledge.save();
    await knowledge.populate('uploadedBy', 'firstName lastName');
    await knowledge.populate('projectId', 'name');

    res.status(200).json({
      status: 'success',
      data: {
        knowledge,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteKnowledge = async (req, res, next) => {
  try {
    const { id } = req.params;

    const knowledge = await KnowledgeBase.findById(id);

    if (!knowledge) {
      return next(new AppError('Knowledge base entry not found', 404));
    }

    // Check if user is admin or the uploader
    if (req.user.role !== 'admin' && knowledge.uploadedBy.toString() !== req.user._id.toString()) {
      return next(new AppError('You do not have permission to delete this entry', 403));
    }

    knowledge.isActive = false;
    await knowledge.save();

    res.status(200).json({
      status: 'success',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

export const bulkImportKnowledge = async (req, res, next) => {
  try {
    const { entries } = req.body;
    const userId = req.user._id;

    if (!Array.isArray(entries) || entries.length === 0) {
      return next(new AppError('Entries array is required', 400));
    }

    const knowledgeEntries = entries.map(entry => ({
      title: entry.title,
      content: entry.content,
      category: entry.category || 'other',
      tags: entry.tags || [],
      uploadedBy: userId,
    }));

    const results = await KnowledgeBase.insertMany(knowledgeEntries);

    res.status(201).json({
      status: 'success',
      data: {
        imported: results.length,
        knowledge: results,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAIAnalytics = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    // Total knowledge entries
    const totalKnowledge = await KnowledgeBase.countDocuments({ isActive: true });

    // Knowledge by category
    const knowledgeByCategory = await KnowledgeBase.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Chat statistics
    const chatFilter = { isActive: true };
    if (Object.keys(dateFilter).length > 0) {
      chatFilter.createdAt = dateFilter;
    }

    const totalSessions = await ChatHistory.countDocuments(chatFilter);
    const totalMessages = await ChatHistory.aggregate([
      { $match: chatFilter },
      { $project: { messageCount: { $size: '$messages' } } },
      { $group: { _id: null, total: { $sum: '$messageCount' } } },
    ]);

    // Most active users
    const activeUsers = await ChatHistory.aggregate([
      { $match: chatFilter },
      { $group: { _id: '$userId', sessions: { $sum: 1 } } },
      { $sort: { sessions: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          userId: '$_id',
          sessions: 1,
          name: { $concat: ['$user.firstName', ' ', '$user.lastName'] },
        },
      },
    ]);

    // Most searched topics (based on message content)
    const recentMessages = await ChatHistory.aggregate([
      { $match: chatFilter },
      { $unwind: '$messages' },
      { $match: { 'messages.role': 'user' } },
      { $project: { content: '$messages.content' } },
      { $limit: 100 },
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        knowledge: {
          total: totalKnowledge,
          byCategory: knowledgeByCategory,
        },
        chat: {
          totalSessions,
          totalMessages: totalMessages[0]?.total || 0,
          averageMessagesPerSession:
            totalSessions > 0
              ? ((totalMessages[0]?.total || 0) / totalSessions).toFixed(1)
              : 0,
        },
        users: {
          mostActive: activeUsers,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const exportChatHistory = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user._id;

    const chatSession = await ChatHistory.findOne({
      userId,
      sessionId,
    }).populate('context.projectIds', 'name');

    if (!chatSession) {
      return next(new AppError('Chat session not found', 404));
    }

    // Format for export
    const exportData = {
      sessionId: chatSession.sessionId,
      title: chatSession.title,
      date: chatSession.createdAt,
      messages: chatSession.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
        sources: msg.sources,
      })),
    };

    res.status(200).json({
      status: 'success',
      data: {
        export: exportData,
      },
    });
  } catch (error) {
    next(error);
  }
};
