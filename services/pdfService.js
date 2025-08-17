const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

class PdfService {
  constructor() {
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
    this.allowedMimeTypes = ['application/pdf'];
  }

  /**
   * Validate PDF file
   * @param {Object} file - Multer file object
   * @returns {Object} - Validation result
   */
  validatePdfFile(file) {
    const errors = [];

    if (!file) {
      errors.push('No file provided');
      return { valid: false, errors };
    }

    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      errors.push('Invalid file type. Only PDF files are allowed');
    }

    if (file.size > this.maxFileSize) {
      errors.push('File size exceeds 10MB limit');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Extract text from PDF file
   * @param {string} filePath - Path to the PDF file
   * @returns {Promise<Object>} - Extracted text and metadata
   */
  async extractTextFromPdf(filePath) {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdf(dataBuffer);

      return {
        success: true,
        text: data.text,
        metadata: {
          title: data.info.Title || 'Unknown',
          author: data.info.Author || 'Unknown',
          subject: data.info.Subject || '',
          keywords: data.info.Keywords || '',
          creationDate: data.info.CreationDate || null,
          modificationDate: data.info.ModDate || null,
          creator: data.info.Creator || '',
          producer: data.info.Producer || '',
          pages: data.numpages,
          version: data.version
        },
        pageText: this.splitTextByPages(data.text, data.numpages)
      };
    } catch (error) {
      console.error('Error extracting text from PDF:', error);
      return {
        success: false,
        error: error.message,
        text: null,
        metadata: null,
        pageText: null
      };
    }
  }

  /**
   * Split extracted text by pages (approximate)
   * @param {string} fullText - Full extracted text
   * @param {number} pageCount - Total number of pages
   * @returns {Array} - Array of page texts
   */
  splitTextByPages(fullText, pageCount) {
    if (pageCount <= 1) {
      return [fullText];
    }

    // Split text into roughly equal parts based on page count
    const words = fullText.split(/\s+/);
    const wordsPerPage = Math.ceil(words.length / pageCount);
    const pages = [];

    for (let i = 0; i < pageCount; i++) {
      const start = i * wordsPerPage;
      const end = Math.min((i + 1) * wordsPerPage, words.length);
      const pageText = words.slice(start, end).join(' ');
      pages.push(pageText);
    }

    return pages;
  }

  /**
   * Clean and format extracted text for better readability
   * @param {string} text - Raw extracted text
   * @returns {string} - Cleaned and formatted text
   */
  cleanAndFormatText(text) {
    if (!text) return '';

    // Remove excessive whitespace
    text = text.replace(/\s+/g, ' ').trim();

    // Fix common PDF text issues
    text = text
      .replace(/\f/g, '') // Remove form feeds
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\n{3,}/g, '\n\n') // Limit consecutive newlines
      .replace(/ +/g, ' ') // Remove multiple spaces
      .replace(/([.!?])\s*\n/g, '$1\n\n') // Ensure proper paragraph breaks
      .replace(/([a-z])([A-Z])/g, '$1 $2') // Fix missing spaces between sentences
      .replace(/([a-z])\.([A-Z])/g, '$1. $2'); // Fix missing spaces after periods

    // Remove page numbers (common patterns)
    text = text.replace(/\n\s*\d+\s*\n/g, '\n\n');
    text = text.replace(/^\d+\s*$/gm, '');

    return text.trim();
  }

  /**
   * Convert PDF to transcript format
   * @param {string} filePath - Path to the PDF file
   * @param {Object} options - Conversion options
   * @returns {Promise<Object>} - Transcript data
   */
  async convertPdfToTranscript(filePath, options = {}) {
    const {
      includeMetadata = true,
      cleanText = true,
      includePageNumbers = true,
      speakerLabels = null
    } = options;

    try {
      const extraction = await this.extractTextFromPdf(filePath);
      
      if (!extraction.success) {
        return extraction;
      }

      let transcriptText = extraction.text;
      if (cleanText) {
        transcriptText = this.cleanAndFormatText(transcriptText);
      }

      // Create transcript object
      const transcript = {
        success: true,
        transcript: transcriptText,
        originalFile: path.basename(filePath),
        processingDate: new Date().toISOString(),
        metadata: includeMetadata ? extraction.metadata : null,
        pageCount: extraction.metadata?.pages || 1,
        wordCount: transcriptText.split(/\s+/).length,
        characterCount: transcriptText.length,
        pages: includePageNumbers ? extraction.pageText : null
      };

      // Add speaker labels if provided
      if (speakerLabels && Array.isArray(speakerLabels)) {
        transcript.speakers = speakerLabels;
        transcript.transcript = this.addSpeakerLabels(transcriptText, speakerLabels);
      }

      return transcript;
    } catch (error) {
      console.error('Error converting PDF to transcript:', error);
      return {
        success: false,
        error: error.message,
        transcript: null
      };
    }
  }

  /**
   * Add speaker labels to transcript text
   * @param {string} text - Transcript text
   * @param {Array} speakers - Array of speaker names
   * @returns {string} - Text with speaker labels
   */
  addSpeakerLabels(text, speakers) {
    if (!speakers || speakers.length === 0) return text;

    const paragraphs = text.split('\n\n').filter(p => p.trim());
    const speakerCount = speakers.length;
    let currentSpeaker = 0;

    return paragraphs.map(paragraph => {
      const speaker = speakers[currentSpeaker % speakerCount];
      currentSpeaker++;
      return `${speaker}: ${paragraph.trim()}`;
    }).join('\n\n');
  }

  /**
   * Save transcript to file
   * @param {Object} transcript - Transcript data
   * @param {string} outputPath - Path to save the transcript
   * @returns {Object} - Save result
   */
  saveTranscriptToFile(transcript, outputPath) {
    try {
      const transcriptContent = this.formatTranscriptForFile(transcript);
      fs.writeFileSync(outputPath, transcriptContent, 'utf8');
      
      return {
        success: true,
        filePath: outputPath,
        size: fs.statSync(outputPath).size
      };
    } catch (error) {
      console.error('Error saving transcript:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Format transcript for file output
   * @param {Object} transcript - Transcript data
   * @returns {string} - Formatted transcript content
   */
  formatTranscriptForFile(transcript) {
    let content = '';

    // Header
    content += `=== MEETING TRANSCRIPT ===\n`;
    content += `Original File: ${transcript.originalFile}\n`;
    content += `Processed: ${transcript.processingDate}\n`;
    content += `Pages: ${transcript.pageCount}\n`;
    content += `Words: ${transcript.wordCount}\n`;
    content += `Characters: ${transcript.characterCount}\n\n`;

    // Metadata
    if (transcript.metadata) {
      content += `=== DOCUMENT METADATA ===\n`;
      content += `Title: ${transcript.metadata.title}\n`;
      content += `Author: ${transcript.metadata.author}\n`;
      if (transcript.metadata.subject) content += `Subject: ${transcript.metadata.subject}\n`;
      if (transcript.metadata.creationDate) content += `Created: ${transcript.metadata.creationDate}\n`;
      if (transcript.metadata.modificationDate) content += `Modified: ${transcript.metadata.modificationDate}\n`;
      content += '\n';
    }

    // Transcript
    content += `=== TRANSCRIPT ===\n\n`;
    content += transcript.transcript;

    return content;
  }

  /**
   * Get supported file types
   * @returns {Array} - Array of supported file types
   */
  getSupportedFileTypes() {
    return this.allowedMimeTypes;
  }

  /**
   * Get maximum file size
   * @returns {number} - Maximum file size in bytes
   */
  getMaxFileSize() {
    return this.maxFileSize;
  }
}

module.exports = PdfService;