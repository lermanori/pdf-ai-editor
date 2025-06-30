import React, { useState } from 'react';
import { Edit3, Save, XCircle } from 'lucide-react';

const TranslationItem = ({ item, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(item.translation);

  const handleSave = () => {
    onUpdate(item.id, editText);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditText(item.translation);
    setIsEditing(false);
  };

  return (
    <div className="p-4 border rounded-lg bg-white shadow-sm transition-all hover:shadow-md">
      <div className="flex justify-between items-start">
        <div>
          <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">
            Page {item.page + 1} - Area #{item.id.split('_').pop()}
          </span>
          <p className="mt-2 text-sm text-gray-500 line-clamp-3">
            <span className="font-medium text-gray-600">Original:</span> {item.originalText}
          </p>
        </div>
        <button 
          onClick={() => setIsEditing(!isEditing)} 
          className="p-2 text-gray-400 hover:text-indigo-600"
          title="Edit Translation"
        >
          {!isEditing && <Edit3 className="w-4 h-4" />}
        </button>
      </div>

      <div className="mt-3">
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full p-2 border rounded-md text-sm text-gray-800 focus:ring-2 focus:ring-indigo-500"
              rows={4}
            />
            <div className="flex items-center justify-end space-x-2">
              <button 
                onClick={handleCancel}
                className="p-2 text-gray-500 hover:text-red-600"
                title="Cancel"
              >
                <XCircle className="w-5 h-5" />
              </button>
              <button
                onClick={handleSave}
                className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700"
                title="Save"
              >
                <Save className="w-4 h-4" />
                <span>Save</span>
              </button>
            </div>
          </div>
        ) : (
          <p className="p-2 bg-gray-50 rounded-md text-sm text-gray-800 select-all">
            {item.translation || <span className="text-gray-400">No translation yet...</span>}
          </p>
        )}
      </div>
    </div>
  );
};

const TranslationPanel = ({ translations, setTranslations }) => {
  const handleUpdateTranslation = (id, newText) => {
    setTranslations(prev => 
      prev.map(t => (t.id === id ? { ...t, translation: newText } : t))
    );
  };
  
  const successfulTranslations = translations.filter(t => t.translation && t.translation !== 'Translation failed');

  return (
    <div className="h-full bg-gray-50 border-l p-4 flex flex-col">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-800">Translations ({successfulTranslations.length})</h2>
        <p className="text-sm text-gray-600">Review and edit the AI translations before processing.</p>
      </div>
      
      {translations.length > 0 ? (
        <div className="space-y-4 overflow-y-auto flex-grow pr-2">
          {translations.map(item => (
            <TranslationItem 
              key={item.id} 
              item={item} 
              onUpdate={handleUpdateTranslation} 
            />
          ))}
          {successfulTranslations.length > 0 && (
            <div className="p-4 text-center bg-green-50 text-green-700 rounded-lg text-sm">
              ✅ Successfully translated {successfulTranslations.length} text areas.
            </div>
          )}
        </div>
      ) : (
        <div className="flex-grow flex items-center justify-center text-center text-gray-500">
          <p>No translations to display yet. <br /> Click "Translate" on the PDF viewer to start.</p>
        </div>
      )}
    </div>
  );
};

export default TranslationPanel; 