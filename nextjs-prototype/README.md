# 🚀 Voxnote NextJS Prototype

Prototipo de la interfaz de Voxnote migrada a NextJS, mostrando las ventajas de una arquitectura moderna.

---

## ✨ Características Implementadas

### 🎨 UI/UX Mejorado

| Feature | Streamlit | NextJS (Este Proto) |
|---------|-----------|---------------------|
| **Visualizador de ondas** | ❌ No disponible | ✅ Wavesurfer.js integrado |
| **Animaciones fluidas** | ⚠️ CSS limitado | ✅ Framer Motion |
| **Grabación con visualización** | ⚠️ Básica | ✅ Barras en tiempo real |
| **Audio player custom** | ❌ Nativo del navegador | ✅ Controles personalizados |
| **Estados de carga** | ⚠️ Spinner simple | ✅ Steps animados |
| **Responsive** | ⚠️ Limitado | ✅ Full responsive |

### 🎵 Visualizador de Audio (Wavesurfer.js)

El componente más importante que no se puede hacer en Streamlit:

```tsx
<AudioVisualizer 
  audioUrl="https://ejemplo.com/audio.mp3"
  fileName="reunion.mp3"
/>
```

Features:
- Waveform interactivo
- Play/Pause con animaciones
- Control de volumen
- Tiempo actual/duración
- Descarga directa

### 🎤 Grabador con Visualización

```tsx
<AudioRecorder onRecordingComplete={handleBlob} />
```

- Barras que responden a la voz en tiempo real
- Timer con formato mm:ss
- Estados: idle → recording → completed
- Controles intuitivos

---

## 🏗️ Arquitectura Propuesta

```
┌─────────────────────────────────────────────────────────┐
│                    NEXTJS FRONTEND                       │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │  React UI   │  │  Audio Viz   │  │  State Mgmt    │ │
│  │  Components │  │  Wavesurfer  │  │  React Hooks   │ │
│  └─────────────┘  └──────────────┘  └────────────────┘ │
│                         │                               │
│                         ▼                               │
│              ┌────────────────────┐                     │
│              │  /api/v1/* Proxy   │                     │
│              │  Next.js Routes    │                     │
│              └────────────────────┘                     │
└─────────────────────────┬───────────────────────────────┘
                          │ HTTP/WebSocket
┌─────────────────────────┼───────────────────────────────┐
│              FASTAPI BACKEND (Python)                    │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │  /transcribe│  │  /insights   │  │  /export       │ │
│  │  Whisper    │  │  LLM         │  │  Markdown      │ │
│  └─────────────┘  └──────────────┘  └────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Cómo probar el prototipo

```bash
cd nextjs-prototype

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Abrir http://localhost:3000
```

---

## 📦 Estructura del Proyecto

```
nextjs-prototype/
├── src/
│   ├── app/
│   │   ├── layout.tsx      # Root layout con fuentes
│   │   ├── page.tsx        # Página principal
│   │   └── globals.css     # Estilos Tailwind
│   ├── components/
│   │   ├── Header.tsx           # Logo + título
│   │   ├── ConfigSidebar.tsx    # Panel de config
│   │   ├── AudioRecorder.tsx    # Grabación con visualizer
│   │   ├── AudioVisualizer.tsx  # Wavesurfer.js
│   │   └── ProcessingSteps.tsx  # Steps animados
│   └── lib/
│       └── utils.ts        # Utilidades (cn, etc.)
├── tailwind.config.ts      # Config Tailwind + tema
├── next.config.js          # Config Next + proxy
└── package.json
```

---

## 🔌 Integración con Backend Python

### Opción 1: FastAPI como API (Recomendada)

```python
# backend/main.py
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# CORS para desarrollo
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/v1/transcribe")
async def transcribe(audio: UploadFile = File(...)):
    # Usar voxnote.pipeline.transcriber
    result = await process_audio(audio)
    return {"text": result.text, "segments": result.segments}

