import { useState, useEffect, useCallback } from "react";
import { quizAPI } from "../api";
import { useAuth } from "../../context/AuthContext";

/**
 * Quiz Component
 * Main quiz page with browsing, creating, and taking quizzes
 * Features: Quiz list, quiz creation form, quiz taking interface, results display
 */

// Category options for quizzes
const CATEGORIES = [
  'Mathematics', 'Science', 'History', 'Geography', 
  'English', 'Computer Science', 'General Knowledge', 'Other'
];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

const Quiz = () => {
  // State management
  const [view, setView] = useState('browse'); // 'browse' | 'create' | 'take' | 'results'
  const [quizzes, setQuizzes] = useState([]);
  const [myQuizzes, setMyQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState('public'); // 'public' | 'my'
  const [stats, setStats] = useState(null);
  
  // Filters
  const [categoryFilter, setCategoryFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  
  // Quiz creation state
  const [newQuiz, setNewQuiz] = useState({
    title: '',
    description: '',
    category: 'General Knowledge',
    difficulty: 'Medium',
    timeLimit: 0,
    isPublic: true,
    questions: [{ questionText: '', options: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }], explanation: '', points: 1 }]
  });
  
  // Quiz taking state
  const [currentQuiz, setCurrentQuiz] = useState(null);
  const [attemptId, setAttemptId] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [quizStartTime, setQuizStartTime] = useState(null);
  
  // Results state
  const [results, setResults] = useState(null);

  // Leaderboard state
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboard, setLeaderboard] = useState(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardQuizTitle, setLeaderboardQuizTitle] = useState("");
  
  const { isAuthenticated } = useAuth();

  // Fetch quizzes on mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchQuizzes();
      fetchStats();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Timer effect for quiz taking
  useEffect(() => {
    let timer;
    if (view === 'take' && currentQuiz?.timeLimit > 0 && timeRemaining > 0) {
      timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleSubmitQuiz(); // Auto-submit when time runs out
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [view, currentQuiz, timeRemaining]);

  // Fetch all quizzes
  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      const params = {};
      if (categoryFilter) params.category = categoryFilter;
      if (difficultyFilter) params.difficulty = difficultyFilter;
      
      const [publicData, myData] = await Promise.all([
        quizAPI.getPublicQuizzes(params),
        quizAPI.getMyQuizzes(params)
      ]);
      
      setQuizzes(publicData.quizzes || []);
      setMyQuizzes(myData.quizzes || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch user stats
  const fetchStats = async () => {
    try {
      const data = await quizAPI.getStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  // Apply filters
  useEffect(() => {
    if (isAuthenticated) {
      fetchQuizzes();
    }
  }, [categoryFilter, difficultyFilter]);

  // Fetch leaderboard
  const handleShowLeaderboard = async (quizId, quizTitle) => {
    try {
      setLeaderboardLoading(true);
      setLeaderboardQuizTitle(quizTitle);
      const data = await quizAPI.getLeaderboard(quizId);
      setLeaderboard(data);
      setShowLeaderboard(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLeaderboardLoading(false);
    }
  };

  // Start taking a quiz
  const handleStartQuiz = async (quizId) => {
    try {
      setLoading(true);
      const data = await quizAPI.startQuiz(quizId);
      setCurrentQuiz(data.quiz);
      setAttemptId(data.attemptId);
      setCurrentQuestion(0);
      setAnswers([]);
      setQuizStartTime(Date.now());
      if (data.quiz.timeLimit > 0) {
        setTimeRemaining(data.quiz.timeLimit * 60);
      }
      setView('take');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle answer selection
  const handleSelectAnswer = (questionId, optionId) => {
    setAnswers(prev => {
      const existing = prev.findIndex(a => a.questionId === questionId);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { questionId, selectedOptionId: optionId };
        return updated;
      }
      return [...prev, { questionId, selectedOptionId: optionId }];
    });
  };

  // Submit quiz
  const handleSubmitQuiz = useCallback(async () => {
    try {
      setLoading(true);
      const timeTaken = Math.round((Date.now() - quizStartTime) / 1000);
      const data = await quizAPI.submitQuiz(currentQuiz._id, attemptId, answers, timeTaken);
      setResults(data);
      setView('results');
      fetchStats(); // Refresh stats
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentQuiz, attemptId, answers, quizStartTime]);

  // Create new quiz
  const handleCreateQuiz = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await quizAPI.createQuiz(newQuiz);
      setNewQuiz({
        title: '',
        description: '',
        category: 'General Knowledge',
        difficulty: 'Medium',
        timeLimit: 0,
        isPublic: true,
        questions: [{ questionText: '', options: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }], explanation: '', points: 1 }]
      });
      setView('browse');
      fetchQuizzes();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete quiz
  const handleDeleteQuiz = async (quizId) => {
    if (!confirm('Are you sure you want to delete this quiz?')) return;
    try {
      await quizAPI.deleteQuiz(quizId);
      fetchQuizzes();
    } catch (err) {
      setError(err.message);
    }
  };

  // Add question to new quiz
  const addQuestion = () => {
    setNewQuiz(prev => ({
      ...prev,
      questions: [...prev.questions, { questionText: '', options: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }], explanation: '', points: 1 }]
    }));
  };

  // Remove question from new quiz
  const removeQuestion = (index) => {
    if (newQuiz.questions.length <= 1) return;
    setNewQuiz(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index)
    }));
  };

  // Update question
  const updateQuestion = (qIndex, field, value) => {
    setNewQuiz(prev => {
      const questions = [...prev.questions];
      questions[qIndex] = { ...questions[qIndex], [field]: value };
      return { ...prev, questions };
    });
  };

  // Add option to question
  const addOption = (qIndex) => {
    setNewQuiz(prev => {
      const questions = [...prev.questions];
      questions[qIndex].options.push({ text: '', isCorrect: false });
      return { ...prev, questions };
    });
  };

  // Update option
  const updateOption = (qIndex, oIndex, field, value) => {
    setNewQuiz(prev => {
      const questions = [...prev.questions];
      const options = [...questions[qIndex].options];
      
      // If setting this as correct, unset others
      if (field === 'isCorrect' && value === true) {
        options.forEach((opt, i) => {
          opt.isCorrect = i === oIndex;
        });
      } else {
        options[oIndex] = { ...options[oIndex], [field]: value };
      }
      
      questions[qIndex] = { ...questions[qIndex], options };
      return { ...prev, questions };
    });
  };

  // Remove option
  const removeOption = (qIndex, oIndex) => {
    if (newQuiz.questions[qIndex].options.length <= 2) return;
    setNewQuiz(prev => {
      const questions = [...prev.questions];
      questions[qIndex].options = questions[qIndex].options.filter((_, i) => i !== oIndex);
      return { ...prev, questions };
    });
  };

  // Format time for display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Not authenticated view
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">🎯 Quiz</h1>
          <p className="text-gray-600 mb-6">Please login to access quizzes and test your knowledge.</p>
          <a href="/login" className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition inline-block">
            Login to Continue
          </a>
        </div>
      </div>
    );
  }

  // Results view
  if (view === 'results' && results) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
            <h1 className="text-3xl font-bold text-center mb-2">Quiz Completed! 🎉</h1>
            <div className="text-center mb-8">
              <div className={`text-6xl font-bold mb-2 ${results.percentage >= 70 ? 'text-green-600' : results.percentage >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                {results.percentage}%
              </div>
              <p className="text-gray-600">Score: {results.score} / {results.totalPoints} points</p>
              <p className="text-gray-500 text-sm">Time: {formatTime(results.timeTaken)}</p>
            </div>

            {/* Results breakdown */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold border-b pb-2">Question Review</h2>
              {results.results.map((result, index) => (
                <div key={index} className={`p-4 rounded-lg border-l-4 ${result.isCorrect ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
                  <div className="flex items-start gap-2">
                    <span className={`mt-1 ${result.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                      {result.isCorrect ? '✓' : '✗'}
                    </span>
                    <div className="flex-1">
                      <p className="font-medium">{result.questionText}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        Your answer: <span className={result.isCorrect ? 'text-green-700' : 'text-red-700'}>{result.userAnswer}</span>
                      </p>
                      {!result.isCorrect && (
                        <p className="text-sm text-green-700 mt-1">Correct: {result.correctAnswer}</p>
                      )}
                      {result.explanation && (
                        <p className="text-sm text-gray-500 mt-2 italic">{result.explanation}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => { setView('browse'); setResults(null); }}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Back to Quizzes
          </button>
        </div>
      </div>
    );
  }

  // Quiz taking view
  if (view === 'take' && currentQuiz) {
    const question = currentQuiz.questions[currentQuestion];
    const selectedAnswer = answers.find(a => a.questionId === question._id);

    return (
      <div className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Quiz header */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-xl font-bold text-gray-800">{currentQuiz.title}</h1>
              {currentQuiz.timeLimit > 0 && (
                <div className={`font-mono text-lg px-4 py-2 rounded-lg ${timeRemaining < 60 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                  ⏱ {formatTime(timeRemaining)}
                </div>
              )}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {currentQuiz.questions.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentQuestion(index)}
                  className={`min-w-[40px] h-10 rounded-lg font-medium transition ${
                    currentQuestion === index
                      ? 'bg-blue-600 text-white'
                      : answers.find(a => a.questionId === currentQuiz.questions[index]._id)
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Question card */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="mb-6">
              <span className="text-sm text-gray-500">Question {currentQuestion + 1} of {currentQuiz.questions.length}</span>
              <span className="text-sm text-blue-600 ml-4">({question.points} point{question.points > 1 ? 's' : ''})</span>
            </div>
            <h2 className="text-xl font-semibold mb-6">{question.questionText}</h2>
            
            <div className="space-y-3">
              {question.options.map((option) => (
                <button
                  key={option._id}
                  onClick={() => handleSelectAnswer(question._id, option._id)}
                  className={`w-full p-4 text-left rounded-lg border-2 transition ${
                    selectedAnswer?.selectedOptionId === option._id
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {option.text}
                </button>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex gap-4">
            <button
              onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
              disabled={currentQuestion === 0}
              className="flex-1 py-3 rounded-lg font-semibold border-2 border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            {currentQuestion < currentQuiz.questions.length - 1 ? (
              <button
                onClick={() => setCurrentQuestion(prev => prev + 1)}
                className="flex-1 py-3 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmitQuiz}
                className="flex-1 py-3 rounded-lg font-semibold bg-green-600 text-white hover:bg-green-700"
              >
                Submit Quiz
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Create quiz view
  if (view === 'create') {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Create New Quiz</h1>
            <button
              onClick={() => setView('browse')}
              className="text-gray-600 hover:text-gray-800"
            >
              ← Back
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
              <button onClick={() => setError("")} className="ml-2 font-bold">×</button>
            </div>
          )}

          <form onSubmit={handleCreateQuiz} className="space-y-6">
            {/* Quiz details */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold mb-4">Quiz Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                  <input
                    type="text"
                    value={newQuiz.title}
                    onChange={(e) => setNewQuiz({ ...newQuiz, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="Enter quiz title"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={newQuiz.description}
                    onChange={(e) => setNewQuiz({ ...newQuiz, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="Enter quiz description"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                  <select
                    value={newQuiz.category}
                    onChange={(e) => setNewQuiz({ ...newQuiz, category: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty *</label>
                  <select
                    value={newQuiz.difficulty}
                    onChange={(e) => setNewQuiz({ ...newQuiz, difficulty: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {DIFFICULTIES.map(diff => <option key={diff} value={diff}>{diff}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time Limit (minutes, 0 = no limit)</label>
                  <input
                    type="number"
                    value={newQuiz.timeLimit}
                    onChange={(e) => setNewQuiz({ ...newQuiz, timeLimit: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    min="0"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={newQuiz.isPublic}
                    onChange={(e) => setNewQuiz({ ...newQuiz, isPublic: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="isPublic" className="ml-2 text-sm text-gray-700">Make quiz public</label>
                </div>
              </div>
            </div>

            {/* Questions */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Questions</h2>
                <button
                  type="button"
                  onClick={addQuestion}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  + Add Question
                </button>
              </div>

              {newQuiz.questions.map((question, qIndex) => (
                <div key={qIndex} className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-semibold text-gray-700">Question {qIndex + 1}</h3>
                    {newQuiz.questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeQuestion(qIndex)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Question Text *</label>
                      <input
                        type="text"
                        value={question.questionText}
                        onChange={(e) => updateQuestion(qIndex, 'questionText', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="Enter question"
                        required
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-medium text-gray-700">Options * (select correct answer)</label>
                        <button
                          type="button"
                          onClick={() => addOption(qIndex)}
                          className="text-sm text-blue-600 hover:text-blue-700"
                        >
                          + Add Option
                        </button>
                      </div>
                      <div className="space-y-2">
                        {question.options.map((option, oIndex) => (
                          <div key={oIndex} className="flex gap-2 items-center">
                            <input
                              type="radio"
                              name={`correct-${qIndex}`}
                              checked={option.isCorrect}
                              onChange={() => updateOption(qIndex, oIndex, 'isCorrect', true)}
                              className="w-4 h-4 text-green-600"
                              title="Mark as correct"
                            />
                            <input
                              type="text"
                              value={option.text}
                              onChange={(e) => updateOption(qIndex, oIndex, 'text', e.target.value)}
                              className={`flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none ${
                                option.isCorrect ? 'border-green-500 focus:ring-green-500' : 'border-gray-300 focus:ring-blue-500'
                              }`}
                              placeholder={`Option ${oIndex + 1}`}
                              required
                            />
                            {question.options.length > 2 && (
                              <button
                                type="button"
                                onClick={() => removeOption(qIndex, oIndex)}
                                className="text-red-600 hover:text-red-700 px-2"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Points</label>
                        <input
                          type="number"
                          value={question.points}
                          onChange={(e) => updateQuestion(qIndex, 'points', parseInt(e.target.value) || 1)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          min="1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Explanation (optional)</label>
                        <input
                          type="text"
                          value={question.explanation}
                          onChange={(e) => updateQuestion(qIndex, 'explanation', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          placeholder="Why is this the correct answer?"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Quiz'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Browse quizzes view (default)
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header with stats */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">🎯 Quizzes</h1>
            <p className="text-gray-600">Test your knowledge and track your progress</p>
          </div>
          <button
            onClick={() => setView('create')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            + Create Quiz
          </button>
        </div>

        {/* Stats cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <div className="text-3xl font-bold text-blue-600">{stats.totalAttempts}</div>
              <div className="text-sm text-gray-600">Quizzes Taken</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <div className="text-3xl font-bold text-green-600">{stats.averagePercentage}%</div>
              <div className="text-sm text-gray-600">Average Score</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <div className="text-3xl font-bold text-purple-600">{stats.quizzesCreated}</div>
              <div className="text-sm text-gray-600">Quizzes Created</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <div className="text-3xl font-bold text-orange-600">{stats.totalScore}</div>
              <div className="text-sm text-gray-600">Total Points</div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
            <button onClick={() => setError("")} className="ml-2 font-bold">×</button>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl shadow p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">All Difficulties</option>
              {DIFFICULTIES.map(diff => <option key={diff} value={diff}>{diff}</option>)}
            </select>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab('public')}
            className={`px-6 py-3 font-medium border-b-2 transition ${
              activeTab === 'public'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            Public Quizzes ({quizzes.length})
          </button>
          <button
            onClick={() => setActiveTab('my')}
            className={`px-6 py-3 font-medium border-b-2 transition ${
              activeTab === 'my'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            My Quizzes ({myQuizzes.length})
          </button>
        </div>

        {/* Quiz list */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading quizzes...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(activeTab === 'public' ? quizzes : myQuizzes).map((quiz) => (
              <div key={quiz._id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      quiz.difficulty === 'Easy' ? 'bg-green-100 text-green-800' :
                      quiz.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {quiz.difficulty}
                    </span>
                    <span className="text-xs text-gray-500">{quiz.category}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">{quiz.title}</h3>
                  {quiz.description && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{quiz.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                    <span>📝 {quiz.questions?.length || 0} questions</span>
                    {quiz.timeLimit > 0 && <span>⏱ {quiz.timeLimit} min</span>}
                  </div>
                  {activeTab === 'public' && quiz.user && (
                    <p className="text-xs text-gray-400 mb-4">By: {quiz.user.username}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleStartQuiz(quiz._id)}
                      className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
                    >
                      Start Quiz
                    </button>
                    <button
                      onClick={() => handleShowLeaderboard(quiz._id, quiz.title)}
                      className="px-4 py-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition"
                      title="View leaderboard"
                    >
                      🏆
                    </button>
                    {activeTab === 'my' && (
                      <button
                        onClick={() => handleDeleteQuiz(quiz._id)}
                        className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {(activeTab === 'public' ? quizzes : myQuizzes).length === 0 && (
              <div className="col-span-full text-center py-12 bg-white rounded-xl shadow">
                <p className="text-gray-600 mb-4">
                  {activeTab === 'public' ? 'No public quizzes available.' : 'You haven\'t created any quizzes yet.'}
                </p>
                <button
                  onClick={() => setView('create')}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Create your first quiz →
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Leaderboard Modal */}
      {showLeaderboard && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">🏆 Quiz Leaderboard</h2>
                <p className="text-gray-600 text-sm mt-1">{leaderboardQuizTitle}</p>
              </div>
              <button
                onClick={() => setShowLeaderboard(false)}
                className="text-gray-500 hover:text-gray-700 text-3xl"
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {leaderboardLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading leaderboard...</p>
                </div>
              ) : leaderboard && leaderboard.leaderboard && leaderboard.leaderboard.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-200">
                        <th className="text-left py-3 px-4 text-gray-700 font-semibold">Rank</th>
                        <th className="text-left py-3 px-4 text-gray-700 font-semibold">Username</th>
                        <th className="text-center py-3 px-4 text-gray-700 font-semibold">Score %</th>
                        <th className="text-center py-3 px-4 text-gray-700 font-semibold">Points</th>
                        <th className="text-center py-3 px-4 text-gray-700 font-semibold">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.leaderboard.map((entry, index) => (
                        <tr
                          key={index}
                          className={`border-b border-gray-100 ${
                            index === 0 ? 'bg-yellow-50' : index === 1 ? 'bg-gray-100' : index === 2 ? 'bg-orange-50' : ''
                          }`}
                        >
                          <td className="py-3 px-4">
                            <span className="font-bold text-lg">
                              {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-medium text-gray-800">{entry.username}</td>
                          <td className="py-3 px-4 text-center">
                            <span className={`font-bold ${
                              entry.scorePercentage >= 80 ? 'text-green-600' :
                              entry.scorePercentage >= 60 ? 'text-blue-600' :
                              'text-orange-600'
                            }`}>
                              {entry.scorePercentage}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center text-gray-700">{entry.score}</td>
                          <td className="py-3 px-4 text-center text-gray-600 text-sm">{formatTime(entry.timeSpent)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600">No attempts yet. Be the first to take this quiz!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Quiz;