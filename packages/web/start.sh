#!/bin/bash

echo "🎙️ Starting Voxnote Next.js"
echo "=============================="
echo ""

# Check whether node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
    echo "✅ Dependencies installed"
    echo ""
fi

echo "🚀 Starting server at http://localhost:3001"
echo "Press Ctrl+C to stop"
echo ""

npm run dev
