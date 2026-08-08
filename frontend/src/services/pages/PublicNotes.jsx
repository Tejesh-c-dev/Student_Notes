/**
 * Public Notes Component
 * Community page showing notes that students have shared publicly.
 * The backend /notes/public endpoint returns ONLY notes with
 * visibility: "public" — no frontend filtering is needed or used here.
 */

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { notesAPI } from "../api";
import { useAuth } from "../../context/AuthContext";

// Human-readable attachment type label + icon for a note card.
const attachmentInfo = (note) => {
  if (note.attachmentType === "external") {
    return { icon: "🔗", label: "Link" };
  }
  if (note.fileUrl) {
    return { icon: "📄", label: "PDF" };
  }
  return { icon: "📝", label: "Text" };
};

const PublicNotes = () => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    const fetchPublicNotes = async () => {
      try {
        setLoading(true);
        // The server already filters to visibility === "public".
        setNotes(await notesAPI.getPublicNotes());
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPublicNotes();
  }, [isAuthenticated]);

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Heading */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">🌎 Public Notes</h1>
          <p className="text-gray-600 mt-1">
            Notes shared by other students for everyone to read.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
            <button onClick={() => setError("")} className="ml-2 font-bold">×</button>
          </div>
        )}

        {/* Not authenticated: prompt to log in */}
        {!isAuthenticated ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-md">
            <p className="text-gray-600 mb-4">
              Login to browse public notes shared by other students.
            </p>
            <Link
              to="/login"
              className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition"
            >
              Login
            </Link>
          </div>
        ) : loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading public notes...</p>
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-md">
            <p className="text-gray-600">
              No public notes shared yet. Be the first to share one from{" "}
              <Link to="/notes" className="text-indigo-600 font-medium">
                your notes
              </Link>
              !
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {notes.map((note) => {
              const { icon, label } = attachmentInfo(note);
              const id = note._id || note.id;
              return (
                <div
                  key={id}
                  className="p-5 bg-white rounded-xl shadow-md hover:shadow-lg transition"
                >
                  {/* Title + public indicator */}
                  <div className="flex items-start justify-between mb-2">
                    <h2 className="text-lg font-semibold text-gray-800 flex-1">
                      {note.title}
                    </h2>
                    <span
                      className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 ml-2 whitespace-nowrap"
                      title="Publicly shared"
                    >
                      🌎 Public
                    </span>
                  </div>

                  {/* Student who shared it */}
                  <p className="text-sm text-gray-600 mb-3">
                    Shared by <span className="font-medium text-gray-800">{note.user?.username || "Unknown"}</span>
                  </p>

                  {/* Attachment type + created date */}
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                    <span title={label}>{icon} {label}</span>
                    <span>·</span>
                    <span>{note.createdAt ? new Date(note.createdAt).toLocaleDateString() : ""}</span>
                  </div>

                  {/* Social counts (denormalized on the note, no extra queries) */}
                  <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
                    <span title="Likes">👍 {note.likeCount || 0}</span>
                    <span title="Comments">💬 {note.commentCount || 0}</span>
                  </div>

                  {/* View button -> detail page */}
                  <Link
                    to={`/notes/${id}`}
                    className="inline-block w-full text-center bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
                  >
                    View Note →
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicNotes;
