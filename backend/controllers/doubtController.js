const { Doubt, Answer, Vote, User } = require('../models');
const asyncHandler = require('../utilits/asyncHandler');
const { escapeRegex, withPopulatedUser } = require('../utilits/mongoHelpers');

/**
 * Doubt Controller
 * Handles all doubt/question-related operations
 * Implements Q&A functionality with voting and answer acceptance
 */

const includeDoubtUser = 'userId';
const includeAnswerUser = 'userId';

const withOwner = (entity) => withPopulatedUser(entity, 'userId');

const withAnswerOwner = (answer) => withPopulatedUser(answer, 'userId');

const attachAnswers = async (doubts) => {
  const doubtIds = doubts.map((d) => d.id);
  if (!doubtIds.length) return doubts;

  const answers = await Answer.find({ doubtId: { $in: doubtIds } })
    .populate(includeAnswerUser, 'id username')
    .sort({ isAccepted: -1, createdAt: 1 });

  const grouped = answers.reduce((acc, answer) => {
    const plain = withAnswerOwner(answer);
    if (!acc[plain.doubtId]) acc[plain.doubtId] = [];
    acc[plain.doubtId].push(plain);
    return acc;
  }, {});

  return doubts.map((doubt) => ({
    ...doubt,
    answers: grouped[doubt.id] || [],
    answerCount: (grouped[doubt.id] || []).length,
    netVotes: Number(doubt.upvotes || 0) - Number(doubt.downvotes || 0)
  }));
};

const recountVotes = async (targetId, targetType) => {
  const [upvotes, downvotes] = await Promise.all([
    Vote.countDocuments({ targetId, targetType, voteType: 'up' }),
    Vote.countDocuments({ targetId, targetType, voteType: 'down' })
  ]);

  if (targetType === 'doubt') {
    await Doubt.updateOne({ _id: targetId }, { $set: { upvotes, downvotes } });
  } else {
    await Answer.updateOne({ _id: targetId }, { $set: { upvotes, downvotes } });
  }

  return { upvotes, downvotes };
};

// ==================== DOUBT CRUD OPERATIONS ====================

const createDoubt = asyncHandler(async (req, res) => {
  const { title, description, category, tags } = req.body;

  if (!title || !description || !category) {
    return res.status(400).json({
      message: 'Title, description, and category are required'
    });
  }

  let processedTags = [];
  if (tags) {
    if (typeof tags === 'string') {
      processedTags = tags.split(',').map((tag) => tag.trim()).filter((tag) => tag);
    } else if (Array.isArray(tags)) {
      processedTags = tags.map((tag) => tag.trim()).filter((tag) => tag);
    }
  }

  const doubt = await Doubt.create({
    title,
    description,
    category,
    tags: processedTags,
    userId: req.user
  });

  const created = await Doubt.findById(doubt.id).populate(includeDoubtUser, 'id username');
  const doubtResponse = {
    ...withOwner(created),
    answers: [],
    answerCount: 0,
    netVotes: 0
  };

  res.status(201).json({
    message: 'Doubt posted successfully',
    doubt: doubtResponse
  });
});

const getAllDoubts = asyncHandler(async (req, res) => {
  const { category, status, search, page = 1, limit = 10, sort = 'recent' } = req.query;

  const currentPage = parseInt(page, 10);
  const pageSize = parseInt(limit, 10);
  const offset = (currentPage - 1) * pageSize;

  const filter = {};
  if (category) filter.category = category;
  if (status) filter.status = status;

  if (search) {
    const searchTerm = new RegExp(escapeRegex(search), 'i');
    filter.$or = [
      { title: searchTerm },
      { description: searchTerm },
      { tags: searchTerm }
    ];
  }

  let order = [['createdAt', 'DESC']];
  if (sort === 'popular') {
    order = [['views', 'DESC'], ['createdAt', 'DESC']];
  } else if (sort === 'unanswered') {
    filter.status = 'open';
  }

  const [rows, count] = await Promise.all([
    Doubt.find(filter)
      .populate(includeDoubtUser, 'id username')
      .sort(order.reduce((acc, [field, direction]) => ({ ...acc, [field]: direction === 'DESC' ? -1 : 1 }), {}))
      .skip(offset)
      .limit(pageSize),
    Doubt.countDocuments(filter)
  ]);

  const doubtsWithOwner = rows.map((d) => withOwner(d));
  const doubts = await attachAnswers(doubtsWithOwner);

  res.json({
    doubts,
    pagination: {
      current: currentPage,
      pages: Math.ceil(count / pageSize),
      total: count
    }
  });
});

