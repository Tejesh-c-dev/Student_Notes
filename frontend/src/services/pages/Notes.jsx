/**
 * Notes Component
 * User notes management page with PDF support
 * Features: View, create (text/PDF), search, delete, PDF viewer
 */

import { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { notesAPI } from "../api";
import { useAuth } from "../../context/AuthContext";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

// Set PDF worker for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const Notes = () => {
  // State for notes data
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  
  // State for note creation form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formMode, setFormMode] = useState("text"); // "text" or "pdf"
  const [newNote, setNewNote] = useState({ title: "", content: "" });
  const [selectedFile, setSelectedFile] = useState(null);
  const [creating, setCreating] = useState(false);
  
  // State for PDF viewer modal
  const [selectedPDF, setSelectedPDF] = useState(null);
  const [pdfPageNum, setPdfPageNum] = useState(1);
  const [pdfNumPages, setPdfNumPages] = useState(null);
    const [pdfError, setPdfError] = useState(null);
  
  const { isAuthenticated } = useAuth();

  // Fetch notes on component mount
  useEffect(() => {
    fetchNotes();
  }, []);

  // Fetches all notes from API
  const fetchNotes = async () => {
    try {
      setLoading(true);
      const data = await notesAPI.getAllNotes();
      setNotes(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Creates a new text note via API
  const handleCreateTextNote = async (e) => {
    e.preventDefault();
    if (!newNote.title || !newNote.content) {
      setError("Title and content are required");
      return;
    }

    try {
      setCreating(true);
      const createdNote = await notesAPI.createNote(newNote.title, newNote.content);
      setNotes([createdNote, ...notes]);
      setNewNote({ title: "", content: "" });
      setShowCreateForm(false);
      setFormMode("text");
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  // Creates a new PDF note via API
  const handleCreatePDFNote = async (e) => {
    e.preventDefault();
    if (!newNote.title || !selectedFile) {
      setError("Title and PDF file are required");
      return;
    }

    try {
      setCreating(true);
      const createdNote = await notesAPI.createNoteWithFile(newNote.title, selectedFile);
      setNotes([createdNote, ...notes]);
      setNewNote({ title: "", content: "" });
      setSelectedFile(null);
      setShowCreateForm(false);
      setFormMode("text");
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  // Deletes a note after confirmation
  const handleDeleteNote = async (id) => {
    if (!confirm("Are you sure you want to delete this note?")) return;

    try {
      await notesAPI.deleteNote(id);
      setNotes(notes.filter((note) => note.id !== id && note._id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  // Filter notes based on search term
  const filteredNotes = notes.filter(
    (note) =>
      note.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.extractedText?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      {/* Search Bar */}
      <div className="max-w-4xl mx-auto mb-8">
        <input
          type="text"
          placeholder="Search notes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm
                     focus:outline-none focus:ring-2 focus:ring-indigo-500
                     placeholder-gray-400"
        />
      </div>

      {/* Heading & Create Button */}
      <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">
          {isAuthenticated ? "Your Notes" : "Highly Recommended Notes"}
        </h1>
        {isAuthenticated && (
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
          >
            {showCreateForm ? "Cancel" : "+ New Note"}
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="max-w-4xl mx-auto mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
          <button onClick={() => setError("")} className="ml-2 font-bold">×</button>
        </div>
      )}

      {/* Create Note Form */}
      {showCreateForm && isAuthenticated && (
        <div className="max-w-4xl mx-auto mb-6 p-6 bg-white rounded-xl shadow-md">
          <h2 className="text-lg font-semibold mb-4">Create New Note</h2>
          
          {/* Mode Toggle */}
          <div className="flex gap-4 mb-4">
            <button
              type="button"
              onClick={() => setFormMode("text")}
              className={`px-4 py-2 rounded-lg transition ${
                formMode === "text"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-200 text-gray-800 hover:bg-gray-300"
              }`}
            >
              📝 Text Note
            </button>
            <button
              type="button"
              onClick={() => setFormMode("pdf")}
              className={`px-4 py-2 rounded-lg transition ${
                formMode === "pdf"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-200 text-gray-800 hover:bg-gray-300"
              }`}
            >
              📄 PDF Upload
            </button>
          </div>

          {/* Text Note Form */}
          {formMode === "text" && (
            <form onSubmit={handleCreateTextNote} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={newNote.title}
                  onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter note title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                <textarea
                  value={newNote.content}
                  onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter note content"
                />
              </div>
              <button
                type="submit"
                disabled={creating}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create Note"}
              </button>
            </form>
          )}

          {/* PDF Upload Form */}
          {formMode === "pdf" && (
            <form onSubmit={handleCreatePDFNote} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={newNote.title}
                  onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter note title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">PDF File</label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {selectedFile && (
                  <p className="text-sm text-gray-600 mt-2">
                    Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>
              <button
                type="submit"
                disabled={creating}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {creating ? "Uploading..." : "Upload PDF"}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="max-w-4xl mx-auto text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading notes...</p>
        </div>
      ) : (
        <>
          {/* Notes Cards */}
          {filteredNotes.length > 0 ? (
            <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {filteredNotes.map((note) => (
                <div
                  key={note.id || note._id}
                  className="p-5 bg-white rounded-xl shadow-md hover:shadow-lg transition relative group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h2 className="text-lg font-semibold text-gray-800 flex-1">
                      {note.title}
                    </h2>
                    {note.fileUrl && (
                      <span className="text-xl ml-2">📄</span>
                    )}
                  </div>
                  
                  {note.fileUrl ? (
                    <div className="mb-3">
                      <p className="text-sm text-gray-600 mb-2">
                        PDF file · {note.extractedText ? "Text extracted" : "No text"}
                      </p>
                      <button
                        onClick={() => setSelectedPDF(`http://localhost:3000${note.fileUrl}`)}
                        className="text-indigo-600 text-sm font-medium hover:text-indigo-700"
                      >
                        View PDF →
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600 line-clamp-3 mb-3">
                      {note.content}
                    </p>
                  )}
                  
                  <p className="text-xs text-gray-400">
                    {note.createdAt && new Date(note.createdAt).toLocaleDateString()}
                  </p>
                  
                  {isAuthenticated && (
                    <button
                      onClick={() => handleDeleteNote(note.id || note._id)}
                      className="absolute top-2 right-2 text-red-500 opacity-0 group-hover:opacity-100 transition hover:text-red-700"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="max-w-4xl mx-auto text-center py-12">
              <p className="text-gray-600">
                {searchTerm ? "No notes match your search." : "No notes available yet."}
              </p>
              {isAuthenticated && !searchTerm && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="mt-4 text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Create your first note →
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* PDF Viewer Modal */}
      {selectedPDF && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800">PDF Viewer</h3>
              <button
                onClick={() => {
                  setSelectedPDF(null);
                  setPdfPageNum(1);
                  setPdfNumPages(null);
                                 setPdfError(null);
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            {/* PDF Document */}
            <div className="p-4 flex flex-col items-center">
               {pdfError && (
                 <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg mb-4">
                   Error loading PDF: {pdfError}
                 </div>
               )}
               {!pdfError && (
                 <Document
                   file={selectedPDF}
                   onLoadSuccess={({ numPages }) => setPdfNumPages(numPages)}
                   onLoadError={(error) => setPdfError(error.message)}
                 >
                   <Page pageNumber={pdfPageNum} />
                 </Document>
               )}
                 setPdfError(null);

              {/* Pagination Controls */}
              {pdfNumPages && (
                <div className="mt-4 flex gap-4 items-center">
                  <button
                    onClick={() => setPdfPageNum(Math.max(1, pdfPageNum - 1))}
                    disabled={pdfPageNum <= 1}
                    className="px-4 py-2 bg-gray-300 text-gray-800 rounded disabled:opacity-50"
                  >
                    ← Previous
                  </button>
                  <span className="text-gray-700">
                    Page {pdfPageNum} of {pdfNumPages}
                  </span>
                  <button
                    onClick={() => setPdfPageNum(Math.min(pdfNumPages, pdfPageNum + 1))}
                    disabled={pdfPageNum >= pdfNumPages}
                    className="px-4 py-2 bg-gray-300 text-gray-800 rounded disabled:opacity-50"
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notes;
  