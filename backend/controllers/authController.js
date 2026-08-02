/**
 * Auth Controller
 * Handles user registration, login, and password management
 * Uses JWT for authentication tokens
 */

const { User } = require("../models");
const validator = require("validator");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { isStrong } = require("../utilits/validators");

// Generates JWT token with userId payload
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

// POST /api/register - Creates new user account
// Validates input, hashes password, returns token
const register = async (req, res) => {
  const { username, email, password, confirmpassword } = req.body;
  const normalizedEmail = normalizeEmail(email);

  if (!username || !email || !password || !confirmpassword){
    return res.status(400).json({ message: "All fields are required" });
  }
  if (!validator.isEmail(normalizedEmail)){
    return res.status(400).json({ message: "Invalid email format" });
  }
  if (password !== confirmpassword){
    return res.status(400).json({ message: "Passwords do not match" });
  }
  if (!isStrong(password)){
    return res.status(400).json({ message: "Password is not strong enough" });
  }
  const exists = await User.findOne({ email });
  if (exists)
    return res.status(409).json({ message: "Email already in use" });

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    username,
    email,
    password: hashedPassword
  });

  const token = generateToken(user.id);

  res.status(201).json({ 
    message: "User registered successfully",
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email
    }
  });
};

// POST /api/login - Authenticates user credentials
// Verifies password, returns JWT token on success
const login = async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = normalizeEmail(email);

  if (!email || !password)
    return res.status(400).json({ message: "Email and password required" });

  const user = await User.findOne({ email: normalizedEmail });
  if (!user)
    return res.status(401).json({ message: "User does not exist" });

  const match = await bcrypt.compare(password, user.password);
  if (!match)
    return res.status(401).json({ message: "Invalid credentials" });

  const token = generateToken(user.id);

  res.status(200).json({ 
    message: "Login successful",
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email
    }
  });
};

// PUT /api/change-password - Updates user password
// Requires old password verification
const changePassword = async (req, res) => {
    try {
      const { email, oldPassword, newPassword } = req.body;
      const normalizedEmail = normalizeEmail(email);
  
      if (!email || !oldPassword || !newPassword) {
        return res.status(400).json({ message: "All fields are required" });
      }
  
      const user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
  
      const match = await bcrypt.compare(oldPassword, user.password);
      if (!match) {
        return res.status(401).json({ message: "Old password is incorrect" });
      }
  
      if (!isStrong(newPassword)) {
        return res.status(400).json({ message: "New password is not strong enough" });
      }
  
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      user.password = hashedNewPassword;
      await user.save();
  
      res.status(200).json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Error changing password:", error);  
      res.status(500).json({ message: "Something went wrong" });
    }
};

// POST /api/auth/forgot-password - Request password reset
// Sends reset link via console (for development)
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email: normalizedEmail });

    // Always return success message regardless of whether email exists (prevents user enumeration)
    if (user) {
      // Generate secure random reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
      
      // Store hashed token and expiry (1 hour)
      user.resetToken = hashedToken;
      user.resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now
      await user.save();

      // Log reset link to console (for development)
      const resetLink = `http://localhost:5173/reset-password?token=${resetToken}`;
      console.log(`Reset link for ${normalizedEmail}: ${resetLink}`);
    }

    res.status(200).json({
      message: "If this email is registered, a reset link has been sent. Check your console (dev mode)."
    });
  } catch (error) {
    console.error("Error in forgot password:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

// POST /api/auth/reset-password - Reset password using token
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    if (!token || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    if (!isStrong(newPassword)) {
      return res.status(400).json({ message: "Password is not strong enough" });
    }

    // Hash the incoming token to compare with stored token
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid reset token and non-expired expiry
    const user = await User.findOne({ resetToken: hashedToken });

    if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    // Hash and set new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();

    res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Error in reset password:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

module.exports = { register, login, changePassword, forgotPassword, resetPassword };