@app.post("/api/v1/insights")
async def extract_insights(text: str, provider: str = "ollama"):
    # Usar voxnote.pipeline.insights
    insights = await get_insights(text, provider)
    return insights
```

### Opción 2: WebSocket para Streaming

```typescript
// hooks/useTranscription.ts
import { useEffect, useRef } from 'react';

export function useTranscription() {
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    ws.current = new WebSocket('ws://localhost:8000/ws/transcribe');
    
    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      // Actualizar UI con chunks de transcripción
    };
  }, []);

  const sendAudio = (blob: Blob) => {
    ws.current?.send(blob);
  };

  return { sendAudio };
}
```

---

## 🎯 Ventajas de Migrar a NextJS

### 1. **Experiencia de Audio Superior**
```typescript
// Visualización en tiempo real - IMPOSIBLE en Streamlit
const analyser = audioContext.createAnalyser();
analyser.getByteFrequencyData(dataArray);
// Renderizar barras animadas...
```

### 2. **Mejor Performance**
- **Code splitting** automático
- **Lazy loading** de componentes pesados
- **Static generation** para páginas estáticas

### 3. **UI Más Reactiva**
```typescript
// Animaciones fluidas con Framer Motion
<motion.div
  animate={{ scale: isRecording ? [1, 1.1, 1] : 1 }}
  transition={{ repeat: Infinity, duration: 1 }}
>
  Recording...
</motion.div>
```

### 4. **Mejor Developer Experience**
- Hot reload rápido
- TypeScript integrado
- Debugging con React DevTools
- CSS Modules / Tailwind

### 5. **Preparado para Producción**
- SSR/SSG para SEO (si se necesita)
- API Routes para backend serverless
- Optimización de imágenes automática
- Analytics integrado

---

## ⚖️ Comparación: Streamlit vs NextJS

| Aspecto | Streamlit | NextJS |
|---------|-----------|--------|
| **Setup inicial** | ⚡ 5 minutos | 🐢 30 minutos |
| **Custom UI** | 🟡 Limitada | 🟢 Total control |
| **Audio viz** | ❌ No | ✅ Profesional |
| **Animaciones** | 🟡 Básicas | ✅ Avanzadas |
| **Mantenimiento** | 🟢 Simple | 🟡 Medio |
| **Escalabilidad** | 🟡 MVP | 🟢 Enterprise |
| **Coste hosting** | 🟢 Bajo | 🟡 Medio |

---

## 🤔 Recomendación

**Mantén Streamlit si:**
- Es para uso personal/interno
- No necesitas visualización de audio
- Quieres iterar rápido sin diseño

**Migra a NextJS si:**
- Planeas comercializar como SaaS
- La UX de audio es crítica
- Quieres un producto "premium"
- Necesitas landing page marketing

---

## 🛣️ Roadmap de Migración Sugerido

### Fase 1: API Backend (1 semana)
1. Crear FastAPI wrapper alrededor de `voxnote.pipeline`
2. Endpoints: `/transcribe`, `/insights`, `/export`
3. WebSocket para transcripción en tiempo real

### Fase 2: Frontend Core (1 semana)
1. Setup NextJS con este tema
2. Migrar componentes de config
3. Integrar grabación + visualizer

### Fase 3: Features Avanzadas (1 semana)
1. Visualizador de ondas con Wavesurfer
2. Edición de transcripción inline
3. Export con preview en vivo

### Fase 4: Polish (3 días)
1. Animaciones con Framer Motion
2. Testing
3. Deploy (Vercel + Railway/Render)

**Total estimado: 3-4 semanas**

---

## 📚 Recursos

- [Next.js Docs](https://nextjs.org/docs)
- [Wavesurfer.js](https://wavesurfer-js.org/)
- [Framer Motion](https://www.framer.com/motion/)
- [Tailwind CSS](https://tailwindcss.com/)
