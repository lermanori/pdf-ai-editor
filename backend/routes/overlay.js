const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const pdfService = require('../services/pdfService');

const router = express.Router();

// Configure multer for logo uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
});

// POST /api/overlay - Apply overlays to PDF
router.post('/', upload.single('logo'), async (req, res) => {
  try {
    const { fileId, translations } = req.body;
    const logoFile = req.file;
    const logoPosition = req.body.logoPosition ? JSON.parse(req.body.logoPosition) : null;
    
    if (!fileId || !translations) {
      return res.status(400).json({ error: 'File ID and translations are required' });
    }

    let parsedTranslations;
    try {
      parsedTranslations = JSON.parse(translations);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid translations format' });
    }

    if (!Array.isArray(parsedTranslations)) {
      return res.status(400).json({ error: 'Translations must be an array' });
    }

    // Find the original PDF file
    const uploadsDir = path.join(__dirname, '../uploads');
    const files = await fs.readdir(uploadsDir);
    const originalPdfFile = files.find(file => file.startsWith(fileId));
    
    if (!originalPdfFile) {
      return res.status(404).json({ error: 'Original PDF file not found' });
    }

    const originalFilePath = path.join(uploadsDir, originalPdfFile);
    
    // Generate new filename for processed PDF
    const processedId = uuidv4();
    const processedFilename = `${processedId}.pdf`;
    const processedFilePath = path.join(uploadsDir, processedFilename);
    
    console.log('🔄 Starting PDF processing...');
    console.log('📊 Processing details:', {
      fileId,
      translationsCount: parsedTranslations.length,
      hasLogo: !!logoFile,
      logoSize: logoFile ? logoFile.size : 0
    });
    
    // Process the PDF with all modifications
    await pdfService.processFullPdf(originalFilePath, processedFilePath, {
      translations: parsedTranslations,
      logoFile,
      logoPosition,
      removeChinese: true
    });
    
    console.log('✅ PDF processing completed');

    // Get file size for response
    const stats = await fs.stat(processedFilePath);

    res.json({
      success: true,
      processedFile: {
        id: processedId,
        filename: processedFilename,
        size: stats.size,
        processedAt: new Date().toISOString()
      },
      message: 'PDF processed successfully with Hebrew text, logo, and Chinese text removal'
    });

  } catch (error) {
    console.error('Overlay error:', error);
    res.status(500).json({ 
      error: 'PDF overlay processing failed',
      message: error.message 
    });
  }
});

module.exports = router; 