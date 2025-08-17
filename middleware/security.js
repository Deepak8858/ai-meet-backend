const rateLimit = require('express-rate-limit')
const helmet = require('helmet')
const validator = require('validator')
const DOMPurify = require('isomorphic-dompurify')

class SecurityMiddleware {
  static configureHelmet() {
    return helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "https://api.openai.com", "https://api.groq.com"],
        },
      },
      crossOriginEmbedderPolicy: false,
    })
  }

  static createRateLimiters() {
    const generalLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes'
      },
      standardHeaders: true,
      legacyHeaders: false,
    })

    const uploadLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 10, // limit file uploads to 10 per 15 minutes
      message: {
        error: 'Too many file uploads, please try again later.',
        retryAfter: '15 minutes'
      }
    })

    const apiLimiter = rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 30, // limit API calls to 30 per minute
      message: {
        error: 'Too many API calls, please try again later.',
        retryAfter: '1 minute'
      }
    })

    return { generalLimiter, uploadLimiter, apiLimiter }
  }

  static sanitizeInput(input) {
    if (typeof input !== 'string') {
      return validator.escape(String(input))
    }
    
    // Remove potentially dangerous HTML tags
    let sanitized = DOMPurify.sanitize(input, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'br', 'p'],
      ALLOWED_ATTR: []
    })
    
    // Additional sanitization for SQL injection prevention
    sanitized = sanitized.replace(/['"`;]/g, '')
    
    // Remove null bytes and control characters
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '')
    
    return sanitized.trim()
  }

  static validateFileUpload(file) {
    const allowedTypes = [
      'text/plain',
      'text/markdown',
      'application/json',
      'application/pdf',
      'text/csv'
    ]
    
    const maxSize = 10 * 1024 * 1024 // 10MB
    
    if (!file) {
      throw new Error('No file provided')
    }
    
    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error(`File type ${file.mimetype} is not allowed`)
    }
    
    if (file.size > maxSize) {
      throw new Error(`File size ${file.size} exceeds maximum allowed size of ${maxSize}`)
    }
    
    // Validate filename
    const filename = file.originalname || file.filename
    if (!/^[a-zA-Z0-9._-]+$/.test(filename)) {
      throw new Error('Invalid filename. Only alphanumeric characters, dots, underscores, and hyphens are allowed.')
    }
    
    return true
  }

  static validateEmail(email) {
    if (!email || typeof email !== 'string') {
      throw new Error('Email is required')
    }
    
    if (!validator.isEmail(email)) {
      throw new Error('Invalid email format')
    }
    
    // Additional checks for disposable emails
    const disposableDomains = [
      'tempmail.com', '10minutemail.com', 'guerrillamail.com',
      'mailinator.com', 'throwaway.email'
    ]
    
    const domain = email.split('@')[1]?.toLowerCase()
    if (disposableDomains.includes(domain)) {
      throw new Error('Disposable email addresses are not allowed')
    }
    
    return true
  }

  static validatePrompt(prompt) {
    if (!prompt || typeof prompt !== 'string') {
      throw new Error('Prompt is required')
    }
    
    const sanitized = this.sanitizeInput(prompt)
    
    if (sanitized.length < 3) {
      throw new Error('Prompt must be at least 3 characters long')
    }
    
    if (sanitized.length > 1000) {
      throw new Error('Prompt must not exceed 1000 characters')
    }
    
    // Check for potential injection attempts
    const dangerousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /data:/gi,
      /vbscript:/gi,
      /on\w+\s*=/gi
    ]
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(sanitized)) {
        throw new Error('Potentially dangerous content detected')
      }
    }
    
    return sanitized
  }

  static createSecurityHeaders() {
    return (req, res, next) => {
      // Remove sensitive headers
      res.removeHeader('X-Powered-By')
      
      // Add security headers
      res.setHeader('X-Content-Type-Options', 'nosniff')
      res.setHeader('X-Frame-Options', 'DENY')
      res.setHeader('X-XSS-Protection', '1; mode=block')
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
      res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
      
      next()
    }
  }

  static logSecurityEvent(event, details) {
    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      event,
      details,
      ip: details.ip || 'unknown',
      userAgent: details.userAgent || 'unknown'
    }
    
    // In production, this would log to a security monitoring service
    console.log('SECURITY_EVENT:', JSON.stringify(logEntry))
  }

  static async scanForMalware(file) {
    // Placeholder for malware scanning
    // In production, integrate with services like ClamAV or VirusTotal
    return {
      clean: true,
      scanId: `scan_${Date.now()}`,
      message: 'File scan completed'
    }
  }
}

module.exports = SecurityMiddleware