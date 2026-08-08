import { useState, useEffect } from "react";
import { doubtAPI } from "../api";
import { useAuth } from "../../context/AuthContext";

/**
 * Doubts Component
 * Main doubt solving page with Q&A functionality
 * Features: Post doubts, browse doubts, answer questions, voting, accept solutions
 */

// Category options for doubts
const CATEGORIES = [
  'Mathematics', 'Science', 'History', 'Geography', 
  'English', 'Computer Science', 'General Knowledge', 'Other'
];

const Doubts = () => {
  // State management
  const [view, setView] = useState('browse'); // 'browse' | 'create' | 'detail'
  const [doubts, setDoubts] = useState([]);
  const [myDoubts, setMyDoubts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'my' | 'unanswered'
  const [stats, setStats] = useState(null);
  
  // Filters
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('recent'); // 'recent' | 'popular' | 'unanswered'
  
  // Doubt creation state
  const [newDoubt, setNewDoubt] = useState({
    title: '',
    description: '',
    category: 'General Knowledge',
    tags: ''
  });
  
  // Detail view state
  const [selectedDoubt, setSelectedDoubt] = useState(null);
  const [newAnswer, setNewAnswer] = useState('');
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  
  const { isAuthenticated, user } = useAuth();

  // Fetch doubts on mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchDoubts();
      fetchStats();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Fetch doubts with filters
  const fetchDoubts = async () => {
    try {
      setLoading(true);
      const params = { sort: sortBy };
      if (categoryFilter) params.category = categoryFilter;
      if (searchTerm) params.search = searchTerm;
      
      const [allData, myData] = await Promise.all([
        doubtAPI.getAllDoubts(params),
        doubtAPI.getMyDoubts()
      ]);
      
      setDoubts(allData.doubts || []);
      setMyDoubts(myData.doubts || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch user stats
  const fetchStats = async () => {
    try {
      const data = await doubtAPI.getStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  // Apply filters
  useEffect(() => {
    if (isAuthenticated) {
      const timeoutId = setTimeout(fetchDoubts, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [categoryFilter, searchTerm, sortBy]);

  // View doubt detail
  const handleViewDoubt = async (doubtId) => {
    try {
      setLoading(true);
      const doubt = await doubtAPI.getDoubt(doubtId);
      setSelectedDoubt(doubt);
      setView('detail');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Create new doubt
  const handleCreateDoubt = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await doubtAPI.createDoubt(newDoubt);
      setNewDoubt({ title: '', description: '', category: 'General Knowledge', tags: '' });
      setView('browse');
      fetchDoubts();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete doubt
  const handleDeleteDoubt = async (doubtId) => {
    if (!confirm('Are you sure you want to delete this doubt?')) return;
    try {
      await doubtAPI.deleteDoubt(doubtId);
      setView('browse');
      setSelectedDoubt(null);
      fetchDoubts();
    } catch (err) {
      setError(err.message);
    }
  };

  // Add answer
  const handleAddAnswer = async (e) => {
    e.preventDefault();
    if (!newAnswer.trim()) return;
    
    try {
      setSubmittingAnswer(true);
      await doubtAPI.addAnswer(selectedDoubt._id, newAnswer);
      setNewAnswer('');
      // Refresh the doubt
      const updated = await doubtAPI.getDoubt(selectedDoubt._id);
      setSelectedDoubt(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmittingAnswer(false);
    }
  };

  // Accept answer
  const handleAcceptAnswer = async (answerId) => {
    try {
      const updated = await doubtAPI.acceptAnswer(selectedDoubt._id, answerId);
      setSelectedDoubt(updated.doubt);
      fetchDoubts();
    } catch (err) {
      setError(err.message);
    }
  };

  // Delete answer
  const handleDeleteAnswer = async (answerId) => {
    if (!confirm('Are you sure you want to delete this answer?')) return;
    try {
      await doubtAPI.deleteAnswer(selectedDoubt._id, answerId);
      const updated = await doubtAPI.getDoubt(selectedDoubt._id);
      setSelectedDoubt(updated);
    } catch (err) {
      setError(err.message);
    }
  };

  // Vote on doubt
  const handleVoteDoubt = async (doubtId, voteType) => {
    try {
      await doubtAPI.voteDoubt(doubtId, voteType);
      if (selectedDoubt && selectedDoubt._id === doubtId) {
        const updated = await doubtAPI.getDoubt(doubtId);
        setSelectedDoubt(updated);
      }
      fetchDoubts();
    } catch (err) {
      setError(err.message);
    }
  };

  // Vote on answer
  const handleVoteAnswer = async (answerId, voteType) => {
    try {
      await doubtAPI.voteAnswer(selectedDoubt._id, answerId, voteType);
      const updated = await doubtAPI.getDoubt(selectedDoubt._id);
      setSelectedDoubt(updated);
    } catch (err) {
      setError(err.message);
    }
  };

  // Get status badge color
  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'bg-yellow-100 text-yellow-800';
      case 'answered': return 'bg-blue-100 text-blue-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return date.toLocaleDateString();
  };

  // Not authenticated view
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">💬 Doubt Solving</h1>
          <p className="text-gray-600 mb-6">Please login to ask questions and help others with their doubts.</p>
          <a href="/login" className="bg-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-purple-700 transition inline-block">
            Login to Continue
          </a>
        </div>
      </div>
    );
  }

  // Detail view
  if (view === 'detail' && selectedDoubt) {
    const isOwner = selectedDoubt.user?._id === user?.id;
    
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Back button */}
          <button
            onClick={() => { setView('browse'); setSelectedDoubt(null); }}
            className="mb-6 text-gray-600 hover:text-gray-800 flex items-center gap-2"
          >
            ← Back to Doubts
          </button>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
              <button onClick={() => setError("")} className="ml-2 font-bold">×</button>
            </div>
          )}

          {/* Doubt card */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="flex gap-4">
              {/* Voting */}
              <div className="flex flex-col items-center gap-1">
                <button
                  onClick={() => handleVoteDoubt(selectedDoubt._id, 'up')}
                  className="p-2 rounded hover:bg-gray-100 text-gray-500 hover:text-green-600"
                >
                  ▲
                </button>
                <span className="font-semibold text-lg">
                  {(selectedDoubt.upvotes?.length || 0) - (selectedDoubt.downvotes?.length || 0)}
                </span>
                <button
                  onClick={() => handleVoteDoubt(selectedDoubt._id, 'down')}
                  className="p-2 rounded hover:bg-gray-100 text-gray-500 hover:text-red-600"
                >
                  ▼
                </button>
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(selectedDoubt.status)}`}>
                    {selectedDoubt.status}
                  </span>
                  <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
                    {selectedDoubt.category}
                  </span>
                  {selectedDoubt.tags?.map((tag, i) => (
                    <span key={i} className="px-2 py-1 text-xs rounded-full bg-blue-50 text-blue-700">
                      #{tag}
                    </span>
                  ))}
                </div>

                <h1 className="text-2xl font-bold text-gray-800 mb-4">{selectedDoubt.title}</h1>
                <p className="text-gray-700 whitespace-pre-wrap mb-4">{selectedDoubt.description}</p>

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center gap-4">
                    <span>Asked by: <strong>{selectedDoubt.user?.username || 'Unknown'}</strong></span>
                    <span>{formatDate(selectedDoubt.createdAt)}</span>
                    <span>👁 {selectedDoubt.views} views</span>
                  </div>
                  {isOwner && (
                    <button
                      onClick={() => handleDeleteDoubt(selectedDoubt._id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Answers section */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4">
              {selectedDoubt.answers?.length || 0} Answer{selectedDoubt.answers?.length !== 1 ? 's' : ''}
            </h2>

            {selectedDoubt.answers?.length === 0 ? (
              <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
                No answers yet. Be the first to help!
              </div>
            ) : (
              <div className="space-y-4">
                {selectedDoubt.answers
                  .sort((a, b) => {
                    // Accepted answers first
                    if (a.isAccepted && !b.isAccepted) return -1;
                    if (!a.isAccepted && b.isAccepted) return 1;
                    // Then by votes
                    const aVotes = (a.upvotes?.length || 0) - (a.downvotes?.length || 0);
                    const bVotes = (b.upvotes?.length || 0) - (b.downvotes?.length || 0);
                    return bVotes - aVotes;
                  })
                  .map((answer) => {
                    const isAnswerOwner = answer.user?._id === user?.id;
                    
                    return (
                      <div
                        key={answer._id}
                        className={`bg-white rounded-xl shadow p-6 ${
                          answer.isAccepted ? 'border-2 border-green-500' : ''
                        }`}
                      >
                        <div className="flex gap-4">
                          {/* Voting */}
                          <div className="flex flex-col items-center gap-1">
                            <button
                              onClick={() => handleVoteAnswer(answer._id, 'up')}
                              className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-green-600"
                            >
                              ▲
                            </button>
                            <span className="font-semibold">
                              {(answer.upvotes?.length || 0) - (answer.downvotes?.length || 0)}
                            </span>
                            <button
                              onClick={() => handleVoteAnswer(answer._id, 'down')}
                              className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-red-600"
                            >
                              ▼
                            </button>
                            {answer.isAccepted && (
                              <span className="text-green-600 text-2xl mt-2" title="Accepted Answer">✓</span>
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1">
                            <p className="text-gray-700 whitespace-pre-wrap mb-4">{answer.content}</p>
                            
                            <div className="flex items-center justify-between text-sm text-gray-500">
                              <div className="flex items-center gap-4">
                                <span>Answered by: <strong>{answer.user?.username || 'Unknown'}</strong></span>
                                <span>{formatDate(answer.createdAt)}</span>
                              </div>
                              <div className="flex gap-2">
                                {isOwner && !answer.isAccepted && selectedDoubt.status !== 'resolved' && (
                                  <button
                                    onClick={() => handleAcceptAnswer(answer._id)}
                                    className="text-green-600 hover:text-green-700 font-medium"
                                  >
                                    Accept
                                  </button>
                                )}
                                {(isAnswerOwner || isOwner) && (
                                  <button
                                    onClick={() => handleDeleteAnswer(answer._id)}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Add answer form */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Your Answer</h3>
            <form onSubmit={handleAddAnswer}>
              <textarea
                value={newAnswer}
                onChange={(e) => setNewAnswer(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none mb-4"
                placeholder="Write your answer here..."
                rows={6}
                required
              />
              <button
                type="submit"
                disabled={submittingAnswer || !newAnswer.trim()}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition disabled:opacity-50"
              >
                {submittingAnswer ? 'Posting...' : 'Post Answer'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Create doubt view
  if (view === 'create') {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Ask a Question</h1>
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

          <form onSubmit={handleCreateDoubt} className="bg-white rounded-xl shadow-lg p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input
                type="text"
                value={newDoubt.title}
                onChange={(e) => setNewDoubt({ ...newDoubt, title: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                placeholder="What's your question? Be specific."
                required
              />
              <p className="text-xs text-gray-500 mt-1">Be clear and concise with your question title</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
              <textarea
                value={newDoubt.description}
                onChange={(e) => setNewDoubt({ ...newDoubt, description: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                placeholder="Provide all the details needed to answer your question..."
                rows={8}
                required
              />
              <p className="text-xs text-gray-500 mt-1">Include any relevant context, what you've tried, and what you're expecting</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <select
                  value={newDoubt.category}
                  onChange={(e) => setNewDoubt({ ...newDoubt, category: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma separated)</label>
                <input
                  type="text"
                  value={newDoubt.tags}
                  onChange={(e) => setNewDoubt({ ...newDoubt, tags: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  placeholder="algebra, equations, homework"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition disabled:opacity-50"
            >
              {loading ? 'Posting...' : 'Post Question'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Browse doubts view (default)
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">💬 Doubt Solving</h1>
            <p className="text-gray-600">Ask questions and help others learn</p>
          </div>
          <button
            onClick={() => setView('create')}
            className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition"
          >
            + Ask Question
          </button>
        </div>

        {/* Stats cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <div className="text-3xl font-bold text-purple-600">{stats.totalDoubts}</div>
              <div className="text-sm text-gray-600">Questions Asked</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <div className="text-3xl font-bold text-green-600">{stats.resolvedDoubts}</div>
              <div className="text-sm text-gray-600">Resolved</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <div className="text-3xl font-bold text-blue-600">{stats.totalAnswers}</div>
              <div className="text-sm text-gray-600">Answers Given</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <div className="text-3xl font-bold text-orange-600">{stats.helpfulRate}%</div>
              <div className="text-sm text-gray-600">Helpful Rate</div>
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
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                placeholder="Search questions..."
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
            >
              <option value="recent">Most Recent</option>
              <option value="popular">Most Popular</option>
              <option value="unanswered">Unanswered</option>
            </select>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-6 py-3 font-medium border-b-2 transition ${
              activeTab === 'all'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            All Questions ({doubts.length})
          </button>
          <button
            onClick={() => setActiveTab('my')}
            className={`px-6 py-3 font-medium border-b-2 transition ${
              activeTab === 'my'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            My Questions ({myDoubts.length})
          </button>
        </div>

        {/* Doubts list */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading questions...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {(activeTab === 'all' ? doubts : myDoubts).map((doubt) => (
              <div
                key={doubt._id}
                className="bg-white rounded-xl shadow hover:shadow-lg transition cursor-pointer"
                onClick={() => handleViewDoubt(doubt._id)}
              >
                <div className="p-6">
                  <div className="flex gap-6">
                    {/* Stats */}
                    <div className="hidden md:flex flex-col items-center gap-4 text-center min-w-[80px]">
                      <div>
                        <div className="text-lg font-semibold text-gray-700">
                          {(doubt.upvotes?.length || 0) - (doubt.downvotes?.length || 0)}
                        </div>
                        <div className="text-xs text-gray-500">votes</div>
                      </div>
                      <div className={`px-3 py-1 rounded ${
                        doubt.status === 'resolved' 
                          ? 'bg-green-100 text-green-800' 
                          : doubt.answers?.length > 0 
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        <div className="text-lg font-semibold">{doubt.answers?.length || 0}</div>
                        <div className="text-xs">answers</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">{doubt.views || 0}</div>
                        <div className="text-xs text-gray-400">views</div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex flex-wrap gap-2 mb-2">
                        <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(doubt.status)}`}>
                          {doubt.status}
                        </span>
                        <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700">
                          {doubt.category}
                        </span>
                      </div>

                      <h3 className="text-lg font-semibold text-gray-800 mb-2 hover:text-purple-600">
                        {doubt.title}
                      </h3>
                      <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                        {doubt.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        {doubt.tags?.slice(0, 3).map((tag, i) => (
                          <span key={i} className="px-2 py-0.5 text-xs rounded bg-blue-50 text-blue-700">
                            {tag}
                          </span>
                        ))}
                        <span className="text-gray-400 ml-auto">
                          {doubt.user?.username || 'Unknown'} • {formatDate(doubt.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {(activeTab === 'all' ? doubts : myDoubts).length === 0 && (
              <div className="text-center py-12 bg-white rounded-xl shadow">
                <p className="text-gray-600 mb-4">
                  {activeTab === 'all' ? 'No questions found.' : 'You haven\'t asked any questions yet.'}
                </p>
                <button
                  onClick={() => setView('create')}
                  className="text-purple-600 hover:text-purple-700 font-medium"
                >
                  Ask your first question →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Doubts;