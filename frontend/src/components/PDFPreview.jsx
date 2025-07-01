import React, { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Stage, Layer, Rect, Text, Image } from 'react-konva';
import { ArrowLeft, ArrowRight, Download, Eye, ZoomIn, ZoomOut, Sparkles } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const PDFPreview = ({ file, fileUrl, translations, onBack, onGenerate, isProcessing, originalRectangles, logoUrl, logoPosition }) => {
    const [numPages, setNumPages] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [pdfDimensions, setPdfDimensions] = useState({ width: 0, height: 0 });
    const [showOverlays, setShowOverlays] = useState(true);
    const [stage, setStage] = useState({ scale: 1, x: 0, y: 0 });
    const [logoImage, setLogoImage] = useState(null);

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

    // 🎯 AI-Powered Text Formatting Analysis (matching backend)
    const analyzeTextFormatting = (text, containerWidth, containerHeight) => {
        console.log('🤖 [PREVIEW AI FORMATTER] Analyzing text formatting requirements...');
        
        // AI-powered text analysis
        const textLength = text.length;
        const wordCount = text.split(/\s+/).length;
        
        // Calculate optimal font size based on container and content
        const baseSize = Math.min(containerWidth / 20, containerHeight / 4);
        let optimalFontSize = Math.max(8, Math.min(18, baseSize));
        
        // Adjust for text density
        if (textLength > 200) optimalFontSize *= 0.8;
        if (textLength < 50) optimalFontSize *= 1.2;
        
        // Calculate spacing and padding
        const padding = Math.max(8, optimalFontSize * 0.5);
        const lineHeight = optimalFontSize * 1.3;
        
        const formatting = {
            fontSize: Math.round(optimalFontSize),
            lineHeight: Math.round(lineHeight),
            padding: Math.round(padding),
            textAlign: 'center', // Center alignment for better appearance
            maxLines: Math.floor((containerHeight - padding * 2) / lineHeight),
            backgroundColor: 'white',
            textColor: 'black',
            borderRadius: 4
        };
        
        console.log('🤖 [PREVIEW AI FORMATTER] Optimal formatting calculated:', {
            textLength,
            wordCount,
            containerSize: `${containerWidth}x${containerHeight}`,
            formatting
        });
        
        return formatting;
    };

    // 🧠 Smart Text Wrapping with AI (matching backend)
    const smartTextWrap = (text, maxWidth, fontSize, maxLines) => {
        console.log('🧠 [PREVIEW SMART WRAPPER] Processing text for optimal layout...');
        
        const words = text.split(/\s+/).filter(word => word.length > 0);
        const lines = [];
        let currentLine = '';
        
        // Approximate character width for font sizing
        const charWidth = fontSize * 0.6;
        const maxCharsPerLine = Math.floor(maxWidth / charWidth);
        
        for (const word of words) {
            const testLine = currentLine === '' ? word : currentLine + ' ' + word;
            
            if (testLine.length <= maxCharsPerLine) {
                currentLine = testLine;
            } else {
                if (currentLine !== '') {
                    lines.push(currentLine);
                    if (lines.length >= maxLines) break; // Respect max lines
                    currentLine = word;
                } else {
                    // Word too long, break it intelligently
                    const chars = word.split('');
                    let partialWord = '';
                    for (const char of chars) {
                        const testChar = partialWord + char;
                        if (testChar.length <= maxCharsPerLine) {
                            partialWord = testChar;
                        } else {
                            if (partialWord) {
                                lines.push(partialWord);
                                if (lines.length >= maxLines) break;
                            }
                            partialWord = char;
                        }
                    }
                    if (partialWord && lines.length < maxLines) currentLine = partialWord;
                }
            }
        }
        
        if (currentLine !== '' && lines.length < maxLines) {
            lines.push(currentLine);
        }
        
        console.log('🧠 [PREVIEW SMART WRAPPER] Generated', lines.length, 'optimized lines');
        return lines;
    };

    // 🎯 Perfect Preview Rendering Function
    const renderPerfectPreview = (translation) => {
        const text = translation.translation || '';
        
        // 🤖 AI Style Analysis (matching backend logic)
        const aiFormatting = analyzeTextFormatting(text, translation.width, translation.height);
        
        // 🧠 Neural Text Wrapping Algorithm
        const maxWidth = translation.width - (aiFormatting.padding * 2);
        const wrappedText = smartTextWrap(text, maxWidth, aiFormatting.fontSize, aiFormatting.maxLines);
        
        // Calculate total text height for vertical centering
        const totalTextHeight = wrappedText.length * aiFormatting.lineHeight;
        const extraSpace = translation.height - totalTextHeight - (aiFormatting.padding * 2);
        const verticalOffset = extraSpace > 0 ? extraSpace / 2 : 0;

        return (
            <React.Fragment key={translation.id}>
                {/* 🎯 SOLID WHITE BACKGROUND (Clean Overlay) */}
                <Rect
                    x={translation.x}
                    y={translation.y}
                    width={translation.width}
                    height={translation.height}
                    fill="white"
                    stroke="#e0e0e0"
                    strokeWidth={0.5}
                    cornerRadius={aiFormatting.borderRadius}
                />
                
                {/* 🎯 AI-Formatted Text Rendering */}
                {wrappedText.map((line, index) => {
                    const lineWidth = line.length * (aiFormatting.fontSize * 0.6);
                    
                    // AI-powered text alignment (center for better appearance)
                    let lineX;
                    if (aiFormatting.textAlign === 'center') {
                        lineX = translation.x + (translation.width - lineWidth) / 2;
                    } else {
                        lineX = translation.x + translation.width - lineWidth - aiFormatting.padding; // Right align
                    }
                    
                    const lineY = translation.y + aiFormatting.padding + aiFormatting.fontSize + verticalOffset + (index * aiFormatting.lineHeight);
                    
                    return (
                        <Text
                            key={`${translation.id}-perfect-line-${index}`}
                            text={line}
                            x={lineX}
                            y={lineY}
                            fontSize={aiFormatting.fontSize}
                            fontFamily="Arial, sans-serif"
                            fill="black" // Pure black text
                            align="left"
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
                        title="Toggle translation overlays"
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

            {/* PDF and Overlay */}
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

                    {/* Interactive Konva Stage */}
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
                            
                            {/* 🎯 Perfect Preview Rendering */}
                            {showOverlays && currentTranslations.map((translation) => 
                                renderPerfectPreview(translation)
                            )}
                        </Layer>
                    </Stage>
                </div>
            </div>
        </div>
    );
};

export default PDFPreview;