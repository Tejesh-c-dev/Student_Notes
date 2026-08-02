const { randomUUID } = require('crypto');
const { Quiz, QuizAttempt, User } = require('../models');
const asyncHandler = require('../utilits/asyncHandler');
const { withPopulatedUser } = require('../utilits/mongoHelpers');

/**
 * Quiz Controller
 * Handles all quiz-related operations including CRUD and quiz attempts
 * All routes require authentication via authMiddleware
 */

const normalizeDifficulty = (difficulty) => String(difficulty || '').toLowerCase();

const normalizeQuestions = (questions = []) => {
  return questions.map((question) => {
    const questionId = question._id || question.id || randomUUID();
    const options = (question.options || []).map((option) => ({
      _id: option._id || option.id || randomUUID(),
      text: option.text,
      isCorrect: Boolean(option.isCorrect)
    }));

    return {
      _id: questionId,
      questionText: question.questionText,
      options,
      explanation: question.explanation || '',
      points: Number(question.points || 1)
    };
  });
};

const sanitizeQuestions = (questions = []) => {
  return questions.map((question) => ({
    ...question,
    options: (question.options || []).map((option) => ({
      _id: option._id,
      text: option.text
    }))
  }));
};

const getTotalPoints = (questions = []) => {
  return questions.reduce((sum, q) => sum + Number(q.points || 0), 0);
};

// ==================== QUIZ CRUD OPERATIONS ====================

const createQuiz = asyncHandler(async (req, res) => {
  const { title, description, category, difficulty, questions, timeLimit, isPublic } = req.body;

  if (!title || !category || !difficulty || !Array.isArray(questions) || questions.length < 1) {
    return res.status(400).json({
      message: 'Title, category, difficulty, and at least 1 question are required'
    });
  }

  for (let i = 0; i < questions.length; i += 1) {
    const q = questions[i];
    if (!q.questionText || !q.options || q.options.length < 2) {
      return res.status(400).json({
        message: `Question ${i + 1} must have text and at least 2 options`
      });
    }
    const correctOptions = q.options.filter((opt) => opt.isCorrect);
    if (correctOptions.length !== 1) {
      return res.status(400).json({
        message: `Question ${i + 1} must have exactly 1 correct answer`
      });
    }
  }

  const quiz = await Quiz.create({
    title,
    description: description || '',
    category,
    difficulty: normalizeDifficulty(difficulty),
    questions: normalizeQuestions(questions),
    timeLimit: Number(timeLimit || 0),
    isPublic: Boolean(isPublic),
    userId: req.user
  });

  res.status(201).json({
    message: 'Quiz created successfully',
    quiz
  });
});

const getMyQuizzes = asyncHandler(async (req, res) => {
  const { category, difficulty, page = 1, limit = 10 } = req.query;

  const currentPage = parseInt(page, 10);
  const pageSize = parseInt(limit, 10);
  const offset = (currentPage - 1) * pageSize;

  const filter = { userId: req.user };
  if (category) filter.category = category;
  if (difficulty) filter.difficulty = normalizeDifficulty(difficulty);

  const [rows, count] = await Promise.all([
    Quiz.find(filter)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(pageSize),
    Quiz.countDocuments(filter)
  ]);

  const quizzes = rows.map((quiz) => {
    const plain = quiz.toObject({ virtuals: true });
    return {
      ...plain,
      questions: sanitizeQuestions(plain.questions || [])
    };
  });

  res.json({
    quizzes,
    pagination: {
      current: currentPage,
      pages: Math.ceil(count / pageSize),
      total: count
    }
  });
});

const getPublicQuizzes = asyncHandler(async (req, res) => {
  const { category, difficulty, page = 1, limit = 10 } = req.query;

  const currentPage = parseInt(page, 10);
  const pageSize = parseInt(limit, 10);
  const offset = (currentPage - 1) * pageSize;

  const filter = { isPublic: true };
  if (category) filter.category = category;
  if (difficulty) filter.difficulty = normalizeDifficulty(difficulty);

  const [rows, count] = await Promise.all([
    Quiz.find(filter)
      .populate('userId', 'id username')
      .sort({ totalAttempts: -1, createdAt: -1 })
      .skip(offset)
      .limit(pageSize),
    Quiz.countDocuments(filter)
  ]);

  const quizzes = rows.map((quiz) => {
    const plain = withPopulatedUser(quiz, 'userId');
    return {
      ...plain,
      questions: sanitizeQuestions(plain.questions || [])
    };
  });

  res.json({
    quizzes,
    pagination: {
      current: currentPage,
      pages: Math.ceil(count / pageSize),
      total: count
    }
  });
});

