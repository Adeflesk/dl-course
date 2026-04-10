# Course Improvement Plan v2

Comprehensive review of the entire `dl-course` site — lesson content, site infrastructure, styling, diagrams, and SEO. Each item is categorised by priority and grouped by area.

---

## Phase 1: Content Corrections (High Priority)

### 1.1 Lesson 06 — Callout references stale architecture
**File:** `src/content/lessons/06-cnns.mdx` line 93  
**Issue:** The callout at the bottom still lists the *old* architecture without the ReLU between the two linear layers:  
> `Conv2d(1,8,5) → ReLU → MaxPool2d(2) → Flatten → BatchNorm(1152) → Linear(1152,64) → Dropout(0.3) → Linear(64,10)`  

**Fix:** Insert `→ ReLU` after `Linear(1152,64)` to match the updated Lesson 08 architecture.

### 1.2 Lesson 07 — BatchNorm backward dμ formula has unclear σ notation
**File:** `src/content/lessons/07-batchnorm-dropout.mdx` line 39  
**Issue:** The `∂L/∂μ` formula uses bare `σ` (standard deviation) where all other formulas use `σ²` (variance) with explicit square-root. The inconsistency could confuse readers:  
```
∂L/∂μ = Σ ∂L/∂x̂ · (-1/σ) + ...
```
**Fix:** Replace `-1/σ` with `-1/√(σ²+ε)` to match the code's `inv_std` notation and be explicit about where epsilon lives.

### 1.3 Lesson 01 — Tensor struct missing `shared_ptr` for graph ownership
**File:** `src/content/lessons/01-tensors.mdx` lines 28-33  
**Issue:** The struct shows `std::shared_ptr<Operation> backOp;` but the surrounding text never explains *why* it's a `shared_ptr` rather than a `unique_ptr` or raw pointer. Since Lesson 04 later dives deep into pointer lifetimes, a single sentence here ("shared ownership lets multiple tensors reference the same operation when outputs are used in several places") would set up that later discussion.  
**Fix:** Add one sentence after line 36 explaining shared ownership.

---

## Phase 2: Missing Content (Medium Priority)

### 2.1 No `zero_grad()` discussion anywhere
**Issue:** The training loop in Lesson 03 shows `SGD::step()` but never mentions `zero_grad()`. Gradients accumulate by default (via `accumulate_grad`), so without zeroing between batches the network trains on stale gradients. This is the single most common beginner bug in every framework.  
**Fix:** Add a short subsection to Lesson 03 (after the SGD code block) titled **"Zeroing gradients"** that explains why `zero_grad()` must be called before each forward pass, with a 3-line code snippet.

### 2.2 Lesson 08 — No training loop shown
**Issue:** The capstone shows architecture, loss, optimizer, and results — but never the actual training loop (`for each epoch → for each batch → forward → loss → backward → step → zero_grad`). This is the single most important piece of code in the entire course and the reader has to imagine it.  
**Fix:** Add a code block after the "Training setup" bullet list showing a simplified but complete training loop.

### 2.3 Homepage — No meta description
**File:** `src/pages/index.astro`  
**Issue:** The homepage `<head>` has `<title>` but no `<meta name="description">`.  
**Fix:** Add `<meta name="description" content="...">` using the hero subtitle text.

---

## Phase 3: Diagram Improvements (Medium Priority)

### 3.1 Canvas diagrams are not responsive (break on mobile)
**Files:** All three `*-canvas.js` files  
**Issue:** Canvas dimensions are hard-coded (`W = 560, H = 220` etc.) and never respond to container width. On viewports under ~600px the canvas overflows.  
**Fix:** On init and on `window resize`, read `canvas.parentElement.clientWidth`, scale `W` accordingly, recalculate positions proportionally, and redraw. Keep a minimum width of ~320px.

### 3.2 Canvas diagrams have no HiDPI / Retina support
**Issue:** The canvases set `canvas.width` in CSS pixels but never account for `devicePixelRatio`. On Retina displays all text and lines look blurry.  
**Fix:** Multiply `canvas.width/height` by `devicePixelRatio`, then apply `ctx.scale(dpr, dpr)` and set CSS `width`/`height` to the logical size. Apply this to all three canvas files.

### 3.3 Autodiff diagram — Backward edges point the wrong direction
**File:** `src/diagrams/autodiff-canvas.js`  
**Issue:** The arrow heads are drawn at the *target* of each forward edge, but the diagram description says "gradient flows backward." The lit-up edges during the backward animation step from child→parent but the arrows still point parent→child (forward direction). This is visually confusing — the animation says "backward pass" but the arrows say "forward."  
**Fix:** During backward-step animation, either reverse the arrow heads on lit edges, or draw a second set of dashed backward arrows.

