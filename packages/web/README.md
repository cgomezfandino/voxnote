# Voxnote Next.js

Versión moderna de Voxnote construida con Next.js.

## 🎨 Diseño

- **Fondo**: Blanco puro (#FFFFFF)
- **Cards**: Blanco con bordes grises suaves
- **Texto**: Gris oscuro (#1F2937)
- **Acento**: Índigo (#4F46E5)
- **Éxito**: Verde esmeralda (#10B981)
- **Grabación**: Rojo (#EF4444)

## 🚀 Iniciar

```bash
# Instalar dependencias
npm install

# Iniciar desarrollo
npm run dev

# Abrir http://localhost:3001
```

## 📁 Estructura

```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── AudioRecorder.tsx      # Grabación con visualizer
│   ├── AudioVisualizer.tsx    # Wavesurfer.js
│   └── ConfigPanel.tsx        # Panel de configuración
├── hooks/
│   └── useVoxnote.ts          # Hook de API
├── lib/
│   └── utils.ts               # Utilidades
└── types/
    └── index.ts               # Tipos TypeScript
```

## 🔌 API Backend

Conecta con tu backend Python FastAPI:

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

// Puerto personalizado en package.json: "dev": "next dev -p 3001"
```

Endpoints necesarios:
- `POST /api/transcribe` - Transcripción con Whisper
- `POST /api/insights` - Extracción de insights
- `POST /api/export` - Exportar nota

## ✨ Features

- ✅ Grabadora con visualizador de ondas en tiempo real
- ✅ Audio player con Wavesurfer.js
- ✅ Diseño minimalista y profesional
- ✅ Total control del UI (sin limitaciones de Streamlit)
- ✅ TypeScript + Tailwind CSS
