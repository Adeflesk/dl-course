# Progressive Disclosure with WASM Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate tensorflowccp C++ code into dl-course companion website through interactive WASM demos, reusable code snippets, and inline API documentation across 10 chapters.

**Architecture:** 
- Build Astro components (`CodeSnippet`, `APIReference`, `WasmDemo`) as reusable content blocks
- Compile tensorflowccp C++ to WASM via Emscripten, served as static assets
- Enhance existing Ch 1-8 lessons inline; create new Ch 9-10 lessons
- Static deployment on Vercel with lazy-loaded WASM per chapter

**Tech Stack:** Astro, Emscripten, C++ (tensorflowccp), TypeScript, CSS

**Phase Structure:**
- **Phase 1 (Critical Path):** WASM infrastructure + Ch 1-3 demos + core components (gets to working state)
- **Phase 2 (Content):** Ch 9-10 lessons + specialized demos
- **Phase 3 (Polish):** Enhance Ch 4-8 + optimize bundling

---

## File Structure

### New Components (src/components/)
- `CodeSnippet.astro` — Reusable code block with syntax highlighting + copy button
- `APIReference.astro` — Inline API reference callout component
- `WasmDemo.astro` — Wrapper for loading/running WASM demos

### New Demo Components (src/components/demos/)
- `TensorVisualizer.astro` — Interactive tensor creation/reshape (Ch 1)
- `AutodiffVisualizer.astro` — Computation graph visualization (Ch 2)
- `GradientDescentOptimizer.astro` — 2D loss surface + optimizer paths (Ch 3)
- `TextGenerationDemo.astro` — Character-level text generation with hidden state (Ch 9)
- `AttentionVisualizer.astro` — Multi-head attention heatmap (Ch 10)

### New WASM Infrastructure (wasm-src/)
- `CMakeLists.txt` — Emscripten build configuration
- `tensor_wasm.cpp` — Tensor C++ bindings to JavaScript
- `ops_wasm.cpp` — Operations bindings
- `modules_wasm.cpp` — Neural network module bindings

### Updated Build Files
- `build.sh` — New build orchestration (C++ → WASM → Astro)
- `vercel.json` — Updated build command
- `package.json` — Add emscripten tools dependency (optional, if not system-wide)

### Lesson Files
- **Existing (to enhance):** `src/content/lessons/01-tensors.mdx` through `08-mnist-capstone.mdx`
- **New (to create):** `src/content/lessons/09-sequence-models.mdx`, `10-transformers.mdx`

---

# PHASE 1: WASM Infrastructure & Ch 1-3 Demos

## Task 1: Set Up WASM Build Infrastructure

**Files:**
- Create: `wasm-src/CMakeLists.txt`
- Create: `build.sh` (top-level)
- Modify: `vercel.json`
- Modify: `package.json`

### Step 1: Create wasm-src/CMakeLists.txt

Create the file at `/Users/adriancorsini/Development/dl-course/wasm-src/CMakeLists.txt`:

```cmake
cmake_minimum_required(VERSION 3.10)
project(tensorflowccp_wasm)

# Emscripten settings
set(CMAKE_CXX_COMPILER emcc)
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -std=c++17 -O3")

# Include tensorflowccp headers from main repo
set(TENSORFLOWCCP_PATH "${CMAKE_CURRENT_SOURCE_DIR}/../../../tensorflowccp")
include_directories(${TENSORFLOWCCP_PATH})

# Output to public/wasm
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}/../public/wasm")

# WASM bindings library
add_executable(framework.js 
    tensor_wasm.cpp
    ops_wasm.cpp
    modules_wasm.cpp
)

# Emscripten-specific linker flags
target_link_options(framework.js PRIVATE 
    -sWASM=1
    -sALLOW_MEMORY_GROWTH=1
    -sEXPORT_ES6=1
    -sMODULARIZE=1
    -sEXPORT_NAME=TensorflowCCP
    -sINVOKE_RUN=0
)
```

- [ ] **Step 2: Create top-level build.sh**

Create the file at `/Users/adriancorsini/Development/dl-course/build.sh`:

```bash
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
```

Make it executable:
```bash
chmod +x build.sh
```

- [ ] **Step 3: Update package.json build script**

Open `/Users/adriancorsini/Development/dl-course/package.json` and modify the `"build"` script:

```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "bash build.sh",
    "preview": "astro preview"
  }
}
```

- [ ] **Step 4: Create vercel.json**

Create `/Users/adriancorsini/Development/dl-course/vercel.json`:

```json
{
  "buildCommand": "bash build.sh",
  "outputDirectory": "dist"
}
```

- [ ] **Step 5: Test build.sh locally (dry run)**

Run:
```bash
cd /Users/adriancorsini/Development/dl-course
bash build.sh
```

