# Progressive Disclosure with WASM Integration Design

**Date:** 2026-04-15  
**Project:** dl-course (Deep Learning Course Companion Website)  
**Scope:** Integrate tensorflowccp C++ code into the companion website with interactive WASM demos, code snippets, and comprehensive API documentation across 10 chapters (8 existing + 2 new).

---

## Overview

The dl-course companion website will evolve from a conceptual teaching tool into a hands-on learning platform by embedding:

1. **Interactive WASM demos** — For foundational chapters, allow students to see concepts in action (tensor creation, autodiff graphs, optimizer convergence, text generation, attention mechanisms)
2. **Copy-paste code snippets** — Chapters 4-8 emphasize practical implementation examples with syntax highlighting and annotations
3. **Inline API documentation** — Reference material stays within lesson context, not in a separate section
4. **Extended curriculum** — Add Chapters 9-10 for Sequence Models (RNN/LSTM) and Transformers

The design prioritizes **student understanding** through interactivity, followed by reference value and teaching completeness.

---

## Architecture & Content Flow

### Chapter Progression

**Chapters 1-3 (Foundations):** Interactive WASM demos + explanatory code snippets
- Show mechanics in real-time (tensor layout, graph traversal, optimization dynamics)
- Demystify "how does this work under the hood?"

**Chapters 4-8 (Application):** Copy-paste code examples + inline API reference
- Students are building models, not learning mechanics
- Focus: "How do I use this module?"
- Exception: Optional MNIST loss curve demo in Ch 8 (nice-to-have)

**Chapters 9-10 (Specialized):** WASM demos + comprehensive code + API reference
- Ch 9 (Sequence Models): Hidden state visualization for character-level text generation
- Ch 10 (Transformers): Multi-head attention heatmap, position encoding visualization

### Lesson Distribution

| Chapter | Title | WASM Demo | Code Snippets | API Reference |
|---------|-------|-----------|---------------|---------------|
| 1 | Tensors | ✓ | ✓ | ✓ |
| 2 | Autodiff | ✓ | ✓ | ✓ |
| 3 | Gradient Descent | ✓ | ✓ | ✓ |
| 4 | Linear Layers | — | ✓ | ✓ |
| 5 | Activations | — | ✓ | ✓ |
| 6 | CNNs | — | ✓ | ✓ |
| 7 | BatchNorm + Dropout | — | ✓ | ✓ |
| 8 | MNIST Capstone | ◐ | ✓ | ✓ |
| 9 | Sequence Models (RNN/LSTM) | ✓ | ✓ | ✓ |
| 10 | Transformers | ✓ | ✓ | ✓ |

◐ = Optional (loss curve tracking during training)

---

## Content Components

### 1. Interactive WASM Demos

**Chapters with demos:** 1, 2, 3, 9, 10 (+ optional Ch 8)

**Ch 1 — Tensor Visualizer**
- Interactive tensor creation, reshaping, indexing
- Show memory layout updates as operations change shape
- Example: Create 3×4 → reshape to 6×2 → see contiguous storage rearrange

**Ch 2 — Autodiff Computation Graph**
- Drag-and-drop node creation for simple expressions (y = x² + 3x)
- Forward pass: compute y given x
- Backward pass: propagate gradients, highlight computation paths
- Show accumulation of gradients at leaf nodes

**Ch 3 — Gradient Descent Optimizer**
- 2D loss surface (contour plot) with learnable parameter x, y
- Overlay optimizer path (SGD vs. Adam)
- Interactive: adjust learning rate slider, watch convergence speed change
- Show: epoch count, loss value, gradient magnitude

**Ch 9 — Text Generation with Hidden State**
- Character-level LSTM predicting next character
- Input: feed tokens one-by-one (e.g., "h-e-l-l-o")
- Visualization: hidden state vector as heatmap/bar chart, evolving with each step
- Output: predicted next character with probability
- Interactive: type custom input, see predictions in real-time

**Ch 10 — Multi-Head Attention Visualizer**
- Query/Key/Value matrices from input tokens
- Show attention weight heatmap per head
- Highlight which tokens attend to which
- Overlay causal masking (show masked-out future positions)
- Interactive: select different heads, see how each focuses on different relationships

**Ch 8 (Optional) — MNIST Loss Curve**
- Real-time loss tracking during training
- Show training vs. validation curves diverging/converging
- Not a full training loop (too slow), just visualization of logged curves

---

### 2. Code Snippets

**Component:** `<CodeSnippet>` (new Astro component)

**Features:**
- Syntax highlighting (C++)
- Copy-to-clipboard button
- Optional line highlighting (e.g., highlight the constructor, highlight the backward pass)
- Inline annotations (comments explaining key concepts)

