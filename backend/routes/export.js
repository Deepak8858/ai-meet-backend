const express = require('express')
const router = express.Router()
const ExportService = require('../services/exportService')
const SecurityMiddleware = require('../middleware/security')

// GET supported export formats
router.get('/export/formats', (req, res) => {
  try {
    const formats = ExportService.getSupportedFormats()
    res.json({
      success: true,
      formats
    })
  } catch (error) {
    console.error('Error fetching export formats:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch export formats'
    })
  }
})

// POST export content
router.post('/export', async (req, res) => {
  try {
    const { content, format, options = {} } = req.body

    if (!content || !format) {
      return res.status(400).json({
        success: false,
        error: 'Content and format are required'
      })
    }

    const supportedFormats = ExportService.getSupportedFormats()
    const formatConfig = supportedFormats.find(f => f.format === format)

    if (!formatConfig) {
      return res.status(400).json({
        success: false,
        error: 'Unsupported export format'
      })
    }

    let exportResult

    switch (format) {
      case 'pdf':
        exportResult = await ExportService.exportToPDF(content, options)
        break
      case 'docx':
        exportResult = await ExportService.exportToDOCX(content, options)
        break
      case 'markdown':
        exportResult = await ExportService.exportToMarkdown(content, options)
        break
      case 'txt':
        exportResult = await ExportService.exportToText(content, options)
        break
      default:
        return res.status(400).json({
          success: false,
          error: 'Unsupported export format'
        })
    }

    // Send file for download
    res.setHeader('Content-Disposition', `attachment; filename="${exportResult.filename}"`)
    res.setHeader('Content-Type', exportResult.contentType)
    
    const fileContent = await require('fs').promises.readFile(exportResult.filePath)
    res.send(fileContent)

    // Clean up temporary file
    await ExportService.cleanup(exportResult.filePath)

  } catch (error) {
    console.error('Error exporting content:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to export content'
    })
  }
})

// POST export with preview
router.post('/export/preview', async (req, res) => {
  try {
    const { content, format, options = {} } = req.body

    if (!content || !format) {
      return res.status(400).json({
        success: false,
        error: 'Content and format are required'
      })
    }

    const supportedFormats = ExportService.getSupportedFormats()
    const formatConfig = supportedFormats.find(f => f.format === format)

    if (!formatConfig) {
      return res.status(400).json({
        success: false,
        error: 'Unsupported export format'
      })
    }

    let exportResult

    switch (format) {
      case 'markdown':
        exportResult = await ExportService.exportToMarkdown(content, options)
        break
      case 'txt':
        exportResult = await ExportService.exportToText(content, options)
        break
      default:
        // For binary formats like PDF/DOCX, return metadata only
        exportResult = {
          format: formatConfig,
          content: 'Binary content - use /export endpoint for download',
          metadata: {
            title: options.title || 'Exported Document',
            author: options.author || 'Meet with AI',
            createdAt: new Date().toISOString()
          }
        }
        break
    }

    res.json({
      success: true,
      preview: exportResult
    })

  } catch (error) {
    console.error('Error generating export preview:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to generate export preview'
    })
  }
})

// GET export status
router.get('/export/status/:format', (req, res) => {
  try {
    const { format } = req.params
    const supportedFormats = ExportService.getSupportedFormats()
    const formatConfig = supportedFormats.find(f => f.format === format)

    if (!formatConfig) {
      return res.status(400).json({
        success: false,
        error: 'Unsupported export format'
      })
    }

    res.json({
      success: true,
      format: formatConfig,
      status: 'ready',
      maxContentLength: 1000000 // 1MB limit
    })
  } catch (error) {
    console.error('Error checking export status:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to check export status'
    })
  }
})

module.exports = router