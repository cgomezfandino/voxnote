#!/bin/bash

echo "🚀 Voxnote NextJS Prototype"
echo "=========================="
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias..."
    npm install
    echo ""
fi

echo "🎨 Iniciando servidor de desarrollo..."
echo ""
echo "Cuando esté listo, abre: http://localhost:3000"
echo ""
echo "Presiona Ctrl+C para detener"
echo ""

npm run dev
