const API_BASE_URL = 'http://localhost:3000/api';

/**
 * Helper function to get auth headers
 * Retrieves token from localStorage and returns Authorization header
 */
const getAuthHeaders = () => {
  const user = localStorage.getItem('user');
  if (user) {
    const { token } = JSON.parse(user);
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }
  return { 'Content-Type': 'application/json' };
};

/**
 * Auth API calls
 * Handles user authentication (login, register, password change)
 */
export const authAPI = {
  login: async (email, password) => {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }
    return data;
  },

  register: async (username, email, password, confirmpassword) => {
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, email, password, confirmpassword }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Registration failed');
    }
    return data;
  },

  changePassword: async (email, oldPassword, newPassword) => {
    const response = await fetch(`${API_BASE_URL}/change-password`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ email, oldPassword, newPassword }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Password change failed');
    }
    return data;
  },

  forgotPassword: async (email) => {
    const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Forgot password request failed');
    }
    return data;
  },

  resetPassword: async (token, newPassword, confirmPassword) => {
    const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token, newPassword, confirmPassword }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Password reset failed');
    }
    return data;
  },
};

/**
 * Notes API calls
 * CRUD operations for user notes (text and PDF)
 */
export const notesAPI = {
  getAllNotes: async () => {
    const response = await fetch(`${API_BASE_URL}/notes`, {
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch notes');
    }
    return data;
  },

  getNote: async (id) => {
    const response = await fetch(`${API_BASE_URL}/notes/${id}`, {
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch note');
    }
    return data;
  },

  createNote: async (title, content) => {
    const response = await fetch(`${API_BASE_URL}/notes`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ title, content }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to create note');
    }
    return data;
  },

  createNoteWithFile: async (title, file) => {
    const formData = new FormData();
    formData.append('title', title);
    formData.append('file', file);

    const user = localStorage.getItem('user');
    const headers = {};
    if (user) {
      const { token } = JSON.parse(user);
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/notes`, {
      method: 'POST',
      headers,
      body: formData
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to create note with file');
    }
    return data;
  },

  createNoteWithExternal: async (title, fileUrl) => {
    const response = await fetch(`${API_BASE_URL}/notes`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ title, fileUrl, attachmentType: 'external' }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to create note with external link');
    }
    return data;
  },

  deleteNote: async (id) => {
    const response = await fetch(`${API_BASE_URL}/notes/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to delete note');
    }
    return data;
  },
};

/**
 * Quiz API calls
 * Handles quiz CRUD, attempts, and statistics
 */
export const quizAPI = {
  // Get user's own quizzes
  getMyQuizzes: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/quizzes/my?${query}`, {
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch quizzes');
    }
    return data;
  },

  // Get all public quizzes
  getPublicQuizzes: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/quizzes/public?${query}`, {
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch public quizzes');
    }
    return data;
  },

  // Get single quiz
  getQuiz: async (id) => {
    const response = await fetch(`${API_BASE_URL}/quizzes/${id}`, {
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch quiz');
    }
    return data;
  },

  // Create new quiz
  createQuiz: async (quizData) => {
    const response = await fetch(`${API_BASE_URL}/quizzes`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(quizData),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to create quiz');
    }
    return data;
  },

  // Update quiz
  updateQuiz: async (id, quizData) => {
    const response = await fetch(`${API_BASE_URL}/quizzes/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(quizData),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to update quiz');
    }
    return data;
  },

  // Delete quiz
  deleteQuiz: async (id) => {
    const response = await fetch(`${API_BASE_URL}/quizzes/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to delete quiz');
    }
    return data;
  },

  // Start quiz attempt
  startQuiz: async (id) => {
    const response = await fetch(`${API_BASE_URL}/quizzes/${id}/start`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to start quiz');
    }
    return data;
  },

  // Submit quiz answers
  submitQuiz: async (id, attemptId, answers, timeTaken) => {
    const response = await fetch(`${API_BASE_URL}/quizzes/${id}/submit`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ attemptId, answers, timeTaken }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to submit quiz');
    }
    return data;
  },

  // Get quiz attempt history
  getAttempts: async (id) => {
    const response = await fetch(`${API_BASE_URL}/quizzes/${id}/attempts`, {
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch attempts');
    }
    return data;
  },

  // Get user quiz statistics
  getStats: async () => {
    const response = await fetch(`${API_BASE_URL}/quizzes/stats`, {
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch stats');
    }
    return data;
  },

  // Get quiz leaderboard
  getLeaderboard: async (id) => {
    const response = await fetch(`${API_BASE_URL}/quizzes/${id}/leaderboard`, {
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch leaderboard');
    }
    return data;
  },
};

/**
 * Doubt API calls
 * Handles doubt/question CRUD, answers, and voting
 */
export const doubtAPI = {
  // Get all doubts (public feed)
  getAllDoubts: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/doubts?${query}`, {
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch doubts');
    }
    return data;
  },

  // Get user's own doubts
  getMyDoubts: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/doubts/my?${query}`, {
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch your doubts');
    }
    return data;
  },

  // Get single doubt
  getDoubt: async (id) => {
    const response = await fetch(`${API_BASE_URL}/doubts/${id}`, {
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch doubt');
    }
    return data;
  },

  // Create new doubt
  createDoubt: async (doubtData) => {
    const response = await fetch(`${API_BASE_URL}/doubts`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(doubtData),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to create doubt');
    }
    return data;
  },

  // Update doubt
  updateDoubt: async (id, doubtData) => {
    const response = await fetch(`${API_BASE_URL}/doubts/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(doubtData),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to update doubt');
    }
    return data;
  },

  // Delete doubt
  deleteDoubt: async (id) => {
    const response = await fetch(`${API_BASE_URL}/doubts/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to delete doubt');
    }
    return data;
  },

  // Vote on doubt
  voteDoubt: async (id, voteType) => {
    const response = await fetch(`${API_BASE_URL}/doubts/${id}/vote`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ voteType }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to vote');
    }
    return data;
  },

  // Add answer to doubt
  addAnswer: async (doubtId, content) => {
    const response = await fetch(`${API_BASE_URL}/doubts/${doubtId}/answers`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ content }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to add answer');
    }
    return data;
  },

  // Update answer
  updateAnswer: async (doubtId, answerId, content) => {
    const response = await fetch(`${API_BASE_URL}/doubts/${doubtId}/answers/${answerId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ content }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to update answer');
    }
    return data;
  },

  // Delete answer
  deleteAnswer: async (doubtId, answerId) => {
    const response = await fetch(`${API_BASE_URL}/doubts/${doubtId}/answers/${answerId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to delete answer');
    }
    return data;
  },

  // Accept answer as solution
  acceptAnswer: async (doubtId, answerId) => {
    const response = await fetch(`${API_BASE_URL}/doubts/${doubtId}/answers/${answerId}/accept`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to accept answer');
    }
    return data;
  },

  // Vote on answer
  voteAnswer: async (doubtId, answerId, voteType) => {
    const response = await fetch(`${API_BASE_URL}/doubts/${doubtId}/answers/${answerId}/vote`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ voteType }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to vote');
    }
    return data;
  },

  // Get user doubt statistics
  getStats: async () => {
    const response = await fetch(`${API_BASE_URL}/doubts/stats`, {
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch stats');
    }
    return data;
  },
};

/**
 * PYQs API calls
 * Handles Past Year Questions CRUD with PDF uploads
 */
export const pyqsAPI = {
  // Get all PYQs with optional filters
  getAllPYQs: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/pyqs?${query}`, {
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch PYQs');
    }
    return data;
  },

  // Get single PYQ
  getPYQ: async (id) => {
    const response = await fetch(`${API_BASE_URL}/pyqs/${id}`, {
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch PYQ');
    }
    return data;
  },

  // Upload PYQ with PDF file
  uploadPYQ: async (title, subject, year, examType, file) => {
    const formData = new FormData();
    formData.append('title', title);
    formData.append('subject', subject);
    formData.append('year', year);
    formData.append('examType', examType);
    formData.append('file', file);

    const user = localStorage.getItem('user');
    const headers = {};
    if (user) {
      const { token } = JSON.parse(user);
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/pyqs`, {
      method: 'POST',
      headers,
      body: formData
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to upload PYQ');
    }
    return data;
  },

  // Delete PYQ
  deletePYQ: async (id) => {
    const response = await fetch(`${API_BASE_URL}/pyqs/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to delete PYQ');
    }
    return data;
  },
};

/**
 * Builds a browser-accessible URL for an uploaded file (e.g. a PDF).
 * Accepts the portable reference stored in the DB (/uploads/<name>), an
 * absolute URL, or a legacy absolute local path (e.g. C:\Student Notes\uploads\...),
 * and returns a URL the browser can fetch from the backend.
 */
export const resolveFileUrl = (fileUrl) => {
  if (!fileUrl) return '';
  // Already a full URL — use as-is
  if (/^https?:\/\//i.test(fileUrl)) return fileUrl;
  // Normalize Windows backslashes, strip a drive letter and query string
  const clean = fileUrl.replace(/\\/g, '/').replace(/^[a-zA-Z]:/, '').split('?')[0];
  const filename = clean.split('/').filter(Boolean).pop();
  if (!filename) return '';
  const origin = new URL(API_BASE_URL).origin;
  return `${origin}/uploads/${encodeURIComponent(filename)}`;
};
