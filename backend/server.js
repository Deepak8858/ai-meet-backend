const express = require('express')
const cors = require('cors')
const multer = require('multer')
require('dotenv').config()

const SecurityMiddleware = require('./middleware/security')
const aiService = require('./services/aiService')
const emailService = require('./services/emailService')
const uploadRoutes = require('./routes/upload')
const summarizeRoutes = require('./routes/summarize')
const shareRoutes = require('./routes/share')
const pdfRoutes = require('./routes/pdf')
const templatesRoutes = require('./routes/templates')
const versionHistoryRoutes = require('./routes/versionHistory')
const exportRoutes = require('./routes/export')

const app = express()
const PORT = process.env.PORT || 5000

// Security middleware
app.use(SecurityMiddleware.configureHelmet())
app.use(SecurityMiddleware.createSecurityHeaders())
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}))

// Rate limiting
const { generalLimiter, uploadLimiter, apiLimiter } = SecurityMiddleware.createRateLimiters()
app.use('/api/', generalLimiter)
app.use('/api/upload', uploadLimiter)
app.use('/api/summarize', apiLimiter)
app.use('/api/pdf', apiLimiter)

// Body parsing middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// File upload configuration
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

// Routes
app.use('/api/upload', uploadRoutes)
app.use('/api/summarize', summarizeRoutes)
app.use('/api/share', shareRoutes)
app.use('/api/pdf', pdfRoutes)
app.use('/api/templates', templatesRoutes)
app.use('/api/version-history', versionHistoryRoutes)
app.use('/api/export', exportRoutes)

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error)
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' })
    }
  }
  
  if (error.message && error.message.includes('Invalid file type')) {
    return res.status(400).json({ error: error.message })
  }
  
  res.status(500).json({ 
    error: 'An unexpected error occurred. Please try again.',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' })
})

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`)
})

module.exports = app