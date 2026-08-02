/**
 * Note Controller
 * CRUD operations for user notes
 * All operations are scoped to the authenticated user
 */

const { Note } = require("../models");
const asyncHandler = require("../utilits/asyncHandler");
const { extractTextFromPDF } = require("../utilits/pdfExtract");

// POST /api/notes - Creates a new note for the user (supports text or PDF)
const createNote = asyncHandler(async (req, res) => {
  const { title, content } = req.body;
  const file = req.file;

  // Title is always required
  if (!title) {
    return res.status(400).json({ message: "Title is required" });
  }

  // Either content OR file must be provided
  if (!content && !file) {
    return res.status(400).json({ message: "Either content or a PDF file is required" });
  }

  const noteData = {
    title,
    userId: req.user
  };

  // If file is provided, handle PDF upload
  if (file) {
    noteData.fileUrl = `/uploads/${file.filename}`;
    noteData.fileType = 'pdf';
    
    // Extract text from PDF
    const extractedText = await extractTextFromPDF(file.buffer);
    noteData.extractedText = extractedText;
  } else {
    // Otherwise use plain text content
    noteData.content = content;
  }

  const note = await Note.create(noteData);

  res.status(201).json(note);
});

// GET /api/notes - Returns all notes for authenticated user
const getNotes = asyncHandler(async (req, res) => {
  const notes = await Note.find({ userId: req.user }).sort({ createdAt: -1 });
  res.json(notes);
});

// GET /api/notes/:id - Returns single note if owned by user
const getNote = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const note = await Note.findOne({ _id: id, userId: req.user });

  if (!note) {
    return res.status(404).json({ message: "Note not found" });
  }

  res.json(note);
});

// DELETE /api/notes/:id - Deletes note if owned by user
const deleteNote = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const note = await Note.findOne({ _id: id, userId: req.user });

  if (!note) {
    return res.status(404).json({ message: "Note not found" });
  }

  await note.deleteOne();

  res.json({ message: "Note deleted successfully" });
});

module.exports = { createNote, getNotes, getNote, deleteNote };