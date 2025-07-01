import React, { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Stage, Layer, Rect, Text, Image } from 'react-konva';
import { ArrowLeft, ArrowRight, Download, Eye, ZoomIn, ZoomOut, Sparkles, Brain } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

// 🧠 Neural Text Rendering Engine for Frontend
class FrontendTextEngine {
  constructor() {
    this.canvas = null;
    this.context = null;
    this.initializeCanvas();
  }

  initializeCanvas() {
    // Create a virtual canvas for text measurements
    this.canvas = document.createElement('canvas');
    this.context = this.canvas.getContext('2d');
    console.log('✅ Frontend neural text engine initialized');
  }

  // 🎯 Neural Text Analysis (matching backend)
  analyzeTextLayout(text, containerWidth, containerHeight) {
    console.log('🧠 [FRONTEND NEURAL] Analyzing text layout requirements...');
    
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

    console.log('🧠 [FRONTEND NEURAL] Text analysis complete:', analysis);
    return analysis;
  }

  // 🎨 Smart Font Size Calculator (matching backend)
  calculateOptimalFontSize(analysis, containerWidth, containerHeight) {
    console.log('🎨 [FRONTEND FONT] Computing optimal font size...');
    
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
    console.log('🎨 [FRONTEND FONT] Optimal font size:', finalSize);
    return finalSize;
  }

  // 📏 Precise Text Measurement (matching backend)
  measureText(text, fontSize, fontFamily = 'Arial') {
    this.context.font = `${fontSize}px ${fontFamily}`;
    const metrics = this.context.measureText(text);
    return {
      width: metrics.width,
      height: fontSize * 1.2 // Approximate line height
    };
  }

  // 🧠 Neural Text Wrapping Algorithm (matching backend)
  wrapTextIntelligently(text, maxWidth, fontSize, fontFamily = 'Arial') {
    console.log('🧠 [FRONTEND WRAPPER] Processing intelligent text wrapping...');
    
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
    
    console.log('🧠 [FRONTEND WRAPPER] Generated', lines.length, 'optimized lines');
    return lines;
  }

  // 🎯 Complete Layout Calculation (matching backend)
  calculatePerfectLayout(text, containerWidth, containerHeight) {
    console.log('🎯 [FRONTEND LAYOUT] Calculating perfect text layout...');
    
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
    
    console.log('🎯 [FRONTEND LAYOUT] Perfect layout calculated:', {
      fontSize: layout.fontSize,
      lineCount: layout.lines.length,
      padding: layout.padding,
      verticalOffset: layout.verticalOffset
    });
    
    return layout;
  }

