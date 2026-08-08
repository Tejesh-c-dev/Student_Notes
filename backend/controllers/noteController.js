/**
 * Note Controller
 * CRUD operations for user notes
 * All operations are scoped to the authenticated user
 */

const fs = require("fs/promises");
const { Note, Like, Bookmark, Comment } = require("../models");
const asyncHandler = require("../utilits/asyncHandler");
const { extractTextFromPDF } = require("../utilits/pdfExtract");
const { isHttpUrl } = require("../utilits/validators");
const { withPopulatedUser } = require("../utilits/mongoHelpers");
const { getFileUrl, filePathFor } = require("../middleware/upload");

// POST /api/notes - Creates a new note for the user
// Supports three modes:
//   1. text     -> { title, content }                          (attachmentType omitted/"upload", no file)
//   2. PDF      -> multipart { title, file }                   (attachmentType omitted/"upload", with file)
//   3. external -> { title, fileUrl, attachmentType: "external" }
const createNote = asyncHandler(async (req, res) => {
  const { title, content, attachmentType, fileUrl, visibility } = req.body;
  const file = req.file;

  // Title is always required
  if (!title) {
    return res.status(400).json({ message: "Title is required" });
  }

  const type = attachmentType === "external" ? "external" : "upload";

  if (type === "external") {
    // External attachments must provide a real http(s) URL and nothing else.
    if (!fileUrl || typeof fileUrl !== "string" || !fileUrl.trim()) {
      return res.status(400).json({ message: "An external URL is required" });
    }
    if (!isHttpUrl(fileUrl.trim())) {
      return res.status(400).json({ message: "Please provide a valid http(s) URL" });
    }
    if (file) {
      // Multer already saved the uploaded file; remove it so it isn't orphaned.
      fs.unlink(file.path).catch(() => {});
      return res.status(400).json({ message: "Cannot combine a PDF upload with an external URL" });
    }
  } else if (!content && !file) {
    // Upload/text mode: either content or a PDF file must be provided.
    return res.status(400).json({ message: "Either content or a PDF file is required" });
  }

  const noteData = {
    title,
    userId: req.user,
    attachmentType: type,
    // Private is the default; only an explicit "public" makes the note shareable.
    visibility: visibility === "public" ? "public" : "private"
  };

  if (type === "external") {
    // Store the original external URL as-is. fileType marks it as a link so the
    // UI can open it in a new tab instead of forcing it through the PDF viewer.
    noteData.fileUrl = fileUrl.trim();
    noteData.fileType = 'link';
  } else if (file) {
    // If file is provided, handle PDF upload
    noteData.fileUrl = getFileUrl(file.filename);
    noteData.fileType = 'pdf';

    // Extract text from PDF (diskStorage writes the file to disk, so file.path
    // is available while file.buffer is not)
    const extractedText = await extractTextFromPDF(file.path);
    noteData.extractedText = extractedText;
  } else {
    // Otherwise use plain text content
    noteData.content = content;
  }

  const note = await Note.create(noteData);

  res.status(201).json(note);
});

// GET /api/notes - Returns all notes for authenticated user
// Includes both private and public notes (the user's own notes always appear).
const getNotes = asyncHandler(async (req, res) => {
  const notes = await Note.find({ userId: req.user }).sort({ createdAt: -1 });
  res.json(notes);
});

// GET /api/notes/public - Returns public notes shared by other students.
// The current user's own notes are excluded so the community feed only shows
// notes they can benefit from, mirroring the "student-to-student" sharing goal.
const getPublicNotes = asyncHandler(async (req, res) => {
  const notes = await Note.find({ visibility: "public", userId: { $ne: req.user } })
    .populate("userId", "id username")
    .sort({ createdAt: -1 });

  res.json(notes.map((note) => withPopulatedUser(note, "userId")));
});

