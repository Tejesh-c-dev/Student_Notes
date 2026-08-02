/**
 * Error Handler Middleware
 * Central error handling for all routes
 * Must be placed AFTER all routes in Express
 */

// Catches errors and sends JSON response with error message
const errorHandler = (err, req, res, next) => {
    console.error(err); // Log error for debugging
  
    // Use existing status code or default to 500
    const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  
    res.status(statusCode).json({
      message: err.message || "Internal Server Error"
    });
  };
  
  module.exports = errorHandler;
  