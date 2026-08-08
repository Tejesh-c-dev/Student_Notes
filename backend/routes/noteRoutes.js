/**
 * Note Routes
 * All routes are protected with JWT authentication
 * Base path: /api/notes
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { upload } = require('../middleware/upload');
const { createNote, getNotes, getNote, deleteNote } = require('../controllers/noteController');

// Apply auth middleware to all routes below
router.use(authMiddleware);

router.post('/', upload.single('file'), createNote);      // Create note (with optional PDF)
router.get('/', getNotes);         // List all user notes
router.get('/:id', getNote);       // Get single note
router.delete('/:id', deleteNote); // Delete note

module.exports = router;