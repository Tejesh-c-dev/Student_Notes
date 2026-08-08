const fs = require('fs/promises');
const { PYQ, User } = require('../models');
const { extractTextFromPDF } = require('../utilits/pdfExtract');
const asyncHandler = require('../utilits/asyncHandler');
const { escapeRegex, withPopulatedUser } = require('../utilits/mongoHelpers');
const { getFileUrl, filePathFor } = require('../middleware/upload');

/**
 * PYQ Controller
 * Handles Past Year Questions (PYQs) module operations
 */

// POST /api/pyqs - Upload a new PYQ
const uploadPYQ = asyncHandler(async (req, res) => {
  const { title, subject, year, examType } = req.body;
  const file = req.file;

  // Validate required fields
  if (!title || !subject || !year || !examType) {
    return res.status(400).json({
      message: 'Title, subject, year, and examType are required'
    });
  }

  // Validate file is present
  if (!file) {
    return res.status(400).json({
      message: 'PDF file is required'
    });
  }

  // Extract text from PDF (diskStorage writes the file to disk, so file.path
  // is available while file.buffer is not)
  const extractedText = await extractTextFromPDF(file.path);

  // Create PYQ record
  const pyq = await PYQ.create({
    title,
    subject,
    year: parseInt(year, 10),
    examType,
    fileUrl: getFileUrl(file.filename),
    extractedText,
    uploadedBy: req.user
  });

  // Fetch with user info
  const created = await PYQ.findById(pyq.id).populate('uploadedBy', 'id username');

  res.status(201).json({
    message: 'PYQ uploaded successfully',
    pyq: withPopulatedUser(created, 'uploadedBy')
  });
});

// GET /api/pyqs - List all PYQs with optional filters
const getPYQs = asyncHandler(async (req, res) => {
  const { subject, year, examType, search, page = 1, limit = 10 } = req.query;

  const currentPage = parseInt(page, 10);
  const pageSize = parseInt(limit, 10);
  const offset = (currentPage - 1) * pageSize;

  const filter = {};

  if (subject) filter.subject = subject;
  if (year) filter.year = parseInt(year, 10);
  if (examType) filter.examType = examType;

  // Search in title and extractedText
  if (search) {
    const searchTerm = new RegExp(escapeRegex(search), 'i');
    filter.$or = [
      { title: searchTerm },
      { extractedText: searchTerm }
    ];
  }

  const [rows, count] = await Promise.all([
    PYQ.find(filter)
      .populate('uploadedBy', 'id username')
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(pageSize),
    PYQ.countDocuments(filter)
  ]);

  res.json({
    pyqs: rows.map((pyq) => withPopulatedUser(pyq, 'uploadedBy')),
    pagination: {
      current: currentPage,
      pages: Math.ceil(count / pageSize),
      total: count
    }
  });
});

// GET /api/pyqs/:id - Get single PYQ
const getPYQ = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const pyq = await PYQ.findById(id).populate('uploadedBy', 'id username');

  if (!pyq) {
    return res.status(404).json({ message: 'PYQ not found' });
  }

  res.json(withPopulatedUser(pyq, 'uploadedBy'));
});

// DELETE /api/pyqs/:id - Delete PYQ (owner only)
const deletePYQ = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const pyq = await PYQ.findOne({ _id: id, uploadedBy: req.user });

  if (!pyq) {
    return res.status(404).json({ message: 'PYQ not found or access denied' });
  }

  // Delete physical file from the uploads directory.
  // Best-effort: ignore missing files and only log real failures.
  const filePath = filePathFor(pyq.fileUrl);
  if (filePath) {
    try {
      await fs.unlink(filePath);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.error('Failed to delete PDF file:', err.message);
      }
    }
  }

  await pyq.deleteOne();

  res.json({ message: 'PYQ deleted successfully' });
});

module.exports = {
  uploadPYQ,
  getPYQs,
  getPYQ,
  deletePYQ
};
