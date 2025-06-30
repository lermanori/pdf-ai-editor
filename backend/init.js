// Global initialization to suppress canvas warnings
// This must be loaded before any PDF.js modules

// Store original console methods
const originalWarn = console.warn;
const originalError = console.error;

// Override console.warn to filter out canvas-related warnings
console.warn = function(...args) {
  const message = args.join(' ');
  
  // Filter out canvas-related warnings
  if (typeof message === 'string' && (
    message.includes('Cannot polyfill') ||
    message.includes('canvas') ||
    message.includes('DOMMatrix') ||
    message.includes('Path2D') ||
    message.includes('rendering may be broken') ||
    message.includes('Warning: Cannot polyfill')
  )) {
    return; // Suppress these warnings
  }
  
  // Allow other warnings through
  originalWarn.apply(console, args);
};

// Also suppress some errors that are actually warnings
console.error = function(...args) {
  const message = args.join(' ');
  
  // Filter out canvas-related errors that are actually warnings
  if (typeof message === 'string' && (
    message.includes('Cannot polyfill') ||
    message.includes('canvas') ||
    message.includes('DOMMatrix') ||
    message.includes('Path2D')
  )) {
    return; // Suppress these error messages
  }
  
  // Allow other errors through
  originalError.apply(console, args);
};

// Set up PDF.js environment with polyfills
if (typeof globalThis !== 'undefined') {
  // Create minimal polyfills
  globalThis.DOMMatrix = globalThis.DOMMatrix || class DOMMatrix {
    constructor() {
      this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0;
    }
  };
  
  globalThis.Path2D = globalThis.Path2D || class Path2D {
    constructor() {}
    addPath() {}
    closePath() {}
    moveTo() {}
    lineTo() {}
    bezierCurveTo() {}
    quadraticCurveTo() {}
    arc() {}
    arcTo() {}
    ellipse() {}
    rect() {}
  };
}

// Suppress PDF.js specific warnings
if (typeof process !== 'undefined' && process.env) {
  process.env.PDFJS_DISABLE_CONSOLE_WARNINGS = 'true';
}

console.log('🔧 PDF.js environment initialized (canvas warnings suppressed)');

module.exports = {}; 