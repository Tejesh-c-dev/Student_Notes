/**
 * Note Routes
 * All routes are protected with JWT authentication
 * Base path: /api/notes
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { upload } = require('../middleware/upload');
const {
  createNote,
  getNotes,
  getPublicNotes,
  getNote,
  updateNoteVisibility,
  updateNote,
  deleteNote
} = require('../controllers/noteController');

const {
  toggleLike,
  toggleBookmark,
  getBookmarks,
  getComments,
  addComment,
  deleteComment
} = require('../controllers/noteSocialController');

// Apply auth middleware to all routes below
router.use(authMiddleware);

router.post('/', upload.single('file'), createNote);      // Create note (with optional PDF)
router.get('/', getNotes);         // List all user notes
router.get('/public', getPublicNotes); // List public notes shared by other students (must precede /:id)
router.get('/bookmarks', getBookmarks); // List current user's bookmarked notes (must precede /:id)
router.get('/:id', getNote);       // Get single note
router.patch('/:id/visibility', updateNoteVisibility); // Owner changes note visibility
router.put('/:id', updateNote);       // Owner edits their own note
router.delete('/:id', deleteNote); // Delete note
router.post('/:id/like', toggleLike);   // Toggle like (access enforced server-side)
router.post('/:id/bookmark', toggleBookmark); // Toggle bookmark (access enforced server-side)
router.get('/:id/comments', getComments);  // List comments on an accessible note
router.post('/:id/comments', addComment);  // Add comment to an accessible note
router.delete('/:id/comments/:commentId', deleteComment); // Delete own comment

module.exports = router;