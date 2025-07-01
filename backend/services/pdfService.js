// Load initialization to suppress warnings
require('../init');

const fs = require('fs-extra');
const path = require('path');
const { PDFDocument, rgb, StandardFonts, TextAlign } = require('pdf-lib');
const sharp = require('sharp');
const fontkit = require('fontkit');

// Configure PDF.js for Node.js environment without canvas
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

// Enhanced Node.js Canvas Factory for PDF.js
class EnhancedNodeCanvasFactory {
  create(width, height) {
    return {
      canvas: {
        width: width,
        height: height,
        style: {},
        addEventListener: () => {},
        removeEventListener: () => {},
        getAttribute: () => null,
        setAttribute: () => {},
        toDataURL: () => 'data:image/png;base64,',
        toBlob: (callback) => callback(new Blob()),
        getContext: (type) => this.createContext(width, height)
      },
      context: this.createContext(width, height)
    };
  }

  createContext(width, height) {
    return {
      canvas: { width, height },
      fillStyle: '#000000',
      strokeStyle: '#000000',
      lineWidth: 1,
      globalAlpha: 1,
      globalCompositeOperation: 'source-over',
      imageSmoothingEnabled: true,
      lineCap: 'butt',
      lineJoin: 'miter',
      miterLimit: 10,
      shadowBlur: 0,
      shadowColor: 'rgba(0, 0, 0, 0)',
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      
      // Canvas methods
      save: () => {},
      restore: () => {},
      scale: () => {},
      rotate: () => {},
      translate: () => {},
      transform: () => {},
      setTransform: () => {},
      resetTransform: () => {},
      
      // Drawing methods
      clearRect: () => {},
      fillRect: () => {},
      strokeRect: () => {},
      beginPath: () => {},
      closePath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      quadraticCurveTo: () => {},
      bezierCurveTo: () => {},
      arcTo: () => {},
      rect: () => {},
      arc: () => {},
      fill: () => {},
      stroke: () => {},
      clip: () => {},
      
      // Text methods
      fillText: () => {},
      strokeText: () => {},
      measureText: (text) => ({ width: text.length * 8 }),
      
      // Image methods
      drawImage: () => {},
      createImageData: (width, height) => ({
        width,
        height,
        data: new Uint8ClampedArray(width * height * 4)
      }),
      getImageData: (x, y, width, height) => ({
        width,
        height,
        data: new Uint8ClampedArray(width * height * 4)
      }),
      putImageData: () => {},
      
      // Gradient methods
      createLinearGradient: () => ({ addColorStop: () => {} }),
      createRadialGradient: () => ({ addColorStop: () => {} }),
      createPattern: () => null
    };
  }

  reset(canvasAndContext, width, height) {
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
    canvasAndContext.context.canvas.width = width;
    canvasAndContext.context.canvas.height = height;
  }

  destroy(canvasAndContext) {
    // Cleanup if needed
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
  }
}

class PDFService {
  
