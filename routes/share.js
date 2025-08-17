const express = require('express')
const emailService = require('../services/emailService')
const router = express.Router()

// POST /api/share - Share summary via email
router.post('/', async (req, res) => {
  try {
    const { recipients, subject, summary, originalFileName } = req.body

    // Validation
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ error: 'At least one recipient email is required' })
    }

    if (!summary || typeof summary !== 'string') {
      return res.status(400).json({ error: 'Summary content is required' })
    }

    if (summary.trim().length === 0) {
      return res.status(400).json({ error: 'Summary cannot be empty' })
    }

    // Validate email addresses
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const invalidEmails = recipients.filter(email => !emailRegex.test(email))
    
    if (invalidEmails.length > 0) {
      return res.status(400).json({ 
        error: 'Invalid email addresses',
        invalid: invalidEmails
      })
    }

    // Limit number of recipients
    if (recipients.length > 10) {
      return res.status(400).json({ error: 'Maximum 10 recipients allowed' })
    }

    // Log email request
    console.log('Email sharing request:', {
      recipients: recipients.length,
      subject: subject || 'No subject',
      summaryLength: summary.length,
      originalFileName: originalFileName || 'Unknown',
      timestamp: new Date().toISOString()
    })

    // Send email
    const result = await emailService.sendSummaryEmail(
      recipients,
      subject,
      summary,
      originalFileName
    )

    res.json({
      success: true,
      message: `Email sent successfully to ${result.recipients} recipient(s)`,
      messageId: result.messageId,
      recipients: recipients
    })

  } catch (error) {
    console.error('Email sharing error:', error)
    
    // Handle specific email service errors
    if (error.message.includes('not configured')) {
      return res.status(500).json({ error: 'Email service is not configured' })
    }
    
    if (error.message.includes('authentication')) {
      return res.status(500).json({ error: 'Email authentication failed' })
    }
    
    if (error.message.includes('rate limit')) {
      return res.status(429).json({ error: 'Email sending rate limit exceeded' })
    }

    res.status(500).json({ 
      error: 'Failed to send email',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// POST /api/share/test - Test email configuration
router.post('/test', async (req, res) => {
  try {
    const { email } = req.body

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Valid test email address is required' })
    }

    const testSummary = `
This is a test email from AI Meeting Summarizer.

Your email configuration is working correctly!

You can now use the application to:
- Upload meeting transcripts
- Generate AI-powered summaries
- Share summaries via email

If you received this email, everything is set up properly.

Generated at: ${new Date().toLocaleString()}
    `

    const result = await emailService.sendSummaryEmail(
      [email],
      'Test Email - AI Meeting Summarizer',
      testSummary,
      'Test File'
    )

    res.json({
      success: true,
      message: 'Test email sent successfully',
      messageId: result.messageId,
      test: true
    })

  } catch (error) {
    console.error('Email test error:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /api/share/status - Check email service status
router.get('/status', async (req, res) => {
  try {
    const status = await emailService.testConnection()
    res.json({
      success: true,
      ...status
    })
  } catch (error) {
    console.error('Email status check error:', error)
    res.status(500).json({ error: 'Failed to check email status' })
  }
})

module.exports = router