### 3.4 MNIST loss curve — static, not animated
**File:** `src/diagrams/mnist-loss-canvas.js`  
**Issue:** Unlike the other two diagrams, the loss curve draws everything immediately with no animation. It's the only diagram that isn't interactive.  
**Fix:** Animate the curves drawing epoch-by-epoch (reveal one data point per tick), matching the interactive feel of the other diagrams.

---

## Phase 4: Styling & UX (Medium Priority)

### 4.1 No mobile responsiveness
**File:** `src/styles/global.css`  
**Issue:** The sidebar is `position: sticky; width: 220px` with no `@media` breakpoint. On mobile the sidebar and content overlap or force horizontal scrolling.  
**Fix:** Add a `@media (max-width: 768px)` query that hides the sidebar (or converts it into a top hamburger nav) and allows `.main-content` to fill the screen with adjusted padding.

### 4.2 Tables have no styling
**Issue:** The Lesson 08 results table renders as browser-default (no borders, no striping, inconsistent padding). This looks jarring against the polished dark theme.  
**Fix:** Add table styles to `global.css`: dark background, subtle border, header row with `var(--bg-border)`, alternating row shading, monospace font for numbers.

### 4.3 No scroll-to-top or progress indicator
**Issue:** Lessons are long single-page documents. Once the reader scrolls past 50% there's no quick way back to the top or sense of progress.  
**Fix (optional):** Add a thin accent-coloured progress bar at the top of the viewport, driven by `scroll` event.

### 4.4 No syntax highlighting language badge
**Issue:** Code blocks don't indicate the language. The `shikiConfig` uses `github-dark` and lists `['cpp', 'bash', 'yaml']` but there's no visual badge. Adding a small language label (e.g. "C++") in the top-right of each `<pre>` block improves scannability.  
**Fix:** Add a CSS `::before` pseudo-element or a rehype plugin that inserts a language label.

---

## Phase 5: Site Infrastructure (Low Priority)

### 5.1 README is the Astro starter template
**File:** `README.md`  
**Issue:** The README is the untouched Astro minimal starter ("Seasoned astronaut? Delete this file."). It says nothing about the course.  
**Fix:** Replace with a proper README: course title, what it covers, how to run locally, project structure, and a screenshot.

### 5.2 No 404 page
**Issue:** There is no `src/pages/404.astro`. Bad URLs render the default Astro 404.  
**Fix:** Add a simple 404 page matching the site's dark theme with a link back to the homepage.

### 5.3 No Open Graph / social meta tags
**Issue:** Neither the homepage nor lesson pages include `og:title`, `og:description`, or `og:image`. Sharing links on social media or chat shows no preview.  
**Fix:** Add OG meta tags to `LessonLayout.astro` and `index.astro`.

---

## Phase 6: Content Polish (Low Priority)

### 6.1 Lesson 02 — TypeScript cast in Astro component
**File:** `src/diagrams/AutodiffDiagram.astro` line 15  
**Issue:** Uses `as HTMLCanvasElement` TypeScript cast inside a `<script>` tag. The other two diagram `.astro` files don't use this cast. Should be consistent.  
**Fix:** Remove the `as HTMLCanvasElement` cast to match the other two files (Astro client scripts in non-TS mode don't need it).

### 6.2 Lesson 05 — Softmax mentioned but not explained until Lesson 08
**Issue:** Softmax appears in Lesson 05 (Activations) with its formula and a note that it's "fused with cross-entropy loss in this framework." The full explanation of *why* it's fused and the derivation of the backward pass doesn't come until Lesson 08. This is fine pedagogically, but a forward-reference like "(see Lesson 8: MNIST Capstone for the full fused implementation)" would help.  
**Fix:** Add a parenthetical forward-reference after the softmax section in Lesson 05.

### 6.3 Consistent code comment style
**Issue:** Some code blocks use `// From src/ops/...` path references, others use `// nn/Linear.h`, and one uses `// main.cpp`. The inconsistency is minor but a consistent `// From <path>` prefix would look cleaner.  
**Fix:** Standardise all code block comments to use `// From <relative-path>` format.

---

## Implementation Order

| Order | Item(s)             | Effort   |
|-------|---------------------|----------|
| 1     | 1.1, 1.2, 1.3      | ~15 min  |
| 2     | 2.1, 2.2, 2.3      | ~30 min  |
| 3     | 4.1, 4.2            | ~30 min  |
| 4     | 3.1, 3.2            | ~45 min  |
| 5     | 3.3, 3.4            | ~30 min  |
| 6     | 5.1, 5.2, 5.3      | ~20 min  |
| 7     | 4.3, 4.4, 6.1–6.3  | ~30 min  |
