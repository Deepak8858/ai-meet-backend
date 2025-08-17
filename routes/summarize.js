const express = require('express')
const aiService = require('../services/aiService')
const router = express.Router()

// POST /api/summarize
router.post('/', async (req, res) => {
  try {
    const { content, prompt } = req.body

    // Validation
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'Content is required and must be a string' })
    }

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required and must be a string' })
    }

    if (content.trim().length === 0) {
      return res.status(400).json({ error: 'Content cannot be empty' })
    }

    if (content.length > 100000) {
      return res.status(400).json({ error: 'Content too large. Maximum 100KB of text.' })
    }

    if (prompt.trim().length === 0) {
      return res.status(400).json({ error: 'Prompt cannot be empty' })
    }

    // Log request for debugging
    console.log('Summarization request received:', {
      contentLength: content.length,
      promptLength: prompt.length,
      timestamp: new Date().toISOString()
    })

    // Generate summary using AI service
    const summary = await aiService.summarizeText(content, prompt)

    if (!summary || summary.trim().length === 0) {
      return res.status(500).json({ error: 'Failed to generate summary' })
    }

    // Log successful response
    console.log('Summary generated successfully:', {
      summaryLength: summary.length,
      timestamp: new Date().toISOString()
    })

    res.json({
      success: true,
      summary: summary.trim(),
      metadata: {
        originalLength: content.length,
        summaryLength: summary.length,
        compressionRatio: (summary.length / content.length * 100).toFixed(1) + '%',
        generatedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Summarization error:', error)
    
    // Handle specific AI service errors
    if (error.message.includes('API key')) {
      return res.status(500).json({ error: 'AI service not properly configured' })
    }
    
    if (error.message.includes('rate limit')) {
      return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' })
    }
    
    if (error.message.includes('network') || error.message.includes('timeout')) {
      return res.status(503).json({ error: 'AI service temporarily unavailable' })
    }

    res.status(500).json({ 
      error: 'Failed to generate summary',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// GET /api/summarize/test - Test endpoint
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Summarization service is running',
    timestamp: new Date().toISOString(),
    providers: {
      groq: !!process.env.GROQ_API_KEY,
      gemini: !!process.env.GEMINI_API_KEY
    }
  })
})

// POST /api/summarize/sample - Generate sample summary for testing
router.post('/sample', async (req, res) => {
  try {
    const sampleContent = `
Meeting: Weekly Team Sync
Date: 2024-01-15
Attendees: John Smith (PM), Sarah Johnson (Dev Lead), Mike Chen (Designer), Lisa Rodriguez (QA)

Agenda:
1. Sprint 23 Review
2. Sprint 24 Planning
3. Product Roadmap Discussion
4. Technical Debt Review

Discussion:
John opened the meeting by reviewing Sprint 23 achievements. The team completed 85% of planned stories, with the main blocker being integration issues with the new payment gateway. Sarah reported that the authentication module is now fully tested and deployed to staging. Mike presented the new dashboard designs which received positive feedback from stakeholders. Lisa highlighted that QA has found 3 critical bugs that need immediate attention.

Key Decisions:
- Move payment gateway integration to Sprint 25 to allow more testing time
- Prioritize fixing the 3 critical bugs before the next release
- Schedule user testing sessions for the new dashboard next week
- Allocate 20% of Sprint 24 capacity to technical debt reduction

Action Items:
- Sarah: Fix authentication edge cases by Wednesday
- Mike: Finalize dashboard responsive design by Friday
- Lisa: Create test cases for payment gateway integration
- John: Schedule stakeholder demo for next Tuesday

Next Steps:
The team will reconvene on Friday for Sprint 24 planning. All action items must be completed by then.
    `

    const samplePrompt = 'Create a concise executive summary focusing on key decisions and action items'
    const summary = await aiService.summarizeText(sampleContent, samplePrompt)

    res.json({
      success: true,
      summary,
      sample: true,
      generatedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Sample summarization error:', error)
    res.status(500).json({ error: 'Failed to generate sample summary' })
  }
})

module.exports = router