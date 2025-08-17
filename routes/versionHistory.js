const express = require('express')
const router = express.Router()
const VersionHistoryService = require('../services/versionHistory')
const SecurityMiddleware = require('../middleware/security')

// GET all versions for a document
router.get('/documents/:documentId/versions', async (req, res) => {
  try {
    const { documentId } = req.params
    const { limit = 50, offset = 0 } = req.query

    if (!documentId) {
      return res.status(400).json({
        success: false,
        error: 'Document ID is required'
      })
    }

    const versions = VersionHistoryService.getVersions(documentId)
    
    // Apply pagination
    const startIndex = parseInt(offset)
    const endIndex = startIndex + parseInt(limit)
    const paginatedVersions = versions.slice(startIndex, endIndex)

    res.json({
      success: true,
      versions: paginatedVersions,
      total: versions.length,
      hasMore: endIndex < versions.length
    })
  } catch (error) {
    console.error('Error fetching versions:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch versions'
    })
  }
})

// GET specific version
router.get('/documents/:documentId/versions/:versionId', async (req, res) => {
  try {
    const { documentId, versionId } = req.params

    if (!documentId || !versionId) {
      return res.status(400).json({
        success: false,
        error: 'Document ID and version ID are required'
      })
    }

    const version = VersionHistoryService.getVersion(documentId, versionId)

    if (!version) {
      return res.status(404).json({
        success: false,
        error: 'Version not found'
      })
    }

    res.json({
      success: true,
      version
    })
  } catch (error) {
    console.error('Error fetching version:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch version'
    })
  }
})

// POST save new version
router.post('/documents/:documentId/versions', async (req, res) => {
  try {
    const { documentId } = req.params
    const { content, userId, action, metadata } = req.body

    if (!documentId || !content) {
      return res.status(400).json({
        success: false,
        error: 'Document ID and content are required'
      })
    }

    const version = VersionHistoryService.saveVersion(
      documentId,
      content,
      userId,
      action,
      metadata
    )

    res.status(201).json({
      success: true,
      version
    })
  } catch (error) {
    console.error('Error saving version:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to save version'
    })
  }
})

// POST restore version
router.post('/documents/:documentId/versions/:versionId/restore', async (req, res) => {
  try {
    const { documentId, versionId } = req.params
    const { userId } = req.body

    if (!documentId || !versionId) {
      return res.status(400).json({
        success: false,
        error: 'Document ID and version ID are required'
      })
    }

    const restoredVersion = VersionHistoryService.restoreVersion(
      documentId,
      versionId,
      userId
    )

    res.json({
      success: true,
      version: restoredVersion
    })
  } catch (error) {
    console.error('Error restoring version:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to restore version'
    })
  }
})

// GET compare two versions
router.get('/documents/:documentId/versions/:versionId1/compare/:versionId2', async (req, res) => {
  try {
    const { documentId, versionId1, versionId2 } = req.params

    if (!documentId || !versionId1 || !versionId2) {
      return res.status(400).json({
        success: false,
        error: 'Document ID and both version IDs are required'
      })
    }

    const comparison = VersionHistoryService.compareVersions(
      documentId,
      versionId1,
      versionId2
    )

    res.json({
      success: true,
      comparison
    })
  } catch (error) {
    console.error('Error comparing versions:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to compare versions'
    })
  }
})

// GET version statistics
router.get('/documents/:documentId/stats', async (req, res) => {
  try {
    const { documentId } = req.params

    if (!documentId) {
      return res.status(400).json({
        success: false,
        error: 'Document ID is required'
      })
    }

    const stats = VersionHistoryService.getVersionStats(documentId)

    res.json({
      success: true,
      stats
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch version statistics'
    })
  }
})

// GET export version history
router.get('/documents/:documentId/export', async (req, res) => {
  try {
    const { documentId } = req.params

    if (!documentId) {
      return res.status(400).json({
        success: false,
        error: 'Document ID is required'
      })
    }

    const exportData = VersionHistoryService.exportVersionHistory(documentId)

    res.setHeader('Content-Disposition', `attachment; filename="version-history-${documentId}.json"`)
    res.setHeader('Content-Type', 'application/json')
    res.json(exportData)
  } catch (error) {
    console.error('Error exporting version history:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to export version history'
    })
  }
})

// DELETE cleanup old versions
router.delete('/documents/:documentId/versions/cleanup', async (req, res) => {
  try {
    const { documentId } = req.params
    const { keepCount = 10 } = req.query

    if (!documentId) {
      return res.status(400).json({
        success: false,
        error: 'Document ID is required'
      })
    }

    VersionHistoryService.cleanupOldVersions(documentId, parseInt(keepCount))

    res.json({
      success: true,
      message: 'Old versions cleaned up successfully'
    })
  } catch (error) {
    console.error('Error cleaning up versions:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to clean up old versions'
    })
  }
})

module.exports = router