**Placement Strategy:**

**Chapters 1-3:** Snippets show framework internals
- Example from Ch 2: "Here's how Tensor::backward() traverses the operation graph"
- Example from Ch 3: "Here's the SGD weight update loop"

**Chapters 4-8:** Snippets show how to use the framework
- Example from Ch 4: "Create a Linear layer and forward pass"
- Example from Ch 6: "Build a simple CNN with Conv2D + ReLU + MaxPool"

**Chapters 9-10:** Snippets show both usage and key internals
- Example from Ch 9: "LSTM forward pass with gates" + "How hidden state carries information"
- Example from Ch 10: "Scaled dot-product attention" + "Causal masking in TransformerBlock"

---

### 3. API Documentation (Inline)

**Component:** `<APIReference>` (new Astro component)

**Structure per module:**
```
<APIReference>
### Constructor
```cpp
ClassName(arg1, arg2, ...)
```

### Methods
- `methodName(params) → ReturnType` — one-line description

### Parameters
- `param1` — description and valid ranges

### Example
```cpp
// Usage example
auto module = make_shared<ClassName>(args);
Tensor output = module->forward(input);
```
</APIReference>
```

**Coverage by chapter:**

| Chapter | Modules |
|---------|---------|
| 1 | `Tensor`, constructors, indexing, broadcasting |
| 2 | `Operation` (base class), `Tensor::backward()`, gradient accumulation |
| 3 | `optim::SGD`, `optim::Adam` |
| 4 | `nn::Linear` |
| 5 | `nn::ReLU`, `nn::Tanh`, `nn::Sigmoid` |
| 6 | `nn::Conv2D`, `nn::MaxPool2D` |
| 7 | `nn::BatchNorm`, `nn::Dropout` |
| 8 | Loss functions: `nn::MSELoss`, `nn::CrossEntropyLoss` |
| 9 | `nn::RNN`, `nn::LSTM`, `nn::Embedding`, `nn::LayerNorm` |
| 10 | `nn::MultiHeadAttention`, `nn::PositionalEncoding`, `nn::TransformerBlock`, `nn::TransformerDecoder` |

---

## Technical Implementation

### Build Pipeline

**1. C++ → WASM Compilation**

Create new `wasm-src/` directory with thin bindings for tensorflowccp:

```
wasm-src/
├── CMakeLists.txt (emscripten-specific)
├── tensor_wasm.cpp (export Tensor APIs)
├── ops_wasm.cpp (export operation methods)
└── modules_wasm.cpp (export nn:: modules)
```

- Use Emscripten to compile selected tensorflowccp files to WASM
- Export only necessary APIs to JavaScript (Tensor construction, forward/backward, parameter access)
- Minimize bundle size: don't export debug utilities or internal helpers

**Output:** `public/wasm/framework.wasm` + `public/wasm/framework.js` (glue code)

**2. Astro Build**

Standard Astro build process:
- Process `.mdx` lesson files
- Inject `<CodeSnippet>`, `<APIReference>`, `<WasmDemo>` components
- Generate static HTML pages

**3. Deployment to Vercel**

- WASM files in `public/` are served as static assets from CDN
- Lazy-load WASM only on pages with demos (Ch 1-3, 9-10)
- Use dynamic imports: `lazy(() => import('./demos/ch2-autodiff.wasm.js'))`
- Zero serverless functions — entirely static

**Build Configuration:**

Create `build.sh`:
```bash
#!/bin/bash
set -e

# Compile C++ to WASM
echo "Compiling tensorflowccp to WASM..."
cd wasm-src
emcmake cmake -B build
cmake --build build
cp build/*.wasm ../public/wasm/
cp build/*.js ../public/wasm/
cd ..

# Build Astro site
echo "Building Astro site..."
npm run build
```

Update `vercel.json`:
```json
{
  "buildCommand": "bash build.sh"
}
```

### Bundle Size Optimization

- Compiled WASM: estimate 2-5 MB (depending on optimization level)
- Lazy-load by chapter to avoid loading Ch 10 WASM on Ch 1 page
- Minify JavaScript glue code
- Consider running emscripten with `-O3` or `-Oz` flags (size optimization)

---

## File Structure

