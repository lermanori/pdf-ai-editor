import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Stage, Layer, Rect, Text, Transformer, Image } from 'react-konva';
import { Eye, Zap, Download, Move, Plus, Trash2, Copy, Pin, ZoomIn, ZoomOut, Search, ArrowLeft, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import ProcessingStatus from './ProcessingStatus';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const ResizableRect = ({ shapeProps, isSelected, onSelect, onChange }) => {
  const shapeRef = useRef();
  const trRef = useRef();

  useEffect(() => {
    if (isSelected) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  return (
    <>
      <Rect
        onClick={onSelect}
        onTap={onSelect}
        ref={shapeRef}
        {...shapeProps}
        draggable
        onDragEnd={(e) => {
          onChange({ ...shapeProps, x: e.target.x(), y: e.target.y() });
        }}
        onTransformEnd={(e) => {
          const node = shapeRef.current;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          node.scaleX(1);
          node.scaleY(1);
          onChange({
            ...shapeProps,
            x: node.x(),
            y: node.y(),
            width: Math.max(5, node.width() * scaleX),
            height: Math.max(5, node.height() * scaleY),
          });
        }}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 5 || newBox.height < 5) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}
    </>
  );
};

const PDFViewer = ({ 
  file,
  fileUrl,
  rectangles, 
  translations,
  detectedRectangles,
  onRectanglesDetected,
  onTextDetected,
  onTranslationsReceived,
  onProcessingComplete,
  onPreview,
  isProcessing,
  setIsProcessing,
  setProcessingStep,
  logoFile,
  logoUrl,
  logoPosition,
  setLogoFile,
  setLogoUrl,
  setLogoPosition,
  hasPendingChanges,
  setHasPendingChanges
}) => {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfDimensions, setPdfDimensions] = useState({ width: 0, height: 0 });
  const [stage, setStage] = useState({ scale: 1, x: 0, y: 0 });
  const [showRectangles, setShowRectangles] = useState(true);
  const [isDragMode, setIsDragMode] = useState(false);
  const [localRectangles, setLocalRectangles] = useState([]);
  const [selectedId, selectShape] = useState(null);
  const [isInteractingWithShape, setIsInteractingWithShape] = useState(false);
  const [detectionStep, setDetectionStep] = useState('none'); // 'none', 'detecting', 'detected'
  const [selectedLogo, setSelectedLogo] = useState(false);
  const [logoImage, setLogoImage] = useState(null);

  const stageRef = useRef(null);
  const transformerRef = useRef(null);
  const isPanning = useRef(false);
  const lastPointerPosition = useRef({ x: 0, y: 0 });
  const containerRef = useRef(null);

  // Initialize logo position if not provided
  const currentLogoPosition = logoPosition || { x: 10, y: 10, width: 60, height: 30 };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space') {
        isPanning.current = true;
        document.body.style.cursor = 'grab';
        e.preventDefault();
      }
    };
    const handleKeyUp = (e) => {
      if (e.code === 'Space') {
        isPanning.current = false;
        document.body.style.cursor = 'default';
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

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

  const handleWheel = (e) => {
    console.log('Konva wheel event triggered');
    e.evt.preventDefault();
    e.evt.stopPropagation();
    
    const scaleBy = 1.1;
    const stage = e.target.getStage();
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();

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
    const scaleBy = 1.2;
    const stage = stageRef.current;
    const oldScale = stage.scaleX();
    
    const newScale = direction === 'in' ? oldScale * scaleBy : oldScale / scaleBy;
    
    setStage({
      ...stage.position(),
      scale: newScale,
    });
  };

  useEffect(() => {
    if (file && file.filename && rectangles.length === 0) {
      detectRectangles();
    }
  }, [file, rectangles.length]);

  useEffect(() => {
    setLocalRectangles(rectangles);
  }, [rectangles]);

  useEffect(() => {
    if (selectedId && transformerRef.current) {
      const stage = stageRef.current;
      const selectedNode = stage.findOne(`#${selectedId}`);
      if (selectedNode) {
        transformerRef.current.nodes([selectedNode]);
        transformerRef.current.getLayer().batchDraw();
      }
    } else if (selectedLogo && transformerRef.current && logoImage) {
      const stage = stageRef.current;
      const logoNode = stage.findOne('logo');
      if (logoNode) {
        transformerRef.current.nodes([logoNode]);
        transformerRef.current.getLayer().batchDraw();
      }
    }
  }, [selectedId, selectedLogo, logoImage]);

  const detectRectangles = async () => {
    if (!file || !file.filename) {
      toast.error("Cannot detect rectangles without a valid file.");
      return;
    }
    
    try {
      setIsProcessing(true);
      setProcessingStep('Detecting text areas...');
      
      const response = await axios.post('/api/detect', {
        filename: file.filename
      });

      if (response.data.success) {
        onRectanglesDetected(response.data.rectangles);
        toast.success(`Detected ${response.data.rectangles.length} text areas`);
      }
    } catch (error) {
      console.error('Detection error:', error);
      toast.error('Failed to detect text areas');
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  const detectTextFromRectangles = async () => {
    if (localRectangles.length === 0) {
      toast.error('No rectangles to detect text from');
      return;
    }

    // First, update the parent component with the latest rectangles.
    onRectanglesDetected(localRectangles);

    try {
      setIsProcessing(true);
      setDetectionStep('detecting');
      setProcessingStep('Extracting text from PDF...');
      
      console.log("Sending to /api/translate/detect:", { fileId: file.id, rectangles: localRectangles });
      const response = await axios.post('/api/translate/detect', {
        fileId: file.id,
        rectangles: localRectangles
      });

      if (response.data.success) {
        onTextDetected(response.data.detectedRectangles);
        setDetectionStep('detected');
        toast.success(response.data.message || 'Text extraction complete!');
      } else {
        toast.error(response.data.message || 'Failed to extract text');
      }
    } catch (error) {
      console.error('Text detection error:', error);
      toast.error('Failed to extract text from PDF');
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  const translateRectangles = async () => {
    if (!detectedRectangles || detectedRectangles.length === 0) {
      toast.error('No detected text to translate. Please detect text first.');
      return;
    }

    try {
      setIsProcessing(true);
      setProcessingStep('Translating text with AI...');
      
      console.log("Sending to /api/translate:", { fileId: file.id, rectangles: detectedRectangles });
      const response = await axios.post('/api/translate', {
        fileId: file.id,
        rectangles: detectedRectangles
      });

      if (response.data.success) {
        onTranslationsReceived(response.data.translations, detectedRectangles);
        toast.success(response.data.message || 'Translation complete!');
      } else {
        toast.error(response.data.message || 'Failed to translate');
      }
    } catch (error) {
      console.error('Translation error:', error);
      toast.error('Failed to translate text');
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  const processAndDownload = async () => {
    if (translations.length === 0) {
      toast.error('No translations available');
      return;
    }

    try {
      setIsProcessing(true);
      setProcessingStep('Processing PDF...');
      
      // Use updated rectangle positions
      const updatedTranslations = translations.map(translation => {
        const updatedRect = localRectangles.find(r => r.id === translation.id);
        if (updatedRect) {
          return { ...translation, ...updatedRect };
        }
        return translation;
      });
      
      // Prepare form data for logo upload
      const formData = new FormData();
      formData.append('fileId', file.id);
      formData.append('translations', JSON.stringify(updatedTranslations));
      
      if (logoFile) {
        formData.append('logo', logoFile);
        formData.append('logoPosition', JSON.stringify(logoPosition));
      }
      
      const response = await axios.post('/api/overlay', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        toast.success('PDF processed successfully! Starting download...');
        const { id, name } = response.data.processedFile;
        const downloadUrl = `/api/download/${id}`;
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        toast.error(response.data.message || 'Failed to process PDF');
      }
    } catch (error) {
      console.error('Processing error:', error);
      toast.error('Failed to process PDF');
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    console.log(`PDF loaded with ${numPages} pages`);
  };

  const onPageLoadSuccess = (page) => {
    // Use a fixed width for the viewer and calculate a responsive height
    const viewerWidth = 800;
    const scale = viewerWidth / page.getViewport({ scale: 1 }).width;
    setPdfDimensions({
      width: viewerWidth,
      height: page.getViewport({ scale: scale }).height,
    });
  };

  const handleRectangleDrag = (rectId, newPos) => {
    if (!isDragMode) return;
    
    setLocalRectangles(prev => prev.map(rect => 
      rect.id === rectId 
        ? { ...rect, x: newPos.x, y: newPos.y }
        : rect
    ));
  };

  const handleRectangleResize = (rectId, newSize) => {
    if (!isDragMode) return;
    
    setLocalRectangles(prev => prev.map(rect => 
      rect.id === rectId 
        ? { ...rect, width: newSize.width, height: newSize.height }
        : rect
    ));
  };

  const resetRectangles = () => {
    setLocalRectangles(rectangles);
    setDetectionStep('none');
    onTextDetected([]);
    onTranslationsReceived([], []);
    toast.success('Rectangle positions reset');
    setHasPendingChanges(false);
  };

  const addNewRectangle = () => {
    const newId = `manual_${Date.now()}`;
    
    // Calculate center position based on current view
    const stage = stageRef.current;
    let centerX = 400; // Default center
    let centerY = 300; // Default center
    
    if (stage) {
      // Get the center of the current view
      const stageWidth = stage.width();
      const stageHeight = stage.height();
      centerX = (stageWidth / 2 - stage.x()) / stage.scaleX();
      centerY = (stageHeight / 2 - stage.y()) / stage.scaleY();
    }
    
    const newRect = {
      id: newId,
      page: pageNumber - 1,
      x: centerX - 75, // Center the rectangle
      y: centerY - 25,
      width: 150,
      height: 50,
      text: 'Manual Area',
      isManual: true,
      mode: 'individual', // 'individual' or 'repeated'
      stroke: '#ff4d4d',
      fill: 'rgba(255, 77, 77, 0.1)', // Light red fill for manual rectangles
    };
    
    setLocalRectangles([...localRectangles, newRect]);
    selectShape(newId);
    setDetectionStep('none');
    onTextDetected([]);
    onTranslationsReceived([], []);
    setHasPendingChanges(true);
    toast.success('New manual area added. Drag and resize it as needed.');
  };

  const addRepeatedRectangle = () => {
    const newId = `repeated_${Date.now()}`;
    
    const stage = stageRef.current;
    let centerX = 400;
    let centerY = 300;
    
    if (stage) {
      const stageWidth = stage.width();
      const stageHeight = stage.height();
      centerX = (stageWidth / 2 - stage.x()) / stage.scaleX();
      centerY = (stageHeight / 2 - stage.y()) / stage.scaleY();
    }
    
    const newRect = {
      id: newId,
      page: -1, // Assign to a "global" page
      x: centerX - 75,
      y: centerY - 25,
      width: 150,
      height: 50,
      text: 'Repeated Area',
      isManual: true,
      mode: 'repeated',
      stroke: '#8b5cf6',
      fill: 'rgba(139, 92, 244, 0.1)',
    };
    
    console.log('🔍 [DEBUG] Creating new repeated rectangle:');
    console.log('  - ID:', newRect.id);
    console.log('  - Page:', newRect.page);
    console.log('  - Coordinates:', { x: newRect.x, y: newRect.y, width: newRect.width, height: newRect.height });
    console.log('  - Stage info:', { 
      stageWidth: stage?.width(), 
      stageHeight: stage?.height(), 
      stageX: stage?.x(), 
      stageY: stage?.y(),
      stageScaleX: stage?.scaleX(),
      stageScaleY: stage?.scaleY()
    });
    console.log('  - Center calculation:', { centerX, centerY });
    console.log('  - Final rectangle:', newRect);
    
    setLocalRectangles(prevRects => [...prevRects, newRect]);
    selectShape(newId);
    setDetectionStep('none');
    onTextDetected([]);
    onTranslationsReceived([], []);
    setHasPendingChanges(true);
    toast.success('New repeated area added. This will appear on all pages.');
  };

  const deleteSelectedRectangle = () => {
    if (selectedId) {
      setLocalRectangles(localRectangles.filter(rect => rect.id !== selectedId));
      selectShape(null);
      setDetectionStep('none');
      onTextDetected([]);
      onTranslationsReceived([], []);
      setHasPendingChanges(true);
      toast.success('Rectangle deleted');
    }
  };

  const toggleRectangleMode = () => {
    if (selectedId) {
      setLocalRectangles(prev => prev.map(rect => {
        if (rect.id === selectedId) {
          const newMode = rect.mode === 'individual' ? 'repeated' : 'individual';
          const modeText = newMode === 'repeated' ? 'repeated on all pages' : 'individual page only';
          toast.success(`Rectangle mode set to: ${modeText}`);
          
          // Update visual styling based on mode
          const updatedRect = { 
            ...rect, 
            mode: newMode,
            stroke: newMode === 'repeated' ? '#8b5cf6' : '#ff4d4d', // Purple for repeated, red for individual
            fill: newMode === 'repeated' ? 'rgba(139, 92, 244, 0.1)' : 'rgba(255, 77, 77, 0.1)'
          };
          
          return updatedRect;
        }
        return rect;
      }));
    } else {
      toast.error('Please select a rectangle first');
    }
  };

  const checkDeselect = (e) => {
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty) {
      selectShape(null);
      setSelectedLogo(false);
    }
  };

  const handleMouseDown = (e) => {
    // Check if clicking on a shape
    const clickedOnShape = e.target.hasName('rectangle') || e.target.hasName('text');
    setIsInteractingWithShape(clickedOnShape);
    
    if (isPanning.current && !clickedOnShape) {
      lastPointerPosition.current = e.target.getStage().getPointerPosition();
    }
    checkDeselect(e);
  };

  const handleMouseMove = (e) => {
    if (!isPanning.current || !lastPointerPosition.current || isInteractingWithShape) return;
    const stage = e.target.getStage();
    const newPos = {
      x: stage.getPointerPosition().x - lastPointerPosition.current.x + stage.x(),
      y: stage.getPointerPosition().y - lastPointerPosition.current.y + stage.y(),
    };
    setStage({ ...stage.attrs, ...newPos });
    lastPointerPosition.current = stage.getPointerPosition();
  };

  const handleMouseUp = () => {
    setIsInteractingWithShape(false);
  };

  const handleLogoUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Logo file must be smaller than 5MB');
        return;
      }
      
      setLogoFile(file);
      
      // Create preview URL
      const url = URL.createObjectURL(file);
      setLogoUrl(url);
      
      toast.success('Logo uploaded successfully');
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    if (logoUrl) {
      URL.revokeObjectURL(logoUrl);
      setLogoUrl(null);
    }
    setSelectedLogo(false);
    toast.success('Logo removed');
  };

  const handleLogoDrag = (newPos) => {
    setLogoPosition(prev => ({ ...prev, x: newPos.x, y: newPos.y }));
  };

  const handleLogoResize = (newSize) => {
    setLogoPosition(prev => ({ 
      ...prev, 
      width: Math.max(20, newSize.width), 
      height: Math.max(10, newSize.height) 
    }));
  };

  const handleLogoSelect = () => {
    selectShape(null);
    setSelectedLogo(true);
    console.log('Logo selected at position:', currentLogoPosition);
  };

  const handleLogoDeselect = () => {
    setSelectedLogo(false);
  };

  const currentPageRectangles = localRectangles.filter(rect => {
    // Show on all pages if mode is 'repeated' or page is -1 (our new global page marker)
    if (rect.mode === 'repeated' || rect.page === -1) {
      return true;
    }
    // Otherwise, show only on its assigned page
    return rect.page === pageNumber - 1;
  });

  // Load logo image for Konva
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

  const handleApplyChanges = async () => {
    if (isProcessing || localRectangles.length === 0) return;

    setIsProcessing(true);
    try {
      // 1. Detect Text
      setProcessingStep('Re-detecting text...');
      const detectResponse = await axios.post('/api/translate/detect', {
        fileId: file.id,
        rectangles: localRectangles
      });

      if (!detectResponse.data.success) {
        toast.error(detectResponse.data.message || 'Failed to detect text.');
        return;
      }
      
      const newDetectedRectangles = detectResponse.data.detectedRectangles;
      onTextDetected(newDetectedRectangles);
      setDetectionStep('detected');
      toast.success('Text detection complete!');

      // 2. Translate Text
      setProcessingStep('Translating updated text...');
      const translateResponse = await axios.post('/api/translate', {
        fileId: file.id,
        rectangles: newDetectedRectangles
      });

      if (translateResponse.data.success) {
        onTranslationsReceived(translateResponse.data.translations, newDetectedRectangles);
        toast.success('Translation complete!');
        setHasPendingChanges(false); // Reset the flag on full success
      } else {
        toast.error(translateResponse.data.message || 'Failed to translate text.');
      }
    } catch (error) {
      console.error('Apply changes error:', error);
      toast.error('An error occurred while applying changes.');
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  if (isProcessing && !fileUrl) {
    return <ProcessingStatus step={processingStep} />;
  }
  
  if (!fileUrl) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100 rounded-lg">
        <p className="text-gray-500">Waiting for a valid PDF...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg">
      {/* Toolbar */}
      <TooltipProvider>
        <div className="flex items-center justify-between p-2 border-b bg-gray-50">
          {/* Left: File Info */}
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {file?.originalName || 'PDF Document'}
            </h3>
            {file?.size && (
              <span className="text-sm text-gray-500">
                {(file.size / 1024 / 1024).toFixed(1)} MB
              </span>
            )}
          </div>
          
          {/* Center: View Controls */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 bg-gray-200 p-1 rounded-md">
              <button onClick={() => handleZoom('out')} className="p-1.5 rounded-md hover:bg-gray-300"><ZoomOut className="w-4 h-4" /></button>
              <div className="text-sm font-semibold w-12 text-center">{(stage.scale * 100).toFixed(0)}%</div>
              <button onClick={() => handleZoom('in')} className="p-1.5 rounded-md hover:bg-gray-300"><ZoomIn className="w-4 h-4" /></button>
            </div>
            
            {numPages > 1 && (
              <div className="flex items-center space-x-2 border-l pl-2 ml-2">
                <button
                  onClick={() => setPageNumber(pageNumber - 1)}
                  disabled={pageNumber <= 1}
                  className="p-2 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-medium text-gray-700">
                  Page {pageNumber} of {numPages}
                </span>
                <button
                  onClick={() => setPageNumber(pageNumber + 1)}
                  disabled={pageNumber >= numPages}
                  className="p-2 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            <button
              onClick={() => setShowRectangles(!showRectangles)}
              className={`p-2 rounded-md ${showRectangles ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
              title="Toggle rectangles"
            >
              <Eye className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsDragMode(!isDragMode)}
              className={`p-2 rounded-md ${isDragMode ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}
              title="Toggle drag/resize mode"
            >
              <Move className="w-4 h-4" />
            </button>
            
            {isDragMode && (
              <button
                onClick={resetRectangles}
                className="px-3 py-2 text-xs bg-orange-100 text-orange-600 rounded-md hover:bg-orange-200"
              >
                Reset
              </button>
            )}
          </div>
          
          {/* Right: Action Buttons */}
          <div className="flex items-center space-x-2">
            {hasPendingChanges ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={handleApplyChanges} disabled={isProcessing} variant="default" className="bg-green-600 hover:bg-green-700">
                    <Zap className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Apply Changes & Translate</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <>
                {localRectangles.length === 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={detectRectangles} disabled={isProcessing}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Detect Areas</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                
                {localRectangles.length > 0 && detectionStep !== 'detected' && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={detectTextFromRectangles} disabled={isProcessing}>
                        <Zap className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Detect Text</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                
                {detectionStep === 'detected' && translations.length === 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={translateRectangles} disabled={isProcessing}>
                        <Zap className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Translate</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                
                {translations.length > 0 && (
                  <>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button onClick={translateRectangles} disabled={isProcessing}>
                          <Zap className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Re-translate</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button onClick={() => onPreview && onPreview(localRectangles, logoFile, logoUrl, logoPosition)} disabled={isProcessing} variant="outline">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Preview</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button onClick={processAndDownload} disabled={isProcessing} className="bg-purple-600 hover:bg-purple-700">
                          <Download className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Process PDF</p>
                      </TooltipContent>
                    </Tooltip>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </TooltipProvider>

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
              loading={<ProcessingStatus step="Loading PDF..." />}
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
            draggable={isPanning.current && !isInteractingWithShape}
            className="absolute top-0 left-0 pointer-events-auto"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            <Layer>
              {currentPageRectangles.map(rect => {
                // Determine stroke color based on rectangle type and mode
                let strokeColor = '#3b82f6'; // Default blue for auto-detected
                let strokeWidth = 2;
                
                if (rect.isManual) {
                  if (rect.mode === 'repeated') {
                    strokeColor = rect.id === selectedId ? '#00ff00' : '#8b5cf6'; // Purple for repeated
                  } else {
                    strokeColor = rect.id === selectedId ? '#00ff00' : '#ff4d4d'; // Red for individual manual
                  }
                } else {
                  strokeColor = rect.id === selectedId ? '#00ff00' : '#3b82f6'; // Blue for auto-detected
                }
                
                if (rect.id === selectedId) {
                  strokeWidth = 3;
                }
                
                return (
                  <Rect
                    key={rect.id}
                    id={rect.id}
                    {...rect}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    name="rectangle"
                    draggable={isDragMode}
                    onTap={() => {
                      selectShape(rect.id);
                    }}
                    onMouseDown={() => {
                      selectShape(rect.id);
                    }}
                    onDragEnd={(e) => {
                      const updatedRectangles = localRectangles.map(r =>
                        r.id === rect.id
                          ? { ...r, x: e.target.x(), y: e.target.y() }
                          : r
                      );
                      setLocalRectangles(updatedRectangles);
                      onRectanglesDetected(updatedRectangles);
                      // Reset subsequent steps since geometry has changed
                      setDetectionStep('none');
                      onTextDetected([]);
                      onTranslationsReceived([], []);
                      setHasPendingChanges(true);
                    }}
                    onTransformEnd={(e) => {
                      const node = e.target;
                      const scaleX = node.scaleX();
                      const scaleY = node.scaleY();

                      node.scaleX(1);
                      node.scaleY(1);

                      const updatedRectangles = localRectangles.map(r =>
                        r.id === rect.id
                          ? {
                              ...r,
                              x: node.x(),
                              y: node.y(),
                              width: Math.max(5, node.width() * scaleX),
                              height: Math.max(5, node.height() * scaleY),
                            }
                          : r
                      );
                      setLocalRectangles(updatedRectangles);
                      onRectanglesDetected(updatedRectangles);
                      // Reset subsequent steps since geometry has changed
                      setDetectionStep('none');
                      onTextDetected([]);
                      onTranslationsReceived([], []);
                      setHasPendingChanges(true);
                    }}
                  />
                );
              })}
              
              {/* Interactive Logo */}
              {logoUrl && (
                <Image
                  key="logo"
                  image={logoImage}
                  {...currentLogoPosition}
                  draggable={true}
                  name="logo"
                  onTap={handleLogoSelect}
                  onMouseDown={handleLogoSelect}
                  onDragEnd={(e) => {
                    handleLogoDrag({ x: e.target.x(), y: e.target.y() });
                  }}
                  onTransformEnd={(e) => {
                    const node = e.target;
                    const scaleX = node.scaleX();
                    const scaleY = node.scaleY();

                    node.scaleX(1);
                    node.scaleY(1);

                    handleLogoResize({
                      width: Math.max(20, node.width() * scaleX),
                      height: Math.max(10, node.height() * scaleY)
                    });
                  }}
                />
              )}
              
              {selectedId && isDragMode && (
                <Transformer
                  ref={transformerRef}
                  boundBoxFunc={(oldBox, newBox) => {
                    return newBox;
                  }}
                />
              )}
              
              {selectedLogo && (
                <Transformer
                  ref={transformerRef}
                  boundBoxFunc={(oldBox, newBox) => {
                    return newBox;
                  }}
                />
              )}
            </Layer>
          </Stage>
        </div>
      </div>
      
      {/* Footer with Manual Tools & Pagination */}
      <TooltipProvider>
        <div className="p-2 border-t bg-gray-50">
          <div className="flex justify-between items-center">
            {/* Manual Tools */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-semibold text-gray-700">Manual Tools:</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={addNewRectangle} variant="outline" size="icon">
                    <Plus className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Add Individual Area</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={addRepeatedRectangle} variant="outline" size="icon">
                    <Copy className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Add Repeated Area</p>
                </TooltipContent>
              </Tooltip>
              
              {/* Logo Upload */}
              <div className="flex items-center space-x-2 border-l pl-2 ml-2">
                <span className="text-sm font-semibold text-gray-700">Logo:</span>
                {!logoFile ? (
                  <label className="p-2 rounded-md bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-600 cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <span className="text-xs">Upload</span>
                  </label>
                ) : (
                  <div className="flex items-center space-x-2">
                    <img 
                      src={logoUrl} 
                      alt="Logo preview" 
                      className="w-6 h-6 object-contain border rounded"
                    />
                    <button
                      onClick={removeLogo}
                      className="p-1 rounded-md bg-red-100 text-red-600 hover:bg-red-200 text-xs"
                      title="Remove logo"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
              
              {selectedId && (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={toggleRectangleMode} variant="outline" size="icon">
                        <Pin className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Toggle Repeated Mode</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={deleteSelectedRectangle} variant="destructive" size="icon">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Delete Selected Area</p>
                    </TooltipContent>
                  </Tooltip>
                </>
              )}
            </div>
            
            {/* Rectangle Stats */}
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span>Auto: {localRectangles.filter(r => !r.isManual).length}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span>Manual: {localRectangles.filter(r => r.isManual && r.mode === 'individual').length}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-purple-500 rounded"></div>
                <span>Repeated: {localRectangles.filter(r => r.mode === 'repeated').length}</span>
              </div>
            </div>
          </div>
        </div>
      </TooltipProvider>
    </div>
  );
};

export default PDFViewer; 