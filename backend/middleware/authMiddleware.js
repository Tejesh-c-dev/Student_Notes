/**
 * Auth Middleware
 * JWT-based authentication for protected routes
 * Verifies Bearer token and attaches userId to request
 */

const jwt = require('jsonwebtoken');

// Validates JWT token and grants access to protected routes
const authMiddleware = (req, res, next) => {
  try {
    // Get Authorization header from request
    const authHeader = req.headers.authorization;

    // Check if header exists and follows "Bearer <token>" format
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    // Extract token from header (split removes "Bearer ")
    const token = authHeader.split(' ')[1];

    // Extra safety check if token is somehow missing
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    // Verify token using secret key (checks signature + expiry)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach decoded userId to request object for downstream use
    req.user = decoded.userId;

    // Pass control to next middleware or route handler
    next();

  } catch (error) {
    // If verification fails (invalid/expired token), return 401
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

module.exports = authMiddleware; // Export middleware for route protection