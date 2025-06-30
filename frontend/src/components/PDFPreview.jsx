import React, { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Stage, Layer, Label, Tag, Text, Image, Circle, Rect } from 'react-konva';
import { ArrowLeft, ArrowRight, Download, Eye, ZoomIn, ZoomOut } from 'lucide-react';
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

    const currentPageRectangles = (originalRectangles || []).filter(r => r.page === pageNumber - 1);
    const currentPageRectangleIds = new Set(currentPageRectangles.map(r => r.id));
    const currentTranslations = (translations || []).filter(t => t.page === pageNumber - 1);

    return (
        <div className="flex flex-col h-full bg-white rounded-lg shadow-lg">
            {/* Toolbar */}
            <div className="flex items-center justify-between p-2 border-b bg-gray-50">
                <div className="flex items-center space-x-2">
                    <button
                        onClick={onBack}
                        className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back to Editor</span>
                    </button>
                </div>
                
                <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1 bg-gray-200 p-1 rounded-md">
                        <button onClick={() => handleZoom('out')} className="p-1.5 rounded-md hover:bg-gray-300"><ZoomOut className="w-4 h-4" /></button>
                        <div className="text-sm font-semibold w-12 text-center">{(stage.scale * 100).toFixed(0)}%</div>
                        <button onClick={() => handleZoom('in')} className="p-1.5 rounded-md hover:bg-gray-300"><ZoomIn className="w-4 h-4" /></button>
                    </div>
                    <button
                        onClick={() => setShowOverlays(!showOverlays)}
                        className={`p-2 rounded-md ${showOverlays ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
                        title="Toggle translation overlays"
                    >
                        <Eye className="w-4 h-4" />
                    </button>
                    
                    {numPages > 1 && (
                    <div className="flex items-center space-x-2 border-l pl-2 ml-2">
                        <button
                            onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
                            disabled={pageNumber <= 1}
                            className="p-2 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                        <span className="text-sm font-medium text-gray-700">
                            Page {pageNumber} of {numPages}
                        </span>
                        <button
                            onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))}
                            disabled={pageNumber >= numPages}
                            className="p-2 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50"
                        >
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                    )}
                </div>
                
                <div className="flex items-center space-x-2">
                    <button
                        onClick={handleGeneratePDF}
                        disabled={isProcessing}
                        className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2 font-semibold"
                    >
                        <Download className="w-5 h-5" />
                        <span>Generate PDF</span>
                    </button>
                </div>
            </div>

            {/* PDF and Overlay */}
            <div 
                ref={containerRef} 
                className="flex-grow relative overflow-auto bg-gray-200"
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
                                loading={<div className="p-8 text-center">Loading page...</div>}
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
                            
                            {showOverlays && currentTranslations.map((translation) => {
                                const text = translation.translation || '';
                                const fontSize = Math.max(8, Math.min(16, translation.height / 3));

                                return (
                                    <React.Fragment key={translation.id}>
                                        {/* White background and red border */}
                                        <Rect
                                            x={translation.x}
                                            y={translation.y}
                                            width={translation.width}
                                            height={translation.height}
                                            fill="white"
                                            stroke="red"
                                            strokeWidth={1}
                                        />
                                        {/* Translated Text */}
                                        <Text
                                            text={text}
                                            x={translation.x + 2} // Padding from left
                                            y={translation.y + 2} // Padding from top
                                            width={translation.width - 4} // Padding
                                            height={translation.height - 4} // Padding
                                            fontSize={fontSize}
                                            fontFamily="Arial" // Use a common font
                                            fill="black"
                                            align="right" // RTL alignment
                                            verticalAlign="top"
                                        />
                                    </React.Fragment>
                                );
                            })}
                        </Layer>
                    </Stage>
                </div>
            </div>
        </div>
    );
};

export default PDFPreview; 