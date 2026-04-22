# Phase 2: Recommendations and Roadmap

This document outlines the current technical debts ("What's Wrong"), areas for enhancement ("What Could Be Improved"), and bold new concepts ("New Ideas") for the next phase of the `dl-course` companion site, bridging it seamlessly with the newly matured `tensorflowccp` framework.

---

## 1. What's Wrong (Technical Debt & Stale State)

* **WASM Integration is Faked:** The current files in `wasm-src/` (`tensor_wasm.cpp`, `modules_wasm.cpp`, etc.) do not compile or bind the actual `tensorflowccp` codebase. They are standalone stubs. The WASM build process needs to be updated to compile real backend files (`src/**/*.cpp`) and bind directly to `Tensor.h`.
* **Outdated Documentation:** The `README.md` and phase checkpoint specifications say the course stops at the "MNIST Capstone" (Chapter 8). They also claim that Sequence models are blocked on C++ implementations, which is no longer true since `LSTM.h`, `MultiHeadAttention.h`, and `minigpt_demo.cpp` are now fully built.
* **Orphaned Content:** Chapters `09-sequence-models.mdx` and `10-transformers.mdx` are empty stubs. If left as-is, they severely detract from the otherwise high-quality course experience.

## 2. What Could Be Improved (Refinements)

* **Compile Real C++ to WebAssembly:** Update `wasm-src/CMakeLists.txt` to correctly link `tensorflowccp/src` files. Exposing the real computational graph to JS via `embind` will allow true interactive debugging.
* **Apply Progressive Disclosure to NLP:** The "progressive demos" spec proposed for Chapters 2 & 3 should be extended to Chapter 10 (Transformers). Attention is notoriously hard to understand; breaking it down sequentially on a canvas diagram (query, key, value projections $\rightarrow$ dot product $\rightarrow$ masking) will reduce cognitive load.
* **PyTorch vs. Custom C++ Toggle:** In the `CodeSnippet` component, add a "PyTorch Equivalent" toggle. As learners read the `tensorflowccp` C++ implementation, allowing them to flip and see the exact equivalent in standard PyTorch will anchor their understanding in an industry standard.
* **Pre-trained Model Loading in Browser:** Rather than training a model from scratch in the browser, `tensorflowccp` allows binary weight loading (`Serialization.h`). The course website could fetch a small binary model (like the 300KB MNIST or a small Text Gen model) from `/public/models/` and run inference *live in WASM*.

## 3. New Ideas (Features & Capstones)

### A. The "MiniGPT" Capstone (Chapter 11)
Since the C++ framework now successfully implements a transformer and has `minigpt_demo.cpp`, the course should culminate in building a miniature Generative Pre-trained Transformer. The capstone would walk through:
1. Building a simple Byte-Pair or Character tokenizer.
2. Embedding tokens and adding Sine/Cosine Positional Encoding.
3. Stacking `TransformerBlock` and `LayerNorm`.
4. Putting it together to autoregressively generate novel text.

### B. Interactive Attention Heatmap Visualizer (Canvas Demo)
For Chapter 10, build an `AttentionVisualizer.astro` component. 
* **User Flow:** A user types a 5-10 word sentence ("The quick brown fox...").
* **Execution:** The WASM framework computes the scaled dot-product attention in real time.
* **Visualization:** A 2D Canvas visually maps the connection strengths (weights) between each word in a heatmap, revealing who "attends" to who.

### C. WebAssembly Performance Benchmarking
Add a fun "Performance" section to the end of the course measuring the WASM execution speed of your C++ linear algebra against pure JavaScript implementations. It proves to the learner *why* systems programming languages are preferred for deep learning math, even on the web.

### D. Model Weight Exporter Ecosystem
Create a tiny Python script that mirrors `tensorflowccp` in PyTorch, trains a model perfectly, and exports the `.bin` weights. Provide this script in the course so students understand interoperability—showing how standard framework weights can be ingested into their custom C++ engine.

---

**Proposed Execution Strategy**
1. **Fix the Foundation (WASM):** Rework `wasm-src` to consume the real `<Tensor.h>` and `MultiHeadAttention.h`.
2. **Draft the NLP Content:** Flesh out Ch 9, Ch 10, and write Ch 11 based on `text_gen_demo.cpp`.
3. **Build the Visualizers:** Integrate the Attention and Canvas demos to cap off the Phase 2 UI.