const getQuiz = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const quiz = await Quiz.findById(id).populate('userId', 'id username');

  if (!quiz) {
    return res.status(404).json({ message: 'Quiz not found' });
  }

  const isOwner = quiz.userId === req.user;
  if (!isOwner && !quiz.isPublic) {
    return res.status(403).json({ message: 'Access denied. Quiz is private.' });
  }

  const quizObj = withPopulatedUser(quiz, 'userId');
  if (!isOwner) {
    quizObj.questions = sanitizeQuestions(quizObj.questions || []);
  }

  res.json(quizObj);
});

const updateQuiz = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const quiz = await Quiz.findOne({ _id: id, userId: req.user });
  if (!quiz) {
    return res.status(404).json({ message: 'Quiz not found or access denied' });
  }

  const allowedUpdates = ['title', 'description', 'category', 'difficulty', 'questions', 'timeLimit', 'isPublic'];

  Object.keys(updates).forEach((key) => {
    if (!allowedUpdates.includes(key)) return;

    if (key === 'difficulty') {
      quiz.difficulty = normalizeDifficulty(updates[key]);
      return;
    }

    if (key === 'questions') {
      quiz.questions = normalizeQuestions(updates[key]);
      return;
    }

    quiz[key] = updates[key];
  });

  await quiz.save();

  res.json({
    message: 'Quiz updated successfully',
    quiz
  });
});

const deleteQuiz = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const quiz = await Quiz.findOne({ _id: id, userId: req.user });
  if (!quiz) {
    return res.status(404).json({ message: 'Quiz not found or access denied' });
  }

  await quiz.deleteOne();

  res.json({ message: 'Quiz deleted successfully' });
});

// ==================== QUIZ ATTEMPT OPERATIONS ====================

const startQuizAttempt = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const quiz = await Quiz.findById(id);
  if (!quiz) {
    return res.status(404).json({ message: 'Quiz not found' });
  }

  const isOwner = quiz.userId === req.user;
  if (!isOwner && !quiz.isPublic) {
    return res.status(403).json({ message: 'Access denied. Quiz is private.' });
  }

  const attempt = await QuizAttempt.create({
    quizId: id,
    userId: req.user,
    totalPoints: getTotalPoints(quiz.questions || []),
    percentage: 0,
    startedAt: new Date()
  });

  const quizForAttempt = {
    _id: quiz.id,
    title: quiz.title,
    description: quiz.description,
    category: quiz.category,
    difficulty: quiz.difficulty,
    timeLimit: quiz.timeLimit,
    questions: (quiz.questions || []).map((q) => ({
      _id: q._id,
      questionText: q.questionText,
      points: q.points,
      options: (q.options || []).map((opt) => ({ _id: opt._id, text: opt.text }))
    }))
  };

  res.status(201).json({
    message: 'Quiz attempt started',
    attemptId: attempt.id,
    quiz: quizForAttempt
  });
});

const submitQuizAttempt = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { attemptId, answers, timeTaken } = req.body;

  if (!attemptId || !answers) {
    return res.status(400).json({ message: 'Attempt ID and answers are required' });
  }

  const attempt = await QuizAttempt.findOne({
    _id: attemptId,
    quizId: id,
    userId: req.user,
    status: 'in-progress'
  });

  if (!attempt) {
    return res.status(404).json({ message: 'Active quiz attempt not found' });
  }

  const quiz = await Quiz.findById(id);
  if (!quiz) {
    return res.status(404).json({ message: 'Quiz not found' });
  }

  let totalScore = 0;
  const processedAnswers = [];

  for (const question of quiz.questions || []) {
    const userAnswer = answers.find((a) => a.questionId === question._id);
    const correctOption = (question.options || []).find((opt) => opt.isCorrect);

    let isCorrect = false;
    let pointsEarned = 0;

    if (userAnswer && userAnswer.selectedOptionId && correctOption) {
      isCorrect = userAnswer.selectedOptionId === correctOption._id;
      if (isCorrect) {
        pointsEarned = Number(question.points || 0);
        totalScore += pointsEarned;
      }
    }

    processedAnswers.push({
      questionId: question._id,
      selectedOptionId: userAnswer?.selectedOptionId || null,
      isCorrect,
      pointsEarned
    });
  }

  const percentage = attempt.totalPoints > 0
    ? Math.round((totalScore / attempt.totalPoints) * 100)
    : 0;

  attempt.answers = processedAnswers;
  attempt.score = totalScore;
  attempt.percentage = percentage;
  attempt.timeTaken = Number(timeTaken || 0);
  attempt.completedAt = new Date();
  attempt.status = 'completed';
  await attempt.save();

  const updatedAttempts = quiz.totalAttempts + 1;
  const updatedAverage = Math.round(
    ((quiz.averageScore * quiz.totalAttempts) + percentage) / updatedAttempts
  );

  quiz.totalAttempts = updatedAttempts;
  quiz.averageScore = updatedAverage;
  await quiz.save();

  const results = (quiz.questions || []).map((q, index) => {
    const userAnswer = processedAnswers[index];
    const correctOption = (q.options || []).find((opt) => opt.isCorrect);
    const selectedOption = (q.options || []).find((opt) => opt._id === userAnswer.selectedOptionId);

    return {
      questionText: q.questionText,
      correctAnswer: correctOption?.text || '',
      userAnswer: selectedOption?.text || 'Not answered',
      isCorrect: userAnswer.isCorrect,
      pointsEarned: userAnswer.pointsEarned,
      explanation: q.explanation
    };
  });

  res.json({
    message: 'Quiz submitted successfully',
    score: totalScore,
    totalPoints: attempt.totalPoints,
    percentage,
    timeTaken: attempt.timeTaken,
    results
  });
});

