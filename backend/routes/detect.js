const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const pdfService = require('../services/pdfService');

const router = express.Router();

// POST /api/detect - Detect rectangles in PDF
router.post('/', async (req, res) => {
  try {
    const { filename } = req.body;
    
    if (!filename) {
      return res.status(400).json({ error: 'Filename is required' });
    }

    const filePath = path.join(__dirname, '../uploads', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'PDF file not found' });
    }
    
    // Read the file buffer and pass it to the service
    const pdfBuffer = await fs.readFile(filePath);
    
    // Detect rectangles using PDF service
    const rectangles = await pdfService.detectRightSideRectangles(pdfBuffer);
    
    console.log(`✅ Detected ${rectangles.length} rectangles in PDF`);

    res.json({
      success: true,
      rectangles,
      totalPages: rectangles.length > 0 ? Math.max(...rectangles.map(r => r.page)) + 1 : 0
    });

  } catch (error) {
    console.error('Detection error:', error);
    res.status(500).json({ 
      error: 'Rectangle detection failed',
      message: error.message 
    });
  }
});

module.exports = router; 