Expected output: Script runs, checks for Emscripten, creates directories, but will fail at CMake step (we haven't created the .cpp files yet). That's OK — we're just verifying the bash syntax is correct.

If it fails, fix any typos in `build.sh` and re-run.

- [ ] **Step 6: Commit build infrastructure**

```bash
cd /Users/adriancorsini/Development/dl-course
git add wasm-src/CMakeLists.txt build.sh vercel.json package.json
git commit -m "feat: add WASM build infrastructure and Vercel config"
```

---

## Task 2: Create WASM Bindings (Stub Implementation)

**Files:**
- Create: `wasm-src/tensor_wasm.cpp`
- Create: `wasm-src/ops_wasm.cpp`
- Create: `wasm-src/modules_wasm.cpp`

These will be minimal stubs for now, just enough to compile. We'll fill them in as we build demos.

- [ ] **Step 1: Create tensor_wasm.cpp**

Create `/Users/adriancorsini/Development/dl-course/wasm-src/tensor_wasm.cpp`:

```cpp
#include <emscripten/bind.h>
#include <emscripten/val.h>
#include <vector>
#include <cmath>

using emscripten::val;
using emscripten::index;

// Stub: This will expose Tensor operations to JavaScript
// For now, just a minimal binding that compiles

class TensorWasm {
public:
    std::vector<float> data;
    std::vector<int> shape;

    TensorWasm(const std::vector<int>& s) : shape(s) {
        int size = 1;
        for (int d : shape) size *= d;
        data.resize(size, 0.0f);
    }

    // Basic API that JS will call
    val getShape() const {
        val result = val::array();
        for (int i = 0; i < shape.size(); ++i) {
            result.set(i, shape[i]);
        }
        return result;
    }

    val getData() const {
        val result = val::array();
        for (int i = 0; i < data.size(); ++i) {
            result.set(i, data[i]);
        }
        return result;
    }

    void setData(const std::vector<float>& newData) {
        data = newData;
    }

    int size() const { return data.size(); }
};

// Bindings to JavaScript
EMSCRIPTEN_BINDINGS(tensorflowccp) {
    emscripten::class_<TensorWasm>("Tensor")
        .constructor<std::vector<int>>()
        .method("getShape", &TensorWasm::getShape)
        .method("getData", &TensorWasm::getData)
        .method("setData", &TensorWasm::setData)
        .method("size", &TensorWasm::size);
}
```

- [ ] **Step 2: Create ops_wasm.cpp**

Create `/Users/adriancorsini/Development/dl-course/wasm-src/ops_wasm.cpp`:

```cpp
#include <emscripten/bind.h>
#include <cmath>
#include <vector>

using emscripten::val;

// Stub: Operations will be bound here as we build demos

// Placeholder for ReLU operation
float relu(float x) {
    return x > 0.0f ? x : 0.0f;
}

// Placeholder for Softmax (simplified)
std::vector<float> softmax(const std::vector<float>& input) {
    std::vector<float> result = input;
    float maxVal = *std::max_element(result.begin(), result.end());
    float sum = 0.0f;
    
    for (auto& v : result) {
        v = std::exp(v - maxVal);
        sum += v;
    }
    
    for (auto& v : result) {
        v /= sum;
    }
    
    return result;
}

EMSCRIPTEN_BINDINGS(ops) {
    emscripten::function("relu", &relu);
    emscripten::function("softmax", &softmax);
}
```

- [ ] **Step 3: Create modules_wasm.cpp**

Create `/Users/adriancorsini/Development/dl-course/wasm-src/modules_wasm.cpp`:

```cpp
#include <emscripten/bind.h>
#include <vector>

using emscripten::val;

// Stub: Neural network modules will be bound here as we build demos

// Placeholder: Linear layer computation
std::vector<float> linearForward(
    const std::vector<float>& input,
    const std::vector<float>& weights,
    const std::vector<float>& bias,
    int inputSize,
    int outputSize
) {
    std::vector<float> output(outputSize, 0.0f);
    
    // Simple matrix multiplication: output = input @ weights + bias
    for (int i = 0; i < outputSize; ++i) {
        output[i] = bias[i];
        for (int j = 0; j < inputSize; ++j) {
            output[i] += input[j] * weights[i * inputSize + j];
        }
    }
    
    return output;
}

EMSCRIPTEN_BINDINGS(modules) {
    emscripten::function("linearForward", &linearForward);
}
```

- [ ] **Step 4: Test WASM compilation**

Run the build:
```bash
cd /Users/adriancorsini/Development/dl-course
bash build.sh
```

Expected: Should see Emscripten compile messages and create `public/wasm/framework.js` and `public/wasm/framework.wasm`.

If there are compilation errors, debug the CMakeLists.txt or .cpp files.

- [ ] **Step 5: Verify WASM artifacts**

```bash
ls -lah /Users/adriancorsini/Development/dl-course/public/wasm/
```

Expected output: Two files:
- `framework.wasm` (~500 KB - 2 MB depending on optimization)
- `framework.js` (~10-50 KB - Emscripten glue code)

If you don't see them, re-run the build and check for CMake errors.

- [ ] **Step 6: Commit WASM bindings**

```bash
cd /Users/adriancorsini/Development/dl-course
git add wasm-src/tensor_wasm.cpp wasm-src/ops_wasm.cpp wasm-src/modules_wasm.cpp
git commit -m "feat: add stub WASM bindings for Tensor, ops, and modules"
```

---

## Task 3: Create CodeSnippet Component

**Files:**
- Create: `src/components/CodeSnippet.astro`

This component will be used throughout all lessons to display C++ code with syntax highlighting and copy buttons.

- [ ] **Step 1: Create CodeSnippet.astro**

Create `/Users/adriancorsini/Development/dl-course/src/components/CodeSnippet.astro`:

```astro
---
interface Props {
    title?: string;
    language?: string;
    code: string;
    highlight?: number[]; // line numbers to highlight (1-indexed)
}

const { title, language = "cpp", code, highlight = [] } = Astro.props;

// Simple line number tracking for highlight map
const lines = code.split('\n');
const highlightSet = new Set(highlight);
---

<div class="code-snippet-container">
    {title && <div class="code-snippet-title">{title}</div>}
    <div class="code-snippet-header">
        <span class="language-label">{language}</span>
        <button class="copy-btn" data-code={code}>
            Copy
        </button>
    </div>
    <pre class="code-snippet"><code class={`language-${language}`}>
{lines.map((line, index) => {
    const lineNum = index + 1;
    const isHighlighted = highlightSet.has(lineNum);
    const className = isHighlighted ? 'highlight-line' : '';
    return <span class={className} data-line={lineNum}>{line}\n</span>;
})}
    </code></pre>
</div>

<style>
.code-snippet-container {
    margin: 1.5rem 0;
    border: 1px solid #ddd;
    border-radius: 8px;
    background: #f8f9fa;
    overflow: hidden;
}

.code-snippet-title {
    background: #e9ecef;
    padding: 0.75rem 1rem;
    font-weight: 600;
    font-size: 0.95rem;
    border-bottom: 1px solid #ddd;
    color: #333;
}

.code-snippet-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 1rem;
    background: #f1f3f5;
    border-bottom: 1px solid #ddd;
    font-size: 0.85rem;
}

.language-label {
    color: #666;
    font-weight: 500;
}

.copy-btn {
    background: #fff;
    border: 1px solid #ddd;
    padding: 0.4rem 0.8rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.85rem;
    transition: all 0.2s;
}

.copy-btn:hover {
    background: #e9ecef;
    border-color: #adb5bd;
}

.copy-btn:active {
    background: #dee2e6;
}

.code-snippet {
    padding: 1rem;
    overflow-x: auto;
    margin: 0;
    font-size: 0.9rem;
    line-height: 1.5;
    color: #333;
    background: #fff;
}

.code-snippet code {
    font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
}

.highlight-line {
    background: #fff3cd;
    display: block;
    padding-left: 0.5rem;
    padding-right: 0.5rem;
    margin: 0 -1rem;
    padding-left: calc(0.5rem + 1rem);
    padding-right: calc(0.5rem + 1rem);
}
</style>

<script>
// Copy button functionality
document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const code = btn.getAttribute('data-code');
        navigator.clipboard.writeText(code).then(() => {
            const originalText = btn.textContent;
            btn.textContent = 'Copied!';
            setTimeout(() => {
                btn.textContent = originalText;
            }, 2000);
        });
    });
});
</script>
```

- [ ] **Step 2: Commit CodeSnippet component**

```bash
cd /Users/adriancorsini/Development/dl-course
git add src/components/CodeSnippet.astro
git commit -m "feat: add CodeSnippet component with syntax highlighting and copy button"
```

---

## Task 4: Create APIReference Component

**Files:**
- Create: `src/components/APIReference.astro`

This component displays API documentation inline within lessons.

- [ ] **Step 1: Create APIReference.astro**

Create `/Users/adriancorsini/Development/dl-course/src/components/APIReference.astro`:

```astro
---
interface Props {
    name: string;  // e.g., "nn::Linear"
    description?: string;
}

const { name, description } = Astro.props;
---

<div class="api-reference">
    <div class="api-header">
        <span class="api-icon">📚</span>
        <h4 class="api-name">{name}</h4>
    </div>
    {description && <p class="api-description">{description}</p>}
    <div class="api-content">
        <slot />
    </div>
</div>

<style>
.api-reference {
    margin: 1.5rem 0;
    padding: 0;
    border-left: 4px solid #0066cc;
    background: #f0f7ff;
    border-radius: 4px;
    overflow: hidden;
}

.api-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    background: #e6f2ff;
    border-bottom: 1px solid #b3d9ff;
}

.api-icon {
    font-size: 1.2rem;
}

.api-name {
    margin: 0;
    font-size: 1.05rem;
    color: #0066cc;
    font-weight: 600;
}

.api-description {
    margin: 0;
    padding: 0 1rem;
    padding-top: 0.5rem;
    font-size: 0.95rem;
    color: #555;
}

.api-content {
    padding: 1rem;
}

.api-content :global(code) {
    background: #fff;
    padding: 0.2rem 0.4rem;
    border-radius: 3px;
    font-family: 'Monaco', 'Menlo', monospace;
    color: #c41a16;
}

.api-content :global(pre) {
    background: #f8f9fa;
    padding: 0.75rem;
    border-radius: 4px;
    overflow-x: auto;
    margin: 0.5rem 0;
}
</style>
```

- [ ] **Step 2: Commit APIReference component**

```bash
cd /Users/adriancorsini/Development/dl-course
git add src/components/APIReference.astro
git commit -m "feat: add APIReference component for inline documentation"
```

---

## Task 5: Create WasmDemo Component

**Files:**
- Create: `src/components/WasmDemo.astro`

This wrapper component loads and initializes WASM modules for demos.

- [ ] **Step 1: Create WasmDemo.astro**

Create `/Users/adriancorsini/Development/dl-course/src/components/WasmDemo.astro`:

```astro
---
interface Props {
    title?: string;
    description?: string;
    demoId: string; // unique ID for this demo
}

const { title, description, demoId } = Astro.props;
---

<div class="wasm-demo" id={demoId}>
    {title && <h3 class="demo-title">{title}</h3>}
    {description && <p class="demo-description">{description}</p>}
    
    <div class="demo-canvas">
        <div class="demo-loader">
            <span class="spinner"></span>
            Loading interactive demo...
        </div>
        <slot name="demo" />
    </div>
</div>

<style>
.wasm-demo {
    margin: 2rem 0;
    padding: 1.5rem;
    border: 2px solid #4a90e2;
    border-radius: 8px;
    background: #f5f9ff;
}

.demo-title {
    margin: 0 0 0.5rem 0;
    color: #4a90e2;
    font-size: 1.1rem;
}

.demo-description {
    margin: 0 0 1rem 0;
    color: #666;
    font-size: 0.95rem;
}

.demo-canvas {
    background: #fff;
    border: 1px solid #ddd;
    border-radius: 6px;
    padding: 1rem;
    min-height: 300px;
    position: relative;
}

.demo-loader {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    color: #666;
    font-size: 0.95rem;
}

.spinner {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid #ddd;
    border-top: 2px solid #4a90e2;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}
</style>

<script define:vars={{ demoId }}>
// When WASM is loaded, remove the loader
document.addEventListener('wasmLoaded', (event) => {
    if (event.detail.demoId === demoId) {
        const loader = document.querySelector(`#${demoId} .demo-loader`);
        if (loader) {
            loader.style.display = 'none';
        }
    }
});
</script>
```

- [ ] **Step 2: Commit WasmDemo component**

```bash
cd /Users/adriancorsini/Development/dl-course
git add src/components/WasmDemo.astro
git commit -m "feat: add WasmDemo wrapper component for interactive demos"
```

---

## Task 6: Create TensorVisualizer Demo (Chapter 1)

**Files:**
- Create: `src/components/demos/TensorVisualizer.astro`
- Create: `src/js/demos/tensor-visualizer.ts`

This demo lets students interactively create and reshape tensors.

- [ ] **Step 1: Create tensor-visualizer.ts**

Create `/Users/adriancorsini/Development/dl-course/src/js/demos/tensor-visualizer.ts`:

```typescript
export class TensorVisualizer {
    private canvasId: string;
    private canvas: HTMLCanvasElement | null;
    private ctx: CanvasRenderingContext2D | null;

