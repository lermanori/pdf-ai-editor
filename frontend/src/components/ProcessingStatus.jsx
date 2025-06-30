import React from 'react';
import { Loader2 } from 'lucide-react';

const ProcessingStatus = ({ step }) => {
  const steps = [
    'Uploading PDF...',
    'Detecting text areas...',
    'Cropping images...',
    'Translating text with AI...',
    'Processing PDF...',
    'Adding Hebrew text...',
    'Embedding logo...',
    'Removing Chinese text...',
    'Generating final PDF...'
  ];

  const getCurrentStepIndex = () => {
    return steps.findIndex(s => s.toLowerCase().includes(step.toLowerCase().split(' ')[0]));
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center space-x-3 mb-4">
        <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
        <h3 className="text-lg font-semibold text-gray-900">
          Processing...
        </h3>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-blue-600">
            {step}
          </span>
          <span className="text-xs text-gray-500">
            Please wait...
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
            style={{ 
              width: `${Math.min(100, (getCurrentStepIndex() + 1) * (100 / steps.length))}%` 
            }}
          />
        </div>

        <div className="text-xs text-gray-500">
          <p>• AI is analyzing your document</p>
          <p>• This may take a few moments</p>
          <p>• Please don't close the browser</p>
        </div>
      </div>
    </div>
  );
};

export default ProcessingStatus; 