const getMyDoubts = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;

  const currentPage = parseInt(page, 10);
  const pageSize = parseInt(limit, 10);
  const offset = (currentPage - 1) * pageSize;

  const filter = { userId: req.user };
  if (status) filter.status = status;

  const [rows, count] = await Promise.all([
    Doubt.find(filter)
      .populate(includeDoubtUser, 'id username')
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(pageSize),
    Doubt.countDocuments(filter)
  ]);

  const doubtsWithOwner = rows.map((d) => withOwner(d));
  const doubts = await attachAnswers(doubtsWithOwner);

  res.json({
    doubts,
    pagination: {
      current: currentPage,
      pages: Math.ceil(count / pageSize),
      total: count
    }
  });
});

const getDoubt = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const doubt = await Doubt.findById(id).populate(includeDoubtUser, 'id username');
  if (!doubt) {
    return res.status(404).json({ message: 'Doubt not found' });
  }

  doubt.views += 1;
  await doubt.save();

  const answers = await Answer.find({ doubtId: id })
    .populate(includeAnswerUser, 'id username')
    .sort({ isAccepted: -1, createdAt: 1 });

  const doubtResponse = {
    ...withOwner(doubt),
    answers: answers.map((answer) => {
      const plain = withAnswerOwner(answer);
      return {
        ...plain,
        netVotes: Number(plain.upvotes || 0) - Number(plain.downvotes || 0)
      };
    }),
    answerCount: answers.length,
    netVotes: Number(doubt.upvotes || 0) - Number(doubt.downvotes || 0)
  };

  res.json(doubtResponse);
});

const updateDoubt = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, description, category, tags } = req.body;

  const doubt = await Doubt.findOne({ _id: id, userId: req.user });
  if (!doubt) {
    return res.status(404).json({ message: 'Doubt not found or access denied' });
  }

  const answerCount = await Answer.countDocuments({ doubtId: id });
  if (answerCount > 0) {
    return res.status(400).json({
      message: 'Cannot edit doubt after receiving answers'
    });
  }

  if (title) doubt.title = title;
  if (description) doubt.description = description;
  if (category) doubt.category = category;
  if (tags) {
    doubt.tags = typeof tags === 'string'
      ? tags.split(',').map((t) => t.trim()).filter((t) => t)
      : tags;
  }

  await doubt.save();

  const updated = await Doubt.findById(doubt.id).populate(includeDoubtUser, 'id username');

  res.json({
    message: 'Doubt updated successfully',
    doubt: {
      ...withOwner(updated),
      answers: [],
      answerCount: 0,
      netVotes: Number(updated.upvotes || 0) - Number(updated.downvotes || 0)
    }
  });
});

const deleteDoubt = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const doubt = await Doubt.findOne({ _id: id, userId: req.user });
  if (!doubt) {
    return res.status(404).json({ message: 'Doubt not found or access denied' });
  }

  const answers = await Answer.find({ doubtId: id }).select('_id');
  const answerIds = answers.map((answer) => answer.id);

  await Vote.deleteMany({ targetId: id, targetType: 'doubt' });
  if (answerIds.length > 0) {
    await Vote.deleteMany({ targetId: { $in: answerIds }, targetType: 'answer' });
  }

  await Answer.deleteMany({ doubtId: id });
  await doubt.deleteOne();

  res.json({ message: 'Doubt deleted successfully' });
});

