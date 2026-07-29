# Voxnote Next.js

The modern Voxnote frontend, built with Next.js.

## 🎨 Design

- **Background**: Pure white (#FFFFFF)
- **Cards**: White with soft gray borders
- **Text**: Dark gray (#1F2937)
- **Accent**: Indigo (#4F46E5)
- **Success**: Emerald green (#10B981)
- **Recording**: Red (#EF4444)

## 🚀 Getting started

```bash
# Install dependencies
npm install

# Start development
npm run dev

# Open http://localhost:3001
```

## 📁 Structure

```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── AudioRecorder.tsx      # Recording with visualizer
│   ├── AudioVisualizer.tsx    # Wavesurfer.js
│   └── ConfigPanel.tsx        # Settings panel
├── hooks/
│   └── useVoxnote.ts          # API hook
├── lib/
│   └── utils.ts               # Utilities
└── types/
    └── index.ts               # TypeScript types
```

## 🔌 Backend API

Connects to your Python FastAPI backend:

```javascript
// next.config.js
async rewrites() {
  return [
    {
      source: "/api/:path*",
      destination: "http://localhost:8000/api/:path*",
    },
  ];
}

// Custom port in package.json: "dev": "next dev -p 3001"
```

Required endpoints:
- `POST /api/transcribe` - Whisper transcription
- `POST /api/insights` - Insight extraction
- `POST /api/export` - Export note

## ✨ Features

- ✅ Recorder with real-time waveform visualizer
- ✅ Audio player with Wavesurfer.js
- ✅ Minimalist, professional design
- ✅ Full UI control (no Streamlit limitations)
- ✅ TypeScript + Tailwind CSS
