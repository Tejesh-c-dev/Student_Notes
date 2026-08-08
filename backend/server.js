/**
 * Server Entry Point
 * Configures Express app, connects to MongoDB, and sets up all routes
 */

require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const rateLimit = require('express-rate-limit');
const router = require('./routes/router');
const { connectDB } = require('./config/db');
const errorHandler = require("./middleware/errorHandler");
const { uploadsDir, ensureUploadsDir } = require('./middleware/upload');

const app = express(); // Initialize Express application

const localOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/;

// CORS configuration - allow local Vite dev servers on any port
app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && localOriginPattern.test(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

app.use(express.json());

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per windowMs
  message: { message: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', apiLimiter);

// Serve uploaded files as static assets
// Ensure the uploads directory exists before serving it (multer does not create it)
ensureUploadsDir();
app.use('/uploads', express.static(uploadsDir));

// ==================== API ROUTES ====================
// Notes routes - protected with auth middleware
app.use("/api/notes", require("./routes/noteRoutes"));

// Quiz routes - protected with auth middleware
app.use("/api/quizzes", require("./routes/quizRoutes"));

// Doubt routes - protected with auth middleware
app.use("/api/doubts", require("./routes/doubtRoutes"));

// PYQ routes
app.use("/api/pyqs", require("./routes/pyqRoutes"));

const PORT = process.env.PORT || 3000;

// General routes (auth, pages)
app.use('/api/', router);

// Error handler must be AFTER all routes
app.use(errorHandler);

const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
};

startServer();