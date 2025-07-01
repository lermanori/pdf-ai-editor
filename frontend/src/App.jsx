import React, { useState, useMemo, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import UploadForm from './components/UploadForm';
import PDFViewer from './components/PDFViewer';
import PDFPreview from './components/PDFPreview';
import TranslationPanel from './components/TranslationPanel';
import ProcessingStatus from './components/ProcessingStatus';
import HowItWorksPanel from './components/HowItWorksPanel';
import DetectedTextPanel from './components/DetectedTextPanel';
import FuturisticBackground from './components/FuturisticBackground';
import Header from './components/Header';

function App() {
  const [file, setFile] = useState(null);
  const [rectangles, setRectangles] = useState([]);
  const [translations, setTranslations] = useState([]);
  const [detectedRectangles, setDetectedRectangles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoUrl, setLogoUrl] = useState(null);
  const [logoPosition, setLogoPosition] = useState({ x: 10, y: 10, width: 60, height: 30 });
  const [hasPendingChanges, setHasPendingChanges] = useState(false);

  // Derive the PDF URL from the file object returned by the backend
  const pdfUrl = useMemo(() => {
    if (file && file.filename) {
      // Assuming the Express backend serves the uploads folder statically
      return `http://localhost:3001/uploads/${file.filename}`;
    }
    return '';
  }, [file]);

  // Calculate current step based on app state
  const currentStep = useMemo(() => {
    if (!file) return 'upload';
    if (showPreview) return 'download';
    if (translations.length > 0) return 'review';
    return 'process';
  }, [file, showPreview, translations.length]);

  const handleFileSelect = (uploadedFile) => {
    setFile(uploadedFile);
    // Reset all subsequent states when a new file is uploaded
    setRectangles([]);
    setTranslations([]);
    setDetectedRectangles([]);
    setShowPreview(false);
  };
  
  const handleTranslationsReceived = (receivedTranslations, currentRectangles) => {
    // Combine original text from rectangles with new translations
    const updatedTranslations = receivedTranslations.map(trans => {
      const originalRect = currentRectangles.find(r => r.id === trans.id);
      return {
        ...trans,
        originalText: originalRect ? originalRect.text : 'N/A',
      };
    });
    setTranslations(updatedTranslations);
    setProcessingStep('');
  };

  const resetApp = () => {
    setFile(null);
    setRectangles([]);
    setTranslations([]);
    setIsProcessing(false);
    setProcessingStep('');
    setShowPreview(false);
  };

  const handlePreview = (updatedRectangles, logoFile, logoUrl, logoPosition) => {
    if (updatedRectangles) {
      setRectangles(updatedRectangles);
    }
    if (logoFile) {
      setLogoFile(logoFile);
    }
    if (logoUrl) {
      setLogoUrl(logoUrl);
    }
    if (logoPosition) {
      setLogoPosition(logoPosition);
    }
    setShowPreview(true);
  };

  const handleBackFromPreview = () => {
    setShowPreview(false);
  };

  const handleGenerationComplete = () => {
    // Could add tracking here in the future
    console.log('PDF generation and download initiated.');
  };

  const handleRectanglesDetected = (newRectangles) => {
    setRectangles(newRectangles);
  };

  const handleTextDetected = (newDetectedRectangles) => {
    setDetectedRectangles(newDetectedRectangles);
    setTranslations([]); // Reset translations when new text is detected
  };

  useEffect(() => {
    // Clean up logo object URL when component unmounts or logo changes
    return () => {
      setLogoUrl(null);
      setLogoFile(null);
      setLogoPosition({ x: 10, y: 10, width: 60, height: 30 });
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      <FuturisticBackground />
      
      <Toaster 
        position="top-right"
        toastOptions={{
          className: 'bg-slate-800/90 text-white border border-cyan-500/30 backdrop-blur-md',
          style: {
            background: 'rgba(15, 23, 42, 0.9)',
            color: 'white',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            backdropFilter: 'blur(12px)',
          },
        }}
      />
      
      {/* Header */}
      <Header currentStep={currentStep} setCurrentStep={() => {}} onReset={resetApp} />

      <main className="container mx-auto p-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {!pdfUrl ? (
              <div className="glass-dark rounded-xl p-6 border border-cyan-500/30">
                <UploadForm onFileSelect={handleFileSelect} />
              </div>
            ) : showPreview ? (
              <div className="glass-dark rounded-xl border border-cyan-500/30">
                <PDFPreview
                  file={file}
                  fileUrl={pdfUrl}
                  translations={translations}
                  originalRectangles={rectangles}
                  onBack={handleBackFromPreview}
                  onGenerate={handleGenerationComplete}
                  isProcessing={isProcessing}
                  logoUrl={logoUrl}
                  logoPosition={logoPosition}
                />
              </div>
            ) : (
              <div className="glass-dark rounded-xl border border-cyan-500/30">
                <PDFViewer
                  file={file}
                  fileUrl={pdfUrl}
                  rectangles={rectangles}
                  translations={translations}
                  detectedRectangles={detectedRectangles}
                  onRectanglesDetected={handleRectanglesDetected}
                  onTextDetected={handleTextDetected}
                  onTranslationsReceived={handleTranslationsReceived}
                  onPreview={handlePreview}
                  isProcessing={isProcessing}
                  setIsProcessing={setIsProcessing}
                  setProcessingStep={setProcessingStep}
                  logoFile={logoFile}
                  logoUrl={logoUrl}
                  logoPosition={logoPosition}
                  setLogoFile={setLogoFile}
                  setLogoUrl={setLogoUrl}
                  setLogoPosition={setLogoPosition}
                  hasPendingChanges={hasPendingChanges}
                  setHasPendingChanges={setHasPendingChanges}
                />
              </div>
            )}
          </div>
          <div className="lg:col-span-1">
            <div className="glass-dark rounded-xl border border-cyan-500/30 p-4">
              {isProcessing ? (
                <ProcessingStatus step={processingStep} />
              ) : translations.length > 0 ? (
                <TranslationPanel 
                  translations={translations} 
                  setTranslations={setTranslations}
                />
              ) : detectedRectangles.length > 0 ? (
                <DetectedTextPanel 
                  detectedRectangles={detectedRectangles}
                />
              ) : (
                <HowItWorksPanel />
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;