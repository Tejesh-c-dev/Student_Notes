/**
 * PYQs Component (Previous Year Questions)
 * Browse and upload past year exam papers with PDF viewer
 * Features: Search, filters (subject/year/examType), pagination, PDF upload/viewing
 */

import { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { pyqsAPI } from "../api";
import { useAuth } from "../../context/AuthContext";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

// Set PDF worker for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const PYQs = () => {
  // State for PYQs data
  const [pyqs, setPyqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(9);
  
  // State for filters
  const [filters, setFilters] = useState({
    subject: "",
    year: "",
    examType: ""
  });

  // State for upload form
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: "",
    subject: "",
    year: "",
    examType: "",
    file: null
  });
  const [uploading, setUploading] = useState(false);

  // State for PDF viewer modal
  const [selectedPDF, setSelectedPDF] = useState(null);
  const [pdfPageNum, setPdfPageNum] = useState(1);
  const [pdfNumPages, setPdfNumPages] = useState(null);
  const [viewingPYQTitle, setViewingPYQTitle] = useState("");
  const [pdfError, setPdfError] = useState(null);

  const { isAuthenticated } = useAuth();

  // Fetch PYQs on component mount
  useEffect(() => {
    fetchPYQs();
  }, [filters, searchTerm]);

  // Fetches PYQs with filters
  const fetchPYQs = async () => {
    try {
      setLoading(true);
      const params = {
        ...filters,
        search: searchTerm
      };
      const data = await pyqsAPI.getAllPYQs(params);
      setPyqs(data);
      setCurrentPage(1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handles filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({ ...filters, [name]: value });
  };

  // Handles PYQ upload
  const handleUploadPYQ = async (e) => {
    e.preventDefault();
    if (!uploadForm.title || !uploadForm.subject || !uploadForm.year || !uploadForm.examType || !uploadForm.file) {
      setError("All fields are required");
      return;
    }

    try {
      setUploading(true);
      const newPYQ = await pyqsAPI.uploadPYQ(
        uploadForm.title,
        uploadForm.subject,
        uploadForm.year,
        uploadForm.examType,
        uploadForm.file
      );
      setPyqs([newPYQ, ...pyqs]);
      setUploadForm({ title: "", subject: "", year: "", examType: "", file: null });
      setError("");
      setShowUploadForm(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  // Handles PYQ deletion
  const handleDeletePYQ = async (id) => {
    if (!confirm("Are you sure you want to delete this PYQ?")) return;

    try {
      await pyqsAPI.deletePYQ(id);
      setPyqs(pyqs.filter((pyq) => pyq.id !== id && pyq._id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  // Get unique subjects and exam types for filters
  const subjects = [...new Set(pyqs.map(p => p.subject))];
  const years = [...new Set(pyqs.map(p => p.year))].sort((a, b) => b - a);
  const examTypes = [...new Set(pyqs.map(p => p.examType))];

  // Filter PYQs based on search term
  const filteredPYQs = pyqs.filter(
    (pyq) =>
      pyq.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pyq.extractedText?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination
  const totalPages = Math.ceil(filteredPYQs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPYQs = filteredPYQs.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold text-gray-800">📖 Past Year Questions</h1>
          {isAuthenticated && (
            <button
              onClick={() => setShowUploadForm(!showUploadForm)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
            >
              {showUploadForm ? "Cancel" : "+ Upload PYQ"}
            </button>
          )}
        </div>
        <p className="text-gray-600">Practice with previous year exam papers to prepare better</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="max-w-6xl mx-auto mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
          <button onClick={() => setError("")} className="ml-2 font-bold">×</button>
        </div>
      )}

      {/* Upload Form */}
      {showUploadForm && isAuthenticated && (
        <div className="max-w-6xl mx-auto mb-8 p-6 bg-white rounded-xl shadow-md">
          <h2 className="text-lg font-semibold mb-4">Upload PYQ</h2>
          <form onSubmit={handleUploadPYQ} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., JEE Main 2023 Physics"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                <input
                  type="text"
                  value={uploadForm.subject}
                  onChange={(e) => setUploadForm({ ...uploadForm, subject: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., Physics, Mathematics"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year *</label>
                <input
                  type="number"
                   value={uploadForm.year || ""}
                   onChange={(e) => setUploadForm({ ...uploadForm, year: e.target.value ? parseInt(e.target.value) : "" })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., 2023"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Exam Type *</label>
                <input
                  type="text"
                  value={uploadForm.examType}
                  onChange={(e) => setUploadForm({ ...uploadForm, examType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., JEE Main, NEET"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PDF File *</label>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files?.[0] || null })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {uploadForm.file && (
                <p className="text-sm text-gray-600 mt-2">
                  Selected: {uploadForm.file.name} ({(uploadForm.file.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={uploading}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {uploading ? "Uploading..." : "Upload PYQ"}
            </button>
          </form>
        </div>
      )}

      {/* Search and Filters */}
      <div className="max-w-6xl mx-auto mb-8 space-y-4">
        {/* Search Bar */}
        <input
          type="text"
          placeholder="Search PYQs by title..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm
                     focus:outline-none focus:ring-2 focus:ring-indigo-500
                     placeholder-gray-400"
        />

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <select
            name="subject"
            value={filters.subject}
            onChange={handleFilterChange}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Subjects</option>
            {subjects.map((subject) => (
              <option key={subject} value={subject}>{subject}</option>
            ))}
          </select>

          <select
            name="year"
            value={filters.year}
            onChange={handleFilterChange}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Years</option>
            {years.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>

          <select
            name="examType"
            value={filters.examType}
            onChange={handleFilterChange}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Exam Types</option>
            {examTypes.map((examType) => (
              <option key={examType} value={examType}>{examType}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="max-w-6xl mx-auto text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading PYQs...</p>
        </div>
      ) : (
        <>
          {/* PYQs Grid */}
          {paginatedPYQs.length > 0 ? (
            <>
              <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-8">
                {paginatedPYQs.map((pyq) => (
                  <div
                    key={pyq.id || pyq._id}
                    className="p-5 bg-white rounded-xl shadow-md hover:shadow-lg transition relative group"
                  >
                    <div className="mb-3">
                      <h3 className="text-lg font-semibold text-gray-800 mb-1">
                        {pyq.title}
                      </h3>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded">
                          {pyq.subject}
                        </span>
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          {pyq.year}
                        </span>
                        <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                          {pyq.examType}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {pyq.extractedText || "PDF file uploaded"}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedPDF(`http://localhost:3000${pyq.fileUrl}`);
                          setViewingPYQTitle(pyq.title);
                          setPdfPageNum(1);
                          setPdfNumPages(null);
                        }}
                        className="flex-1 bg-indigo-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-indigo-700 transition"
                      >
                        View PDF
                      </button>
                      {isAuthenticated && (
                        <button
                          onClick={() => handleDeletePYQ(pyq.id || pyq._id)}
                          className="text-red-500 opacity-0 group-hover:opacity-100 transition hover:text-red-700 px-3 py-2"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="max-w-6xl mx-auto flex justify-center items-center gap-4 mb-8">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage <= 1}
                    className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg disabled:opacity-50"
                  >
                    ← Previous
                  </button>
                  <div className="flex gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-2 rounded ${
                          currentPage === page
                            ? "bg-indigo-600 text-white"
                            : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage >= totalPages}
                    className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg disabled:opacity-50"
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="max-w-6xl mx-auto text-center py-12">
              <p className="text-gray-600 mb-4">
                {searchTerm || Object.values(filters).some(f => f)
                  ? "No PYQs match your search or filters."
                  : "No PYQs available yet."}
              </p>
              {isAuthenticated && (
                <button
                  onClick={() => setShowUploadForm(true)}
                  className="text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Upload your first PYQ →
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
              <h3 className="text-lg font-semibold text-gray-800">{viewingPYQTitle}</h3>
              <button
                onClick={() => {
                  setSelectedPDF(null);
                  setPdfPageNum(1);
                  setPdfNumPages(null);
                  setViewingPYQTitle("");
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

export default PYQs;