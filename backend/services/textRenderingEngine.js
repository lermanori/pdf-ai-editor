// Neural Text Rendering Engine
// Unified text measurement and rendering system for consistent output

class TextRenderingEngine {
  constructor() {
    this.canvas = null;
    this.context = null;
    this.initializeCanvas();
  }

  initializeCanvas() {
    // Create a virtual canvas for text measurements
    try {
      const { createCanvas } = require('canvas');
      this.canvas = createCanvas(1000, 1000);
      this.context = this.canvas.getContext('2d');
      console.log('✅ Canvas-based text measurement engine initialized');
    } catch (error) {
      console.log('⚠️ Canvas not available, using fallback measurements');
      this.canvas = null;
      this.context = null;
    }
  }

  // 🎯 Neural Text Analysis - Analyzes text and container to determine optimal layout
  analyzeTextLayout(text, containerWidth, containerHeight) {
    console.log('🧠 [NEURAL ENGINE] Analyzing text layout requirements...');
    
    const analysis = {
      textLength: text.length,
      wordCount: text.split(/\s+/).filter(w => w.length > 0).length,
      avgWordLength: 0,
      complexity: 'simple',
      density: 'normal'
    };

    analysis.avgWordLength = analysis.textLength / Math.max(analysis.wordCount, 1);
    
    // Determine text complexity
    if (analysis.textLength > 300) analysis.complexity = 'complex';
    else if (analysis.textLength > 150) analysis.complexity = 'medium';
    
    // Determine text density
    if (analysis.wordCount > 50) analysis.density = 'high';
    else if (analysis.wordCount > 20) analysis.density = 'medium';
    else analysis.density = 'low';

    console.log('🧠 [NEURAL ENGINE] Text analysis complete:', analysis);
    return analysis;
  }

  // 🎨 Smart Font Size Calculator
  calculateOptimalFontSize(analysis, containerWidth, containerHeight) {
    console.log('🎨 [FONT CALCULATOR] Computing optimal font size...');
    
    // Base font size calculation
    const baseSize = Math.min(containerWidth / 25, containerHeight / 6);
    let fontSize = Math.max(10, Math.min(20, baseSize));
    
    // Adjust based on text complexity
    switch (analysis.complexity) {
      case 'complex':
        fontSize *= 0.75;
        break;
      case 'medium':
        fontSize *= 0.85;
        break;
      case 'simple':
        fontSize *= 1.1;
        break;
    }
    
    // Adjust based on text density
    switch (analysis.density) {
      case 'high':
        fontSize *= 0.8;
        break;
      case 'medium':
        fontSize *= 0.9;
        break;
      case 'low':
        fontSize *= 1.2;
        break;
    }
    
    const finalSize = Math.round(Math.max(8, Math.min(24, fontSize)));
    console.log('🎨 [FONT CALCULATOR] Optimal font size:', finalSize);
    return finalSize;
  }

  // 📏 Precise Text Measurement
  measureText(text, fontSize, fontFamily = 'Arial') {
    if (this.context) {
      this.context.font = `${fontSize}px ${fontFamily}`;
      const metrics = this.context.measureText(text);
      return {
        width: metrics.width,
        height: fontSize * 1.2 // Approximate line height
      };
    } else {
      // Fallback measurement
      return {
        width: text.length * fontSize * 0.6,
        height: fontSize * 1.2
      };
    }
  }

  // 🧠 Neural Text Wrapping Algorithm
  wrapTextIntelligently(text, maxWidth, fontSize, fontFamily = 'Arial') {
    console.log('🧠 [NEURAL WRAPPER] Processing intelligent text wrapping...');
    
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const lines = [];
    let currentLine = '';
    
    for (const word of words) {
      const testLine = currentLine === '' ? word : currentLine + ' ' + word;
      const measurement = this.measureText(testLine, fontSize, fontFamily);
      
      if (measurement.width <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine !== '') {
          lines.push(currentLine);
          currentLine = word;
        } else {
          // Handle very long words
          const chars = word.split('');
          let partialWord = '';
          for (const char of chars) {
            const testChar = partialWord + char;
            const charMeasurement = this.measureText(testChar, fontSize, fontFamily);
            if (charMeasurement.width <= maxWidth) {
              partialWord = testChar;
            } else {
              if (partialWord) lines.push(partialWord);
              partialWord = char;
            }
          }
          if (partialWord) currentLine = partialWord;
        }
      }
    }
    
    if (currentLine !== '') {
      lines.push(currentLine);
    }
    
    console.log('🧠 [NEURAL WRAPPER] Generated', lines.length, 'optimized lines');
    return lines;
  }

  // 🎯 Complete Layout Calculation
  calculatePerfectLayout(text, containerWidth, containerHeight) {
    console.log('🎯 [LAYOUT ENGINE] Calculating perfect text layout...');
    
    // Step 1: Analyze text
    const analysis = this.analyzeTextLayout(text, containerWidth, containerHeight);
    
    // Step 2: Calculate optimal font size
    const fontSize = this.calculateOptimalFontSize(analysis, containerWidth, containerHeight);
    
    // Step 3: Calculate spacing and padding
    const padding = Math.max(12, fontSize * 0.8);
    const lineHeight = fontSize * 1.4;
    
    // Step 4: Calculate available space for text
    const availableWidth = containerWidth - (padding * 2);
    const availableHeight = containerHeight - (padding * 2);
    const maxLines = Math.floor(availableHeight / lineHeight);
    
    // Step 5: Wrap text intelligently
    const lines = this.wrapTextIntelligently(text, availableWidth, fontSize);
    
    // Step 6: Calculate positioning
    const totalTextHeight = lines.length * lineHeight;
    const verticalOffset = Math.max(0, (availableHeight - totalTextHeight) / 2);
    
    const layout = {
      fontSize,
      lineHeight,
      padding,
      lines: lines.slice(0, maxLines), // Respect max lines
      totalTextHeight,
      verticalOffset,
      textAlign: 'center',
      backgroundColor: '#ffffff',
      borderColor: '#f0f0f0',
      borderWidth: 1,
      borderRadius: 8,
      textColor: '#000000'
    };
    
    console.log('🎯 [LAYOUT ENGINE] Perfect layout calculated:', {
      fontSize: layout.fontSize,
      lineCount: layout.lines.length,
      padding: layout.padding,
      verticalOffset: layout.verticalOffset
    });
    
    return layout;
  }

  // 📍 Calculate Line Positions
  calculateLinePositions(layout, containerX, containerY, containerWidth) {
    const positions = [];
    
    layout.lines.forEach((line, index) => {
      const lineMeasurement = this.measureText(line, layout.fontSize);
      
      // Center align text
      const lineX = containerX + (containerWidth - lineMeasurement.width) / 2;
      const lineY = containerY + layout.padding + layout.fontSize + layout.verticalOffset + (index * layout.lineHeight);
      
      positions.push({
        text: line,
        x: lineX,
        y: lineY,
        width: lineMeasurement.width,
        height: layout.fontSize
      });
    });
    
    return positions;
  }
}

module.exports = new TextRenderingEngine();