// ==================== ANSWER OPERATIONS ====================

const addAnswer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;

  if (!content || content.trim().length === 0) {
    return res.status(400).json({ message: 'Answer content is required' });
  }

  const doubt = await Doubt.findById(id);
  if (!doubt) {
    return res.status(404).json({ message: 'Doubt not found' });
  }

  const answer = await Answer.create({
    content: content.trim(),
    userId: req.user,
    doubtId: id
  });

  if (doubt.status === 'open') {
    doubt.status = 'answered';
    await doubt.save();
  }

  const createdAnswer = await Answer.findById(answer.id).populate(includeAnswerUser, 'id username');

  res.status(201).json({
    message: 'Answer added successfully',
    answer: {
      ...withAnswerOwner(createdAnswer),
      netVotes: 0
    }
  });
});

const updateAnswer = asyncHandler(async (req, res) => {
  const { doubtId, answerId } = req.params;
  const { content } = req.body;

  if (!content || content.trim().length === 0) {
    return res.status(400).json({ message: 'Answer content is required' });
  }

  const doubt = await Doubt.findById(doubtId);
  if (!doubt) {
    return res.status(404).json({ message: 'Doubt not found' });
  }

  const answer = await Answer.findOne({ _id: answerId, doubtId });
  if (!answer) {
    return res.status(404).json({ message: 'Answer not found' });
  }

  if (answer.userId !== req.user) {
    return res.status(403).json({ message: 'Access denied. Not your answer.' });
  }

  answer.content = content.trim();
  await answer.save();

  const updatedAnswer = await Answer.findById(answer.id).populate(includeAnswerUser, 'id username');

  res.json({
    message: 'Answer updated successfully',
    answer: {
      ...withAnswerOwner(updatedAnswer),
      netVotes: Number(updatedAnswer.upvotes || 0) - Number(updatedAnswer.downvotes || 0)
    }
  });
});

const deleteAnswer = asyncHandler(async (req, res) => {
  const { doubtId, answerId } = req.params;

  const doubt = await Doubt.findById(doubtId);
  if (!doubt) {
    return res.status(404).json({ message: 'Doubt not found' });
  }

  const answer = await Answer.findOne({ _id: answerId, doubtId });
  if (!answer) {
    return res.status(404).json({ message: 'Answer not found' });
  }

  const isAnswerOwner = answer.userId === req.user;
  const isDoubtOwner = doubt.userId === req.user;

  if (!isAnswerOwner && !isDoubtOwner) {
    return res.status(403).json({ message: 'Access denied' });
  }

  await Vote.deleteMany({ targetId: answer.id, targetType: 'answer' });
  await answer.deleteOne();

  const remainingAnswers = await Answer.countDocuments({ doubtId });
  if (remainingAnswers === 0) {
    doubt.status = 'open';
  } else {
    const acceptedAnswers = await Answer.countDocuments({ doubtId, isAccepted: true });
    doubt.status = acceptedAnswers > 0 ? 'resolved' : 'answered';
  }

  await doubt.save();

  res.json({ message: 'Answer deleted successfully' });
});

const acceptAnswer = asyncHandler(async (req, res) => {
  const { doubtId, answerId } = req.params;

  const doubt = await Doubt.findById(doubtId);
  if (!doubt) {
    return res.status(404).json({ message: 'Doubt not found' });
  }

  if (doubt.userId !== req.user) {
    return res.status(403).json({ message: 'Only the doubt owner can accept answers' });
  }

  const answer = await Answer.findOne({ _id: answerId, doubtId });
  if (!answer) {
    return res.status(404).json({ message: 'Answer not found' });
  }

  await Answer.updateMany({ doubtId }, { $set: { isAccepted: false } });
  answer.isAccepted = true;
  await answer.save();

  doubt.status = 'resolved';
  await doubt.save();

  const refreshedDoubt = await Doubt.findById(doubtId).populate(includeDoubtUser, 'id username');
  const answers = await Answer.find({ doubtId })
    .populate(includeAnswerUser, 'id username')
    .sort({ isAccepted: -1, createdAt: 1 });

  res.json({
    message: 'Answer accepted as solution',
    doubt: {
      ...withOwner(refreshedDoubt),
      answers: answers.map((a) => {
        const plain = withAnswerOwner(a);
        return {
          ...plain,
          netVotes: Number(plain.upvotes || 0) - Number(plain.downvotes || 0)
        };
      }),
      answerCount: answers.length,
      netVotes: Number(refreshedDoubt.upvotes || 0) - Number(refreshedDoubt.downvotes || 0)
    }
  });
});

