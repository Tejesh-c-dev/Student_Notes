/**
 * PDF Extract Utility
 * Extracts plain text from PDF files using pdf-parse
 */

const pdfParse = require('pdf-parse');

/**
 * Extract text from PDF buffer
 * @param {Buffer} fileBuffer - The PDF file buffer
 * @returns {Promise<string>} - Extracted text or empty string on error
 */
const extractTextFromPDF = async (fileBuffer) => {
  try {
    const data = await pdfParse(fileBuffer);
    return data.text || '';
  } catch (error) {
    console.error('PDF extraction error:', error.message);
    return '';
  }
};

module.exports = { extractTextFromPDF };
