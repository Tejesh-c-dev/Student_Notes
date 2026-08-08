/**
 * Page Controller
 * Simple page routes for basic navigation
 * Returns placeholder text for each page
 */

// GET /api/ - Home page route
const home = (req, res) => {
    res.send("Home Page");
  };
  
// GET /api/notes - Notes page route
const notes = (req, res) => {
    res.send("Student Notes Page");
  };

// GET /api/quiz - Quiz page route
const quiz = (req, res) => {
    res.send("Quiz Page");
  };

// GET /api/pyqs - Previous year questions route
const pyqs = (req, res) => {
    res.send("Previous Year Question Papers Page");
  };
  
  module.exports = { home, notes, quiz, pyqs };
  