import React, { useState } from 'react';
import { Download, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

const DownloadButton = ({ fileId }) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (!fileId) {
      toast.error('No file available for download');
      return;
    }

    try {
      setIsDownloading(true);
      
      // Create download URL
      const downloadUrl = `/api/download/${fileId}`;
      
      // Create a temporary link element and trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `processed_pdf_${fileId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Download started!');
      
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download file');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-3">
      <button
        onClick={handleDownload}
        disabled={isDownloading}
        className="w-full px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 font-medium"
      >
        {isDownloading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Downloading...</span>
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            <span>Download PDF</span>
          </>
        )}
      </button>

      <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
        <FileText className="w-4 h-4" />
        <span>Enhanced PDF with Hebrew translations</span>
      </div>
    </div>
  );
};

export default DownloadButton; 