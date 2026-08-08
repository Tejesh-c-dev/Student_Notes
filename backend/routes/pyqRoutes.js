/**
 * PYQ Routes
 * Routes for Past Year Questions module
 * Base path: /api/pyqs
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { upload } = require('../middleware/upload');
const {
  uploadPYQ,
  getPYQs,
  getPYQ,
  deletePYQ
} = require('../controllers/pyqController');

// POST /api/pyqs - Upload new PYQ (auth required)
router.post('/', authMiddleware, upload.single('file'), uploadPYQ);

// GET /api/pyqs - List all PYQs (public)
router.get('/', getPYQs);

// GET /api/pyqs/:id - Get single PYQ (public)
router.get('/:id', getPYQ);

// DELETE /api/pyqs/:id - Delete PYQ (auth required, owner only)
router.delete('/:id', authMiddleware, deletePYQ);

module.exports = router;
