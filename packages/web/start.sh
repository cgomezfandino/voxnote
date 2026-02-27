#!/bin/bash

echo "🎙️ Iniciando Voxnote Next.js"
echo "=============================="
echo ""

# Verificar si node_modules existe
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Error al instalar dependencias"
        exit 1
    fi
    echo "✅ Dependencias instaladas"
    echo ""
fi

echo "🚀 Iniciando servidor en http://localhost:3001"
echo "Presiona Ctrl+C para detener"
echo ""

npm run dev