  // 📍 Calculate Line Positions (matching backend)
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

const PDFPreview = ({ file, fileUrl, translations, onBack, onGenerate, isProcessing, originalRectangles, logoUrl, logoPosition }) => {
    const [numPages, setNumPages] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [pdfDimensions, setPdfDimensions] = useState({ width: 0, height: 0 });
    const [showOverlays, setShowOverlays] = useState(true);
    const [stage, setStage] = useState({ scale: 1, x: 0, y: 0 });
    const [logoImage, setLogoImage] = useState(null);
    const [textEngine] = useState(() => new FrontendTextEngine());

    const containerRef = useRef(null);
    const stageRef = useRef(null);

    // Load logo image
    useEffect(() => {
        if (logoUrl) {
            const img = new window.Image();
            img.onload = () => {
                setLogoImage(img);
            };
            img.src = logoUrl;
        } else {
            setLogoImage(null);
        }
    }, [logoUrl]);

    // Prevent wheel scrolling on the PDF container
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const preventWheelScroll = (e) => {
            // Only prevent scroll when hovering over the canvas area
            const rect = container.getBoundingClientRect();
            const x = e.clientX;
            const y = e.clientY;
            
            if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
        };

        container.addEventListener('wheel', preventWheelScroll, { passive: false, capture: true });

        return () => {
            container.removeEventListener('wheel', preventWheelScroll, { capture: true });
        };
    }, []);

    function onDocumentLoadSuccess(loadedPdf) {
        setNumPages(loadedPdf.numPages);
    }
    
    const onPageLoadSuccess = (page) => {
        // Use a fixed width for the viewer and calculate a responsive height
        const viewerWidth = 800;
        const scale = viewerWidth / page.getViewport({ scale: 1 }).width;
        setPdfDimensions({
            width: viewerWidth,
            height: page.getViewport({ scale: scale }).height,
        });
    };

    const handleWheel = (e) => {
        e.evt.preventDefault(); // stop default scroll behavior
        
        const scaleBy = 1.05;
        const stage = e.target.getStage();
        const oldScale = stage.scaleX();
        const pointer = stage.getPointerPosition();
        if (!pointer) return;
        
        const mousePointTo = {
            x: (pointer.x - stage.x()) / oldScale,
            y: (pointer.y - stage.y()) / oldScale,
        };
        
        const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
        setStage({
            scale: newScale,
            x: pointer.x - mousePointTo.x * newScale,
            y: pointer.y - mousePointTo.y * newScale,
        });
    };

    const handleZoom = (direction) => {
        if (!stageRef.current) return;
        const stage = stageRef.current;
        const scaleBy = 1.4;
        const oldScale = stage.scaleX();
        const newScale = direction === 'in' ? oldScale * scaleBy : oldScale / scaleBy;
        const center = {
            x: stage.width() / 2,
            y: stage.height() / 2,
        };
        const relatedTo = {
            x: (center.x - stage.x()) / oldScale,
            y: (center.y - stage.y()) / oldScale,
        };
        setStage({
            scale: newScale,
            x: center.x - relatedTo.x * newScale,
            y: center.y - relatedTo.y * newScale,
        });
    };

    const handleGeneratePDF = async () => {
        if ((translations || []).length === 0) {
            toast.error('No translations to generate.');
            return;
        }
        const finalRectangles = (translations || []).map(t => {
            const rect = (originalRectangles || []).find(r => r.id === t.id);
            return rect ? { ...t, ...rect } : t;
        });
        
        try {
            // Prepare form data for logo upload (same as editor)
            const formData = new FormData();
            formData.append('fileId', file.id);
            formData.append('translations', JSON.stringify(finalRectangles));
            
            if (logoUrl) {
                // Convert logo URL back to file for upload
                const response = await fetch(logoUrl);
                const blob = await response.blob();
                const logoFile = new File([blob], 'logo.png', { type: 'image/png' });
                formData.append('logo', logoFile);
                formData.append('logoPosition', JSON.stringify(logoPosition));
            }
            
            const response = await axios.post('/api/overlay', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (response.data.success) {
                toast.success('PDF generated successfully! Starting download...');
                const { id, name } = response.data.processedFile;
                const downloadUrl = `/api/download/${id}`;
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.download = name;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                onGenerate(); // Signal completion
            } else {
                toast.error(response.data.message || 'Failed to generate PDF');
            }
        } catch (error) {
            console.error('PDF generation error:', error);
            toast.error('Failed to generate PDF.');
        }
    };

    // 🎯 Neural Perfect Preview Rendering Function
    const renderNeuralPreview = (translation) => {
        const text = translation.translation || '';
        
        console.log('🎯 [NEURAL PREVIEW] Rendering neural preview for:', {
            id: translation.id,
            text: text.substring(0, 50) + '...',
            container: { width: translation.width, height: translation.height }
        });
        
        // 🧠 Neural Layout Analysis (matching backend exactly)
        const perfectLayout = textEngine.calculatePerfectLayout(text, translation.width, translation.height);
        
        // 📍 Calculate Perfect Line Positions
        const linePositions = textEngine.calculateLinePositions(
            perfectLayout, 
            translation.x, 
            translation.y, 
            translation.width
        );

        console.log('🎯 [NEURAL PREVIEW] Neural layout calculated:', {
            fontSize: perfectLayout.fontSize,
            lineCount: perfectLayout.lines.length,
            padding: perfectLayout.padding,
            verticalOffset: perfectLayout.verticalOffset,
            linePositions: linePositions.length
        });

        return (
            <React.Fragment key={translation.id}>
                {/* 🎯 Perfect White Background with Neural Styling */}
                <Rect
                    x={translation.x}
                    y={translation.y}
                    width={translation.width}
                    height={translation.height}
                    fill={perfectLayout.backgroundColor}
                    stroke={perfectLayout.borderColor}
                    strokeWidth={perfectLayout.borderWidth}
                    cornerRadius={perfectLayout.borderRadius}
                    shadowColor="rgba(0,0,0,0.1)"
                    shadowBlur={4}
                    shadowOffset={{ x: 2, y: 2 }}
                />
                
                {/* 🧠 Neural Text Rendering - Pixel Perfect */}
                {linePositions.map((linePos, index) => {
                    console.log(`🎯 [NEURAL PREVIEW] Rendering line ${index + 1}:`, {
                        text: linePos.text,
                        x: linePos.x,
                        y: linePos.y,
                        fontSize: perfectLayout.fontSize
                    });
                    
                    return (
                        <Text
                            key={`${translation.id}-neural-line-${index}`}
                            text={linePos.text}
                            x={linePos.x}
                            y={linePos.y}
                            fontSize={perfectLayout.fontSize}
                            fontFamily="Arial, sans-serif"
                            fill={perfectLayout.textColor}
                            align="left"
                            perfectDrawEnabled={false} // Better performance
                        />
                    );
                })}
            </React.Fragment>
        );
    };

    const currentPageRectangles = (originalRectangles || []).filter(r => r.page === pageNumber - 1);
    const currentPageRectangleIds = new Set(currentPageRectangles.map(r => r.id));
    const currentTranslations = (translations || []).filter(t => t.page === pageNumber - 1);

    return (
        <div className="flex flex-col h-full glass-dark rounded-xl border border-cyan-500/30 shadow-2xl">
            {/* Toolbar */}
            <div className="flex items-center justify-between p-4 border-b border-cyan-500/20 bg-slate-800/50">
                <div className="flex items-center space-x-3">
                    <button
                        onClick={onBack}
                        className="flex items-center space-x-2 px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors border border-slate-600/30"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back to Editor</span>
                    </button>
                    
                    <div className="flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg border border-purple-500/30">
                        <Brain className="w-4 h-4 text-purple-400" />
                        <span className="text-purple-400 text-sm font-medium">Neural Preview</span>
                    </div>
                </div>
                
                <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1 bg-slate-700/50 p-1 rounded-lg border border-slate-600/30">
                        <button onClick={() => handleZoom('out')} className="p-2 rounded-md hover:bg-slate-600/50 text-slate-300"><ZoomOut className="w-4 h-4" /></button>
                        <div className="text-sm font-semibold w-12 text-center text-slate-300">{(stage.scale * 100).toFixed(0)}%</div>
                        <button onClick={() => handleZoom('in')} className="p-2 rounded-md hover:bg-slate-600/50 text-slate-300"><ZoomIn className="w-4 h-4" /></button>
                    </div>
                    <button
                        onClick={() => setShowOverlays(!showOverlays)}
                        className={`p-2 rounded-lg border ${showOverlays ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' : 'bg-slate-700/50 text-slate-400 border-slate-600/30'}`}
                        title="Toggle neural overlays"
                    >
                        <Eye className="w-4 h-4" />
                    </button>
                    
                    {numPages > 1 && (
                    <div className="flex items-center space-x-2 border-l border-slate-600/30 pl-3 ml-3">
                        <button
                            onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
                            disabled={pageNumber <= 1}
                            className="p-2 rounded-lg bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 disabled:opacity-50 border border-slate-600/30"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                        <span className="text-sm font-medium text-slate-300 px-3">
                            Page {pageNumber} of {numPages}
                        </span>
                        <button
                            onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))}
                            disabled={pageNumber >= numPages}
                            className="p-2 rounded-lg bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 disabled:opacity-50 border border-slate-600/30"
                        >
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                    )}
                </div>
                
                <div className="flex items-center space-x-3">
                    <button
                        onClick={handleGeneratePDF}
                        disabled={isProcessing}
                        className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white rounded-lg disabled:opacity-50 flex items-center space-x-2 font-semibold shadow-lg shadow-emerald-500/25 border-0"
                    >
                        <Sparkles className="w-5 h-5" />
                        <span>Generate PDF</span>
                    </button>
                </div>
            </div>

            {/* PDF and Neural Overlay */}
            <div 
                ref={containerRef} 
                className="flex-grow relative overflow-auto bg-slate-900/50"
                style={{ height: pdfDimensions.height ? (pdfDimensions.height * stage.scale + 40) : 'calc(100vh - 250px)' }}
            >
                <div 
                    className="absolute top-0 left-1/2" 
                    style={{ 
                        width: pdfDimensions.width, 
                        height: pdfDimensions.height,
                        transform: `translateX(-50%) scale(${stage.scale})`,
                        transformOrigin: 'top center'
                    }}
                >
                    {/* PDF Background - Non-interactive */}
                    <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                        <Document
                            file={fileUrl}
                            onLoadSuccess={onDocumentLoadSuccess}
                            onLoadError={(error) => {
                                console.error('PDF Load Error:', error);
                                toast.error(`Failed to load PDF: ${error.message}`);
                            }}
                        >
                            <Page
                                pageNumber={pageNumber}
                                onLoadSuccess={onPageLoadSuccess}
                                width={pdfDimensions.width}
                                loading={<div className="p-8 text-center text-slate-400">Loading page...</div>}
                            />
                        </Document>
                    </div>

                    {/* Interactive Konva Stage with Neural Rendering */}
                    <Stage
                        ref={stageRef}
                        width={pdfDimensions.width} 
                        height={pdfDimensions.height} 
                        scaleX={stage.scale}
                        scaleY={stage.scale}
                        x={stage.x}
                        y={stage.y}
                        onWheel={handleWheel}
                        draggable={true}
                        className="absolute top-0 left-0 pointer-events-auto"
                        onDragEnd={(e) => setStage({ ...stage, x: e.target.x(), y: e.target.y() })}
                    >
                        <Layer>
                            {/* Logo Preview */}
                            {logoImage && logoPosition && (
                                <Image
                                    image={logoImage}
                                    {...logoPosition}
                                    opacity={0.7}
                                />
                            )}
                            
                            {/* 🧠 Neural Perfect Preview Rendering */}
                            {showOverlays && currentTranslations.map((translation) => 
                                renderNeuralPreview(translation)
                            )}
                        </Layer>
                    </Stage>
                </div>
            </div>
        </div>
    );
};

export default PDFPreview;