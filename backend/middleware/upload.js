/**
 * Upload Middleware
 * Configures multer for handling PDF file uploads.
 * Centralizes the uploads directory so multer, static file serving, and file
 * cleanup all reference the same location.
 */

const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

// Single source of truth for the uploads directory.
// Resolves to <project root>/uploads on both Windows and Linux.
const uploadsDir = path.resolve(__dirname, '..', '..', 'uploads');

// Multer's diskStorage does NOT create the destination directory itself, so we
// create it (recursively) or the first upload fails with ENOENT.
const ensureUploadsDir = () => {
  fs.mkdirSync(uploadsDir, { recursive: true });
};

// Create the directory on startup. Idempotent no-op if it already exists.
try {
  ensureUploadsDir();
} catch (err) {
  console.error(`[upload] Could not create uploads directory at "${uploadsDir}":`, err.message);
}

// Build a portable /uploads/<filename> reference to store in MongoDB.
const getFileUrl = (filename) => `/uploads/${filename}`;

// Resolve a stored file reference (relative /uploads/ URL, full URL, or a
// legacy absolute Windows path) to a real path inside the uploads directory.
// Only the final filename segment is used, which normalizes legacy paths and
// prevents path traversal through a malicious fileUrl.
const filePathFor = (fileUrl) => {
  if (!fileUrl || typeof fileUrl !== 'string') return null;
  const clean = fileUrl.replace(/\\/g, '/').replace(/^[a-zA-Z]:/, '').split('?')[0];
  const filename = clean.split('/').filter(Boolean).pop();
  return filename ? path.join(uploadsDir, filename) : null;
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      // Retry here too, in case the directory was removed after startup.
      ensureUploadsDir();
      cb(null, uploadsDir);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    // Generate unique filename: uuid + original extension
    const ext = path.extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  }
});

// File filter - accept only PDFs
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    const err = new Error('Only PDF files are allowed');
    err.statusCode = 400;
    cb(err, false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max file size
  }
});

module.exports = { upload, uploadsDir, ensureUploadsDir, getFileUrl, filePathFor };
