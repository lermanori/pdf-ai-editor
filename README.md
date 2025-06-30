# 📄 PDF AI Editor

A full-stack web application that uses AI to enhance PDF documents with Hebrew translations, logo additions, and text processing capabilities.

## 🚀 Features

- **📤 PDF Upload**: Drag & drop PDF files with validation
- **🔍 Smart Detection**: Automatically detect text areas on the right side of pages
- **🤖 AI Translation**: Use GPT-4 Vision to translate English text to Hebrew
- **✏️ Text Review**: Edit and review translations before processing
- **📝 Hebrew Overlay**: Add Hebrew text with RTL support
- **🎨 Logo Addition**: Embed logos on every page
- **🇨🇳 Chinese Removal**: Remove Chinese characters from documents
- **📥 Download**: Get your enhanced PDF with all modifications

## 🛠️ Tech Stack

### Frontend
- **React** with Vite
- **Tailwind CSS** for styling
- **React PDF** for PDF rendering
- **Konva.js** for rectangle overlays
- **React Hot Toast** for notifications
- **Axios** for API calls

### Backend
- **Express.js** server
- **PDF-lib** for PDF manipulation
- **PDF.js** for text extraction
- **OpenAI API** for GPT-4 Vision
- **Multer** for file uploads
- **Canvas & Sharp** for image processing

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn
- OpenAI API key (optional, will use mock translations without it)

### 1. Clone the repository
```bash
git clone <repository-url>
cd pdf-ai-editor
```

### 2. Install dependencies
```bash
npm run install:all
```

### 3. Environment setup
```bash
# Copy the environment template
cp env.template .env

# Edit .env and add your OpenAI API key
# Open .env in your editor and replace 'your_openai_api_key_here' with your actual API key
```

**Required Environment Variables:**
- `OPENAI_API_KEY` - Your OpenAI API key (get it from https://platform.openai.com/api-keys)
- `PORT` - Backend server port (default: 3001)
- `FRONTEND_URL` - Frontend URL (default: http://localhost:5173)

### 4. Start the application
```bash
# Development mode (runs both frontend and backend)
npm run dev

# Or run separately:
npm run dev:backend  # Backend on port 3001
npm run dev:frontend # Frontend on port 5173
```

## 🎯 Usage

1. **Upload PDF**: Drag and drop a PDF file or click to select
2. **Detect Areas**: Click "Detect Areas" to find text regions automatically
3. **Translate**: Click "Translate" to send images to GPT-4 Vision for Hebrew translation
4. **Review**: Edit translations in the sidebar panel
5. **Process**: Click "Process PDF" to apply all modifications
6. **Download**: Download your enhanced PDF

## 🔧 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload` | Upload PDF file |
| POST | `/api/detect` | Detect text rectangles |
| POST | `/api/translate` | Translate text with AI |
| POST | `/api/overlay` | Apply overlays to PDF |
| GET | `/api/download/:id` | Download processed PDF |

## 🏗️ Project Structure

```
pdf-ai-editor/
├── frontend/                 # React frontend
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── App.jsx         # Main app component
│   │   └── main.jsx        # Entry point
│   ├── package.json
│   └── vite.config.js
├── backend/                 # Express backend
│   ├── routes/             # API routes
│   ├── services/           # Business logic
│   ├── uploads/            # File storage
│   └── server.js           # Server entry point
├── env.template            # Environment variables template
├── package.json            # Root package.json
└── README.md
```

## ⚙️ Configuration

### Environment Variables
```env
OPENAI_API_KEY=your_openai_api_key_here
PORT=3001
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

### File Limits
- Maximum file size: 50MB
- Supported format: PDF only
- Processing timeout: 5 minutes per file

## 🔐 Security Features

- File type validation
- File size limits
- CORS protection
- Input sanitization
- Error handling

## 🚀 Deployment

### Frontend (Vercel/Netlify)
```bash
cd frontend
npm run build
# Deploy dist/ folder
```

### Backend (Railway/Render)
```bash
cd backend
npm start
# Set environment variables in deployment platform
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

If you encounter any issues:

1. Check the console for error messages
2. Ensure all dependencies are installed
3. Verify your OpenAI API key is valid
4. Check file format and size limits

## 🔮 Future Enhancements

- [ ] Support for more languages
- [ ] Batch processing multiple PDFs
- [ ] Custom logo upload
- [ ] Font selection for Hebrew text
- [ ] OCR for scanned documents
- [ ] User authentication
- [ ] Cloud storage integration

---

Built with ❤️ using React, Express, and OpenAI GPT-4 Vision 