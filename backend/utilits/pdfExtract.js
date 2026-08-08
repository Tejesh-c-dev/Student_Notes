/**
 * PDF Extract Utility
 * Extracts plain text from PDF files using pdf-parse
 */

const fs = require('fs/promises');
const pdfParse = require('pdf-parse');

/**
 * Extract text from a PDF.
 * Accepts either a Buffer or a file path (multer diskStorage provides file.path).
 * @param {Buffer|string} filePathOrBuffer - The PDF buffer or path on disk
 * @returns {Promise<string>} - Extracted text or empty string on error
 */
const extractTextFromPDF = async (filePathOrBuffer) => {
  try {
    const fileBuffer = Buffer.isBuffer(filePathOrBuffer)
      ? filePathOrBuffer
      : await fs.readFile(filePathOrBuffer);
    const data = await pdfParse(fileBuffer);
    return data.text || '';
  } catch (error) {
    console.error('PDF extraction error:', error.message);
    return '';
  }
};

module.exports = { extractTextFromPDF };
