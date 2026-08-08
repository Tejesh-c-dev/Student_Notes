/**
 * Main Router
 * Handles auth routes and basic page routes
 * No authentication required for these routes
 */

const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();
const { home, notes, quiz, pyqs } = require("../controllers/pageController");
const { login, register, changePassword, forgotPassword, resetPassword } = require("../controllers/authController");

// Rate limiting middleware
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per windowMs
  message: { message: "Too many login/register attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false
});

router.use(express.json()); // Parse JSON request bodies

// Page routes (public)
router.get("/", home);           // Home page
router.get("/notes", notes);      // Notes page
router.get("/quiz", quiz);        // Quiz page
router.get("/pyqs", pyqs);        // PYQs page

// Auth routes (public)
router.post("/login", authLimiter, login);              // User login
router.post("/register", authLimiter, register);        // User registration
router.put("/change-password", changePassword);         // Password change
router.post("/auth/forgot-password", forgotPassword);   // Forgot password
router.post("/auth/reset-password", resetPassword);     // Reset password

module.exports = router;
