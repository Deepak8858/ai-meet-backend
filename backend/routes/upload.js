const express = require('express')
const multer = require('multer')
const router = express.Router()

// Configure multer for file uploads
const storage = multer.memoryStorage()
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'text/plain',
      'text/markdown',
      'application/json',
      'text/csv'
    ]
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type. Only .txt, .md, .json, and .csv files are allowed.'))
    }
  }
})

// File upload endpoint
router.post('/', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    const fileContent = req.file.buffer.toString('utf-8')
    const fileName = req.file.originalname
    const fileSize = req.file.size

    // Validate file content
    if (!fileContent.trim()) {
      return res.status(400).json({ error: 'File is empty' })
    }

    if (fileContent.length > 100000) { // 100KB limit for content processing
      return res.status(400).json({ error: 'File content too large. Maximum 100KB of text.' })
    }

    res.json({
      success: true,
      fileName,
      fileSize,
      content: fileContent,
      message: 'File uploaded successfully'
    })

  } catch (error) {
    console.error('Upload error:', error)
    res.status(500).json({ error: 'Failed to process uploaded file' })
  }
})

// Alternative endpoint for direct text upload
router.post('/text', (req, res) => {
  try {
    const { content } = req.body

    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'No content provided' })
    }

    if (!content.trim()) {
      return res.status(400).json({ error: 'Content is empty' })
    }

    if (content.length > 100000) {
      return res.status(400).json({ error: 'Content too large. Maximum 100KB of text.' })
    }

    res.json({
      success: true,
      content: content.trim(),
      message: 'Content received successfully'
    })

  } catch (error) {
    console.error('Text upload error:', error)
    res.status(500).json({ error: 'Failed to process content' })
  }
})

module.exports = router