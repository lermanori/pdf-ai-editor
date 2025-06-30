import React from 'react';
import { BookOpen } from 'lucide-react';

const HowItWorksPanel = () => {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 h-full">
      <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
        <BookOpen className="w-5 h-5 mr-2" />
        How it works
      </h3>
      <ol className="text-sm text-blue-800 space-y-3">
        <li className="flex items-start">
          <span className="font-bold text-blue-600 mr-2">1.</span>
          <span>Upload your PDF document.</span>
        </li>
        <li className="flex items-start">
          <span className="font-bold text-blue-600 mr-2">2.</span>
          <span>Our AI automatically detects text blocks on the right side of each page.</span>
        </li>
        <li className="flex items-start">
          <span className="font-bold text-blue-600 mr-2">3.</span>
          <span>Use the 'Manual Tools' to add, resize, or move rectangles for perfect selections.</span>
        </li>
        <li className="flex items-start">
          <span className="font-bold text-blue-600 mr-2">4.</span>
          <span>Click "Translate" to send the selected areas to GPT-4 Vision.</span>
        </li>
        <li className="flex items-start">
          <span className="font-bold text-blue-600 mr-2">5.</span>
          <span>Review and edit the AI translations in the side panel.</span>
        </li>
        <li className="flex items-start">
          <span className="font-bold text-blue-600 mr-2">6.</span>
          <span>Click "Process PDF" to generate and download your final document.</span>
        </li>
      </ol>
    </div>
  );
};

export default HowItWorksPanel; 