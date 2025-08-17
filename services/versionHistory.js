const SecurityMiddleware = require('../middleware/security')

class VersionHistoryService {
  constructor() {
    this.versions = new Map() // In-memory storage, use database in production
  }

  /**
   * Save a new version of content
   * @param {string} documentId - Unique identifier for the document
   * @param {string} content - The content to save
   * @param {string} userId - User identifier
   * @param {string} action - Action that triggered the save (edit, auto-save, import, etc.)
   * @param {object} metadata - Additional metadata
   * @returns {object} The saved version
   */
  saveVersion(documentId, content, userId, action = 'edit', metadata = {}) {
    if (!documentId || !content) {
      throw new Error('Document ID and content are required')
    }

    // Sanitize content
    const sanitizedContent = SecurityMiddleware.sanitizeInput(content)
    
    const version = {
      id: Date.now().toString(),
      documentId,
      content: sanitizedContent,
      userId: SecurityMiddleware.sanitizeInput(userId || 'anonymous'),
      action: SecurityMiddleware.sanitizeInput(action),
      timestamp: new Date(),
      metadata: {
        ...metadata,
        wordCount: sanitizedContent.split(/\s+/).filter(word => word.length > 0).length,
        characterCount: sanitizedContent.length,
        lineCount: sanitizedContent.split('\n').length
      }
    }

    // Initialize versions array for document if it doesn't exist
    if (!this.versions.has(documentId)) {
      this.versions.set(documentId, [])
    }

    // Add new version
    const documentVersions = this.versions.get(documentId)
    documentVersions.push(version)

    // Keep only last 50 versions per document to prevent memory issues
    if (documentVersions.length > 50) {
      documentVersions.shift()
    }

    return version
  }

  /**
   * Get all versions for a document
   * @param {string} documentId - Document identifier
   * @returns {Array} Array of versions
   */
  getVersions(documentId) {
    if (!documentId) {
      throw new Error('Document ID is required')
    }

    const versions = this.versions.get(documentId) || []
    return versions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  }

  /**
   * Get a specific version
   * @param {string} documentId - Document identifier
   * @param {string} versionId - Version identifier
   * @returns {object} The version or null if not found
   */
  getVersion(documentId, versionId) {
    if (!documentId || !versionId) {
      throw new Error('Document ID and version ID are required')
    }

    const versions = this.versions.get(documentId) || []
    return versions.find(v => v.id === versionId) || null
  }

  /**
   * Get the latest version
   * @param {string} documentId - Document identifier
   * @returns {object} The latest version or null if no versions exist
   */
  getLatestVersion(documentId) {
    if (!documentId) {
      throw new Error('Document ID is required')
    }

    const versions = this.getVersions(documentId)
    return versions[0] || null
  }

  /**
   * Compare two versions
   * @param {string} documentId - Document identifier
   * @param {string} versionId1 - First version ID
   * @param {string} versionId2 - Second version ID
   * @returns {object} Comparison result with diff information
   */
  compareVersions(documentId, versionId1, versionId2) {
    if (!documentId || !versionId1 || !versionId2) {
      throw new Error('Document ID and both version IDs are required')
    }

    const versions = this.versions.get(documentId) || []
    const v1 = versions.find(v => v.id === versionId1)
    const v2 = versions.find(v => v.id === versionId2)

    if (!v1 || !v2) {
      throw new Error('One or both versions not found')
    }

    // Simple diff calculation (in production, use a proper diff library)
    const lines1 = v1.content.split('\n')
    const lines2 = v2.content.split('\n')
    
    const added = lines2.filter(line => !lines1.includes(line))
    const removed = lines1.filter(line => !lines2.includes(line))

    return {
      version1: v1,
      version2: v2,
      differences: {
        added,
        removed,
        addedCount: added.length,
        removedCount: removed.length,
        totalChanges: added.length + removed.length
      }
    }
  }

  /**
   * Restore a previous version
   * @param {string} documentId - Document identifier
   * @param {string} versionId - Version ID to restore
   * @param {string} userId - User performing the restore
   * @returns {object} The restored version
   */
  restoreVersion(documentId, versionId, userId) {
    if (!documentId || !versionId) {
      throw new Error('Document ID and version ID are required')
    }

    const version = this.getVersion(documentId, versionId)
    if (!version) {
      throw new Error('Version not found')
    }

    // Create a new version with restored content
    const restoredVersion = this.saveVersion(
      documentId,
      version.content,
      userId,
      'restore',
      {
        restoredFrom: versionId,
        originalTimestamp: version.timestamp
      }
    )

    return restoredVersion
  }

  /**
   * Get version statistics
   * @param {string} documentId - Document identifier
   * @returns {object} Statistics about the document's versions
   */
  getVersionStats(documentId) {
    if (!documentId) {
      throw new Error('Document ID is required')
    }

    const versions = this.getVersions(documentId)
    if (versions.length === 0) {
      return {
        totalVersions: 0,
        firstVersion: null,
        lastVersion: null,
        averageWordCount: 0,
        totalEdits: 0
      }
    }

    const totalWords = versions.reduce((sum, v) => sum + v.metadata.wordCount, 0)
    const editActions = versions.filter(v => v.action === 'edit').length

    return {
      totalVersions: versions.length,
      firstVersion: versions[versions.length - 1],
      lastVersion: versions[0],
      averageWordCount: Math.round(totalWords / versions.length),
      totalEdits: editActions,
      timeline: versions.map(v => ({
        timestamp: v.timestamp,
        action: v.action,
        wordCount: v.metadata.wordCount
      }))
    }
  }

  /**
   * Clean up old versions (keep only last N versions)
   * @param {string} documentId - Document identifier
   * @param {number} keepCount - Number of recent versions to keep
   */
  cleanupOldVersions(documentId, keepCount = 10) {
    if (!documentId) {
      throw new Error('Document ID is required')
    }

    const versions = this.versions.get(documentId)
    if (!versions || versions.length <= keepCount) {
      return
    }

    // Keep only the last N versions
    const recentVersions = versions.slice(-keepCount)
    this.versions.set(documentId, recentVersions)
  }

  /**
   * Export version history
   * @param {string} documentId - Document identifier
   * @returns {object} Exportable version history
   */
  exportVersionHistory(documentId) {
    if (!documentId) {
      throw new Error('Document ID is required')
    }

    const versions = this.getVersions(documentId)
    return {
      documentId,
      exportedAt: new Date(),
      totalVersions: versions.length,
      versions: versions.map(v => ({
        id: v.id,
        timestamp: v.timestamp,
        userId: v.userId,
        action: v.action,
        metadata: v.metadata
      }))
    }
  }
}

module.exports = new VersionHistoryService()