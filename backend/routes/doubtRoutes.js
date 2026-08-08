const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
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
} = require('../controllers/doubtController');

/**
 * Doubt Routes
 * All routes are protected with authentication middleware
 * Base path: /api/doubts
 */

// Apply authentication to all routes
router.use(authMiddleware);

// ==================== USER STATS ====================
// GET /api/doubts/stats - Get user's doubt statistics
router.get('/stats', getUserDoubtStats);

// ==================== DOUBT LISTING ====================
// GET /api/doubts/my - Get all doubts posted by authenticated user
router.get('/my', getMyDoubts);

// GET /api/doubts - Get all doubts (public feed)
router.get('/', getAllDoubts);

// ==================== DOUBT CRUD ====================
// POST /api/doubts - Create a new doubt
router.post('/', createDoubt);

// GET /api/doubts/:id - Get specific doubt by ID
router.get('/:id', getDoubt);

// PUT /api/doubts/:id - Update doubt (owner only, before answers)
router.put('/:id', updateDoubt);

// DELETE /api/doubts/:id - Delete doubt (owner only)
router.delete('/:id', deleteDoubt);

// ==================== VOTING ====================
// POST /api/doubts/:id/vote - Vote on a doubt
router.post('/:id/vote', voteDoubt);

// ==================== ANSWERS ====================
// POST /api/doubts/:id/answers - Add answer to a doubt
router.post('/:id/answers', addAnswer);

// PUT /api/doubts/:doubtId/answers/:answerId - Update an answer
router.put('/:doubtId/answers/:answerId', updateAnswer);

// DELETE /api/doubts/:doubtId/answers/:answerId - Delete an answer
router.delete('/:doubtId/answers/:answerId', deleteAnswer);

// POST /api/doubts/:doubtId/answers/:answerId/accept - Accept answer as solution
router.post('/:doubtId/answers/:answerId/accept', acceptAnswer);

// POST /api/doubts/:doubtId/answers/:answerId/vote - Vote on an answer
router.post('/:doubtId/answers/:answerId/vote', voteAnswer);

module.exports = router;