const getQuizAttempts = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const attempts = await QuizAttempt.find({
    quizId: id,
    userId: req.user,
    status: 'completed'
  })
    .select('score totalPoints percentage timeTaken completedAt')
    .sort({ completedAt: -1 });

  res.json(attempts);
});

const getUserQuizStats = asyncHandler(async (req, res) => {
  const userId = req.user;

  const attempts = await QuizAttempt.find({
    userId,
    status: 'completed'
  });

  const totalAttempts = attempts.length;
  const totalScore = attempts.reduce((sum, a) => sum + Number(a.score || 0), 0);
  const totalPoints = attempts.reduce((sum, a) => sum + Number(a.totalPoints || 0), 0);
  const averagePercentage = totalAttempts > 0
    ? Math.round(attempts.reduce((sum, a) => sum + Number(a.percentage || 0), 0) / totalAttempts)
    : 0;

  const quizzesCreated = await Quiz.countDocuments({ userId });

  const attemptsByQuiz = await QuizAttempt.find({
    userId,
    status: 'completed'
  }).populate('quizId', 'category');

  const categoryStats = {};
  attemptsByQuiz.forEach((attempt) => {
    if (!attempt.quizId) return;
    const cat = attempt.quizId.category;

    if (!categoryStats[cat]) {
      categoryStats[cat] = { attempts: 0, totalPercentage: 0 };
    }

    categoryStats[cat].attempts += 1;
    categoryStats[cat].totalPercentage += Number(attempt.percentage || 0);
  });

  Object.keys(categoryStats).forEach((cat) => {
    categoryStats[cat].averagePercentage = Math.round(
      categoryStats[cat].totalPercentage / categoryStats[cat].attempts
    );
    delete categoryStats[cat].totalPercentage;
  });

  res.status(200).json({
    totalAttempts,
    totalScore,
    totalPoints,
    averagePercentage,
    quizzesCreated,
    categoryStats
  });
});

// GET /api/quizzes/:id/leaderboard
// Get top 10 users by score percentage for a quiz
const getLeaderboard = asyncHandler(async (req, res) => {
  const { id: quizId } = req.params;

  // Find quiz and verify it exists
  const quiz = await Quiz.findById(quizId);
  if (!quiz) {
    return res.status(404).json({ message: "Quiz not found" });
  }

  // Get top 10 quiz attempts by score percentage
  const leaderboard = await QuizAttempt.find({ quizId })
    .populate('userId', 'id username email')
    .sort({ percentage: -1, timeTaken: 1 })
    .limit(10)
    .select('score percentage timeTaken createdAt userId');

  // Transform response to include rank
  const rankedLeaderboard = leaderboard.map((attempt, index) => ({
    rank: index + 1,
    username: attempt.userId?.username,
    userId: attempt.userId?.id || attempt.userId?._id,
    scorePercentage: attempt.percentage,
    score: attempt.score,
    timeSpent: attempt.timeTaken,
    attemptedAt: attempt.createdAt
  }));

  res.status(200).json({
    quizId,
    quizTitle: quiz.title,
    leaderboard: rankedLeaderboard
  });
});

module.exports = {
  createQuiz,
  getMyQuizzes,
  getPublicQuizzes,
  getQuiz,
  updateQuiz,
  deleteQuiz,
  startQuizAttempt,
  submitQuizAttempt,
  getQuizAttempts,
  getUserQuizStats,
  getLeaderboard
};
