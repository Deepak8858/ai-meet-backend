const fs = require('fs').promises
const path = require('path')
const { v4: uuidv4 } = require('uuid')
const SecurityMiddleware = require('../middleware/security')

class ExportService {
  constructor() {
    this.tempDir = path.join(__dirname, '../temp')
    this.ensureTempDir()
  }

  async ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true })
    } catch (error) {
      console.error('Error creating temp directory:', error)
    }
  }

  /**
   * Generate a unique filename
   * @param {string} extension - File extension
   * @returns {string} Unique filename
   */
  generateFilename(extension) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    return `export-${timestamp}.${extension}`
  }

  /**
   * Export content as PDF
   * @param {string} content - Content to export
   * @param {object} options - Export options
   * @returns {object} Export result with filename and content
   */
  async exportToPDF(content, options = {}) {
    try {
      const sanitizedContent = SecurityMiddleware.sanitizeInput(content)
      const filename = this.generateFilename('pdf')
      const filePath = path.join(this.tempDir, filename)

      // Simple PDF generation (in production, use a proper PDF library like puppeteer or pdfkit)
      const pdfContent = this.createSimplePDF(sanitizedContent, options)
      
      await fs.writeFile(filePath, pdfContent)

      return {
        filename,
        filePath,
        contentType: 'application/pdf',
        size: Buffer.byteLength(pdfContent)
      }
    } catch (error) {
      console.error('Error exporting to PDF:', error)
      throw new Error('Failed to export to PDF')
    }
  }

  /**
   * Export content as DOCX
   * @param {string} content - Content to export
   * @param {object} options - Export options
   * @returns {object} Export result with filename and content
   */
  async exportToDOCX(content, options = {}) {
    try {
      const sanitizedContent = SecurityMiddleware.sanitizeInput(content)
      const filename = this.generateFilename('docx')
      const filePath = path.join(this.tempDir, filename)

      // Simple DOCX generation (in production, use a proper library like docx)
      const docxContent = this.createSimpleDOCX(sanitizedContent, options)
      
      await fs.writeFile(filePath, docxContent)

      return {
        filename,
        filePath,
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: Buffer.byteLength(docxContent)
      }
    } catch (error) {
      console.error('Error exporting to DOCX:', error)
      throw new Error('Failed to export to DOCX')
    }
  }

  /**
   * Export content as Markdown
   * @param {string} content - Content to export
   * @param {object} options - Export options
   * @returns {object} Export result with filename and content
   */
  async exportToMarkdown(content, options = {}) {
    try {
      const sanitizedContent = SecurityMiddleware.sanitizeInput(content)
      const filename = this.generateFilename('md')
      const filePath = path.join(this.tempDir, filename)

      let markdownContent = sanitizedContent

      // Add frontmatter if requested
      if (options.includeFrontmatter) {
        const frontmatter = this.createFrontmatter(options)
        markdownContent = `${frontmatter}\n\n${sanitizedContent}`
      }

      // Add metadata footer
      if (options.includeMetadata) {
        const metadata = this.createMetadataFooter(options)
        markdownContent += `\n\n${metadata}`
      }

      await fs.writeFile(filePath, markdownContent)

      return {
        filename,
        filePath,
        contentType: 'text/markdown',
        content: markdownContent,
        size: Buffer.byteLength(markdownContent)
      }
    } catch (error) {
      console.error('Error exporting to Markdown:', error)
      throw new Error('Failed to export to Markdown')
    }
  }

  /**
   * Export content as plain text
   * @param {string} content - Content to export
   * @param {object} options - Export options
   * @returns {object} Export result with filename and content
   */
  async exportToText(content, options = {}) {
    try {
      const sanitizedContent = SecurityMiddleware.sanitizeInput(content)
      const filename = this.generateFilename('txt')
      const filePath = path.join(this.tempDir, filename)

      let textContent = sanitizedContent

      // Add metadata header
      if (options.includeMetadata) {
        const header = this.createTextHeader(options)
        textContent = `${header}\n\n${sanitizedContent}`
      }

      await fs.writeFile(filePath, textContent)

      return {
        filename,
        filePath,
        contentType: 'text/plain',
        content: textContent,
        size: Buffer.byteLength(textContent)
      }
    } catch (error) {
      console.error('Error exporting to text:', error)
      throw new Error('Failed to export to text')
    }
  }

  /**
   * Create simple PDF content (simplified text-based approach)
   * @param {string} content - Content to convert
   * @param {object} options - PDF options
   * @returns {Buffer} PDF content
   */
  createSimplePDF(content, options = {}) {
    const title = options.title || 'Exported Document'
    const author = options.author || 'Meet with AI'
    
    // Simple text-based PDF generation - using plain text as fallback
    const textContent = `${title}

${content}`
    
    return Buffer.from(textContent)
  }

  /**
   * Create simple DOCX content (placeholder implementation)
   * @param {string} content - Content to convert
   * @param {object} options - DOCX options
   * @returns {Buffer} DOCX content
   */
  createSimpleDOCX(content, options = {}) {
    const title = options.title || 'Exported Document'
    
    // This is a very basic DOCX structure
    // In production, use a proper library like docx
    const docxContent = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r>
        <w:t>${title}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>${content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</w:t>
      </w:r>
    </w:p>
  </w:body>
</w:document>`

    return Buffer.from(docxContent)
  }

  /**
   * Create YAML frontmatter for Markdown
   * @param {object} options - Frontmatter options
   * @returns {string} Frontmatter content
   */
  createFrontmatter(options = {}) {
    const frontmatter = {
      title: options.title || 'Exported Document',
      date: new Date().toISOString(),
      author: options.author || 'Meet with AI',
      tags: options.tags || [],
      category: options.category || 'export'
    }

    const yaml = Object.entries(frontmatter)
      .map(([key, value]) => `${key}: ${Array.isArray(value) ? JSON.stringify(value) : value}`)
      .join('\n')

    return `---\n${yaml}\n---`
  }

  /**
   * Create metadata footer for Markdown
   * @param {object} options - Metadata options
   * @returns {string} Metadata footer
   */
  createMetadataFooter(options = {}) {
    return `---
*Exported from Meet with AI*
*Date: ${new Date().toLocaleDateString()}*
*Time: ${new Date().toLocaleTimeString()}*`
  }

  /**
   * Create text header
   * @param {object} options - Header options
   * @returns {string} Text header
   */
  createTextHeader(options = {}) {
    return `Title: ${options.title || 'Exported Document'}
Date: ${new Date().toLocaleDateString()}
Time: ${new Date().toLocaleTimeString()}
Author: ${options.author || 'Meet with AI'}

---`
  }

  /**
   * Clean up temporary files
   * @param {string} filePath - Path to file to delete
   */
  async cleanup(filePath) {
    try {
      await fs.unlink(filePath)
    } catch (error) {
      console.error('Error cleaning up file:', error)
    }
  }

  /**
   * Get supported export formats
   * @returns {Array} List of supported formats
   */
  getSupportedFormats() {
    return [
      {
        format: 'pdf',
        name: 'PDF',
        extension: '.pdf',
        mimeType: 'application/pdf',
        description: 'Portable Document Format'
      },
      {
        format: 'docx',
        name: 'Word Document',
        extension: '.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        description: 'Microsoft Word document'
      },
      {
        format: 'markdown',
        name: 'Markdown',
        extension: '.md',
        mimeType: 'text/markdown',
        description: 'Markdown formatted text'
      },
      {
        format: 'txt',
        name: 'Plain Text',
        extension: '.txt',
        mimeType: 'text/plain',
        description: 'Plain text file'
      }
    ]
  }
}

module.exports = new ExportService()