const validator = require('validator')

/**
 * Sanitize and validate input data
 */
class ValidationUtils {
  /**
   * Sanitize text content for safe processing
   * @param {string} text - Raw text content
   * @returns {string} - Sanitized text
   */
  static sanitizeText(text) {
    if (!text || typeof text !== 'string') {
      return ''
    }

    // Remove potentially harmful characters and normalize
    let sanitized = text
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Remove iframe tags
      .trim()

    return sanitized
  }

  /**
   * Validate email addresses
   * @param {string} email - Email address to validate
   * @returns {boolean} - Whether email is valid
   */
  static isValidEmail(email) {
    return validator.isEmail(email)
  }

  /**
   * Validate multiple email addresses
   * @param {string[]} emails - Array of email addresses
   * @returns {Object} - Validation result with valid and invalid emails
   */
  static validateEmails(emails) {
    if (!Array.isArray(emails)) {
      return { valid: [], invalid: [] }
    }

    const valid = []
    const invalid = []

    emails.forEach(email => {
      const cleanEmail = email.trim().toLowerCase()
      if (this.isValidEmail(cleanEmail)) {
        valid.push(cleanEmail)
      } else {
        invalid.push(email)
      }
    })

    return { valid, invalid }
  }

  /**
   * Validate file content size
   * @param {string} content - File content
   * @param {number} maxSize - Maximum size in bytes (default: 100KB)
   * @returns {Object} - Validation result
   */
  static validateContentSize(content, maxSize = 100 * 1024) {
    if (!content || typeof content !== 'string') {
      return { valid: false, error: 'Invalid content provided' }
    }

    const size = Buffer.byteLength(content, 'utf8')

    if (size === 0) {
      return { valid: false, error: 'Content is empty' }
    }

    if (size > maxSize) {
      return { 
        valid: false, 
        error: `Content too large. Maximum ${maxSize / 1024}KB allowed, received ${(size / 1024).toFixed(1)}KB` 
      }
    }

    return { valid: true, size }
  }

  /**
   * Validate file type based on extension
   * @param {string} filename - Original filename
   * @param {string[]} allowedTypes - Array of allowed extensions
   * @returns {boolean} - Whether file type is valid
   */
  static isValidFileType(filename, allowedTypes = ['.txt', '.md', '.json', '.csv']) {
    if (!filename || typeof filename !== 'string') {
      return false
    }

    const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'))
    return allowedTypes.includes(extension)
  }

  /**
   * Validate prompt text
   * @param {string} prompt - User's prompt
   * @returns {Object} - Validation result
   */
  static validatePrompt(prompt) {
    if (!prompt || typeof prompt !== 'string') {
      return { valid: false, error: 'Prompt is required' }
    }

    const cleanPrompt = prompt.trim()

    if (cleanPrompt.length === 0) {
      return { valid: false, error: 'Prompt cannot be empty' }
    }

    if (cleanPrompt.length > 1000) {
      return { valid: false, error: 'Prompt too long. Maximum 1000 characters allowed' }
    }

    return { valid: true, prompt: cleanPrompt }
  }

  /**
   * Sanitize filename for safe storage
   * @param {string} filename - Original filename
   * @returns {string} - Sanitized filename
   */
  static sanitizeFilename(filename) {
    if (!filename || typeof filename !== 'string') {
      return 'unnamed_file'
    }

    // Remove path traversal attempts and special characters
    const sanitized = filename
      .replace(/[^\w\s.-]/g, '') // Remove special characters except spaces, dots, and hyphens
      .replace(/\.{2,}/g, '.') // Replace multiple dots with single dot
      .replace(/^\.+/, '') // Remove leading dots
      .substring(0, 100) // Limit length

    return sanitized || 'unnamed_file'
  }

  /**
   * Extract plain text from various file formats
   * @param {Buffer} buffer - File buffer
   * @param {string} mimeType - File MIME type
   * @returns {string} - Extracted text
   */
  static extractTextFromBuffer(buffer, mimeType) {
    try {
      // For now, handle text-based files
      if (mimeType.includes('text/') || 
          mimeType.includes('application/json') || 
          mimeType.includes('application/csv')) {
        return buffer.toString('utf8')
      }

      // Default to text extraction
      return buffer.toString('utf8')
    } catch (error) {
      throw new Error('Failed to extract text from file')
    }
  }

  /**
   * Clean and format summary text
   * @param {string} summary - Raw summary text
   * @returns {string} - Cleaned summary
   */
  static cleanSummary(summary) {
    if (!summary || typeof summary !== 'string') {
      return ''
    }

    return summary
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\n{3,}/g, '\n\n') // Limit consecutive newlines
      .trim()
  }

  /**
   * Validate file upload
   * @param {Object} file - Multer file object
   * @returns {Object} - Validation result
   */
  static validateFileUpload(file) {
    const errors = []

    if (!file) {
      errors.push('No file provided')
      return { valid: false, errors }
    }

    if (!file.originalname || !file.mimetype || !file.size) {
      errors.push('Invalid file object')
      return { valid: false, errors }
    }

    if (file.size === 0) {
      errors.push('File is empty')
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      errors.push('File size exceeds 10MB limit')
    }

    return { valid: errors.length === 0, errors }
  }

  /**
   * Validate session ID format
   * @param {string} sessionId - Session identifier
   * @returns {boolean} - Whether session ID is valid
   */
  static isValidSessionId(sessionId) {
    if (!sessionId || typeof sessionId !== 'string') {
      return false
    }

    // Allow alphanumeric, hyphens, and underscores only
    return /^[a-zA-Z0-9_-]+$/.test(sessionId) && sessionId.length <= 100
  }
}

module.exports = ValidationUtils