/**
 * Note Controller
 * CRUD operations for user notes
 * All operations are scoped to the authenticated user
 */

const fs = require("fs/promises");
const { Note } = require("../models");
const asyncHandler = require("../utilits/asyncHandler");
const { extractTextFromPDF } = require("../utilits/pdfExtract");
const { isHttpUrl } = require("../utilits/validators");
const { getFileUrl, filePathFor } = require("../middleware/upload");

// POST /api/notes - Creates a new note for the user
// Supports three modes:
//   1. text     -> { title, content }                          (attachmentType omitted/"upload", no file)
//   2. PDF      -> multipart { title, file }                   (attachmentType omitted/"upload", with file)
//   3. external -> { title, fileUrl, attachmentType: "external" }
const createNote = asyncHandler(async (req, res) => {
  const { title, content, attachmentType, fileUrl } = req.body;
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
    attachmentType: type
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

  res.json({ message: "Note deleted successfully" });
});

module.exports = { createNote, getNotes, getNote, deleteNote };