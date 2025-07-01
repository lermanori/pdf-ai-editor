import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Zap, Sparkles, Brain } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { usePDF } from '../context/PDFContext';

const UploadZone = ({ onUploadComplete }) => {
  const { dispatch } = usePDF();
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      toast.error('File is too large. Maximum size is 50MB.');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('pdf', file);

    try {
      const response = await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (response.data.success) {
        const { id, filename } = response.data.file;
        const pdfUrl = `http://localhost:3001/uploads/${filename}`;
        
        dispatch({
          type: 'SET_FILE',
          payload: {
            file: { id, filename, name: file.name, size: file.size },
            url: pdfUrl
          }
        });
        
        toast.success('PDF uploaded successfully!');
        onUploadComplete();
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }, [dispatch, onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
    disabled: isUploading,
  });

  return (
    <div className="h-full flex items-center justify-center">
      <div className="relative max-w-2xl w-full">
        {/* Holographic Border */}
        <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-3xl blur opacity-30 animate-pulse"></div>
        
        <div
          {...getRootProps()}
          className={`relative p-20 border-2 border-dashed rounded-3xl text-center cursor-pointer transition-all duration-500 transform hover:scale-[1.02] bg-slate-800/50 backdrop-blur-xl shadow-2xl
            ${isDragActive 
              ? 'border-cyan-400 bg-cyan-500/10 shadow-cyan-500/25' 
              : 'border-slate-600/50 hover:border-purple-400/50 hover:bg-purple-500/5'
            }
            ${isUploading ? 'pointer-events-none opacity-75' : ''}
          `}
        >
          <input {...getInputProps()} />
          
          <div className="flex flex-col items-center space-y-8">
            {/* Animated Icon */}
            <div className="relative">
              <div className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 ${
                isDragActive 
                  ? 'bg-gradient-to-r from-cyan-500 to-purple-500 shadow-lg shadow-cyan-500/25' 
                  : 'bg-gradient-to-r from-slate-700 to-slate-600 hover:from-purple-600 hover:to-cyan-600'
              }`}>
                {isUploading ? (
                  <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Upload className={`w-16 h-16 text-white transition-transform duration-300 ${
                    isDragActive ? 'scale-110' : 'group-hover:scale-110'
                  }`} />
                )}
              </div>
              
              {/* Floating Elements */}
              {!isUploading && (
                <>
                  <Sparkles className="absolute -top-4 -right-4 w-8 h-8 text-cyan-400 animate-bounce" />
                  <Zap className="absolute -bottom-4 -left-4 w-6 h-6 text-purple-400 animate-pulse" />
                  <Brain className="absolute top-0 left-0 w-6 h-6 text-pink-400 animate-ping" />
                </>
              )}
            </div>

            {/* Content */}
            <div className="space-y-4">
              <h2 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                {isUploading 
                  ? "Processing Upload..." 
                  : isDragActive 
                    ? "Release to Upload" 
                    : "Upload Your PDF"
                }
              </h2>
              
              <p className="text-xl text-slate-300 max-w-lg mx-auto leading-relaxed">
                {isUploading 
                  ? "Analyzing document structure with neural networks..." 
                  : isDragActive 
                    ? "Drop your PDF here to begin AI-powered processing" 
                    : "Drag & drop a PDF here, or click to select and start the magic"
                }
              </p>
              
              <div className="flex items-center justify-center space-x-6 text-slate-400">
                <div className="flex items-center space-x-2">
                  <FileText className="w-5 h-5" />
                  <span>PDF Only</span>
                </div>
                <div className="w-2 h-2 bg-slate-500 rounded-full"></div>
                <div className="flex items-center space-x-2">
                  <span>Max 50MB</span>
                </div>
              </div>
            </div>

            {/* AI Features Grid */}
            <div className="grid grid-cols-4 gap-6 mt-12 max-w-2xl">
              {[
                { icon: Brain, label: 'AI Detection', color: 'from-cyan-500 to-blue-500' },
                { icon: Zap, label: 'Smart Translation', color: 'from-purple-500 to-pink-500' },
                { icon: Sparkles, label: 'Hebrew RTL', color: 'from-pink-500 to-red-500' },
                { icon: FileText, label: 'PDF Enhancement', color: 'from-green-500 to-emerald-500' }
              ].map((feature, index) => (
                <div key={index} className="text-center p-4 bg-slate-700/30 rounded-2xl border border-slate-600/30 hover:border-slate-500/50 transition-all duration-300">
                  <div className={`w-12 h-12 bg-gradient-to-r ${feature.color} rounded-xl mx-auto mb-3 flex items-center justify-center shadow-lg`}>
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-sm text-slate-300 font-medium">{feature.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Progress Bar */}
          {isUploading && (
            <div className="absolute bottom-0 left-0 right-0 h-2 bg-slate-700 rounded-b-3xl overflow-hidden">
              <div className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 animate-pulse"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadZone;