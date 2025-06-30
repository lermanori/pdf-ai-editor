import React from 'react';
import { ClipboardList } from 'lucide-react';

const DetectedTextPanel = ({ detectedRectangles }) => {
  if (!detectedRectangles || detectedRectangles.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center mb-4">
        <ClipboardList className="w-6 h-6 text-green-600 mr-3" />
        <h2 className="text-xl font-bold text-gray-800">Detected Text</h2>
      </div>
      <p className="text-sm text-gray-600 mb-4">
        Review the text extracted from the PDF. You can now proceed to translate these sections.
      </p>
      <div className="space-y-4 max-h-[calc(100vh-250px)] overflow-y-auto pr-2">
        {detectedRectangles.map((rect, index) => (
          <div key={rect.id || index} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <div className="font-semibold text-gray-700 text-sm mb-1">
              Area {index + 1} (Page {rect.page + 1})
            </div>
            <p className="text-gray-800 text-sm whitespace-pre-wrap">
              {rect.extractedText || 'No text was detected in this area.'}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DetectedTextPanel; 