    constructor(canvasId: string) {
        this.canvasId = canvasId;
        this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        this.ctx = this.canvas?.getContext('2d') || null;
    }

    // Draw a simple tensor grid
    drawTensor(shape: number[], data: number[]) {
        if (!this.canvas || !this.ctx) return;

        const width = this.canvas.width;
        const height = this.canvas.height;
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(0, 0, width, height);

        // For 2D tensors, draw as a grid
        if (shape.length === 2) {
            const [rows, cols] = shape;
            const cellWidth = (width - 40) / cols;
            const cellHeight = (height - 40) / rows;
            const startX = 20;
            const startY = 20;

            // Draw grid
            this.ctx.strokeStyle = '#ddd';
            this.ctx.lineWidth = 1;
            for (let i = 0; i <= rows; i++) {
                this.ctx.beginPath();
                this.ctx.moveTo(startX, startY + i * cellHeight);
                this.ctx.lineTo(startX + cols * cellWidth, startY + i * cellHeight);
                this.ctx.stroke();
            }
            for (let j = 0; j <= cols; j++) {
                this.ctx.beginPath();
                this.ctx.moveTo(startX + j * cellWidth, startY);
                this.ctx.lineTo(startX + j * cellWidth, startY + rows * cellHeight);
                this.ctx.stroke();
            }

            // Draw values
            this.ctx.fillStyle = '#333';
            this.ctx.font = '14px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';

            for (let i = 0; i < rows; i++) {
                for (let j = 0; j < cols; j++) {
                    const idx = i * cols + j;
                    const value = data[idx] || 0;
                    const x = startX + (j + 0.5) * cellWidth;
                    const y = startY + (i + 0.5) * cellHeight;
                    this.ctx.fillText(value.toFixed(2), x, y);
                }
            }
        } else {
            // Fallback for 1D or 3D+ tensors
            this.ctx.fillStyle = '#333';
            this.ctx.font = '14px monospace';
            this.ctx.fillText(`Shape: [${shape.join(', ')}]`, 20, 30);
            this.ctx.fillText(`Size: ${data.length}`, 20, 60);
        }
    }

    clear() {
        if (this.ctx && this.canvas) {
            this.ctx.fillStyle = '#fff';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }
}
```

- [ ] **Step 2: Create TensorVisualizer.astro**

Create `/Users/adriancorsini/Development/dl-course/src/components/demos/TensorVisualizer.astro`:

```astro
---
import WasmDemo from '../WasmDemo.astro';
---

<WasmDemo 
    title="Interactive Tensor Creator" 
    description="Create and reshape tensors to see how the memory layout changes."
    demoId="tensor-visualizer"
>
    <div slot="demo" class="tensor-demo">
        <div class="controls">
            <div class="control-group">
                <label>Rows:</label>
                <input type="number" id="rows" value="3" min="1" max="10" />
            </div>
            <div class="control-group">
                <label>Columns:</label>
                <input type="number" id="cols" value="4" min="1" max="10" />
            </div>
            <button id="create-btn">Create Tensor</button>
        </div>

        <div class="canvas-container">
            <canvas id="tensor-canvas" width="500" height="300"></canvas>
        </div>