// ==================== VOTING OPERATIONS ====================

const voteDoubt = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { voteType } = req.body;

  if (!['up', 'down'].includes(voteType)) {
    return res.status(400).json({ message: 'Vote type must be "up" or "down"' });
  }

  const doubt = await Doubt.findById(id);
  if (!doubt) {
    return res.status(404).json({ message: 'Doubt not found' });
  }

  const existing = await Vote.findOne({
    userId: req.user,
    targetId: id,
    targetType: 'doubt'
  });

  if (!existing) {
    await Vote.create({ userId: req.user, targetId: id, targetType: 'doubt', voteType });
  } else if (existing.voteType !== voteType) {
    await existing.deleteOne();
    await Vote.create({ userId: req.user, targetId: id, targetType: 'doubt', voteType });
  }

  const { upvotes, downvotes } = await recountVotes(id, 'doubt');

  res.json({
    message: `${voteType === 'up' ? 'Upvoted' : 'Downvoted'} successfully`,
    netVotes: upvotes - downvotes
  });
});

const voteAnswer = asyncHandler(async (req, res) => {
  const { doubtId, answerId } = req.params;
  const { voteType } = req.body;

  if (!['up', 'down'].includes(voteType)) {
    return res.status(400).json({ message: 'Vote type must be "up" or "down"' });
  }

  const doubt = await Doubt.findById(doubtId);
  if (!doubt) {
    return res.status(404).json({ message: 'Doubt not found' });
  }

  const answer = await Answer.findOne({ _id: answerId, doubtId });
  if (!answer) {
    return res.status(404).json({ message: 'Answer not found' });
  }

  const existing = await Vote.findOne({
    userId: req.user,
    targetId: answerId,
    targetType: 'answer'
  });

  if (!existing) {
    await Vote.create({ userId: req.user, targetId: answerId, targetType: 'answer', voteType });
  } else if (existing.voteType !== voteType) {
    await existing.deleteOne();
    await Vote.create({ userId: req.user, targetId: answerId, targetType: 'answer', voteType });
  }

  const { upvotes, downvotes } = await recountVotes(answerId, 'answer');

  res.json({
    message: `${voteType === 'up' ? 'Upvoted' : 'Downvoted'} successfully`,
    netVotes: upvotes - downvotes
  });
});

const getUserDoubtStats = asyncHandler(async (req, res) => {
  const userId = req.user;

  const [totalDoubts, resolvedDoubts, openDoubts, totalAnswers, acceptedAnswers] = await Promise.all([
    Doubt.countDocuments({ userId }),
    Doubt.countDocuments({ userId, status: 'resolved' }),
    Doubt.countDocuments({ userId, status: 'open' }),
    Answer.countDocuments({ userId }),
    Answer.countDocuments({ userId, isAccepted: true })
  ]);

  res.json({
    totalDoubts,
    resolvedDoubts,
    openDoubts,
    totalAnswers,
    acceptedAnswers,
    helpfulRate: totalAnswers > 0
      ? Math.round((acceptedAnswers / totalAnswers) * 100)
      : 0
  });
});

module.exports = {
  createDoubt,
  getAllDoubts,
  getMyDoubts,
  getDoubt,
  updateDoubt,
  deleteDoubt,
  addAnswer,
  updateAnswer,
  deleteAnswer,
  acceptAnswer,
  voteDoubt,
  voteAnswer,
  getUserDoubtStats
};
