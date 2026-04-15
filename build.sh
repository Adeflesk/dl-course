#!/bin/bash
set -e

echo "=== Progressive Disclosure WASM Build ==="

# Check if Emscripten is available
if ! command -v emcc &> /dev/null; then
    echo "ERROR: Emscripten not found. Install with: brew install emscripten (macOS) or see emscripten.org"
    exit 1
fi

# Create public/wasm directory if it doesn't exist
mkdir -p public/wasm

# Compile C++ to WASM
echo "Step 1: Compiling tensorflowccp to WASM..."
cd wasm-src
emcmake cmake -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build
cd ..

echo "Step 2: Copying WASM artifacts..."
cp wasm-src/build/framework.* public/wasm/ 2>/dev/null || echo "Note: WASM artifacts may not have been generated (check CMake output above)"

# Build Astro site
echo "Step 3: Building Astro site..."
npm run build

echo "=== Build Complete ==="
echo "To test locally: npm run preview"
echo "To deploy: vercel deploy"
