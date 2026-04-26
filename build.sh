#!/bin/bash
set -e

echo "=== Progressive Disclosure WASM Build ==="

# ── WASM compilation (optional) ─────────────────────────────────────────────
# Skipped gracefully if Emscripten is not installed or build fails.
# To enable: install emscripten (brew install emscripten) or set up CI with
# the emscripten/emsdk Docker image.
if command -v emcc &> /dev/null; then
    echo "Step 1: Emscripten found — compiling tensorflowccp to WASM..."
    mkdir -p public/wasm
    if (
        cd wasm-src
        emcmake cmake -B build -DCMAKE_BUILD_TYPE=Release
        cmake --build build
    ); then
        echo "Step 2: Copying WASM artifacts..."
        cp public/wasm/framework.js.js public/wasm/framework.js
        cp public/wasm/framework.js.wasm public/wasm/framework.wasm
        echo "  WASM build complete."
    else
        echo "  WASM build failed — skipping WASM artifacts."
        echo "  (Site will build without WASM demos)"
    fi
else
    echo "Step 1: Emscripten not found — skipping WASM compilation."
    echo "  (Site will build without WASM demos; install emscripten to enable them)"
fi

# ── Astro site build ─────────────────────────────────────────────────────────
echo "Step 3: Building Astro site..."
npx astro build

echo "=== Build Complete ==="
