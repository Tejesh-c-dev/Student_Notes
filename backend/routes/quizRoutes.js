const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
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
} = require('../controllers/quizController');

/**
 * Quiz Routes
 * All routes are protected with authentication middleware
 * Base path: /api/quizzes
 */

// Apply authentication to all routes
router.use(authMiddleware);

// ==================== USER STATS ====================
// GET /api/quizzes/stats - Get user's quiz statistics
router.get('/stats', getUserQuizStats);

// ==================== QUIZ LISTING ====================
// GET /api/quizzes/my - Get all quizzes created by authenticated user
router.get('/my', getMyQuizzes);

// GET /api/quizzes/public - Get all public quizzes
router.get('/public', getPublicQuizzes);

// ==================== QUIZ CRUD ====================
// POST /api/quizzes - Create a new quiz
router.post('/', createQuiz);

// GET /api/quizzes/:id - Get specific quiz by ID
router.get('/:id', getQuiz);

// PUT /api/quizzes/:id - Update quiz (owner only)
router.put('/:id', updateQuiz);

// DELETE /api/quizzes/:id - Delete quiz (owner only)
router.delete('/:id', deleteQuiz);

// ==================== QUIZ ATTEMPTS ====================
// POST /api/quizzes/:id/start - Start a quiz attempt
router.post('/:id/start', startQuizAttempt);

// POST /api/quizzes/:id/submit - Submit quiz answers
router.post('/:id/submit', submitQuizAttempt);

// GET /api/quizzes/:id/attempts - Get user's attempt history for a quiz
router.get('/:id/attempts', getQuizAttempts);

// GET /api/quizzes/:id/leaderboard - Get top 10 users by score percentage
router.get('/:id/leaderboard', getLeaderboard);

module.exports = router;
