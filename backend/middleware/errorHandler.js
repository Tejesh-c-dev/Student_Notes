/**
 * Error Handler Middleware
 * Central error handling for all routes
 * Must be placed AFTER all routes in Express
 *
 * Database/library errors are logged in full for debugging but never leaked
 * to the client. Clients only ever receive a sanitized, user-friendly message.
 */

const errorHandler = (err, req, res, next) => {
    // Log the full technical error (message, stack, Mongo internals) server-side
    // so real failures remain diagnosable without exposing them to users.
    console.error(err);

    // Prefer an explicit statusCode set by the error (e.g. 400 from the PDF
    // file filter), otherwise fall back to the existing status or 500.
    let statusCode = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);

    // Default: never reveal raw error messages, stack traces, collection/index
    // names, filesystem paths, or other database internals to the client.
    let message = 'Internal Server Error';
    let handled = false;

    // Multer upload errors (wrong file type handled in fileFilter; size limit etc.)
    if (err.name === 'MulterError') {
      statusCode = 400;
      message = err.code === 'LIMIT_FILE_SIZE'
        ? 'File is too large. Maximum allowed size is 10MB.'
        : 'Upload failed. Please try again.';
      handled = true;
    }

    // MongoDB duplicate key (E11000) — e.g. a stale unique index. Return a
    // friendly message instead of the raw "duplicate key ... index: slug_1" text.
    if (err.code === 11000) {
      statusCode = 409;
      message = 'Unable to create the note. Please try again.';
      handled = true;
    }

    // Pass through intentionally user-facing errors that set an explicit
    // 4xx statusCode (e.g. the fileFilter's "Only PDF files are allowed").
    if (!handled && err.statusCode && err.statusCode < 500) {
      message = err.message;
    }

    res.status(statusCode).json({ message });
  };

  module.exports = errorHandler;