        <div class="info">
            <p id="shape-info">Shape: [3, 4] | Size: 12 elements</p>
            <p id="memory-info">Memory: contiguous, row-major order</p>
        </div>
    </div>
</WasmDemo>

<style>
.tensor-demo {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.controls {
    display: flex;
    gap: 1rem;
    align-items: flex-end;
    padding: 1rem;
    background: #f5f5f5;
    border-radius: 6px;
}

.control-group {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.control-group label {
    font-size: 0.9rem;
    font-weight: 500;
    color: #333;
}

.control-group input {
    padding: 0.4rem 0.6rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 0.9rem;
}

button {
    padding: 0.6rem 1.2rem;
    background: #4a90e2;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
    transition: background 0.2s;
}

button:hover {
    background: #2e5c8a;
}

.canvas-container {
    display: flex;
    justify-content: center;
    background: white;
    padding: 1rem;
    border: 1px solid #ddd;
    border-radius: 6px;
}

canvas {
    border: 1px solid #ddd;
    border-radius: 4px;
}

.info {
    padding: 1rem;
    background: #f0f7ff;
    border-left: 4px solid #4a90e2;
    border-radius: 4px;
}

.info p {
    margin: 0.25rem 0;
    font-size: 0.9rem;
    color: #333;
    font-family: monospace;
}
</style>

<script>
import { TensorVisualizer } from '../../js/demos/tensor-visualizer';

const visualizer = new TensorVisualizer('tensor-canvas');

// Default: draw 3x4 tensor
const defaultData = Array.from({ length: 12 }, (_, i) => i + 1);
visualizer.drawTensor([3, 4], defaultData);

document.getElementById('create-btn')?.addEventListener('click', () => {
    const rows = parseInt((document.getElementById('rows') as HTMLInputElement).value);
    const cols = parseInt((document.getElementById('cols') as HTMLInputElement).value);
    const size = rows * cols;
    const data = Array.from({ length: size }, (_, i) => i + 1);

    visualizer.clear();
    visualizer.drawTensor([rows, cols], data);

    const shapeInfo = document.getElementById('shape-info');
    if (shapeInfo) {
        shapeInfo.textContent = `Shape: [${rows}, ${cols}] | Size: ${size} elements`;
    }
});

// Notify parent that WASM demo is ready
window.dispatchEvent(new CustomEvent('wasmLoaded', {
    detail: { demoId: 'tensor-visualizer' }
}));
</script>
```

- [ ] **Step 3: Test TensorVisualizer locally**

Build and preview:
```bash
cd /Users/adriancorsini/Development/dl-course
npm run build
npm run preview
```

Navigate to Chapter 1 lesson (if enhanced, or create a test page). Click "Create Tensor" and verify the grid renders. Try changing rows/columns.

- [ ] **Step 4: Commit TensorVisualizer**

```bash
cd /Users/adriancorsini/Development/dl-course
git add src/components/demos/TensorVisualizer.astro src/js/demos/tensor-visualizer.ts
git commit -m "feat: add TensorVisualizer interactive demo for Chapter 1"
```

---

## Task 7: Create AutodiffVisualizer Demo (Chapter 2)

**Files:**
- Create: `src/components/demos/AutodiffVisualizer.astro`
- Create: `src/js/demos/autodiff-visualizer.ts`

This demo visualizes the computation graph and gradient flow.

- [ ] **Step 1: Create autodiff-visualizer.ts**

Create `/Users/adriancorsini/Development/dl-course/src/js/demos/autodiff-visualizer.ts`:

```typescript
export interface GraphNode {
    id: string;
    label: string;
    value: number;
    gradient: number;
    x: number;
    y: number;
    parents: string[];
}

export class AutodiffVisualizer {
    private canvasId: string;
    private canvas: HTMLCanvasElement | null;
    private ctx: CanvasRenderingContext2D | null;
    private nodes: Map<string, GraphNode> = new Map();

    constructor(canvasId: string) {
        this.canvasId = canvasId;
        this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        this.ctx = this.canvas?.getContext('2d') || null;
    }

    addNode(id: string, label: string, value: number, x: number, y: number, parents: string[] = []) {
        this.nodes.set(id, { id, label, value, gradient: 0, x, y, parents });
    }

    drawGraph() {
        if (!this.canvas || !this.ctx) return;

        const width = this.canvas.width;
        const height = this.canvas.height;

        // Clear
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(0, 0, width, height);

        // Draw edges (parent-child connections)
        this.ctx.strokeStyle = '#999';
        this.ctx.lineWidth = 2;
        this.nodes.forEach(node => {
            node.parents.forEach(parentId => {
                const parent = this.nodes.get(parentId);
                if (parent) {
                    this.ctx!.beginPath();
                    this.ctx!.moveTo(parent.x, parent.y);
                    this.ctx!.lineTo(node.x, node.y);
                    this.ctx!.stroke();

                    // Arrow
                    const dx = node.x - parent.x;
                    const dy = node.y - parent.y;
                    const len = Math.sqrt(dx * dx + dy * dy);
                    const arrowSize = 10;
                    const angle = Math.atan2(dy, dx);

                    this.ctx!.fillStyle = '#999';
                    this.ctx!.beginPath();
                    this.ctx!.moveTo(node.x, node.y);
                    this.ctx!.lineTo(node.x - arrowSize * Math.cos(angle - Math.PI / 6), node.y - arrowSize * Math.sin(angle - Math.PI / 6));
                    this.ctx!.lineTo(node.x - arrowSize * Math.cos(angle + Math.PI / 6), node.y - arrowSize * Math.sin(angle + Math.PI / 6));
                    this.ctx!.fill();
                }
            });
        });

        // Draw nodes
        this.nodes.forEach(node => {
            const radius = 30;

            // Node circle
            this.ctx!.fillStyle = '#4a90e2';
            this.ctx!.beginPath();
            this.ctx!.arc(node.x, node.y, radius, 0, Math.PI * 2);
            this.ctx!.fill();

            // Node label
            this.ctx!.fillStyle = '#fff';
            this.ctx!.font = 'bold 12px sans-serif';
            this.ctx!.textAlign = 'center';
            this.ctx!.textBaseline = 'middle';
            this.ctx!.fillText(node.label, node.x, node.y - 8);

            // Value
            this.ctx!.fillStyle = '#fff';
            this.ctx!.font = '10px monospace';
            this.ctx!.fillText(`v=${node.value.toFixed(1)}`, node.x, node.y + 4);

            // Gradient (if non-zero)
            if (node.gradient !== 0) {
                this.ctx!.fillStyle = '#ff6b6b';
                this.ctx!.font = '10px monospace';
                this.ctx!.fillText(`∇=${node.gradient.toFixed(1)}`, node.x, node.y + 14);
            }
        });
    }

    setGradient(nodeId: string, gradient: number) {
        const node = this.nodes.get(nodeId);
        if (node) {
            node.gradient = gradient;
        }
    }

    clear() {
        this.nodes.clear();
        if (this.ctx && this.canvas) {
            this.ctx.fillStyle = '#fff';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }
}
```

- [ ] **Step 2: Create AutodiffVisualizer.astro**

Create `/Users/adriancorsini/Development/dl-course/src/components/demos/AutodiffVisualizer.astro`:

```astro
---
import WasmDemo from '../WasmDemo.astro';
---

<WasmDemo 
    title="Computation Graph & Gradient Flow" 
    description="Forward pass computes values; backward pass propagates gradients."
    demoId="autodiff-visualizer"
>
    <div slot="demo" class="autodiff-demo">
        <div class="canvas-container">
            <canvas id="autodiff-canvas" width="600" height="350"></canvas>
        </div>

        <div class="controls">
            <button id="forward-btn">Forward Pass</button>
            <button id="backward-btn">Backward Pass</button>
            <button id="reset-btn">Reset</button>
        </div>

        <div class="equations">
            <p id="equation-display">y = (x² + 3x)</p>
            <p id="gradient-display">∇y/∂x = (2x + 3)</p>
        </div>
    </div>
</WasmDemo>

<style>
.autodiff-demo {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.canvas-container {
    display: flex;
    justify-content: center;
    background: white;
    padding: 1rem;
    border: 1px solid #ddd;
    border-radius: 6px;
}

canvas {
    border: 1px solid #ddd;
    border-radius: 4px;
}

.controls {
    display: flex;
    gap: 0.5rem;
    justify-content: center;
    padding: 1rem;
    background: #f5f5f5;
    border-radius: 6px;
}

button {
    padding: 0.6rem 1.2rem;
    background: #4a90e2;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
}

button:hover {
    background: #2e5c8a;
}

button:disabled {
    background: #ccc;
    cursor: not-allowed;
}

.equations {
    padding: 1rem;
    background: #f0f7ff;
    border-left: 4px solid #4a90e2;
    border-radius: 4px;
}

.equations p {
    margin: 0.25rem 0;
    font-size: 0.95rem;
    font-family: monospace;
    color: #333;
}
</style>

<script>
import { AutodiffVisualizer } from '../../js/demos/autodiff-visualizer';

const visualizer = new AutodiffVisualizer('autodiff-canvas');
let step = 0;

// Example: y = x² + 3x where x = 2
const x = 2;

function reset() {
    visualizer.clear();
    step = 0;
    document.getElementById('forward-btn')!.disabled = false;
    document.getElementById('backward-btn')!.disabled = true;
}

function forwardPass() {
    if (step === 0) {
        // Create nodes for: x, x², 3x, and y = x² + 3x
        visualizer.addNode('x', 'x', x, 100, 150);
        visualizer.addNode('sq', 'x²', x * x, 250, 100, ['x']);
        visualizer.addNode('mul', '3x', 3 * x, 250, 200, ['x']);
        visualizer.addNode('y', 'y=+', x * x + 3 * x, 400, 150, ['sq', 'mul']);
        visualizer.drawGraph();
        step = 1;
        document.getElementById('forward-btn')!.disabled = true;
        document.getElementById('backward-btn')!.disabled = false;
    }
}

function backwardPass() {
    if (step === 1) {
        // ∂y/∂y = 1
        visualizer.setGradient('y', 1.0);
        // ∂y/∂(x²) = 1, ∂y/∂(3x) = 1
        visualizer.setGradient('sq', 1.0);
        visualizer.setGradient('mul', 1.0);
        // ∂y/∂x = ∂y/∂(x²) * ∂(x²)/∂x + ∂y/∂(3x) * ∂(3x)/∂x = 1 * 2x + 1 * 3 = 2x + 3
        const gradX = 2 * x + 3;
        visualizer.setGradient('x', gradX);
        visualizer.drawGraph();
        step = 2;
        document.getElementById('backward-btn')!.disabled = true;
        document.getElementById('gradient-display')!.textContent = `∂y/∂x = ${gradX} (for x=${x})`;
    }
}

reset();
visualizer.drawGraph(); // Initial empty graph

document.getElementById('forward-btn')?.addEventListener('click', forwardPass);
document.getElementById('backward-btn')?.addEventListener('click', backwardPass);
document.getElementById('reset-btn')?.addEventListener('click', reset);

window.dispatchEvent(new CustomEvent('wasmLoaded', {
    detail: { demoId: 'autodiff-visualizer' }
}));
</script>
```

- [ ] **Step 3: Test AutodiffVisualizer locally**

```bash
cd /Users/adriancorsini/Development/dl-course
npm run build
npm run preview
```

Click "Forward Pass", then "Backward Pass" and verify the gradients appear.

- [ ] **Step 4: Commit AutodiffVisualizer**

```bash
cd /Users/adriancorsini/Development/dl-course
git add src/components/demos/AutodiffVisualizer.astro src/js/demos/autodiff-visualizer.ts
git commit -m "feat: add AutodiffVisualizer interactive demo for Chapter 2"
```

---

## Task 8: Create GradientDescentOptimizer Demo (Chapter 3)

**Files:**
- Create: `src/components/demos/GradientDescentOptimizer.astro`
- Create: `src/js/demos/optimizer-visualizer.ts`

This demo shows 2D loss surface with optimizer paths.

- [ ] **Step 1: Create optimizer-visualizer.ts**

Create `/Users/adriancorsini/Development/dl-course/src/js/demos/optimizer-visualizer.ts`:

```typescript
export class OptimizerVisualizer {
    private canvasId: string;
    private canvas: HTMLCanvasElement | null;
    private ctx: CanvasRenderingContext2D | null;

    constructor(canvasId: string) {
        this.canvasId = canvasId;
        this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        this.ctx = this.canvas?.getContext('2d') || null;
    }

    // Quadratic loss: L = (x-1)² + (y-1)²
    lossFunction(x: number, y: number): number {
        return Math.pow(x - 1, 2) + Math.pow(y - 1, 2);
    }

    // Draw contour map of loss surface
    drawContours() {
        if (!this.canvas || !this.ctx) return;

        const width = this.canvas.width;
        const height = this.canvas.height;
        const xMin = -1, xMax = 3;
        const yMin = -1, yMax = 3;

        // Draw contour lines
        this.ctx.strokeStyle = '#ddd';
        this.ctx.lineWidth = 1;

        const levels = [0.1, 0.5, 1, 2, 4, 8];
        const padding = 40;

        levels.forEach(level => {
            this.ctx!.beginPath();
            const radius = Math.sqrt(level);
            const centerX = padding + (1 - xMin) / (xMax - xMin) * (width - 2 * padding);
            const centerY = height - padding - (1 - yMin) / (yMax - yMin) * (height - 2 * padding);
            const radiusPixels = radius / (xMax - xMin) * (width - 2 * padding);

            this.ctx!.arc(centerX, centerY, radiusPixels, 0, Math.PI * 2);
            this.ctx!.stroke();
        });

        // Draw axes
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 2;
        const originX = padding + (0 - xMin) / (xMax - xMin) * (width - 2 * padding);
        const originY = height - padding - (0 - yMin) / (yMax - yMin) * (height - 2 * padding);

        this.ctx.beginPath();
        this.ctx.moveTo(padding, height - padding);
        this.ctx.lineTo(width - padding, height - padding);
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.moveTo(padding, padding);
        this.ctx.lineTo(padding, height - padding);
        this.ctx.stroke();

        // Labels
        this.ctx.fillStyle = '#333';
        this.ctx.font = '12px sans-serif';
        this.ctx.fillText('x', width - padding + 10, height - padding + 5);
        this.ctx.fillText('y', padding - 20, padding - 10);

        // Optimum marker
        this.ctx.fillStyle = '#ff6b6b';
        this.ctx.beginPath();
        const optX = padding + (1 - xMin) / (xMax - xMin) * (width - 2 * padding);
        const optY = height - padding - (1 - yMin) / (yMax - yMin) * (height - 2 * padding);
        this.ctx.arc(optX, optY, 6, 0, Math.PI * 2);
        this.ctx.fill();
    }

    // Draw optimizer path
    drawPath(path: Array<{ x: number; y: number }>, color: string, label: string) {
        if (!this.canvas || !this.ctx || path.length === 0) return;

        const width = this.canvas.width;
        const height = this.canvas.height;
        const xMin = -1, xMax = 3;
        const yMin = -1, yMax = 3;
        const padding = 40;

        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();

        path.forEach((point, idx) => {
            const px = padding + (point.x - xMin) / (xMax - xMin) * (width - 2 * padding);
            const py = height - padding - (point.y - yMin) / (yMax - yMin) * (height - 2 * padding);

            if (idx === 0) {
                this.ctx!.moveTo(px, py);
            } else {
                this.ctx!.lineTo(px, py);
            }
        });

        this.ctx.stroke();

        // Draw final point
        const lastPoint = path[path.length - 1];
        const lastX = padding + (lastPoint.x - xMin) / (xMax - xMin) * (width - 2 * padding);
        const lastY = height - padding - (lastPoint.y - yMin) / (yMax - yMin) * (height - 2 * padding);

        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
        this.ctx.fill();

        // Legend
        this.ctx.fillStyle = color;
        this.ctx.font = '12px sans-serif';
        this.ctx.fillText(label, 60, 30);
    }

    clear() {
        if (this.ctx && this.canvas) {
            this.ctx.fillStyle = '#fff';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }
}
```

- [ ] **Step 2: Create GradientDescentOptimizer.astro**

Create `/Users/adriancorsini/Development/dl-course/src/components/demos/GradientDescentOptimizer.astro`:

```astro
---
import WasmDemo from '../WasmDemo.astro';
---

<WasmDemo 
    title="Gradient Descent & Optimizer Comparison" 
    description="See how different optimizers navigate the loss landscape. Loss = (x-1)² + (y-1)²"
    demoId="optimizer-visualizer"
>
    <div slot="demo" class="optimizer-demo">
        <div class="canvas-container">
            <canvas id="optimizer-canvas" width="500" height="400"></canvas>
        </div>

        <div class="controls">
            <div class="control-group">
                <label>Learning Rate:</label>
                <input type="range" id="lr-slider" min="0.01" max="0.5" step="0.01" value="0.1" />
                <span id="lr-value">0.1</span>
            </div>
            <div class="control-group">
                <button id="sgd-btn">Run SGD</button>
                <button id="adam-btn">Run Adam</button>
                <button id="reset-btn">Reset</button>
            </div>
        </div>

        <div class="stats">
            <p id="stat-sgd">SGD: — steps</p>
            <p id="stat-adam">Adam: — steps</p>
        </div>
    </div>
</WasmDemo>

<style>
.optimizer-demo {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.canvas-container {
    display: flex;
    justify-content: center;
    background: white;
    padding: 1rem;
    border: 1px solid #ddd;
    border-radius: 6px;
}

canvas {
    border: 1px solid #ddd;
    border-radius: 4px;
}

.controls {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
    background: #f5f5f5;
    border-radius: 6px;
}

.control-group {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.control-group label {
    font-weight: 500;
    min-width: 120px;
}

.control-group input[type="range"] {
    flex: 1;
}

.control-group span {
    font-family: monospace;
    min-width: 40px;
}

button {
    padding: 0.6rem 1.2rem;
    background: #4a90e2;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
}

button:hover {
    background: #2e5c8a;
}

.stats {
    padding: 1rem;
    background: #f0f7ff;
    border-left: 4px solid #4a90e2;
    border-radius: 4px;
}

.stats p {
    margin: 0.25rem 0;
    font-family: monospace;
    color: #333;
}
</style>

<script>
import { OptimizerVisualizer } from '../../js/demos/optimizer-visualizer';

const visualizer = new OptimizerVisualizer('optimizer-canvas');
visualizer.clear();
visualizer.drawContours();

const lrSlider = document.getElementById('lr-slider') as HTMLInputElement;
const lrValue = document.getElementById('lr-value');

lrSlider.addEventListener('input', () => {
    lrValue!.textContent = lrSlider.value;
});

function runSGD() {
    const lr = parseFloat(lrSlider.value);
    let x = -0.5, y = -0.5;
    const path = [{ x, y }];

    for (let i = 0; i < 50; i++) {
        const gradX = 2 * (x - 1);
        const gradY = 2 * (y - 1);
        x -= lr * gradX;
        y -= lr * gradY;
        path.push({ x, y });
        if (Math.abs(gradX) < 0.01 && Math.abs(gradY) < 0.01) break;
    }

    visualizer.drawPath(path, '#4a90e2', `SGD (lr=${lr})`);
    const sgdStat = document.getElementById('stat-sgd');
    if (sgdStat) sgdStat.textContent = `SGD: ${path.length} steps`;
}

function runAdam() {
    const lr = parseFloat(lrSlider.value);
    let x = -0.5, y = -0.5;
    let mx = 0, my = 0;
    let vx = 0, vy = 0;
    const path = [{ x, y }];
    const beta1 = 0.9, beta2 = 0.999, eps = 1e-8;

    for (let step = 1; step <= 50; step++) {
        const gradX = 2 * (x - 1);
        const gradY = 2 * (y - 1);

        mx = beta1 * mx + (1 - beta1) * gradX;
        my = beta1 * my + (1 - beta1) * gradY;
        vx = beta2 * vx + (1 - beta2) * gradX * gradX;
        vy = beta2 * vy + (1 - beta2) * gradY * gradY;

        const mxHat = mx / (1 - Math.pow(beta1, step));
        const myHat = my / (1 - Math.pow(beta1, step));
        const vxHat = vx / (1 - Math.pow(beta2, step));
        const vyHat = vy / (1 - Math.pow(beta2, step));

        x -= lr * mxHat / (Math.sqrt(vxHat) + eps);
        y -= lr * myHat / (Math.sqrt(vyHat) + eps);
        path.push({ x, y });

        if (Math.abs(gradX) < 0.01 && Math.abs(gradY) < 0.01) break;
    }

    visualizer.drawPath(path, '#e74c3c', `Adam (lr=${lr})`);
    const adamStat = document.getElementById('stat-adam');
    if (adamStat) adamStat.textContent = `Adam: ${path.length} steps`;
}

function reset() {
    visualizer.clear();
    visualizer.drawContours();
    const sgdStat = document.getElementById('stat-sgd');
    const adamStat = document.getElementById('stat-adam');
    if (sgdStat) sgdStat.textContent = 'SGD: — steps';
    if (adamStat) adamStat.textContent = 'Adam: — steps';
}

document.getElementById('sgd-btn')?.addEventListener('click', runSGD);
document.getElementById('adam-btn')?.addEventListener('click', runAdam);
document.getElementById('reset-btn')?.addEventListener('click', reset);

window.dispatchEvent(new CustomEvent('wasmLoaded', {
    detail: { demoId: 'optimizer-visualizer' }
}));
</script>
```

- [ ] **Step 3: Test GradientDescentOptimizer locally**

```bash
cd /Users/adriancorsini/Development/dl-course
npm run build
npm run preview
```

Adjust the learning rate slider, click "Run SGD" and "Run Adam", verify both paths render.

- [ ] **Step 4: Commit GradientDescentOptimizer**

```bash
cd /Users/adriancorsini/Development/dl-course
git add src/components/demos/GradientDescentOptimizer.astro src/js/demos/optimizer-visualizer.ts
git commit -m "feat: add GradientDescentOptimizer interactive demo for Chapter 3"
```

---

## Task 9: Enhance Chapter 1-3 Lessons with Code Snippets

**Files:**
- Modify: `src/content/lessons/01-tensors.mdx`
- Modify: `src/content/lessons/02-autodiff.mdx`
- Modify: `src/content/lessons/03-gradient-descent.mdx`

This task integrates the TensorVisualizer, AutodiffVisualizer, and GradientDescentOptimizer demos into their respective chapters, plus adds code snippets.

- [ ] **Step 1: Enhance Chapter 1 - Add Imports & TensorVisualizer**

Open `/Users/adriancorsini/Development/dl-course/src/content/lessons/01-tensors.mdx` and add this at the top of the file (after frontmatter):

```mdx
import CodeSnippet from '../components/CodeSnippet.astro';
import APIReference from '../components/APIReference.astro';
import TensorVisualizer from '../components/demos/TensorVisualizer.astro';

<!-- After the first intro section, add: -->

## Interactive Demo

Try creating and reshaping tensors to understand memory layout:

<TensorVisualizer />

## Tensor API Reference

<APIReference name="Tensor Constructor">

```cpp
Tensor(const std::vector<int>& shape);
```

**Parameters:**
- `shape` — Vector of dimension sizes (e.g., {3, 4} for 3x4 matrix)

**Example:**
```cpp
Tensor t({2, 3});  // Creates 2x3 tensor
```

</APIReference>
```

Add this code snippet section after the memory layout explanation:

```mdx
<CodeSnippet 
    title="Creating and Using Tensors"
    code={`Tensor t({3, 4});  // 3x4 matrix
std::vector<float> data = t.data();  // Access underlying data
auto shape = t.shape();              // Get dimensions`}
    highlight={[1]}
/>
```

- [ ] **Step 2: Enhance Chapter 2 - Add AutodiffVisualizer & Snippets**

Open `/Users/adriancorsini/Development/dl-course/src/content/lessons/02-autodiff.mdx` and add:

```mdx
import CodeSnippet from '../components/CodeSnippet.astro';
import APIReference from '../components/APIReference.astro';
import AutodiffVisualizer from '../components/demos/AutodiffVisualizer.astro';

<!-- After intro, add: -->

## Interactive Computation Graph

See how forward and backward passes work:

<AutodiffVisualizer />

## How Backward Propagation Works

<CodeSnippet 
    title="Calling backward() on a Tensor"
    code={`Tensor x({2, 3});
// ... forward computation ...
Tensor loss = compute_loss(x);
loss.backward(1.0f);  // Start gradient flow from loss

float grad_x = x.grad[0];  // Access gradient
`}
    highlight={[4, 5]}
/>

<APIReference name="Tensor::backward">

```cpp
void backward(float grad = 1.0f);
```

**Purpose:** Initiate reverse-mode autodiff from this tensor

**Parameters:**
- `grad` — Initial gradient (usually 1.0 for scalar outputs)

**Example:**
```cpp
loss.backward(1.0f);
```

</APIReference>
```

- [ ] **Step 3: Enhance Chapter 3 - Add GradientDescentOptimizer**

Open `/Users/adriancorsini/Development/dl-course/src/content/lessons/03-gradient-descent.mdx` and add:

```mdx
import CodeSnippet from '../components/CodeSnippet.astro';
import APIReference from '../components/APIReference.astro';
import GradientDescentOptimizer from '../components/demos/GradientDescentOptimizer.astro';

<!-- After intro, add: -->

## Comparing Optimizers

Run SGD and Adam on the same loss surface:

<GradientDescentOptimizer />

## SGD vs Adam Implementation

<CodeSnippet 
    title="Basic SGD Update"
    code={`// SGD: simple gradient descent
for (auto param : model.parameters()) {
    param->data -= learning_rate * param->grad;
}`}
    highlight={[3]}
/>

<CodeSnippet 
    title="Adam with Momentum"
    code={`// Adam: adaptive learning rates with momentum
float beta1 = 0.9, beta2 = 0.999;
for (auto param : model.parameters()) {
    m = beta1 * m + (1 - beta1) * param->grad;
    v = beta2 * v + (1 - beta2) * param->grad * param->grad;
    param->data -= lr * m / (sqrt(v) + eps);
}`}
    highlight={[4, 5]}
/>

<APIReference name="optim::SGD">

```cpp
class SGD : public Optimizer {
public:
    SGD(float lr = 0.01f);
    void step();  // Update parameters
};
```

</APIReference>
```

- [ ] **Step 4: Test enhanced chapters locally**

```bash
cd /Users/adriancorsini/Development/dl-course
npm run build
npm run preview
```

Navigate to Chapters 1, 2, 3 and verify:
- Code snippets render with syntax highlighting
- Copy buttons work
- Interactive demos load and are clickable

- [ ] **Step 5: Commit enhanced chapters**

```bash
cd /Users/adriancorsini/Development/dl-course
git add src/content/lessons/01-tensors.mdx src/content/lessons/02-autodiff.mdx src/content/lessons/03-gradient-descent.mdx
git commit -m "feat: enhance Ch 1-3 with code snippets and interactive WASM demos"
```

---

## Task 10: Create Chapter 9-10 Lesson Stubs

**Files:**
- Create: `src/content/lessons/09-sequence-models.mdx`
- Create: `src/content/lessons/10-transformers.mdx`

These are skeleton files ready to be filled in during Phase 2.

- [ ] **Step 1: Create Chapter 9 Stub**

Create `/Users/adriancorsini/Development/dl-course/src/content/lessons/09-sequence-models.mdx`:

```mdx
---
title: "Sequence Models: RNN & LSTM"
chapter: 9
description: "Recurrent neural networks, LSTM cells, and backpropagation through time"
---

## Overview

Sequence models process variable-length inputs by maintaining hidden state across timesteps. Unlike feedforward networks, they can model temporal dependencies.

### RNN (Vanilla Recurrent Neural Network)

An RNN maintains a hidden state **h** that gets updated at each timestep:

$$h_t = \tanh(W_{hh} h_{t-1} + W_{xh} x_t + b_h)$$
$$y_t = W_{hy} h_t + b_y$$

The same weights are reused across all timesteps, so the network learns to compress information into the hidden state.

### The Problem: Vanishing Gradients

When backpropagating through time (BPTT), gradients are multiplied by the same weight matrix repeatedly. If eigenvalues < 1, gradients shrink exponentially; if > 1, they explode.

**Tanh squashing** (output range [-1, 1]) naturally causes vanishing gradients. Hundreds of timesteps upstream, the gradient approaching 0.

### LSTM: Long Short-Term Memory

LSTMs add a **cell state** and **gating mechanisms** to selectively accumulate or discard information:

$$f_t = \sigma(W_{f} [h_{t-1}, x_t] + b_f) \quad \text{(forget gate)}$$
$$i_t = \sigma(W_{i} [h_{t-1}, x_t] + b_i) \quad \text{(input gate)}$$
$$\tilde{C}_t = \tanh(W_{c} [h_{t-1}, x_t] + b_c) \quad \text{(candidate cell)}$$
$$C_t = f_t \odot C_{t-1} + i_t \odot \tilde{C}_t \quad \text{(cell state)}$$
$$o_t = \sigma(W_{o} [h_{t-1}, x_t] + b_o) \quad \text{(output gate)}$$
$$h_t = o_t \odot \tanh(C_t) \quad \text{(hidden state)}$$

The additive cell state update ($C_t = f_t \odot C_{t-1} + ...$) creates an **additive skip connection**, allowing gradients to flow without multiplication. This largely solves vanishing gradients over long sequences.

---

## Interactive Demo

*Coming in Phase 2: Character-level LSTM text generation with hidden state visualization*

---

## Key Concepts

- **Unrolling:** Treat the RNN as a feedforward network over time, then apply standard backprop (BPTT)
- **Hidden state:** Compresses information from all previous timesteps
- **LSTM gates:** Control information flow and mitigate vanishing gradients

---

## Next Steps

Chapter 10 extends these ideas to the Transformer, which replaces recurrence with self-attention.
```

- [ ] **Step 2: Create Chapter 10 Stub**

Create `/Users/adriancorsini/Development/dl-course/src/content/lessons/10-transformers.mdx`:

```mdx
---
title: "Transformers: Attention & Self-Attention"
chapter: 10
description: "Self-attention mechanism, multi-head attention, and the Transformer architecture"
---

## Overview

Transformers replace RNNs with self-attention, allowing each token to directly attend to all other tokens in parallel. This enables:

- Better gradient flow (no sequential multiplication)
- Parallelization across timesteps
- Longer-range dependencies with less depth

### Scaled Dot-Product Attention

For each query token, compute attention weights over all keys:

$$\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right) V$$

Where:
- **Q (Query):** What are we attending to? (from current position)
- **K (Key):** What positions are worth attending to? (from all positions)
- **V (Value):** What information do we extract? (from all positions)

The $\frac{1}{\sqrt{d_k}}$ scaling prevents softmax from saturating when $d_k$ is large.

### Causal Masking

In language models, position $i$ should only attend to positions $j \leq i$ (no peeking into the future). Causal masking sets attention weights to $-\infty$ for future positions before softmax.

### Multi-Head Attention

Instead of one attention head, use $H$ heads in parallel, each with different learned $Q, K, V$ projections:

$$\text{MultiHead}(Q, K, V) = \text{Concat}(\text{head}_1, ..., \text{head}_H) W^O$$

Different heads learn different attention patterns (e.g., one head attends to adjacent tokens, another to long-range dependencies).

### Transformer Block

A block stacks:

1. **Self-Attention:** Token $i$ attends to all tokens $j \leq i$
2. **Feed-Forward:** Dense MLP applied per-token
3. **Layer Norm + Residuals:** Stabilize training

$$x' = x + \text{MultiHeadAttention}(x, x, x)$$
$$x'' = x' + \text{MLP}(x')$$

Stacking 12-48 blocks creates GPT, BERT, and similar models.

---

## Interactive Demo

*Coming in Phase 2: Multi-head attention heatmap and causal masking visualization*

---

## Key Concepts

- **Self-attention:** Tokens communicate directly; no sequential recurrence
- **Parallelization:** All positions computed in parallel
- **Position encoding:** Positional information must be explicitly injected (sinusoidal encoding)

---

## Summary

Transformers are the dominant architecture for sequence modeling because:
- **Scalability:** Train on massive datasets with gradient flow from attention
- **Efficiency:** Parallel computation across tokens
- **Expressiveness:** Multi-head attention learns diverse patterns

The combination of attention, feedforward layers, and layer norm creates a powerful building block for language modeling, machine translation, and more.
```

- [ ] **Step 3: Test lessons render**

```bash
cd /Users/adriancorsini/Development/dl-course
npm run build
npm run preview
```

Navigate to Chapters 9 and 10 to verify they render without errors.

- [ ] **Step 4: Commit lesson stubs**

```bash
cd /Users/adriancorsini/Development/dl-course
git add src/content/lessons/09-sequence-models.mdx src/content/lessons/10-transformers.mdx
git commit -m "feat: add Chapter 9-10 lesson stubs for Sequence Models and Transformers"
```

---

## Task 11: Update Site Navigation for Chapters 9-10

**Files:**
- Modify: Navigation/sidebar component (likely `src/components/SidebarNav.astro` or similar)

- [ ] **Step 1: Find and update nav config**

Find the lesson navigation configuration (likely in `src/components/SidebarNav.astro` or a config file):

```astro
const chapters = [
    { num: 1, title: "Tensors", href: "/lessons/01-tensors" },
    { num: 2, title: "Autodiff", href: "/lessons/02-autodiff" },
    // ... existing chapters ...
    { num: 8, title: "MNIST Capstone", href: "/lessons/08-mnist-capstone" },
    // ADD THESE:
    { num: 9, title: "Sequence Models: RNN & LSTM", href: "/lessons/09-sequence-models" },
    { num: 10, title: "Transformers", href: "/lessons/10-transformers" },
];
```

- [ ] **Step 2: Test navigation**

```bash
npm run build && npm run preview
```

Verify Chapters 9-10 appear in the sidebar/navigation menu and links work.

- [ ] **Step 3: Commit navigation update**

```bash
git add src/components/SidebarNav.astro
git commit -m "feat: add navigation links for Chapters 9-10"
```

---

## Task 12: Test Full Phase 1 Build & Deployment

**Files:** (no files modified; integration testing)

- [ ] **Step 1: Clean build**

```bash
cd /Users/adriancorsini/Development/dl-course
rm -rf build dist public/wasm node_modules/.vite
npm run build
```

Expected: Build completes without errors. Check for warnings about unused components.

- [ ] **Step 2: Preview locally**

```bash
npm run preview
```

Visit http://localhost:3000 and:
- [ ] Navigate to Chapter 1, verify TensorVisualizer loads and is interactive
- [ ] Navigate to Chapter 2, verify AutodiffVisualizer loads
- [ ] Navigate to Chapter 3, verify GradientDescentOptimizer loads
- [ ] Try copy button on code snippets
- [ ] Navigate to Chapters 9-10, verify content renders
- [ ] Check that all chapters appear in sidebar

- [ ] **Step 3: Test WASM loading**

Open browser DevTools (F12) → Network tab. Filter for `.wasm` files. Verify:
- `framework.wasm` is requested when demos are loaded
- File size is reasonable (< 5 MB)
- Demos work after WASM loads

- [ ] **Step 4: Verify bundle size**

Run:
```bash
du -h public/wasm/
du -h dist/
```

Expected:
- `public/wasm/` ≈ 1-3 MB (WASM + glue code)
- `dist/` ≈ 2-5 MB total (including all HTML/CSS)

If WASM is too large, note for Phase 3 optimization.

- [ ] **Step 5: Create final Phase 1 commit**

```bash
git add -A
git commit -m "feat: Phase 1 complete — WASM infrastructure, Ch 1-3 demos, components, and Ch 9-10 stubs"
```

- [ ] **Step 6: Tag Phase 1 milestone**

```bash
git tag -a phase1/wasm-integration -m "Phase 1: WASM integration with Ch 1-3 interactive demos complete"
git log --oneline -10  # Verify tag
```

---

## Summary

**Phase 1 Deliverables:**
✓ WASM build infrastructure (CMakeLists.txt, build.sh, Vercel config)
✓ WASM stub bindings (tensor_wasm.cpp, ops_wasm.cpp, modules_wasm.cpp)
✓ Reusable Astro components (CodeSnippet, APIReference, WasmDemo)
✓ Three interactive demos (TensorVisualizer, AutodiffVisualizer, GradientDescentOptimizer)
✓ Enhanced Ch 1-3 with code snippets and demos
✓ Ch 9-10 lesson stubs ready for Phase 2
✓ Updated site navigation
✓ Full integration test & local preview

**Next: Phase 2** (separate plan) — Write full Ch 9-10 content, build TextGenerationDemo and AttentionVisualizer, enhance with API references.

---

# PHASE 2: Sequence Models & Transformer Demos (Deferred)

*Create comprehensive Plan 2 once Phase 1 is reviewed and approved. Will include:*
- Full Ch 9 content (RNN/LSTM theory + implementation)
- TextGenerationDemo (character-level prediction with hidden state viz)
- Full Ch 10 content (Attention, multi-head, Transformers)
- AttentionVisualizer (heatmap + causal masking)
- Inline API references for all sequence modules

---

# PHASE 3: Polish & Optimization (Deferred)

*Create separate Plan 3 for:*
- Enhance Ch 4-8 with inline code snippets + API refs
- WASM bundle optimization (size profiling, selective compilation)
- Cross-browser testing
- Performance benchmarks
