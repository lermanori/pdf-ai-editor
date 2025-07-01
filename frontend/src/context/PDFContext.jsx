import React, { createContext, useContext, useReducer } from 'react';

const PDFContext = createContext();

const initialState = {
  file: null,
  pdfUrl: null,
  pages: [],
  detectedAreas: [],
  translations: [],
  processedFile: null,
  isProcessing: false,
  currentPage: 1,
  settings: {
    targetLanguage: 'Hebrew',
    logoFile: null,
    logoPosition: { x: 10, y: 10, width: 60, height: 30 },
    removeChinese: true
  }
};

function pdfReducer(state, action) {
  switch (action.type) {
    case 'SET_FILE':
      return {
        ...state,
        file: action.payload.file,
        pdfUrl: action.payload.url,
        detectedAreas: [],
        translations: [],
        processedFile: null
      };
    
    case 'SET_DETECTED_AREAS':
      return {
        ...state,
        detectedAreas: action.payload
      };
    
    case 'SET_TRANSLATIONS':
      return {
        ...state,
        translations: action.payload
      };
    
    case 'UPDATE_TRANSLATION':
      return {
        ...state,
        translations: state.translations.map(t => 
          t.id === action.payload.id 
            ? { ...t, translation: action.payload.text }
            : t
        )
      };
    
    case 'SET_PROCESSING':
      return {
        ...state,
        isProcessing: action.payload
      };
    
    case 'SET_PROCESSED_FILE':
      return {
        ...state,
        processedFile: action.payload
      };
    
    case 'SET_CURRENT_PAGE':
      return {
        ...state,
        currentPage: action.payload
      };
    
    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: { ...state.settings, ...action.payload }
      };
    
    case 'RESET':
      return initialState;
    
    default:
      return state;
  }
}

export function PDFProvider({ children }) {
  const [state, dispatch] = useReducer(pdfReducer, initialState);

  return (
    <PDFContext.Provider value={{ state, dispatch }}>
      {children}
    </PDFContext.Provider>
  );
}

export function usePDF() {
  const context = useContext(PDFContext);
  if (!context) {
    throw new Error('usePDF must be used within a PDFProvider');
  }
  return context;
}