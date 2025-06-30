📐 Architecture Document: React + Express App
🔧 1. Overview
This is a full-stack web application using:

Frontend: React (Next.js or Vite)

Backend: Express (Node.js)

Purpose: Upload a PDF, detect rectangles, get translation via GPT-4 Vision, and output an annotated PDF

🧩 2. Tech Stack
Layer	Technology	Purpose
Frontend	React (Next.js or Vite)	User interface
UI Framework	Tailwind CSS or Shadcn UI	Styling
State Mgmt	React Context or Zustand	UI state and global state
Backend	Express.js	API endpoints and logic
PDF Tools	pdf-lib, pdfjs-dist	Reading, editing, overlaying
Image Tools	sharp, canvas	Cropping & base64 conversion
External API	OpenAI Vision (gpt-4o)	AI translation from image
Storage	Local or S3	Uploaded PDFs and outputs

🗂️ 3. Project Structure
frontend/
bash
Copy
Edit
frontend/
├── components/
├── pages/
├── services/         # API interaction
├── hooks/
├── utils/
└── App.jsx
backend/
bash
Copy
Edit
backend/
├── controllers/
├── routes/
├── services/         # PDF processing, ChatGPT calls
├── uploads/
├── app.js
└── server.js
🔁 4. Data Flow
csharp
Copy
Edit
[User Uploads PDF]
     ⬇️
[React UI → /api/upload]
     ⬇️
[Express → Save file + Detect Rectangles]
     ⬇️
[Send cropped images to GPT-4o]
     ⬇️
[Receive Hebrew translations]
     ⬇️
[Overlay Hebrew into original PDF]
     ⬇️
[Add logo + remove Chinese text]
     ⬇️
[User Downloads Final PDF]
🌐 5. API Routes
Express Backend
Method	Endpoint	Purpose
POST	/api/upload	Accept and save PDF
POST	/api/detect	Analyze PDF, return rectangles
POST	/api/translate	Send cropped image to OpenAI
POST	/api/overlay	Embed Hebrew text + logo
GET	/api/download/:id	Serve final PDF to user

🧱 6. Core Components
Frontend
UploadForm: drag & drop

PDFViewer: render PDF pages

RectangleEditor: draw/edit overlays

TranslationPanel: review/edit text

DownloadButton: export final PDF

Backend
uploadController.js: save files

detectService.js: auto-locate text areas

chatgptService.js: talk to OpenAI

pdfService.js: overlay text/logo

cleanupService.js: remove Chinese characters

✅ 7. Deployment Suggestions
Layer	Tool
Frontend	Vercel / Netlify
Backend	Render / Railway / Fly.io
Storage	S3 / Supabase / local FS
CI/CD	GitHub Actions

🔒 8. Notes on UX & Security
Secure file handling & sanitization

Use .env for API keys

Toast notifications for upload, translation, errors

Consider auth if sharing or saving files in production