// GET /api/notes/:id - Returns a single note only when the requester may access it.
// The access rule is enforced at the query level (never by frontend filtering):
//   - the requester owns the note, OR
//   - the note is public.
// A private note belonging to another user does not match the query, so it is
// never fetched from the DB and returns 404 — private data is never sent to the
// client just to be hidden by JavaScript.
// The author is populated with ONLY safe fields (id, username) so the detail
// view can show "Shared by" without ever exposing password, password hash, or
// authentication tokens.
const getNote = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const note = await Note.findOne({
    _id: id,
    $or: [{ userId: req.user }, { visibility: "public" }]
  }).populate("userId", "id username");

  if (!note) {
    return res.status(404).json({ message: "Note not found" });
  }

  // Detail page only: cheap indexed existence checks for the current user's
  // like/bookmark state. Lists rely on the denormalized counters instead.
  const [likedByMe, bookmarkedByMe] = await Promise.all([
    Like.exists({ userId: req.user, noteId: id }),
    Bookmark.exists({ userId: req.user, noteId: id })
  ]);

  const result = withPopulatedUser(note, "userId");
  result.likedByMe = !!likedByMe;
  result.bookmarkedByMe = !!bookmarkedByMe;

  res.json(result);
});

// PATCH /api/notes/:id/visibility - Owner can change a note between
// private and public after creation.
const updateNoteVisibility = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { visibility } = req.body;

  if (!["private", "public"].includes(visibility)) {
    return res.status(400).json({ message: 'Visibility must be "private" or "public"' });
  }

  const note = await Note.findOne({ _id: id, userId: req.user });

  if (!note) {
    return res.status(404).json({ message: "Note not found" });
  }

  note.visibility = visibility;
  await note.save();

  res.json({ message: "Visibility updated successfully", note });
});

// PUT /api/notes/:id - Owner edits their own note.
// Ownership is scoped via userId (existing ownership logic): only the owner may
// edit. A viewer of a public note can see it, but viewing never grants edit rights.
const updateNote = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, content, fileUrl } = req.body;

  const note = await Note.findOne({ _id: id, userId: req.user });
  if (!note) {
    return res.status(404).json({ message: "Note not found or access denied" });
  }

  // Title is always editable and must remain non-empty.
  if (title !== undefined) {
    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ message: "Title is required" });
    }
    note.title = title.trim();
  }

  // Text notes carry content; only allow editing content on text notes.
  if (content !== undefined && !note.fileUrl) {
    if (typeof content !== "string") {
      return res.status(400).json({ message: "Content must be a string" });
    }
    note.content = content;
  }

  // External-link notes carry a fileUrl; only allow editing it there.
  if (fileUrl !== undefined && note.attachmentType === "external") {
    if (typeof fileUrl !== "string" || !fileUrl.trim() || !isHttpUrl(fileUrl.trim())) {
      return res.status(400).json({ message: "Please provide a valid http(s) URL" });
    }
    note.fileUrl = fileUrl.trim();
  }

  await note.save();

  res.json({ message: "Note updated successfully", note });
});

// DELETE /api/notes/:id - Deletes note if owned by user
const deleteNote = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const note = await Note.findOne({ _id: id, userId: req.user });

  if (!note) {
    return res.status(404).json({ message: "Note not found" });
  }

  // Delete the physical PDF file if the note had one, so we don't orphan files.
  // External links point to a remote resource (e.g. Google Drive) and must not
  // be touched. Best-effort: ignore missing files and only log real failures.
  const filePath = note.attachmentType !== "external" ? filePathFor(note.fileUrl) : null;
  if (filePath) {
    try {
      await fs.unlink(filePath);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.error('Failed to delete PDF file:', err.message);
      }
    }
  }

  await note.deleteOne();

  // Cascade cleanup of social rows so no orphaned likes/bookmarks/comments
  // (and their user identities) outlive the note.
  await Promise.all([
    Like.deleteMany({ noteId: id }),
    Bookmark.deleteMany({ noteId: id }),
    Comment.deleteMany({ noteId: id })
  ]);

  res.json({ message: "Note deleted successfully" });
});

module.exports = {
  createNote,
  getNotes,
  getPublicNotes,
  getNote,
  updateNoteVisibility,
  updateNote,
  deleteNote
};