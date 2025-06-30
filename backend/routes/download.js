const express = require('express');
const path = require('path');
const fs = require('fs-extra');

const router = express.Router();

// GET /api/download/:id - Download processed PDF
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'File ID is required' });
    }

    // Find the processed PDF file
    const uploadsDir = path.join(__dirname, '../uploads');
    const files = await fs.readdir(uploadsDir);
    const pdfFile = files.find(file => file.startsWith(id) && file.endsWith('.pdf'));
    
    if (!pdfFile) {
      return res.status(404).json({ error: 'Processed PDF file not found' });
    }

    const filePath = path.join(uploadsDir, pdfFile);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }

    // Get file stats
    const stats = await fs.stat(filePath);
    
    // Set headers for file download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="processed_${id}.pdf"`);
    res.setHeader('Content-Length', stats.size);
    
    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    console.log(`✅ Served processed PDF: ${pdfFile}`);
    
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ 
      error: 'Download failed',
      message: error.message 
    });
  }
});

module.exports = router; 