const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const PdfService = require('../services/pdfService');
const { validateFileUpload } = require('../utils/validation');

const router = express.Router();
const pdfService = new PdfService();

// Configure multer for PDF uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads', 'pdfs');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: pdfService.getMaxFileSize()
  },
  fileFilter: (req, file, cb) => {
    if (pdfService.getSupportedFileTypes().includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF files are allowed.'));
    }
  }
});

/**
 * @route   POST /api/pdf/upload
 * @desc    Upload and convert PDF to transcript
 * @access  Public
 */
router.post('/upload', upload.single('pdf'), async (req, res) => {
  try {
    // Validate file upload
    const validation = validateFileUpload(req.file);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors
      });
    }

    const filePath = req.file.path;
    const options = {
      includeMetadata: req.body.includeMetadata !== 'false',
      cleanText: req.body.cleanText !== 'false',
      includePageNumbers: req.body.includePageNumbers !== 'false',
      speakerLabels: req.body.speakerLabels ? JSON.parse(req.body.speakerLabels) : null
    };

    // Convert PDF to transcript
    const result = await pdfService.convertPdfToTranscript(filePath, options);

    if (!result.success) {
      // Clean up uploaded file
      fs.unlinkSync(filePath);
      return res.status(400).json({
        success: false,
        message: 'Failed to process PDF',
        error: result.error
      });
    }

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: 'PDF processed successfully',
      data: result
    });

  } catch (error) {
    console.error('PDF upload error:', error);
    
    // Clean up file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: 'Server error during PDF processing',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/pdf/extract
 * @desc    Extract text from PDF without full transcript formatting
 * @access  Public
 */
router.post('/extract', upload.single('pdf'), async (req, res) => {
  try {
    const validation = validateFileUpload(req.file);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors
      });
    }

    const filePath = req.file.path;
    const extraction = await pdfService.extractTextFromPdf(filePath);

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    if (!extraction.success) {
      return res.status(400).json({
        success: false,
        message: 'Failed to extract text from PDF',
        error: extraction.error
      });
    }

    res.json({
      success: true,
      message: 'Text extracted successfully',
      data: {
        text: extraction.text,
        metadata: extraction.metadata,
        pages: extraction.pageText
      }
    });

  } catch (error) {
    console.error('PDF extract error:', error);
    
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: 'Server error during text extraction',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/pdf/supported-types
 * @desc    Get supported file types and limits
 * @access  Public
 */
router.get('/supported-types', (req, res) => {
  res.json({
    success: true,
    data: {
      supportedTypes: pdfService.getSupportedFileTypes(),
      maxFileSize: pdfService.getMaxFileSize(),
      maxFileSizeMB: Math.round(pdfService.getMaxFileSize() / (1024 * 1024))
    }
  });
});

/**
 * @route   POST /api/pdf/validate
 * @desc    Validate PDF file without processing
 * @access  Public
 */
router.post('/validate', upload.single('pdf'), (req, res) => {
  try {
    const validation = pdfService.validatePdfFile(req.file);
    
    // Clean up uploaded file
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.json({
      success: validation.valid,
      data: {
        valid: validation.valid,
        errors: validation.errors,
        fileInfo: req.file ? {
          originalName: req.file.originalname,
          size: req.file.size,
          mimeType: req.file.mimetype
        } : null
      }
    });

  } catch (error) {
    console.error('PDF validation error:', error);
    
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: 'Server error during validation',
      error: error.message
    });
  }
});

module.exports = router;