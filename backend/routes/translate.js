const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const pdfService = require('../services/pdfService');
const chatgptService = require('../services/chatgptService');

const router = express.Router();

// POST /api/translate/detect - Detect and crop text from rectangles
router.post('/detect', async (req, res) => {
  try {
    const { fileId, rectangles } = req.body;
    
    if (!fileId || !rectangles || !Array.isArray(rectangles)) {
      return res.status(400).json({ error: 'File ID and rectangles array are required' });
    }

    // Find the PDF file
    const uploadsDir = path.join(__dirname, '../uploads');
    const files = await fs.readdir(uploadsDir);
    const pdfFile = files.find(file => file.startsWith(fileId));
    
    if (!pdfFile) {
      return res.status(404).json({ error: 'PDF file not found' });
    }

    const filePath = path.join(uploadsDir, pdfFile);
    
    // Get total page count to expand repeated rectangles
    const numPages = await pdfService.getPdfPageCount(filePath);
    const rectsToProcess = [];

    rectangles.forEach(rect => {
      if (rect.mode === 'repeated') {
        console.log('🔄 [DEBUG] Expanding repeated rectangle:', {
          id: rect.id,
          originalPage: rect.page,
          mode: rect.mode,
          coordinates: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
        });
        
        // Create a copy of the repeated rectangle for each page
        for (let i = 0; i < numPages; i++) {
          const expandedRect = {
            ...rect,
            page: i, // Assign a specific page number
            originalId: rect.id, // Keep track of the original
            id: `${rect.id}_page_${i}` // Create a unique ID for this instance
          };
          
          console.log(`  📄 [DEBUG] Created expanded rectangle for page ${i}:`, {
            id: expandedRect.id,
            page: expandedRect.page,
            coordinates: { x: expandedRect.x, y: expandedRect.y, width: expandedRect.width, height: expandedRect.height }
          });
          
          rectsToProcess.push(expandedRect);
        }
      } else {
        rectsToProcess.push(rect);
      }
    });

    console.log(`[DETECT LOG] Processing ${rectangles.length} incoming rectangles, expanded to ${rectsToProcess.length} total operations.`);

    // Process each rectangle to extract text
    const detectedRectangles = [];
    
    for (const rectangle of rectsToProcess) {
      try {
        console.log("------------------------------------------");
        console.log(`[DETECT LOG] Processing rectangle ID: ${rectangle.id}`);
        console.log(`[DETECT LOG] Is Manual: ${rectangle.isManual}`);
        console.log(`[DETECT LOG] Rectangle Data:`, { 
          x: rectangle.x, 
          y: rectangle.y, 
          width: rectangle.width, 
          height: rectangle.height,
          page: rectangle.page,
          text: rectangle.text 
        });

        // Extract text from the PDF at the rectangle coordinates
        const extractedText = await pdfService.extractTextFromRectangle(filePath, rectangle);
        
        console.log(`[DETECT LOG] Extracted text: "${extractedText}"`);
        
        detectedRectangles.push({
          ...rectangle,
          extractedText: extractedText,
          detectedAt: new Date().toISOString()
        });
        
        console.log(`✅ Detected text for rectangle on page ${rectangle.page}`);
        
      } catch (error) {
        console.error(`❌ Failed to detect text for rectangle on page ${rectangle.page}:`, error);
        detectedRectangles.push({
          ...rectangle,
          extractedText: 'Text detection failed',
          error: error.message,
        });
      }
    }

    console.log(`✅ Completed text detection for ${detectedRectangles.length} rectangles`);

    res.json({
      success: true,
      detectedRectangles,
      message: `Text detected from ${detectedRectangles.length} areas`
    });

  } catch (error) {
    console.error('Detection error:', error);
    res.status(500).json({ 
      error: 'Text detection failed',
      message: error.message 
    });
  }
});

// POST /api/translate - Translate extracted text from rectangles
router.post('/', async (req, res) => {
  try {
    const { fileId, rectangles } = req.body;
    
    if (!fileId || !rectangles || !Array.isArray(rectangles)) {
      return res.status(400).json({ error: 'File ID and rectangles array are required' });
    }

    // --- Intelligent Translation for Repeated Rectangles ---

    // 1. Find all unique text strings that need translation.
    const uniqueTexts = [...new Set(
      rectangles
        .map(r => r.extractedText || r.text)
        .filter(text => text && text !== 'Text detection failed' && text !== 'No text found in this area')
    )];

    console.log(`[TRANSLATE LOG] Found ${uniqueTexts.length} unique text strings to translate.`);

    // 2. Translate each unique text string only once.
    const translationMap = new Map();
    for (const text of uniqueTexts) {
      try {
        const base64Image = await pdfService.createTextImage(text);
        const translation = await chatgptService.translateImage(base64Image);
        translationMap.set(text, translation);
        console.log(`[TRANSLATE LOG] Translated "${text}" -> "${translation}"`);
        await new Promise(resolve => setTimeout(resolve, 500)); // Rate limiting
      } catch (error) {
        console.error(`[TRANSLATE LOG] Failed to translate text: "${text}"`, error);
        translationMap.set(text, 'Translation failed');
      }
    }

    // 3. Map the translations back to the original rectangles, including all repeated instances.
    const finalTranslations = rectangles.map(rect => {
      const originalText = rect.extractedText || rect.text;
      const translatedText = translationMap.get(originalText) || 'Translation not found';
      
      return {
        ...rect,
        translation: translatedText
      };
    });

    console.log(`✅ Completed translation of ${finalTranslations.length} rectangles`);

    res.json({
      success: true,
      translations: finalTranslations,
      message: `Translated ${finalTranslations.length} text areas`
    });

  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({ 
      error: 'Translation failed',
      message: error.message 
    });
  }
});

module.exports = router; 