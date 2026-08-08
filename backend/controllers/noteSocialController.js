/**
 * Note Social Controller
 * Likes, bookmarks, and comments on notes.
 *
 * AUTHORIZATION (spec 7): every social action first resolves the target note
 * through the same owner-or-public access query used by getNote. A private note
 * belonging to someone else does not match, so it 404s server-side and its
 * social data is never fetched. Identity always comes from req.user (set by the
 * auth middleware) — a client-supplied userId is never trusted.
 *
 * PERFORMANCE (spec 8): counts are denormalized on the Note document (likeCount,
 * bookmarkCount, commentCount) and updated atomically, so list/detail reads are
 * O(1) and never load every like/bookmark/comment row. Comment rows are only ever
 * fetched per-note on the detail page, and like/bookmark rows only via their
 * unique (userId, noteId) index.
 */

const { Note, Like, Bookmark, Comment } = require('../models');
const asyncHandler = require('../utilits/asyncHandler');
const { withPopulatedUser } = require('../utilits/mongoHelpers');

// Resolves a note the requester may access: the owner, or any public note.
// Returns null for another user's private note (never fetched / never leaked).
const getAccessibleNote = async (noteId, userId) =>
  Note.findOne({
    _id: noteId,
    $or: [{ userId }, { visibility: 'public' }]
  });

// POST /api/notes/:id/like - Toggle the current user's like on a note.
// Idempotent: liking an already-liked note removes the like (and vice-versa).
const toggleLike = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const note = await getAccessibleNote(id, req.user);
  if (!note) {
    return res.status(404).json({ message: 'Note not found' });
  }

  const existing = await Like.findOneAndDelete({ userId: req.user, noteId: id });

  if (existing) {
    await Note.updateOne({ _id: id }, { $inc: { likeCount: -1 } });
    return res.json({ liked: false, likeCount: Math.max(0, note.likeCount - 1) });
  }

  await Like.create({ userId: req.user, noteId: id });
  await Note.updateOne({ _id: id }, { $inc: { likeCount: 1 } });
  res.json({ liked: true, likeCount: note.likeCount + 1 });
});

// POST /api/notes/:id/bookmark - Toggle the current user's bookmark on a note.
const toggleBookmark = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const note = await getAccessibleNote(id, req.user);
  if (!note) {
    return res.status(404).json({ message: 'Note not found' });
  }

  const existing = await Bookmark.findOneAndDelete({ userId: req.user, noteId: id });

  if (existing) {
    await Note.updateOne({ _id: id }, { $inc: { bookmarkCount: -1 } });
    return res.json({ bookmarked: false, bookmarkCount: Math.max(0, note.bookmarkCount - 1) });
  }

  await Bookmark.create({ userId: req.user, noteId: id });
  await Note.updateOne({ _id: id }, { $inc: { bookmarkCount: 1 } });
  res.json({ bookmarked: true, bookmarkCount: note.bookmarkCount + 1 });
});

// GET /api/notes/bookmarks - List the notes the current user has bookmarked.
// Scoped strictly to req.user, so one user can never read or affect another's
// bookmarks.
const getBookmarks = asyncHandler(async (req, res) => {
  const bookmarkRows = await Bookmark.find({ userId: req.user })
    .select('noteId')
    .sort({ createdAt: -1 });

  const noteIds = bookmarkRows.map((b) => b.noteId);
  if (noteIds.length === 0) {
    return res.json([]);
  }

  const notes = await Note.find({ _id: { $in: noteIds } })
    .populate('userId', 'id username')
    .sort({ createdAt: -1 });

  res.json(notes.map((note) => withPopulatedUser(note, 'userId')));
});

// GET /api/notes/:id/comments - List comments on an accessible note.
// The note access check prevents reading comments (and commenter identities)
// on a private note the requester does not own.
const getComments = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const note = await getAccessibleNote(id, req.user);
  if (!note) {
    return res.status(404).json({ message: 'Note not found' });
  }

  const comments = await Comment.find({ noteId: id })
    .populate('userId', 'id username')
    .sort({ createdAt: 1 });

  res.json(comments.map((comment) => withPopulatedUser(comment, 'userId')));
});

// POST /api/notes/:id/comments - Add a comment to an accessible note.
const addComment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;

  const note = await getAccessibleNote(id, req.user);
  if (!note) {
    return res.status(404).json({ message: 'Note not found' });
  }

  if (typeof content !== 'string' || !content.trim()) {
    return res.status(400).json({ message: 'Comment content is required' });
  }

  const comment = await Comment.create({
    noteId: id,
    userId: req.user,
    content: content.trim()
  });

  await Note.updateOne({ _id: id }, { $inc: { commentCount: 1 } });

  const populated = await Comment.findById(comment._id).populate('userId', 'id username');
  res.status(201).json(withPopulatedUser(populated, 'userId'));
});

// DELETE /api/notes/:id/comments/:commentId - Delete a comment, but only the
// commenter's own. The userId scope means someone else's comment never matches
// and returns 404 — it is never deleted.
const deleteComment = asyncHandler(async (req, res) => {
  const { id, commentId } = req.params;

  const comment = await Comment.findOneAndDelete({
    _id: commentId,
    noteId: id,
    userId: req.user
  });

  if (!comment) {
    return res.status(404).json({ message: 'Comment not found' });
  }

  const note = await Note.findOneAndUpdate(
    { _id: id },
    { $inc: { commentCount: -1 } },
    { new: true }
  );

  res.json({ message: 'Comment deleted successfully', commentCount: Math.max(0, note.commentCount) });
});

module.exports = {
  toggleLike,
  toggleBookmark,
  getBookmarks,
  getComments,
  addComment,
  deleteComment
};
