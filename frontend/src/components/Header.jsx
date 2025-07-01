import React from 'react';
import { Brain, ArrowLeft, Sparkles } from 'lucide-react';

const Header = ({ currentStep, setCurrentStep, onReset }) => {
  const steps = [
    { id: 'upload', name: 'Upload', icon: '📄' },
    { id: 'process', name: 'Process', icon: '🔍' },
    { id: 'review', name: 'Review', icon: '✏️' },
    { id: 'download', name: 'Download', icon: '📥' }
  ];

  const handleReset = () => {
    if (onReset) {
      onReset();
    }
    if (setCurrentStep) {
      setCurrentStep('upload');
    }
  };

  return (
    <header className="bg-slate-900/80 backdrop-blur-xl border-b border-cyan-500/20 shadow-2xl">
      <div className="container mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/25">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full animate-pulse"></div>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                PDF AI Editor
              </h1>
              <p className="text-sm text-slate-400">Neural Document Processing</p>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center space-x-2">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`
                  flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-300
                  ${currentStep === step.id 
                    ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 text-cyan-400' 
                    : 'text-slate-400 hover:text-slate-300'
                  }
                `}>
                  <span className="text-lg">{step.icon}</span>
                  <span className="font-medium">{step.name}</span>
                </div>
                {index < steps.length - 1 && (
                  <div className="w-8 h-px bg-slate-600 mx-2"></div>
                )}
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-3">
            {currentStep !== 'upload' && (
              <button
                onClick={handleReset}
                className="flex items-center space-x-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white rounded-xl transition-all duration-300 border border-slate-600/30"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>New Document</span>
              </button>
            )}
            
            <div className="flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-xl border border-green-500/30">
              <Sparkles className="w-4 h-4 text-green-400" />
              <span className="text-green-400 text-sm font-medium">AI Ready</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;