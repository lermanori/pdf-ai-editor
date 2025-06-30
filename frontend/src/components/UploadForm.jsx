import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const UploadForm = ({ onFileSelect }) => {
  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      toast.error('File is too large. Maximum size is 50MB.');
      return;
    }

    const formData = new FormData();
    formData.append('pdf', file);

    try {
      const response = await axios.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.data.success) {
        toast.success('PDF uploaded successfully!');
        
        // Correctly destructure from the nested 'file' object
        const { id, filename, path } = response.data.file; 
        
        onFileSelect({
          id: id,
          name: file.name, // Keep original name for display
          size: file.size,
          path: path,
          filename: filename,
        });
      } else {
        toast.error(response.data.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.message || 'Upload failed. See console for details.');
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
  });

  return (
    <div
      {...getRootProps()}
      className={`p-10 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors duration-200
        ${isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400'}`}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center justify-center">
        <UploadCloud className={`w-12 h-12 mb-4 ${isDragActive ? 'text-indigo-600' : 'text-gray-400'}`} />
        <p className="text-lg font-semibold text-gray-700">
          {isDragActive ? "Drop the PDF here..." : "Drag & drop a PDF here, or click to select"}
        </p>
        <p className="text-sm text-gray-500 mt-2">Maximum file size: 50MB</p>
      </div>
    </div>
  );
};

export default UploadForm; 