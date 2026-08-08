/**
 * Note Detail Component
 * Shows a single note. Access is enforced on the backend: the current user can
 * only fetch a note they own or one that is public. This page renders whatever
 * the authorized response contains (content, PDF, or external link).
 */

import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Document, Page, pdfjs } from "react-pdf";
import { notesAPI, resolveFileUrl } from "../api";
import { useAuth } from "../../context/AuthContext";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

// Set PDF worker for react-pdf.
// pdfjs-dist 4.x loads the worker as an ES module, so the legacy cdnjs
// pdf.worker.min.js URL fails to import (that script is not an ES module).
// Vite bundles the locally installed worker asset via the `new URL` form.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

// Recognizes Google Drive links so we open them in the Drive viewer instead of
// assuming a /view URL is a direct, renderable PDF.
const isGoogleDriveUrl = (url) => {
  try {
    return ["drive.google.com", "docs.google.com"].includes(new URL(url).hostname);
  } catch {
    return false;
  }
};

const NoteDetail = () => {
  const { id } = useParams();

  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // PDF viewer state (used only for uploaded PDF notes)
  const [pdfPageNum, setPdfPageNum] = useState(1);
  const [pdfNumPages, setPdfNumPages] = useState(null);
  const [pdfError, setPdfError] = useState(null);

  // Social state (likes, bookmarks, comments)
  const [likeCount, setLikeCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [bookmarkCount, setBookmarkCount] = useState(0);
  const [bookmarked, setBookmarked] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const [comments, setComments] = useState([]);
  const [commentContent, setCommentContent] = useState("");
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [socialError, setSocialError] = useState("");

  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    const fetchNote = async () => {
      try {
        setLoading(true);
        const data = await notesAPI.getNote(id);
        setNote(data);
        setLikeCount(data.likeCount || 0);
        setLiked(!!data.likedByMe);
        setBookmarkCount(data.bookmarkCount || 0);
        setBookmarked(!!data.bookmarkedByMe);
        setCommentCount(data.commentCount || 0);
        setError("");
        setPdfPageNum(1);
        setPdfNumPages(null);
        setPdfError(null);
        setComments([]);
        setCommentContent("");
        setSocialError("");
        await fetchComments(id);
      } catch (err) {
        setError(err.message);
        setNote(null);
      } finally {
        setLoading(false);
      }
    };

    fetchNote();
  }, [id, isAuthenticated]);

  const fetchComments = async (noteId) => {
    try {
      setCommentsLoading(true);
      setComments(await notesAPI.getComments(noteId));
    } catch (err) {
      setSocialError(err.message);
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleToggleLike = async () => {
    try {
      const { liked: next, likeCount: nextCount } = await notesAPI.toggleLike(id);
      setLiked(next);
      setLikeCount(nextCount);
    } catch (err) {
      setSocialError(err.message);
    }
  };

  const handleToggleBookmark = async () => {
    try {
      const { bookmarked: next, bookmarkCount: nextCount } = await notesAPI.toggleBookmark(id);
      setBookmarked(next);
      setBookmarkCount(nextCount);
    } catch (err) {
      setSocialError(err.message);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentContent.trim()) return;
    try {
      setCommentSubmitting(true);
      const comment = await notesAPI.addComment(id, commentContent);
      setComments((prev) => [...prev, comment]);
      setCommentCount((prev) => prev + 1);
      setCommentContent("");
      setSocialError("");
    } catch (err) {
      setSocialError(err.message);
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!confirm("Delete this comment?")) return;
    try {
      const { commentCount: nextCount } = await notesAPI.deleteComment(id, commentId);
      setComments((prev) => prev.filter((c) => (c.id || c._id) !== commentId));
      setCommentCount(nextCount);
    } catch (err) {
      setSocialError(err.message);
    }
  };

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="max-w-3xl mx-auto text-center py-12 bg-white rounded-xl shadow-md">
          <p className="text-gray-600 mb-4">
            Login to view this note.
          </p>
          <Link
            to="/login"
            className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition"
          >
            Login
          </Link>
        </div>
      </div>
    );
  }

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="max-w-3xl mx-auto text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading note...</p>
        </div>
      </div>
    );
  }

  // Error (includes 404 for private notes the user doesn't own)
  if (!note || error) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="max-w-3xl mx-auto text-center py-12 bg-white rounded-xl shadow-md">
          <p className="text-red-600 font-medium mb-4">
            {error || "Note not found"}
          </p>
          <p className="text-gray-500 text-sm mb-6">
            The note may have been deleted, or you don't have permission to view it.
          </p>
          <Link
            to="/public-notes"
            className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition"
          >
            ← Back to Public Notes
          </Link>
        </div>
      </div>
    );
  }

  const isExternal = note.attachmentType === "external";
  const isPdf = !isExternal && note.fileUrl;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <Link
          to="/public-notes"
          className="text-indigo-600 text-sm font-medium hover:text-indigo-700 mb-4 inline-block"
        >
          ← Back to Public Notes
        </Link>

        {/* Note metadata */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
            <h1 className="text-2xl font-bold text-gray-800 flex-1">{note.title}</h1>
            <span
              className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${
                note.visibility === "public"
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {note.visibility === "public" ? "🌎 Public" : "🔒 Private"}
            </span>
          </div>

          {/* Shared by + created date + attachment type */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500 mb-4">
            <span>
              Shared by{" "}
              <span className="font-medium text-gray-800">
                {note.user?.username || "Unknown"}
              </span>
            </span>
            <span>·</span>
            <span>{note.createdAt ? new Date(note.createdAt).toLocaleDateString() : ""}</span>
            <span>·</span>
            <span>{isExternal ? "🔗 External link" : isPdf ? "📄 PDF attachment" : "📝 Text note"}</span>
          </div>

          {/* Like / Bookmark actions */}
          {socialError && (
            <div className="mb-3 p-2 bg-red-100 border border-red-400 text-red-700 text-sm rounded-lg">
              {socialError}
              <button onClick={() => setSocialError("")} className="ml-2 font-bold">×</button>
            </div>
          )}
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={handleToggleLike}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                liked
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {liked ? "👍 Liked" : "👍 Like"} · {likeCount}
            </button>
            <button
              onClick={handleToggleBookmark}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                bookmarked
                  ? "bg-amber-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {bookmarked ? "🔖 Bookmarked" : "🔖 Bookmark"} · {bookmarkCount}
            </button>
          </div>

          {/* Body based on note type */}
          {isExternal ? (
            <div>
              <p className="text-gray-600 mb-4">
                This note links to an external document.
              </p>
              <a
                href={note.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition"
              >
                {isGoogleDriveUrl(note.fileUrl)
                  ? "Open in Google Drive →"
                  : "Open external link →"}
              </a>
            </div>
          ) : isPdf ? (
            <div className="flex flex-col items-center">
              {pdfError && (
                <div className="w-full p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg mb-4">
                  Error loading PDF: {pdfError}
                </div>
              )}
              {!pdfError && (
                <Document
                  file={resolveFileUrl(note.fileUrl)}
                  onLoadSuccess={({ numPages }) => setPdfNumPages(numPages)}
                  onLoadError={(e) => setPdfError(e.message)}
                >
                  <Page pageNumber={pdfPageNum} />
                </Document>
              )}

              {/* Pagination controls */}
              {pdfNumPages && !pdfError && (
                <div className="mt-4 flex gap-4 items-center">
                  <button
                    onClick={() => setPdfPageNum((p) => Math.max(1, p - 1))}
                    disabled={pdfPageNum <= 1}
                    className="px-4 py-2 bg-gray-300 text-gray-800 rounded disabled:opacity-50"
                  >
                    ← Previous
                  </button>
                  <span className="text-gray-700">
                    Page {pdfPageNum} of {pdfNumPages}
                  </span>
                  <button
                    onClick={() => setPdfPageNum((p) => Math.min(pdfNumPages, p + 1))}
                    disabled={pdfPageNum >= pdfNumPages}
                    className="px-4 py-2 bg-gray-300 text-gray-800 rounded disabled:opacity-50"
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div>
              <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
                Content
              </h2>
              <p className="text-gray-800 whitespace-pre-wrap">{note.content}</p>
            </div>
          )}

          {/* Comments */}
          <div className="border-t border-gray-100 pt-4 mt-6">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
              Comments ({commentCount})
            </h3>

            <form onSubmit={handleAddComment} className="flex gap-2 mb-4">
              <input
                type="text"
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={commentSubmitting || !commentContent.trim()}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {commentSubmitting ? "Posting..." : "Post"}
              </button>
            </form>

            {commentsLoading ? (
              <p className="text-sm text-gray-500">Loading comments...</p>
            ) : comments.length === 0 ? (
              <p className="text-sm text-gray-500">No comments yet. Be the first to comment!</p>
            ) : (
              <ul className="space-y-3">
                {comments.map((comment) => {
                  const commentId = comment.id || comment._id;
                  const isOwn = comment.user?.id === user?.id;
                  return (
                    <li key={commentId} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-sm font-medium text-gray-800">
                            {comment.user?.username || "Unknown"}
                          </span>
                          <span className="text-xs text-gray-400 ml-2">
                            {comment.createdAt
                              ? new Date(comment.createdAt).toLocaleString()
                              : ""}
                          </span>
                        </div>
                        {isOwn && (
                          <button
                            onClick={() => handleDeleteComment(commentId)}
                            className="text-red-500 hover:text-red-700 text-sm"
                            title="Delete comment"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">
                        {comment.content}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoteDetail;