```
dl-course/
├── src/
│   ├── content/
│   │   └── lessons/
│   │       ├── 01-tensors.mdx
│   │       ├── 02-autodiff.mdx
│   │       ├── 03-gradient-descent.mdx
│   │       ├── 04-linear-layers.mdx
│   │       ├── 05-activations.mdx
│   │       ├── 06-cnns.mdx
│   │       ├── 07-batchnorm-dropout.mdx
│   │       ├── 08-mnist-capstone.mdx
│   │       ├── 09-sequence-models.mdx (NEW)
│   │       └── 10-transformers.mdx (NEW)
│   ├── components/
│   │   ├── CodeSnippet.astro (NEW)
│   │   ├── APIReference.astro (NEW)
│   │   ├── WasmDemo.astro (NEW)
│   │   ├── demos/ (NEW)
│   │   │   ├── TensorVisualizer.astro
│   │   │   ├── AutodiffVisualizer.astro
│   │   │   ├── GradientDescentOptimizer.astro
│   │   │   ├── TextGenerationDemo.astro
│   │   │   └── AttentionVisualizer.astro
│   │   └── [existing components]
│   └── [existing structure]
├── wasm-src/ (NEW)
│   ├── CMakeLists.txt
│   ├── tensor_wasm.cpp
│   ├── ops_wasm.cpp
│   └── modules_wasm.cpp
├── public/
│   └── wasm/ (NEW — generated at build)
│       ├── framework.wasm
│       └── framework.js
├── build.sh (NEW)
├── vercel.json (NEW or updated)
└── [existing files]
```

---

## Testing & Validation

- **WASM demos:** Test in Chrome, Firefox, Safari (WebAssembly support)
- **Code snippets:** Verify syntax highlighting and copy functionality
- **API reference:** Cross-reference with actual tensorflowccp headers to catch typos
- **Build:** Test full pipeline locally before pushing to Vercel
- **Performance:** Verify WASM loads in <2s on 4G connection (lazy loading helps)

---

## Success Criteria

1. ✓ Students can see tensor operations in real-time (Ch 1)
2. ✓ Autodiff graph traversal is visualized step-by-step (Ch 2)
3. ✓ Different optimizers' convergence paths are comparable (Ch 3)
4. ✓ All module types have copy-paste code examples (Ch 4-8)
5. ✓ RNN/LSTM hidden state evolves visibly (Ch 9)
6. ✓ Attention mechanism is understood via heatmap (Ch 10)
7. ✓ Site deploys and builds on Vercel without errors
8. ✓ WASM load time doesn't exceed 3s per demo (lazy loading)

---

## Timeline & Phase

**Phase 1 (High Priority):**
- Build `CodeSnippet` and `APIReference` components
- Enhance Ch 1-3 with code snippets + WASM demos
- Add Ch 9-10 lesson stubs with content outline

**Phase 2 (Medium Priority):**
- Write full Ch 9 (Sequence Models) content + code examples + text generation demo
- Write full Ch 10 (Transformers) content + code examples + attention visualizer

**Phase 3 (Polish):**
- Enhance Ch 4-8 with inline code snippets (use existing text, add formatted code blocks)
- Test all WASM demos across browsers
- Optimize WASM bundle size

---

## Constraints & Dependencies

- **Requires:** Emscripten toolchain available in Vercel build environment (or Docker layer)
- **Dependency:** tensorflowccp must remain stable in the main branch; breaking changes require WASM bindings update
- **Bundle size:** Monitor WASM growth; may need to split into per-chapter bundles if >10 MB
- **Browser support:** WASM requires ES6 + WebAssembly support (covers 95%+ of users)

---

## Pre-Implementation Decisions

These should be resolved before starting Phase 1:

1. **WASM source location:** Should `wasm-src/` live in `dl-course/` repo or be symlinked/copied from `tensorflowccp/`?
   - Recommendation: Keep in `dl-course/` as a dedicated binding layer (easier to maintain separately)

2. **Emscripten toolchain:** Add to Vercel build environment via Docker or require system installation?
   - Recommendation: Docker image in `vercel.json` to ensure consistent Emscripten version

3. **API documentation generation:** Auto-generate from tensorflowccp headers (Doxygen → JSON → Astro components) or write by hand?
   - Recommendation: Start with hand-written for control + clarity; consider auto-generation later if maintenance burden grows

---

## Summary

This design integrates tensorflowccp directly into the dl-course companion website through:

- **Progressive Disclosure:** Chapters 1-3 emphasize interactivity; Ch 4-8 emphasize reference; Ch 9-10 combine both
- **Three Content Types:** Interactive WASM demos, code snippets, inline API docs
- **Static Deployment:** Everything pre-rendered and served from Vercel CDN (no serverless)
- **Extended Curriculum:** Adding Ch 9-10 covers the full tensorflowccp stack (Transformers)
- **Student-Focused:** Prioritizes understanding through interaction, then reference value

Success is measured by students being able to understand concepts through demos, implement them via code examples, and reference APIs when exploring independently.