  // Detect rectangles on the right side of PDF pages
  async detectRightSideRectangles(pdfBuffer) {
    try {
      // The buffer is now passed directly.
      const pdfData = new Uint8Array(pdfBuffer);
      
      const loadingTask = pdfjsLib.getDocument({
        data: pdfData,
        canvasFactory: new EnhancedNodeCanvasFactory(),
        isEvalSupported: false,
        disableFontFace: true,
        verbosity: 0 // Suppress PDF.js warnings
      });
      
      const pdfDoc = await loadingTask.promise;
      const rectangles = [];
      
      console.log(`📄 Processing PDF with ${pdfDoc.numPages} pages`);
      
      // Scale factor for frontend display (PDF.js uses 72 DPI, frontend displays at ~96 DPI)
      const DISPLAY_SCALE = 800 / 72; // Frontend displays at 800px width
      
      for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        try {
          const page = await pdfDoc.getPage(pageNum);
          const viewport = page.getViewport({ scale: 1.0 });
          const textContent = await page.getTextContent();
          
          console.log(`📝 Page ${pageNum}: Viewport ${viewport.width}x${viewport.height}, ${textContent.items.length} text items`);
          
          // Find text items on the right half of the page
          const rightSideItems = textContent.items.filter(item => {
            if (!item.transform || !item.str || item.str.trim().length === 0) return false;
            const x = item.transform[4];
            return x > viewport.width / 2; // x position > half width
          });
          
          console.log(`📝 Page ${pageNum}: Found ${rightSideItems.length} right-side text items`);
          
          if (rightSideItems.length > 0) {
            // Group nearby text items into rectangles
            const groups = this.groupTextItems(rightSideItems, viewport);
            
            groups.forEach((group, index) => {
              // Calculate proper coordinates for frontend display
              const frontendScale = 800 / viewport.width; // Scale to frontend width
              
              rectangles.push({
                id: `rect_${pageNum}_${index}`,
                page: pageNum - 1, // 0-based for frontend
                x: Math.round(group.minX * frontendScale),
                y: Math.round((viewport.height - group.maxY) * frontendScale), // Convert to top-left origin and scale
                width: Math.round((group.maxX - group.minX) * frontendScale),
                height: Math.round((group.maxY - group.minY) * frontendScale),
                text: group.text.trim(),
                // Store original coordinates for PDF processing
                originalX: group.minX,
                originalY: group.minY,
                originalWidth: group.maxX - group.minX,
                originalHeight: group.maxY - group.minY,
                pageWidth: viewport.width,
                pageHeight: viewport.height
              });
            });
          }
          
          const pageRectangles = rectangles.filter(r => r.page === pageNum - 1).length;
          console.log(`✅ Page ${pageNum}: Created ${pageRectangles} rectangles`);
          
        } catch (pageError) {
          console.warn(`⚠️  Error processing page ${pageNum}:`, pageError.message);
        }
      }
      
      console.log(`✅ Total rectangles detected: ${rectangles.length}`);
      return rectangles;
      
    } catch (error) {
      console.error('Error detecting rectangles:', error);
      throw error;
    }
  }
  
  // Group nearby text items into a SINGLE bounding box
  groupTextItems(items, viewport) {
    if (!items || items.length === 0) return [];

    // Filter out any items that are empty or lack transform data
    const validItems = items.filter(item => item && item.str && item.str.trim().length > 0 && item.transform);

    if (validItems.length === 0) return [];

    // Find the min/max coordinates for the entire collection of items
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let combinedText = [];

    validItems.forEach(item => {
      const itemHeight = item.height || 12;
      const itemWidth = item.width || (item.str.length * (itemHeight / 1.8)); // Estimate width

      const itemMinX = item.transform[4];
      const itemMaxX = itemMinX + itemWidth;
      const itemMaxY = item.transform[5];
      const itemMinY = itemMaxY - itemHeight;

      minX = Math.min(minX, itemMinX);
      minY = Math.min(minY, itemMinY);
      maxX = Math.max(maxX, itemMaxX);
      maxY = Math.max(maxY, itemMaxY);
      combinedText.push(item.str);
    });

    const padding = 15; // Generous padding around the block

    const singleGroup = {
      minX: minX - padding,
      minY: minY - padding,
      maxX: maxX + padding,
      maxY: maxY + padding,
      text: combinedText.join(' ').replace(/\s+/g, ' ').trim(),
    };
    
    // Return an array containing only the single, all-encompassing rectangle
    return [singleGroup];
  }
  
  // Get the total number of pages in a PDF
  async getPdfPageCount(pdfPath) {
    const pdfBuffer = await fs.readFile(pdfPath);
    const pdfData = new Uint8Array(pdfBuffer);
    const loadingTask = pdfjsLib.getDocument({ data: pdfData });
    const pdfDoc = await loadingTask.promise;
    return pdfDoc.numPages;
  }
  
  // Extract text from a specific rectangle area in the PDF
  async extractTextFromRectangle(pdfPath, rectangle) {
    try {
      console.log(`[EXTRACT DEBUG] Starting text extraction for rectangle: ${rectangle.id}`);
      
      const pdfBuffer = await fs.readFile(pdfPath);
      const pdfData = new Uint8Array(pdfBuffer);
      
      const loadingTask = pdfjsLib.getDocument({
        data: pdfData,
        canvasFactory: new EnhancedNodeCanvasFactory(),
        isEvalSupported: false,
        disableFontFace: true,
        verbosity: 0
      });

      const pdfDoc = await loadingTask.promise;
      const page = await pdfDoc.getPage(rectangle.page + 1); // pdfjs is 1-based
      const viewport = page.getViewport({ scale: 1.0 });
      
      // Get text content from the page
      const textContent = await page.getTextContent();
      console.log(`[EXTRACT DEBUG] Page ${rectangle.page + 1} has ${textContent.items.length} text items`);
      
      // Calculate the scale factor between frontend and PDF coordinates
      const frontendWidth = 800; // This must match the frontend viewer width
      const scale = viewport.width / frontendWidth;
      
      // Convert frontend coordinates to PDF coordinates
      const pdfX = rectangle.x * scale;
      const pdfY = rectangle.y * scale;
      const pdfWidth = rectangle.width * scale;
      const pdfHeight = rectangle.height * scale;
      
      console.log(`[EXTRACT DEBUG] Frontend Rect (x, y, w, h): ${rectangle.x.toFixed(2)}, ${rectangle.y.toFixed(2)}, ${rectangle.width.toFixed(2)}, ${rectangle.height.toFixed(2)}`);
      console.log(`[EXTRACT DEBUG] PDF Rect in PDF Coords (x, y_from_top, w, h): ${pdfX.toFixed(2)}, ${pdfY.toFixed(2)}, ${pdfWidth.toFixed(2)}, ${pdfHeight.toFixed(2)}`);
      
      // Convert the rectangle's top-based Y to a bottom-based Y for comparison
      const rectTopFromBottom = viewport.height - pdfY;
      const rectBottomFromBottom = rectTopFromBottom - pdfHeight;
      console.log(`[EXTRACT DEBUG] PDF Rect Y-Range (from bottom): ${rectBottomFromBottom.toFixed(2)} to ${rectTopFromBottom.toFixed(2)}`);

      // Find text items that fall within the rectangle area
      const textItems = [];
      for (const item of textContent.items) {
        if (!item.transform || !item.str || item.str.trim().length === 0) continue;
        
        const itemX = item.transform[4];
        const itemY = item.transform[5]; // Y position is from the bottom
        const itemHeight = item.height || 12;
        const itemWidth = item.width || (item.str.length * (itemHeight / 1.8));
        const itemRight = itemX + itemWidth;

        // --- Detailed check with logging ---
        const xCheck = itemX < (pdfX + pdfWidth) && itemRight > pdfX;
        // This is the flawed original check. We will log its result.
        const originalYCheck = itemY > (pdfY - pdfHeight) && (itemY - itemHeight) < pdfY;

        // This is the corrected check.
        const correctedYCheck = itemY > rectBottomFromBottom && itemY < rectTopFromBottom;
        
        console.log(`[EXTRACT ITEM CHECK] Text: "${item.str}" | PDF Coords (x, y): ${itemX.toFixed(2)}, ${itemY.toFixed(2)} | X-Check: ${xCheck ? 'PASS' : 'FAIL'} | Corrected Y-Check: ${correctedYCheck ? 'PASS' : 'FAIL'} | Flawed Original Y-Check: ${originalYCheck ? 'PASS' : 'FAIL'}`);

        if (xCheck && correctedYCheck) {
          textItems.push(item);
        }
      }
      
      console.log(`[EXTRACT DEBUG] Found ${textItems.length} text items within rectangle area`);
      
      if (textItems.length > 0) {
        console.log(`[EXTRACT DEBUG] Text items found:`, textItems.map(item => ({
          text: item.str,
          x: item.transform[4].toFixed(2),
          y: item.transform[5].toFixed(2),
          width: (item.width || (item.str.length * ((item.height || 12) / 1.8))).toFixed(2),
          height: (item.height || 12).toFixed(2)
        })));
        
        // Extract and combine the text
        const extractedText = textItems
          .map(item => item.str)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        console.log(`[EXTRACT DEBUG] Final extracted text: "${extractedText}"`);
        return extractedText;
      } else {
        console.log(`[EXTRACT DEBUG] No text items found in the specified area`);
        return 'No text found in this area';
      }
      
    } catch (error) {
      console.error(`[EXTRACT DEBUG] Error extracting text from PDF for rect ID ${rectangle.id}:`, error);
      return 'Text extraction failed';
    }
  }

  // Create an image from text for translation
  async createTextImage(text) {
    try {
      console.log(`[CREATE IMAGE DEBUG] Creating image with text: "${text}"`);
      
      // Use the existing mock image creation logic
      const mockImageBase64 = await this.createMockPngImage(text);
      
      console.log(`[CREATE IMAGE DEBUG] Created image with ${mockImageBase64.length} bytes`);
      return mockImageBase64;
      
    } catch (error) {
      console.error(`[CREATE IMAGE DEBUG] Error creating text image:`, error);
      throw error;
    }
  }
  
  // Crop rectangle area from PDF and convert to base64 image
  async cropRectangleToBase64(pdfPath, rectangle) {
    try {
      console.log(`[CROP DEBUG] Starting crop for rectangle: ${rectangle.id}`);
      console.log(`[CROP DEBUG] Rectangle data:`, {
        x: rectangle.x,
        y: rectangle.y,
        width: rectangle.width,
        height: rectangle.height,
        page: rectangle.page,
        text: rectangle.text,
        isManual: rectangle.isManual
      });

      // For manual rectangles, let's detect what text is actually in the PDF at those coordinates
      if (rectangle.isManual) {
        console.log(`[CROP DEBUG] Manual rectangle detected - extracting actual PDF text...`);
        
        try {
          const pdfBuffer = await fs.readFile(pdfPath);
          const pdfData = new Uint8Array(pdfBuffer);
          
          const loadingTask = pdfjsLib.getDocument({
            data: pdfData,
            canvasFactory: new EnhancedNodeCanvasFactory(),
            isEvalSupported: false,
            disableFontFace: true,
            verbosity: 0
          });

          const pdfDoc = await loadingTask.promise;
          const page = await pdfDoc.getPage(rectangle.page + 1); // pdfjs is 1-based
          const viewport = page.getViewport({ scale: 1.0 });
          
          // Get text content from the page
          const textContent = await page.getTextContent();
          console.log(`[CROP DEBUG] Page ${rectangle.page + 1} has ${textContent.items.length} text items`);
          
          // Calculate the scale factor between frontend and PDF coordinates
          const frontendWidth = 800; // This must match the frontend viewer width
          const scale = viewport.width / frontendWidth;
          
          // Convert frontend coordinates to PDF coordinates
          const pdfX = rectangle.x * scale;
          const pdfY = rectangle.y * scale;
          const pdfWidth = rectangle.width * scale;
          const pdfHeight = rectangle.height * scale;
          
          console.log(`[CROP DEBUG] Converted coordinates: PDF(${pdfX.toFixed(2)}, ${pdfY.toFixed(2)}) ${pdfWidth.toFixed(2)}x${pdfHeight.toFixed(2)}`);
          
          // Find text items that fall within the rectangle area
          const textItems = textContent.items.filter(item => {
            if (!item.transform || !item.str || item.str.trim().length === 0) return false;
            
            const itemX = item.transform[4];
            const itemY = item.transform[5];
            const itemHeight = item.height || 12;
            const itemWidth = item.width || (item.str.length * (itemHeight / 1.8));
            
            // Check if the text item intersects with our rectangle
            const itemRight = itemX + itemWidth;
            const itemBottom = itemY - itemHeight;
            
            return itemX < (pdfX + pdfWidth) && 
                   itemRight > pdfX && 
                   itemY > (pdfY - pdfHeight) && 
                   itemBottom < pdfY;
          });
          
          console.log(`[CROP DEBUG] Found ${textItems.length} text items within rectangle area`);
          
          if (textItems.length > 0) {
            console.log(`[CROP DEBUG] Text items found:`, textItems.map(item => ({
              text: item.str,
              x: item.transform[4].toFixed(2),
              y: item.transform[5].toFixed(2),
              width: (item.width || (item.str.length * ((item.height || 12) / 1.8))).toFixed(2),
              height: (item.height || 12).toFixed(2)
            })));
            
            // Extract and combine the text
            const extractedText = textItems
              .map(item => item.str)
              .join(' ')
              .replace(/\s+/g, ' ')
              .trim();
            
            console.log(`[CROP DEBUG] Extracted text from PDF: "${extractedText}"`);
            console.log(`[CROP DEBUG] Current placeholder text: "${rectangle.text}"`);
          } else {
            console.log(`[CROP DEBUG] No text items found in the specified area`);
          }
          
        } catch (extractError) {
          console.error(`[CROP DEBUG] Error extracting text from PDF:`, extractError.message);
        }
      }

      // Create a proper PNG image with the actual text using Sharp
      const mockImageBase64 = await this.createMockPngImage(rectangle.text);
      
      console.log(`[CROP DEBUG] Created mock image with text: "${rectangle.text}"`);
      console.log(`[CROP DEBUG] Image size: ${mockImageBase64.length} bytes`);
      
      return mockImageBase64;
      
    } catch (error) {
      console.error('Error cropping rectangle:', error);
      throw error;
    }
  }
  
  // Create a mock PNG image for demo purposes using Sharp
  async createMockPngImage(text) {
    try {
      console.log(`[MOCK IMAGE DEBUG] Creating mock image with text: "${text}"`);
      
      const cleanText = text.replace(/[<>&"']/g, '').trim();
      console.log(`[MOCK IMAGE DEBUG] Cleaned text: "${cleanText}"`);
      
      const lines = this.wrapText(cleanText, 45);
      console.log(`[MOCK IMAGE DEBUG] Wrapped into ${lines.length} lines:`, lines);
      
      // Create SVG markup for the image
      const width = 500;
      const height = 40 + (lines.length * 30) + 40;
      const svgContent = `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <rect width="${width}" height="${height}" fill="#ffffff" stroke="#e0e0e0" stroke-width="2"/>
          ${lines.map((line, i) => 
            `<text x="16" y="${40 + i * 28}" font-family="Arial, sans-serif" font-size="22" fill="#333333">${line}</text>`
          ).join('')}
          <text x="16" y="${40 + lines.length * 28 + 20}" font-family="Arial, sans-serif" font-size="16" fill="#888888">Detected text area</text>
        </svg>
      `;
      
      console.log(`[MOCK IMAGE DEBUG] Created SVG with dimensions: ${width}x${height}`);
      
      // Convert SVG to PNG using Sharp
      const pngBuffer = await sharp(Buffer.from(svgContent))
        .png()
        .toBuffer();
      
      // Convert to base64
      const base64 = pngBuffer.toString('base64');
      const result = `data:image/png;base64,${base64}`;
      
      console.log(`[MOCK IMAGE DEBUG] Final PNG size: ${pngBuffer.length} bytes`);
      console.log(`[MOCK IMAGE DEBUG] Base64 result length: ${result.length} characters`);
      
      return result;
      
    } catch (error) {
      console.error('Error creating PNG image:', error);
      // Fallback to a simple base64 PNG
      return this.createSimpleFallbackImage(text);
    }
  }
  
  // Create a simple fallback PNG image
  createSimpleFallbackImage(text) {
    // Create a minimal 1x1 white PNG as fallback
    const simpleWhitePng = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x01, 0x90, 0x00, 0x00, 0x00, 0xA0,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x18, 0x8A, 0x58, 0xE5, 0x00, 0x00, 0x00,
      0x19, 0x74, 0x45, 0x58, 0x74, 0x53, 0x6F, 0x66, 0x74, 0x77, 0x61, 0x72,
      0x65, 0x00, 0x41, 0x64, 0x6F, 0x62, 0x65, 0x20, 0x49, 0x6D, 0x61, 0x67,
      0x65, 0x52, 0x65, 0x61, 0x64, 0x79, 0x71, 0xC9, 0x65, 0x3C, 0x00, 0x00,
      0x00, 0x0D, 0x49, 0x44, 0x41, 0x54, 0x78, 0xDA, 0x62, 0xF8, 0xFF, 0xFF,
      0x3F, 0x03, 0x00, 0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00,
      0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);
    
    const base64 = simpleWhitePng.toString('base64');
    return `data:image/png;base64,${base64}`;
  }
  
  // Helper function to wrap text
  wrapText(text, maxLength) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';
    
    words.forEach(word => {
      if (currentLine.length + word.length + 1 <= maxLength) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    });
    
    if (currentLine) lines.push(currentLine);
    return lines;
  }
  
  // Process full PDF with all modifications
  async processFullPdf(inputPath, outputPath, options) {
    try {
      const { translations, logoFile, logoPosition, removeChinese } = options;
      
      const existingPdfBytes = await fs.readFile(inputPath);
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      
      // Register fontkit
      pdfDoc.registerFontkit(fontkit);

      // Embed a Hebrew-compatible font
      const fontPath = path.join(__dirname, '../fonts/NotoSansHebrew-Regular.ttf');
      let hebrewFont;
      try {
        const fontBytes = await fs.readFile(fontPath);
        hebrewFont = await pdfDoc.embedFont(fontBytes, { subset: false });
        console.log('✅ Hebrew font embedded successfully.');
      } catch (fontError) {
        console.error(`❌ Could not load Hebrew font from ${fontPath}. Falling back to Helvetica.`);
        console.error('Font error:', fontError.message);
        hebrewFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      }
      
      // Embed logo if provided
      let logoImage = null;
      if (logoFile) {
        try {
          logoImage = await pdfDoc.embedPng(logoFile.buffer);
          console.log('✅ Logo embedded successfully.');
        } catch (logoError) {
          console.error('❌ Could not embed logo:', logoError.message);
        }
      }
      
      const pages = pdfDoc.getPages();
      console.log(`🔄 Processing ${pages.length} pages with ${translations.length} translations...`);
      
      for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
        const page = pages[pageIndex];
        const { width, height } = page.getSize();
        
        // Add logo to top-right corner
        if (logoImage) {
          try {
            // Use provided logo position or fallback to default
            let finalLogoX, finalLogoY, finalLogoWidth, finalLogoHeight;
            
            if (logoPosition) {
              // Convert frontend coordinates to PDF coordinates
              const frontendWidth = 800; // Must match frontend viewer width
              const scale = width / frontendWidth;
              
              finalLogoX = logoPosition.x * scale;
              finalLogoY = height - (logoPosition.y + logoPosition.height) * scale; // Convert to PDF coordinate system
              finalLogoWidth = logoPosition.width * scale;
              finalLogoHeight = logoPosition.height * scale;
              
              console.log(`🔍 [DEBUG] Logo positioning for page ${pageIndex + 1}:`, {
                frontendPosition: logoPosition,
                pdfPosition: { x: finalLogoX, y: finalLogoY, width: finalLogoWidth, height: finalLogoHeight },
                scale,
                pageWidth: width,
                pageHeight: height
              });
            } else {
              // Fallback to default positioning
              const logoWidth = Math.min(60, logoImage.width);
              const logoHeight = (logoImage.height * logoWidth) / logoImage.width;
              const maxHeight = 30;
              finalLogoHeight = Math.min(logoHeight, maxHeight);
              finalLogoWidth = (logoImage.width * finalLogoHeight) / logoImage.height;
              finalLogoX = width - finalLogoWidth - 10;
              finalLogoY = height - finalLogoHeight - 10;
            }
            
            page.drawImage(logoImage, {
              x: finalLogoX,
              y: finalLogoY,
              width: finalLogoWidth,
              height: finalLogoHeight,
            });
            
            console.log(`✅ Logo added to page ${pageIndex + 1} at position:`, { x: finalLogoX, y: finalLogoY, width: finalLogoWidth, height: finalLogoHeight });
          } catch (logoDrawError) {
            console.error(`❌ Error drawing logo on page ${pageIndex + 1}:`, logoDrawError.message);
          }
        }
        
        const pageTranslations = translations.filter(t => t.page === pageIndex);
        console.log(`📄 Page ${pageIndex + 1}: Processing ${pageTranslations.length} translations`);
        
        for (const translation of pageTranslations) {
          if (translation.translation && translation.translation !== 'Translation failed') {
            
            console.log(`🔍 [DEBUG] Processing translation for page ${pageIndex + 1}:`, {
              id: translation.id,
              originalId: translation.originalId,
              page: translation.page,
              frontendCoords: { x: translation.x, y: translation.y, width: translation.width, height: translation.height },
              translation: translation.translation
            });
            
            // --- CLEAN TEXT STYLING TO MATCH ORIGINAL ---

            // 1. Calculate the scale factor between the PDF and the frontend view
            const frontendWidth = 800; // This must match the hardcoded width in the frontend viewer
            
            // For manual rectangles, we need to calculate pageWidth from the current page
            let pageWidth = translation.pageWidth;
            if (!pageWidth) {
              // Manual rectangles don't have pageWidth, so calculate it from the current page
              pageWidth = width;
            }
            
            const scale = pageWidth / frontendWidth;

            // 2. Convert the final frontend coordinates back to native PDF coordinates
            const pdfX = translation.x * scale;
            const pdfY = translation.y * scale;
            const pdfWidth = translation.width * scale;
            const pdfHeight = translation.height * scale;
            
            console.log(`🔍 [DEBUG] Coordinate conversion for page ${pageIndex + 1}:`, {
              pageWidth,
              frontendWidth,
              scale,
              frontendCoords: { x: translation.x, y: translation.y, width: translation.width, height: translation.height },
              pdfCoords: { x: pdfX, y: pdfY, width: pdfWidth, height: pdfHeight }
            });
            
            let text = translation.translation;
            const sanitizedText = text.replace(/[^\u0590-\u05FF\u0041-\u005A\u0061-\u007A\s\d.,!?"':-]/g, '');

            console.log(`🔍 [DEBUG] Text processing for page ${pageIndex + 1}:`, {
              originalText: text,
              sanitizedText: sanitizedText,
              textLength: sanitizedText.length
            });

            // 3. Draw ONLY a clean white background (no borders, no transparency)
            page.drawRectangle({
              x: pdfX,
              y: height - pdfY - pdfHeight, // Y is measured from the bottom in pdf-lib
              width: pdfWidth,
              height: pdfHeight,
              color: rgb(1, 1, 1), // Pure white background
            });
            
            // 4. Calculate optimal font size and text layout
            const fontSize = Math.max(10, Math.min(16, pdfHeight / 2.5));
            const padding = 4;
            const wrappedText = this.wrapTextForPdf(sanitizedText, pdfWidth - (padding * 2), hebrewFont, fontSize);

            console.log(`🔍 [DEBUG] Clean text rendering for page ${pageIndex + 1}:`, {
              fontSize,
              wrappedText,
              textLines: wrappedText.length,
              padding,
              boxCoords: { x: pdfX, y: height - pdfY - pdfHeight, width: pdfWidth, height: pdfHeight }
            });

            try {
              // 5. Draw the text with clean, professional styling
              const lineSpacing = fontSize * 1.2;
              let yPos = height - pdfY - padding - fontSize;

              for (let i = 0; i < wrappedText.length; i++) {
                const line = wrappedText[i];
                const textWidth = hebrewFont.widthOfTextAtSize(line, fontSize);
                
                // Right-align text with proper padding
                const textX = pdfX + pdfWidth - textWidth - padding;
                
                // Ensure text doesn't overflow the container
                if (yPos > height - pdfY - pdfHeight + fontSize) {
                  console.log(`🔍 [DEBUG] Drawing clean text line ${i + 1} on page ${pageIndex + 1}:`, {
                    line,
                    textWidth,
                    textX,
                    yPos,
                    fontSize
                  });
                  
                  page.drawText(line, {
                    x: textX,
                    y: yPos,
                    font: hebrewFont,
                    size: fontSize,
                    color: rgb(0, 0, 0), // Pure black text
                  });
                }
                
                // Move down for the next line with proper spacing
                yPos -= lineSpacing;
              }
              console.log(`✅ Successfully drew clean Hebrew text on page ${pageIndex + 1}`);
            } catch (textError) {
              console.error(`❌ Error drawing clean Hebrew text on page ${pageIndex + 1}:`, textError.message);
            }
          } else {
            console.warn(`⚠️ Skipping failed translation on page ${pageIndex + 1}`);
          }
        }
        console.log(`✅ Processed page ${pageIndex + 1} with ${pageTranslations.length} translations.`);
      }
      
      const pdfBytes = await pdfDoc.save();
      await fs.writeFile(outputPath, pdfBytes);
      console.log(`✅ PDF processed and saved to: ${outputPath}`);
      
    } catch (error) {
      console.error('Error processing PDF:', error);
      throw error;
    }
  }
  
  // Helper to wrap text for pdf-lib with better spacing
  wrapTextForPdf(text, maxWidth, font, fontSize) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine === '' ? word : currentLine + ' ' + word;
      const testWidth = font.widthOfTextAtSize(testLine, fontSize);
      
      if (testWidth <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine !== '') {
          lines.push(currentLine);
          currentLine = word;
        } else {
          // Word is too long, force it on its own line
          lines.push(word);
          currentLine = '';
        }
      }
    }
    
    if (currentLine !== '') {
      lines.push(currentLine);
    }
    
    return lines;
  }
  
  // Remove Chinese characters from text
  removeChinese(text) {
    // Remove Chinese characters using Unicode ranges
    return text.replace(/[\u4e00-\u9fff\u3400-\u4dbf\u20000-\u2a6df\u2a700-\u2b73f\u2b740-\u2b81f\u2b820-\u2ceaf]/g, '');
  }
}

module.exports = new PDFService();