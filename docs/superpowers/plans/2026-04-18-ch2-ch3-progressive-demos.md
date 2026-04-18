# Chapter 2-3 Progressive Disclosure Demos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add interactive progressive-disclosure demos to Chapters 2-3 that concretize derivatives, autodiff, and optimization concepts through guided exploration.

**Architecture:** Unlock-driven UX with LocalStorage persistence. Chapter 2 starts with visual derivatives, unlocks backward-pass debugging on first interaction. Chapter 3 starts with convergence races, progressively unlocks loss landscapes, weight tracking, and hyperparameter tuning. All visualization uses pre-computed trajectories (no live WASM needed).

**Tech Stack:** Astro, TypeScript, Canvas API, Plotly.js (2D), Three.js (3D), localStorage for unlock state.

**Architecture Patterns:** 
- **Component hierarchy:** Use `<UnlockManager>` wrapper + `<slot />` for progressive disclosure (not React conditionals)
- **State management:** `unlock-state.ts` + localStorage (no React hooks)
- **Unlock triggers:** Explicit user actions (buttons, form submission) — not time-based
- **Canvas utilities:** Shared helpers in `src/js/demos/utils/canvas-helpers.ts` to avoid duplication

---

## File Structure

**New files to create:**

```
src/
  components/
    demos/
      ch2/
        DerivativeVisualizer.astro         [~180 lines, renders function + slider]
        BackwardPassDebugger.astro         [~220 lines, shows computational graph + backprop]
      ch3/
        OptimizerPlayground.astro          [~120 lines, orchestrator for all Ch 3 demos]
        ConvergenceRace.astro              [~180 lines, loss vs iterations plot]
        LossLandscape.astro                [~280 lines, 3D surface + trajectories]
        WeightUpdateVisualizer.astro       [~180 lines, time-series weight changes]
        AdvancedTuningPanel.astro          [~120 lines, hyperparameter sliders]
        CustomProblemBuilder.astro         [~140 lines, preset selector + parameter tuning]
      shared/
        UnlockManager.astro                [~80 lines, unlock state + UI trigger]
  js/
    demos/
      utils/
        unlock-state.ts                    [~60 lines, LocalStorage hooks]
        trajectory-loader.ts               [~50 lines, load JSON trajectories]
        canvas-helpers.ts                  [~100 lines, shared canvas utilities]
      ch2/
        derivative-visualizer.ts           [~150 lines, canvas rendering + math]
        backward-pass-debugger.ts          [~180 lines, graph execution + visualization]
      ch3/
        convergence-race.ts                [~140 lines, Plotly setup]
        loss-landscape.ts                  [~250 lines, Three.js 3D rendering]
        weight-visualizer.ts               [~120 lines, line plot with multiple series]
        optimizer-config.ts                [~80 lines, tuning parameter ranges + defaults]
public/
  trajectories/
    problems.json                          [Problem metadata + difficulty parameters]
    quadratic-bowl-sgd-lr0.01.json        [Trajectory: x, y, loss, step]
    quadratic-bowl-adam-lr0.01.json
    rosenbrock-sgd-lr0.001.json
    rosenbrock-adam-lr0.001.json
    spiral-sgd-lr0.1.json
    spiral-adam-lr0.1.json
    gaussian-sgd-lr0.05.json
    gaussian-adam-lr0.05.json
    [... more variants with different LRs]
  functions/
    derivatives.json                       [Analytical + numerical derivatives for Ch 2 functions]

content/
  lessons/
    02-autodiff.mdx                        [UPDATED: integrate DerivativeVisualizer + BackwardPassDebugger]
    03-gradient-descent.mdx                [UPDATED: integrate ConvergenceRace + other Ch 3 demos]
```

---

## Task Breakdown (12 Tasks)

### Task 1: Set Up Unlock State Management

**Files:**
- Create: `src/js/demos/utils/unlock-state.ts`
- Create: `src/components/demos/shared/UnlockManager.astro`

**Description:** Build the foundation for progressive disclosure. UnlockManager is a reusable component that handles unlock logic; unlock-state.ts provides LocalStorage persistence hooks.

- [ ] **Step 1: Write test file for unlock state**

Create `src/js/demos/__tests__/unlock-state.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useUnlockState } from '../utils/unlock-state';

describe('useUnlockState', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('initializes with default unlocked state', () => {
    const { isUnlocked } = useUnlockState('ch2_debugger', false);
    expect(isUnlocked).toBe(false);
  });

  it('persists unlock state to LocalStorage', () => {
    const { unlock } = useUnlockState('ch2_debugger', false);
    unlock();
    expect(localStorage.getItem('unlock_ch2_debugger')).toBe('true');
  });

  it('restores unlock state from LocalStorage', () => {
    localStorage.setItem('unlock_ch2_debugger', 'true');
    const { isUnlocked } = useUnlockState('ch2_debugger', false);
    expect(isUnlocked).toBe(true);
  });

  it('supports manual unlock trigger', () => {
    const { isUnlocked, unlock } = useUnlockState('ch3_landscape', false);
    expect(isUnlocked).toBe(false);
    unlock();
    expect(isUnlocked).toBe(true);
  });
});
```

- [ ] **Step 2: Implement unlock-state.ts**

Create `src/js/demos/utils/unlock-state.ts`:

```typescript
/**
 * Client-side unlock state management for progressive disclosure demos
 * Persists to LocalStorage so unlocks survive page reloads
 */

type UnlockStateListener = (unlocked: boolean) => void;

const listeners = new Map<string, Set<UnlockStateListener>>();

export function useUnlockState(featureId: string, defaultUnlocked: boolean = false) {
  const storageKey = `unlock_${featureId}`;
  
  // Read initial state from localStorage
  const stored = localStorage.getItem(storageKey);
  const isUnlocked = stored !== null ? stored === 'true' : defaultUnlocked;
  
  function unlock() {
    localStorage.setItem(storageKey, 'true');
    notify(featureId, true);
  }
  
  function reset() {
    localStorage.removeItem(storageKey);
    notify(featureId, defaultUnlocked);
  }
  
  function subscribe(listener: UnlockStateListener): () => void {
    if (!listeners.has(featureId)) {
      listeners.set(featureId, new Set());
    }
    listeners.get(featureId)!.add(listener);
    
    // Return unsubscribe function
    return () => {
      listeners.get(featureId)?.delete(listener);
    };
  }
  
  return { isUnlocked, unlock, reset, subscribe };
}

function notify(featureId: string, unlocked: boolean) {
  const featureListeners = listeners.get(featureId);
  if (featureListeners) {
    featureListeners.forEach(listener => listener(unlocked));
  }
}
```

- [ ] **Step 3: Create UnlockManager.astro component**

Create `src/components/demos/shared/UnlockManager.astro`:

```astro
---
interface Props {
  featureId: string;
  triggerText?: string;
  defaultUnlocked?: boolean;
}

const { featureId, triggerText = "Explore further", defaultUnlocked = false } = Astro.props;
---

<div class="unlock-manager" data-feature-id={featureId} data-default={defaultUnlocked}>
  <div class="unlock-hint">
    <p class="hint-text">{triggerText}</p>
  </div>
  <slot />
</div>

<style>
.unlock-manager {
  position: relative;
}

.unlock-hint {
  padding: 0.75rem;
  background: rgba(74, 144, 226, 0.1);
  border-left: 3px solid #4a90e2;
  border-radius: 4px;
  margin-bottom: 1rem;
  font-size: 0.9rem;
  color: #4a90e2;
}

.unlock-hint.hidden {
  display: none;
}

@media (prefers-color-scheme: dark) {
  .unlock-hint {
    background: rgba(74, 144, 226, 0.15);
    color: #7cb3ff;
  }
}
</style>

<script define:vars={{ featureId, defaultUnlocked }}>
  // Client-side unlock hint toggling
  const hint = document.querySelector(`[data-feature-id="${featureId}"] .unlock-hint`);
  const storageKey = `unlock_${featureId}`;
  
  // Check if already unlocked
  const unlocked = localStorage.getItem(storageKey) === 'true' || defaultUnlocked;
  if (unlocked && hint) {
    hint.classList.add('hidden');
  }
  
  // Listen for unlock events
  window.addEventListener('unlock', (e: Event) => {
    if ((e as CustomEvent).detail.featureId === featureId && hint) {
      hint.classList.add('hidden');
    }
  });
</script>
```

- [ ] **Step 4: Run tests to verify unlock state works**

```bash
npm test src/js/demos/__tests__/unlock-state.test.ts
```

Expected: All 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/js/demos/utils/unlock-state.ts src/components/demos/shared/UnlockManager.astro src/js/demos/__tests__/unlock-state.test.ts
git commit -m "feat: add unlock state management with LocalStorage persistence"
```

---

### Task 2: Generate Trajectory Data for Optimizers

**Files:**
- Create: `public/trajectories/problems.json`
- Create: `public/trajectories/quadratic-bowl-*.json`
- Create: `public/trajectories/rosenbrock-*.json`
- Create: `public/trajectories/spiral-*.json`
- Create: `public/trajectories/gaussian-*.json`
- Create: `src/js/demos/utils/trajectory-loader.ts`

**Description:** Generate pre-computed optimizer trajectories for all Chapter 3 demo problems. This avoids needing live WASM execution during the demo.

- [ ] **Step 1: Write trajectory loader utility**

Create `src/js/demos/utils/trajectory-loader.ts`:

```typescript
export interface Trajectory {
  optimizer: string;
  learningRate: number;
  steps: Array<{
    iteration: number;
    loss: number;
    weights?: number[];  // Optional: for weight visualizer
    x?: number;
    y?: number;
  }>;
}

export interface Problem {
  id: string;
  name: string;
  description: string;
  difficulty: number;
  trajectories: {
    [key: string]: string;  // e.g., "sgd-0.01" -> filename
  };
}

let problemsCache: Map<string, Problem> | null = null;
let trajectoriesCache: Map<string, Trajectory> | null = null;

export async function loadProblems(): Promise<Map<string, Problem>> {
  if (problemsCache) return problemsCache;
  
  const res = await fetch('/trajectories/problems.json');
  const data = await res.json();
  
  problemsCache = new Map(data.problems.map((p: Problem) => [p.id, p]));
  return problemsCache;
}

export async function loadTrajectory(filename: string): Promise<Trajectory> {
  if (trajectoriesCache?.has(filename)) {
    return trajectoriesCache.get(filename)!;
  }
  
  const res = await fetch(`/trajectories/${filename}`);
  const data = await res.json();
  
  if (!trajectoriesCache) trajectoriesCache = new Map();
  trajectoriesCache.set(filename, data);
  
  return data;
}

export function clearCache() {
  problemsCache = null;
  trajectoriesCache = null;
}
```

- [ ] **Step 2: Create problems.json metadata file**

Create `public/trajectories/problems.json`:

```json
{
  "problems": [
    {
      "id": "quadratic",
      "name": "Quadratic Bowl",
      "description": "f(x,y) = x² + y² - simple convex bowl, all optimizers converge quickly",
      "difficulty": 1.0,
      "trajectories": {
        "sgd-0.01": "quadratic-bowl-sgd-lr0.01.json",
        "sgd-0.05": "quadratic-bowl-sgd-lr0.05.json",
        "sgd-0.1": "quadratic-bowl-sgd-lr0.1.json",
        "adam-0.001": "quadratic-bowl-adam-lr0.001.json",
        "adam-0.01": "quadratic-bowl-adam-lr0.01.json",
        "adam-0.05": "quadratic-bowl-adam-lr0.05.json"
      }
    },
    {
      "id": "rosenbrock",
      "name": "Rosenbrock",
      "description": "f(x,y) = (1-x)² + 100(y-x²)² - narrow valley, shows momentum advantage",
      "difficulty": 1.8,
      "trajectories": {
        "sgd-0.0001": "rosenbrock-sgd-lr0.0001.json",
        "sgd-0.001": "rosenbrock-sgd-lr0.001.json",
        "adam-0.001": "rosenbrock-adam-lr0.001.json",
        "adam-0.01": "rosenbrock-adam-lr0.01.json"
      }
    },
    {
      "id": "spiral",
      "name": "Spiral Classification",
      "description": "2D two-class classification with spiral structure - non-convex, multiple local minima",
      "difficulty": 1.5,
      "trajectories": {
        "sgd-0.05": "spiral-sgd-lr0.05.json",
        "sgd-0.1": "spiral-sgd-lr0.1.json",
        "adam-0.01": "spiral-adam-lr0.01.json",
        "adam-0.05": "spiral-adam-lr0.05.json"
      }
    },
    {
      "id": "gaussian",
      "name": "Gaussian Mixture",
      "description": "2D classification with Gaussian mixture - multiple peaks, high gradient variance",
      "difficulty": 1.3,
      "trajectories": {
        "sgd-0.05": "gaussian-sgd-lr0.05.json",
        "sgd-0.1": "gaussian-sgd-lr0.1.json",
        "adam-0.01": "gaussian-adam-lr0.01.json",
        "adam-0.05": "gaussian-adam-lr0.05.json"
      }
    }
  ]
}
```

- [ ] **Step 3: Generate sample trajectory JSON files**

For each trajectory file, create a JSON structure like `public/trajectories/quadratic-bowl-sgd-lr0.01.json`:

```json
{
  "optimizer": "sgd",
  "learningRate": 0.01,
  "momentum": 0.0,
  "steps": [
    {"iteration": 0, "loss": 50.0, "x": -5.0, "y": 5.0, "weights": [-5.0, 5.0]},
    {"iteration": 1, "loss": 48.5, "x": -4.9, "y": 4.9, "weights": [-4.9, 4.9]},
    {"iteration": 2, "loss": 47.1, "x": -4.8, "y": 4.8, "weights": [-4.8, 4.8]},
    {"iteration": 3, "loss": 45.8, "x": -4.7, "y": 4.7, "weights": [-4.7, 4.7]},
    {"iteration": 4, "loss": 44.5, "x": -4.6, "y": 4.6, "weights": [-4.6, 4.6]},
    {"iteration": 5, "loss": 43.2, "x": -4.5, "y": 4.5, "weights": [-4.5, 4.5]},
    {"iteration": 10, "loss": 35.0, "x": -4.0, "y": 4.0, "weights": [-4.0, 4.0]},
    {"iteration": 20, "loss": 10.0, "x": -2.0, "y": 2.0, "weights": [-2.0, 2.0]},
    {"iteration": 50, "loss": 0.5, "x": -0.2, "y": 0.2, "weights": [-0.2, 0.2]},
    {"iteration": 100, "loss": 0.001, "x": 0.0, "y": 0.0, "weights": [0.0, 0.0]}
  ]
}
```

Create similar files for all optimizer/learning-rate combinations listed in `problems.json`. (This can be generated programmatically or pre-computed from tensorflowccp runs.)

- [ ] **Step 4: Test trajectory loader**

```bash
# Verify JSON is valid
npm test src/js/demos/__tests__/trajectory-loader.test.ts
```

(Create a simple test file that loads problems.json and one trajectory file to verify format is correct.)

- [ ] **Step 5: Commit**

```bash
git add public/trajectories/ src/js/demos/utils/trajectory-loader.ts
git commit -m "feat: add pre-computed optimizer trajectories and loader utility"
```

---

### Task 3: Chapter 2 - DerivativeVisualizer Component

**Files:**
- Create: `src/components/demos/ch2/DerivativeVisualizer.astro`
- Create: `src/js/demos/ch2/derivative-visualizer.ts`

**Description:** Interactive visualization of derivatives. Users drag a slider along x, see f(x) and f'(x) values, and a visual tangent line. This is the foundation for Chapter 2.

- [ ] **Step 1: Create utility functions for derivative math**

Create `src/js/demos/ch2/derivative-visualizer.ts`:

```typescript
export type FunctionType = 'x2' | 'sin' | 'x3' | 'exp' | 'log' | 'x4';

export const FUNCTIONS: Record<FunctionType, { name: string; fn: (x: number) => number; derivative: (x: number) => number; domain: [number, number] }> = {
  x2: {
    name: 'f(x) = x²',
    fn: (x) => x * x,
    derivative: (x) => 2 * x,
    domain: [-5, 5],
  },
  sin: {
    name: 'f(x) = sin(x)',
    fn: (x) => Math.sin(x),
    derivative: (x) => Math.cos(x),
    domain: [-Math.PI * 2, Math.PI * 2],
  },
  x3: {
    name: 'f(x) = x³',
    fn: (x) => x * x * x,
    derivative: (x) => 3 * x * x,
    domain: [-3, 3],
  },
  exp: {
    name: 'f(x) = eˣ',
    fn: (x) => Math.exp(x),
    derivative: (x) => Math.exp(x),
    domain: [-2, 2],
  },
  log: {
    name: 'f(x) = ln(x)',
    fn: (x) => Math.log(x),
    derivative: (x) => 1 / x,
    domain: [0.1, 5],
  },
  x4: {
    name: 'f(x) = x⁴',
    fn: (x) => x * x * x * x,
    derivative: (x) => 4 * x * x * x,
    domain: [-3, 3],
  },
};

export class DerivativeVisualizer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  padding: number = 40;
  currentX: number = 0;
  selectedFunction: FunctionType = 'x2';

  constructor(canvasId: string) {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.width = this.canvas.width;
    this.height = this.canvas.height;
  }

  drawFunction() {
    const func = FUNCTIONS[this.selectedFunction];
    const [xMin, xMax] = func.domain;
    
    // Clear canvas
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    // Draw axes
    this.drawAxes(xMin, xMax);
    
    // Draw function curve
    this.ctx.strokeStyle = '#4a90e2';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    
    for (let px = 0; px <= this.width - 2 * this.padding; px++) {
      const x = xMin + (px / (this.width - 2 * this.padding)) * (xMax - xMin);
      const y = func.fn(x);
      const canvasX = this.padding + px;
      const canvasY = this.height - this.padding - this.normalize(y, xMin, xMax, func.domain[0], func.domain[1]) * (this.height - 2 * this.padding);
      
      if (px === 0) {
        this.ctx.moveTo(canvasX, canvasY);
      } else {
        this.ctx.lineTo(canvasX, canvasY);
      }
    }
    this.ctx.stroke();
    
    // Draw tangent line at current point
    this.drawTangentLine(func);
    
    // Draw current point
    this.drawCurrentPoint(func);
  }

  drawAxes(xMin: number, xMax: number) {
    this.ctx.strokeStyle = '#cccccc';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(this.padding, this.height - this.padding);
    this.ctx.lineTo(this.width - this.padding, this.height - this.padding);
    this.ctx.stroke();
    
    this.ctx.beginPath();
    this.ctx.moveTo(this.padding, this.padding);
    this.ctx.lineTo(this.padding, this.height - this.padding);
    this.ctx.stroke();
    
    // Draw axis labels
    this.ctx.fillStyle = '#666';
    this.ctx.font = '12px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`${xMin.toFixed(1)}`, this.padding, this.height - this.padding + 20);
    this.ctx.fillText(`${xMax.toFixed(1)}`, this.width - this.padding, this.height - this.padding + 20);
  }

  drawTangentLine(func: typeof FUNCTIONS.x2) {
    const derivative = func.derivative(this.currentX);
    const y = func.fn(this.currentX);
    
    // Tangent line: y - y0 = f'(x0) * (x - x0)
    const x1 = this.currentX - 1;
    const y1 = y - derivative;
    const x2 = this.currentX + 1;
    const y2 = y + derivative;
    
    this.ctx.strokeStyle = '#ff6b6b';
    this.ctx.lineWidth = 1.5;
    this.ctx.setLineDash([5, 5]);
    this.ctx.beginPath();
    this.ctx.moveTo(this.canvasX(x1, func.domain[0], func.domain[1]), this.canvasY(y1));
    this.ctx.lineTo(this.canvasX(x2, func.domain[0], func.domain[1]), this.canvasY(y2));
    this.ctx.stroke();
    this.ctx.setLineDash([]);
  }

  drawCurrentPoint(func: typeof FUNCTIONS.x2) {
    const y = func.fn(this.currentX);
    const cx = this.canvasX(this.currentX, func.domain[0], func.domain[1]);
    const cy = this.canvasY(y);
    
    this.ctx.fillStyle = '#ff6b6b';
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private canvasX(x: number, xMin: number, xMax: number): number {
    return this.padding + ((x - xMin) / (xMax - xMin)) * (this.width - 2 * this.padding);
  }

  private canvasY(y: number, yMin: number = -10, yMax: number = 10): number {
    return this.height - this.padding - ((y - yMin) / (yMax - yMin)) * (this.height - 2 * this.padding);
  }

  private normalize(value: number, min1: number, max1: number, min2: number, max2: number): number {
    return ((value - min1) / (max1 - min1)) * (max2 - min2) + min2;
  }
}
```

- [ ] **Step 2: Create DerivativeVisualizer.astro component**

Create `src/components/demos/ch2/DerivativeVisualizer.astro`:

```astro
---
import { useUnlockState } from '../../js/demos/utils/unlock-state';

interface Props {
  demoId?: string;
}

const { demoId = 'ch2-derivative-viz' } = Astro.props;
---

<div class="derivative-demo" id={demoId}>
  <div class="demo-header">
    <h3>Derivative Visualizer</h3>
    <p class="subtitle">Drag the slider to see how the derivative changes at different points</p>
  </div>

  <div class="demo-controls">
    <label for="function-select">Function:</label>
    <select id="function-select">
      <option value="x2">f(x) = x²</option>
      <option value="sin">f(x) = sin(x)</option>
      <option value="x3">f(x) = x³</option>
      <option value="exp">f(x) = eˣ</option>
      <option value="log">f(x) = ln(x)</option>
      <option value="x4">f(x) = x⁴</option>
    </select>
  </div>

  <div class="demo-canvas">
    <canvas id="derivative-canvas" width="600" height="400"></canvas>
  </div>

  <div class="demo-controls">
    <label for="x-slider">x value:</label>
    <input type="range" id="x-slider" min="-5" max="5" step="0.1" value="0" />
    <span id="x-display">0</span>
  </div>

  <div class="demo-metrics">
    <div class="metric">
      <label>f(x):</label>
      <span id="fx-value">0</span>
    </div>
    <div class="metric">
      <label>f'(x):</label>
      <span id="fpx-value">0</span>
    </div>
    <div class="metric">
      <label>Tangent slope:</label>
      <span id="tangent-value">0</span>
    </div>
  </div>
</div>

<style>
.derivative-demo {
  padding: 1.5rem;
  background: #f5f9ff;
  border: 2px solid #4a90e2;
  border-radius: 8px;
  margin: 2rem 0;
}

.demo-header h3 {
  margin: 0 0 0.5rem 0;
  color: #4a90e2;
}

.subtitle {
  margin: 0 0 1.5rem 0;
  color: #666;
  font-size: 0.95rem;
}

.demo-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.demo-controls label {
  font-weight: 600;
}

.demo-controls select,
.demo-controls input[type="range"] {
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.95rem;
}

.demo-controls input[type="range"] {
  flex: 1;
  max-width: 300px;
}

.demo-canvas {
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  overflow: auto;
}

canvas {
  display: block;
  max-width: 100%;
  height: auto;
}

.demo-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.metric {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.metric label {
  font-weight: 600;
  color: #4a90e2;
  font-size: 0.9rem;
}

.metric span {
  font-size: 1.2rem;
  font-weight: bold;
  color: #333;
  font-family: monospace;
}

@media (prefers-color-scheme: dark) {
  .derivative-demo {
    background: #1a2a3a;
    border-color: #4a90e2;
  }

  .subtitle {
    color: #aaa;
  }

  .demo-canvas {
    background: #1e1e1e;
    border-color: #333;
  }

  .metric span {
    color: #f0f0f0;
  }
}
</style>

<script>
  import { DerivativeVisualizer, FUNCTIONS } from '../../js/demos/ch2/derivative-visualizer';

  const canvas = document.getElementById('derivative-canvas') as HTMLCanvasElement;
  const functionSelect = document.getElementById('function-select') as HTMLSelectElement;
  const xSlider = document.getElementById('x-slider') as HTMLInputElement;
  const xDisplay = document.getElementById('x-display') as HTMLElement;
  const fxValue = document.getElementById('fx-value') as HTMLElement;
  const fpxValue = document.getElementById('fpx-value') as HTMLElement;
  const tangentValue = document.getElementById('tangent-value') as HTMLElement;

  const viz = new DerivativeVisualizer('derivative-canvas');

  function updateVisualization() {
    const funcKey = functionSelect.value as keyof typeof FUNCTIONS;
    const func = FUNCTIONS[funcKey];
    
    viz.selectedFunction = funcKey;
    viz.currentX = parseFloat(xSlider.value);

    // Clamp to domain
    const [xMin, xMax] = func.domain;
    if (viz.currentX < xMin) viz.currentX = xMin;
    if (viz.currentX > xMax) viz.currentX = xMax;

    xSlider.value = String(viz.currentX);
    xDisplay.textContent = viz.currentX.toFixed(2);

    const fx = func.fn(viz.currentX);
    const fpx = func.derivative(viz.currentX);

    fxValue.textContent = fx.toFixed(4);
    fpxValue.textContent = fpx.toFixed(4);
    tangentValue.textContent = fpx.toFixed(4);

    viz.drawFunction();
  }

  functionSelect.addEventListener('change', updateVisualization);
  xSlider.addEventListener('input', updateVisualization);

  // Initial draw
  updateVisualization();

  // Trigger unlock on interaction
  window.addEventListener('input', () => {
    localStorage.setItem('unlock_ch2_debugger', 'true');
    window.dispatchEvent(new CustomEvent('unlock', { detail: { featureId: 'ch2_debugger' } }));
  });
</script>
```

- [ ] **Step 3: Test DerivativeVisualizer renders correctly**

```bash
npm run build
# Verify no console errors, canvas renders with function curve
```

- [ ] **Step 4: Commit**

```bash
git add src/components/demos/ch2/DerivativeVisualizer.astro src/js/demos/ch2/derivative-visualizer.ts
git commit -m "feat: add Chapter 2 DerivativeVisualizer component (progressive disclosure foundation)"
```

---

### Task 4: Chapter 2 - BackwardPassDebugger Component

**Files:**
- Create: `src/components/demos/ch2/BackwardPassDebugger.astro`
- Create: `src/js/demos/ch2/backward-pass-debugger.ts`

**Description:** Shows computational graph and step-by-step backward propagation. Unlocks after DerivativeVisualizer interaction.

- [ ] **Step 1: Create BackwardPassDebugger utility**

Create `src/js/demos/ch2/backward-pass-debugger.ts`:

```typescript
import { FUNCTIONS, FunctionType } from './derivative-visualizer';

export interface ComputationStep {
  id: string;
  operation: string;
  inputValue: number;
  outputValue: number;
  gradient: number;
}

export class BackwardPassDebugger {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  padding: number = 40;
  currentX: number = 0;
  selectedFunction: FunctionType = 'x2';
  steps: ComputationStep[] = [];
  currentStep: number = 0;

  constructor(canvasId: string) {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.width = this.canvas.width;
    this.height = this.canvas.height;
  }

  computeForwardPass() {
    const func = FUNCTIONS[this.selectedFunction];
    const outputValue = func.fn(this.currentX);
    
    this.steps = [
      {
        id: 'input',
        operation: 'Input',
        inputValue: this.currentX,
        outputValue: this.currentX,
        gradient: 0,
      },
      {
        id: 'func',
        operation: this.selectedFunction === 'x2' ? 'Square' : this.selectedFunction,
        inputValue: this.currentX,
        outputValue: outputValue,
        gradient: 0,
      },
    ];
  }

  computeBackwardPass() {
    const func = FUNCTIONS[this.selectedFunction];
    const derivative = func.derivative(this.currentX);

    // Backprop: dL/dx = dL/dy * dy/dx
    this.steps[this.steps.length - 1].gradient = 1.0; // dL/dy = 1 at output
    if (this.steps.length > 1) {
      this.steps[this.steps.length - 2].gradient = derivative; // dL/dx = derivative
    }
  }

  drawComputationGraph() {
    // Clear canvas
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Draw nodes
    const nodeRadius = 40;
    const spacing = (this.width - 4 * this.padding) / (this.steps.length - 1 || 1);

    for (let i = 0; i < this.steps.length; i++) {
      const step = this.steps[i];
      const x = this.padding * 2 + i * spacing;
      const y = this.height / 2;

      // Draw node
      this.ctx.fillStyle = '#4a90e2';
      this.ctx.beginPath();
      this.ctx.arc(x, y, nodeRadius, 0, Math.PI * 2);
      this.ctx.fill();

      // Draw label
      this.ctx.fillStyle = '#fff';
      this.ctx.font = 'bold 12px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(step.operation, x, y - 8);
      this.ctx.font = '10px sans-serif';
      this.ctx.fillText(step.outputValue.toFixed(2), x, y + 8);

      // Draw edge to next node
      if (i < this.steps.length - 1) {
        const nextX = this.padding * 2 + (i + 1) * spacing;
        this.ctx.strokeStyle = '#999';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(x + nodeRadius, y);
        this.ctx.lineTo(nextX - nodeRadius, y);
        this.ctx.stroke();
      }
    }

    // Draw backward arrows and gradients
    this.ctx.strokeStyle = '#ff6b6b';
    this.ctx.lineWidth = 2;
    for (let i = this.steps.length - 1; i > 0; i--) {
      const x = this.padding * 2 + i * spacing;
      const y = this.height / 2;
      const prevX = this.padding * 2 + (i - 1) * spacing;

      // Backward arrow
      this.ctx.beginPath();
      this.ctx.moveTo(prevX + nodeRadius, y - 30);
      this.ctx.lineTo(x - nodeRadius, y - 30);
      this.ctx.stroke();

      // Gradient label
      const grad = this.steps[i - 1].gradient;
      this.ctx.fillStyle = '#ff6b6b';
      this.ctx.font = '10px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(`∂L/∂x = ${grad.toFixed(4)}`, (prevX + x) / 2, y - 40);
    }
  }

  drawDebugTable(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let html = '<table class="debug-table"><tr><th>Operation</th><th>Input</th><th>Output</th><th>Gradient</th></tr>';
    for (const step of this.steps) {
      html += `<tr>
        <td>${step.operation}</td>
        <td>${step.inputValue.toFixed(4)}</td>
        <td>${step.outputValue.toFixed(4)}</td>
        <td>${step.gradient.toFixed(4)}</td>
      </tr>`;
    }
    html += '</table>';
    container.innerHTML = html;
  }
}
```

- [ ] **Step 2: Create BackwardPassDebugger.astro component**

Create `src/components/demos/ch2/BackwardPassDebugger.astro`:

```astro
---
import { useUnlockState } from '../../js/demos/utils/unlock-state';

interface Props {
  selectedFunction?: string;
  currentX?: number;
}

const { selectedFunction = 'x2', currentX = 0 } = Astro.props;
---

<div class="backward-debugger">
  <div class="debugger-header">
    <h4>Backward Pass Debugger</h4>
    <p class="subtitle">See how gradients flow backward through the computation graph</p>
  </div>

  <div class="debugger-controls">
    <button id="step-backward-btn" class="btn btn-primary">Step Backward</button>
    <button id="reset-btn" class="btn btn-secondary">Reset</button>
    <span id="step-counter">Step: 0</span>
  </div>

  <div class="debugger-canvas">
    <canvas id="backward-canvas" width="600" height="300"></canvas>
  </div>

  <div class="debugger-table">
    <table class="debug-table">
      <thead>
        <tr>
          <th>Operation</th>
          <th>Input Value</th>
          <th>Output Value</th>
          <th>Gradient</th>
        </tr>
      </thead>
      <tbody id="debug-tbody">
        <!-- Populated by JavaScript -->
      </tbody>
    </table>
  </div>
</div>

<style>
.backward-debugger {
  padding: 1.5rem;
  background: #fff5f5;
  border: 2px solid #ff6b6b;
  border-radius: 8px;
  margin: 1.5rem 0;
}

.debugger-header h4 {
  margin: 0 0 0.5rem 0;
  color: #ff6b6b;
}

.subtitle {
  margin: 0 0 1rem 0;
  color: #999;
  font-size: 0.9rem;
}

.debugger-controls {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  align-items: center;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
}

.btn-primary {
  background: #ff6b6b;
  color: white;
}

.btn-primary:hover {
  background: #ff5252;
}

.btn-secondary {
  background: #e0e0e0;
  color: #333;
}

.btn-secondary:hover {
  background: #d0d0d0;
}

#step-counter {
  margin-left: auto;
  font-weight: 600;
  color: #666;
}

.debugger-canvas {
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 1rem;
  margin-bottom: 1.5rem;
}

canvas {
  display: block;
  max-width: 100%;
}

.debugger-table {
  overflow-x: auto;
}

.debug-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.debug-table th,
.debug-table td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

.debug-table th {
  background: #f5f5f5;
  font-weight: 600;
  color: #333;
}

.debug-table td {
  font-family: monospace;
  color: #666;
}

@media (prefers-color-scheme: dark) {
  .backward-debugger {
    background: #2a1a1a;
    border-color: #ff6b6b;
  }

  .subtitle {
    color: #aaa;
  }

  .debugger-canvas {
    background: #1e1e1e;
    border-color: #333;
  }

  .debug-table th {
    background: #333;
    color: #f0f0f0;
  }

  .debug-table td {
    color: #aaa;
  }
}
</style>

<script define:vars={{ selectedFunction, currentX }}>
  import { BackwardPassDebugger, FUNCTIONS } from '../../js/demos/ch2/backward-pass-debugger';

  const canvas = document.getElementById('backward-canvas') as HTMLCanvasElement;
  const stepBtn = document.getElementById('step-backward-btn') as HTMLButtonElement;
  const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
  const stepCounter = document.getElementById('step-counter') as HTMLElement;
  const tbody = document.getElementById('debug-tbody') as HTMLTableSectionElement;

  const debugger = new BackwardPassDebugger('backward-canvas');
  debugger.selectedFunction = selectedFunction as any;
  debugger.currentX = currentX;

  function updateDebugger() {
    debugger.computeForwardPass();
    debugger.computeBackwardPass();
    debugger.drawComputationGraph();
    
    // Update table
    tbody.innerHTML = '';
    for (const step of debugger.steps) {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${step.operation}</td>
        <td>${step.inputValue.toFixed(4)}</td>
        <td>${step.outputValue.toFixed(4)}</td>
        <td>${step.gradient.toFixed(4)}</td>
      `;
      tbody.appendChild(row);
    }
  }

  stepBtn.addEventListener('click', () => {
    debugger.currentStep++;
    updateDebugger();
    stepCounter.textContent = `Step: ${debugger.currentStep}`;
  });

  resetBtn.addEventListener('click', () => {
    debugger.currentStep = 0;
    updateDebugger();
    stepCounter.textContent = 'Step: 0';
  });

  // Listen for external function/x changes
  window.addEventListener('update-debugger', (e: Event) => {
    const event = e as CustomEvent;
    debugger.selectedFunction = event.detail.selectedFunction;
    debugger.currentX = event.detail.currentX;
    updateDebugger();
  });

  // Initial draw
  updateDebugger();
</script>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/demos/ch2/BackwardPassDebugger.astro src/js/demos/ch2/backward-pass-debugger.ts
git commit -m "feat: add Chapter 2 BackwardPassDebugger (unlocked after interaction)"
```

---

### Task 5: Integrate Chapter 2 Demos into Lesson

**Files:**
- Modify: `content/lessons/02-autodiff.mdx`

**Description:** Add DerivativeVisualizer and BackwardPassDebugger to the Chapter 2 lesson content.

- [ ] **Step 1: Update Chapter 2 lesson file**

Modify `content/lessons/02-autodiff.mdx`. Add these sections:

```markdown
## Interactive: Understanding Derivatives Visually

Before diving into the math, let's visualize what derivatives actually mean. The derivative f'(x) represents the **slope of the tangent line** at any point x.

<DerivativeVisualizer client:load />

**What to try:**
- Drag the slider to move the point along the curve
- Notice how the red tangent line rotates as you move
- The "Tangent slope" is the derivative f'(x)
- Compare how different functions have different derivatives at the same point

---

## Understanding Backward Pass (Autodiff)

Once you understand derivatives, you can see how **backward propagation** works. It's just applying the chain rule in reverse.

<BackwardPassDebugger client:load selectedFunction="x2" currentX="1.5" />

**What to try:**
- Click "Step Backward" to see gradients propagate backward through operations
- Each operation has a gradient ∂L/∂x showing "how much does the loss change if we change x?"
- The chain rule multiplies gradients as they flow backward
```

- [ ] **Step 2: Verify MDX imports are correct**

Ensure the Astro lesson layout has these imports:

```astro
import DerivativeVisualizer from '../components/demos/ch2/DerivativeVisualizer.astro';
import BackwardPassDebugger from '../components/demos/ch2/BackwardPassDebugger.astro';
```

- [ ] **Step 3: Build and test**

```bash
npm run build
# Verify page builds with no errors
npm run preview
# Navigate to lessons/02-autodiff and see both demos render
```

- [ ] **Step 4: Commit**

```bash
git add content/lessons/02-autodiff.mdx
git commit -m "feat: integrate DerivativeVisualizer and BackwardPassDebugger into Chapter 2"
```

---

### Task 6: Chapter 3 - ConvergenceRace Component

**Files:**
- Create: `src/components/demos/ch3/ConvergenceRace.astro`
- Create: `src/js/demos/ch3/convergence-race.ts`

**Description:** Side-by-side visualization of SGD vs Adam convergence. Foundation for Chapter 3. Uses Plotly for line plots.

- [ ] **Step 1: Install Plotly (if not already present)**

```bash
npm install plotly.js
```

- [ ] **Step 2: Create convergence race utility**

Create `src/js/demos/ch3/convergence-race.ts`:

```typescript
import { loadTrajectory, loadProblems } from '../utils/trajectory-loader';

export class ConvergenceRace {
  problemId: string = 'quadratic';
  optimizer1: string = 'sgd';
  optimizer2: string = 'adam';
  learningRate: number = 0.01;
  trajectories: any = {};

  async loadTrajectories() {
    const problems = await loadProblems();
    const problem = problems.get(this.problemId);
    
    if (!problem) {
      console.error(`Problem ${this.problemId} not found`);
      return;
    }

    // Load both optimizer trajectories
    const key1 = `${this.optimizer1}-${this.learningRate}`;
    const key2 = `${this.optimizer2}-${this.learningRate}`;

    const traj1File = problem.trajectories[key1];
    const traj2File = problem.trajectories[key2];

    if (traj1File) {
      this.trajectories[this.optimizer1] = await loadTrajectory(traj1File);
    }
    if (traj2File) {
      this.trajectories[this.optimizer2] = await loadTrajectory(traj2File);
    }
  }

  getMetrics(optimizerName: string) {
    const traj = this.trajectories[optimizerName];
    if (!traj) return null;

    const steps = traj.steps;
    const convergenceStep = steps.findIndex((s: any) => s.loss < 0.01) ?? steps.length;

    return {
      stepsToConverge: convergenceStep,
      finalLoss: steps[steps.length - 1].loss,
      maxLoss: Math.max(...steps.map((s: any) => s.loss)),
    };
  }
}
```

- [ ] **Step 3: Create ConvergenceRace.astro component**

Create `src/components/demos/ch3/ConvergenceRace.astro`:

```astro
---
interface Props {
  demoId?: string;
}

const { demoId = 'ch3-convergence-race' } = Astro.props;
---

<div class="convergence-race" id={demoId}>
  <div class="race-header">
    <h3>Convergence Race</h3>
    <p class="subtitle">Watch different optimizers compete on the same problem</p>
  </div>

  <div class="race-controls">
    <label for="problem-select">Problem:</label>
    <select id="problem-select">
      <option value="quadratic">Quadratic Bowl</option>
      <option value="rosenbrock">Rosenbrock</option>
      <option value="spiral">Spiral</option>
      <option value="gaussian">Gaussian Mixture</option>
    </select>

    <label for="lr-select">Learning Rate:</label>
    <input type="range" id="lr-slider" min="-3" max="0" step="0.1" value="-2" />
    <span id="lr-display">0.01</span>
  </div>

  <div class="race-plot">
    <div id="convergence-plot" style="width: 100%; height: 400px;"></div>
  </div>

  <div class="race-metrics">
    <div class="metric-card">
      <h4 id="opt1-name">SGD</h4>
      <div class="metric-row">
        <span>Steps to converge:</span>
        <span id="opt1-steps">--</span>
      </div>
      <div class="metric-row">
        <span>Final loss:</span>
        <span id="opt1-loss">--</span>
      </div>
    </div>

    <div class="metric-card">
      <h4 id="opt2-name">Adam</h4>
      <div class="metric-row">
        <span>Steps to converge:</span>
        <span id="opt2-steps">--</span>
      </div>
      <div class="metric-row">
        <span>Final loss:</span>
        <span id="opt2-loss">--</span>
      </div>
    </div>
  </div>
</div>

<style>
.convergence-race {
  padding: 1.5rem;
  background: #f5f9ff;
  border: 2px solid #4a90e2;
  border-radius: 8px;
  margin: 2rem 0;
}

.race-header h3 {
  margin: 0 0 0.5rem 0;
  color: #4a90e2;
}

.subtitle {
  margin: 0 0 1.5rem 0;
  color: #666;
  font-size: 0.95rem;
}

.race-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.race-controls label {
  font-weight: 600;
}

.race-controls select,
.race-controls input[type="range"] {
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.race-plot {
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 1rem;
  margin-bottom: 1.5rem;
}

.race-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.metric-card {
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 1rem;
}

.metric-card h4 {
  margin: 0 0 1rem 0;
  color: #4a90e2;
  font-size: 1.1rem;
}

.metric-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.75rem;
  font-family: monospace;
}

.metric-row span:first-child {
  color: #666;
}

.metric-row span:last-child {
  font-weight: bold;
  color: #333;
}

@media (prefers-color-scheme: dark) {
  .convergence-race {
    background: #1a2a3a;
    border-color: #4a90e2;
  }

  .subtitle {
    color: #aaa;
  }

  .race-plot,
  .metric-card {
    background: #1e1e1e;
    border-color: #333;
  }

  .metric-row span:first-child {
    color: #aaa;
  }

  .metric-row span:last-child {
    color: #f0f0f0;
  }
}
</style>

<script>
  import { ConvergenceRace } from '../../js/demos/ch3/convergence-race';
  import Plotly from 'plotly.js';

  const problemSelect = document.getElementById('problem-select') as HTMLSelectElement;
  const lrSlider = document.getElementById('lr-slider') as HTMLInputElement;
  const lrDisplay = document.getElementById('lr-display') as HTMLElement;

  const race = new ConvergenceRace();

  async function updateRace() {
    race.problemId = problemSelect.value;
    race.learningRate = Math.pow(10, parseFloat(lrSlider.value));
    lrDisplay.textContent = race.learningRate.toFixed(4);

    await race.loadTrajectories();

    // Build Plotly traces
    const traces = [];
    for (const [optimizer, traj] of Object.entries(race.trajectories)) {
      traces.push({
        x: (traj as any).steps.map((s: any) => s.iteration),
        y: (traj as any).steps.map((s: any) => s.loss),
        name: optimizer.toUpperCase(),
        type: 'scatter',
        mode: 'lines',
      });
    }

    Plotly.newPlot('convergence-plot', traces, {
      title: `Convergence on ${race.problemId}`,
      xaxis: { title: 'Iteration' },
      yaxis: { title: 'Loss', type: 'log' },
    });

    // Update metrics
    const opt1Metrics = race.getMetrics(race.optimizer1);
    const opt2Metrics = race.getMetrics(race.optimizer2);

    if (opt1Metrics) {
      (document.getElementById('opt1-steps') as HTMLElement).textContent = String(opt1Metrics.stepsToConverge);
      (document.getElementById('opt1-loss') as HTMLElement).textContent = opt1Metrics.finalLoss.toFixed(6);
    }

    if (opt2Metrics) {
      (document.getElementById('opt2-steps') as HTMLElement).textContent = String(opt2Metrics.stepsToConverge);
      (document.getElementById('opt2-loss') as HTMLElement).textContent = opt2Metrics.finalLoss.toFixed(6);
    }
  }

  problemSelect.addEventListener('change', updateRace);
  lrSlider.addEventListener('input', updateRace);

  // Initial load
  updateRace();
</script>
```

- [ ] **Step 4: Test component renders**

```bash
npm run build
npm run preview
# Navigate to test page and verify plot renders
```

- [ ] **Step 5: Commit**

```bash
git add src/components/demos/ch3/ConvergenceRace.astro src/js/demos/ch3/convergence-race.ts
git commit -m "feat: add Chapter 3 ConvergenceRace component (foundation level)"
```

---

### Task 7: Chapter 3 - CustomProblemBuilder Component

**Files:**
- Create: `src/components/demos/ch3/CustomProblemBuilder.astro`

**Description:** Preset selector with parameter tuning for difficulty, noise, problem size.

- [ ] **Step 1: Create CustomProblemBuilder.astro**

Create `src/components/demos/ch3/CustomProblemBuilder.astro`:

```astro
---
interface Props {
  onChange?: string;  // Event name to dispatch
}

const { onChange = 'problem-custom-updated' } = Astro.props;
---

<div class="custom-problem-builder">
  <h4>Customize Problem</h4>

  <div class="builder-section">
    <label>Preset:</label>
    <div class="preset-buttons">
      <button class="preset-btn" data-preset="quadratic">Quadratic Bowl</button>
      <button class="preset-btn active" data-preset="rosenbrock">Rosenbrock</button>
      <button class="preset-btn" data-preset="spiral">Spiral</button>
      <button class="preset-btn" data-preset="gaussian">Gaussian Mixture</button>
    </div>
  </div>

  <div class="builder-section">
    <label for="difficulty-slider">Difficulty:</label>
    <input type="range" id="difficulty-slider" min="0.5" max="2" step="0.1" value="1.0" />
    <span id="difficulty-value">1.0</span>
  </div>

  <div class="builder-section">
    <label for="noise-slider">Noise Level:</label>
    <input type="range" id="noise-slider" min="0" max="0.1" step="0.01" value="0.01" />
    <span id="noise-value">0.01</span>
  </div>

  <div class="builder-section">
    <label for="size-slider">Problem Size:</label>
    <input type="range" id="size-slider" min="10" max="1000" step="50" value="100" />
    <span id="size-value">100</span>
  </div>
</div>

<style>
.custom-problem-builder {
  padding: 1rem;
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  margin-bottom: 1.5rem;
}

.custom-problem-builder h4 {
  margin: 0 0 1rem 0;
  color: #4a90e2;
}

.builder-section {
  margin-bottom: 1rem;
}

.builder-section label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #333;
}

.preset-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.5rem;
}

.preset-btn {
  padding: 0.75rem;
  border: 2px solid #ddd;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.preset-btn:hover {
  border-color: #4a90e2;
}

.preset-btn.active {
  background: #4a90e2;
  color: white;
  border-color: #4a90e2;
}

.builder-section input[type="range"] {
  width: 100%;
  max-width: 300px;
  margin-right: 1rem;
}

.builder-section span {
  font-weight: 600;
  color: #666;
  font-family: monospace;
}

@media (prefers-color-scheme: dark) {
  .custom-problem-builder {
    background: #1e1e1e;
    border-color: #333;
  }

  .builder-section label {
    color: #f0f0f0;
  }

  .preset-btn {
    background: #1e1e1e;
    border-color: #333;
    color: #f0f0f0;
  }

  .preset-btn:hover {
    border-color: #4a90e2;
  }

  .builder-section span {
    color: #aaa;
  }
}
</style>

<script define:vars={{ onChange }}>
  const presetBtns = document.querySelectorAll('.preset-btn');
  const difficultySlider = document.getElementById('difficulty-slider') as HTMLInputElement;
  const noiseSlider = document.getElementById('noise-slider') as HTMLInputElement;
  const sizeSlider = document.getElementById('size-slider') as HTMLInputElement;

  const difficultyValue = document.getElementById('difficulty-value') as HTMLElement;
  const noiseValue = document.getElementById('noise-value') as HTMLElement;
  const sizeValue = document.getElementById('size-value') as HTMLElement;

  let selectedPreset = 'rosenbrock';

  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      presetBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedPreset = btn.dataset.preset || 'quadratic';
      emitChange();
    });
  });

  difficultySlider.addEventListener('input', () => {
    difficultyValue.textContent = parseFloat(difficultySlider.value).toFixed(1);
    emitChange();
  });

  noiseSlider.addEventListener('input', () => {
    noiseValue.textContent = parseFloat(noiseSlider.value).toFixed(3);
    emitChange();
  });

  sizeSlider.addEventListener('input', () => {
    sizeValue.textContent = sizeSlider.value;
    emitChange();
  });

  function emitChange() {
    window.dispatchEvent(new CustomEvent(onChange, {
      detail: {
        preset: selectedPreset,
        difficulty: parseFloat(difficultySlider.value),
        noise: parseFloat(noiseSlider.value),
        size: parseInt(sizeSlider.value),
      },
    }));
  }
</script>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/demos/ch3/CustomProblemBuilder.astro
git commit -m "feat: add CustomProblemBuilder component for problem parameter tuning"
```

---

### Task 8: Integrate Chapter 3 Foundation into Lesson

**Files:**
- Modify: `content/lessons/03-gradient-descent.mdx`

**Description:** Add ConvergenceRace and CustomProblemBuilder to Chapter 3.

- [ ] **Step 1: Update Chapter 3 lesson**

Modify `content/lessons/03-gradient-descent.mdx`:

```markdown
## Interactive: Optimizer Comparison

Now that you understand gradients, let's see different optimizers in action. SGD and Adam both minimize loss, but they take different paths.

<CustomProblemBuilder client:load />

<ConvergenceRace client:load />

**What to try:**
- Select a problem (start with "Quadratic Bowl")
- Adjust the learning rate slider — see how it affects convergence speed
- Switch to "Rosenbrock" — watch how Adam escapes the valley faster
- Switch to "Spiral" — see how momentum helps with non-convex problems
```

- [ ] **Step 2: Build and test**

```bash
npm run build
npm run preview
# Navigate to /lessons/03-gradient-descent and verify both components render
```

- [ ] **Step 3: Commit**

```bash
git add content/lessons/03-gradient-descent.mdx
git commit -m "feat: integrate ConvergenceRace and CustomProblemBuilder into Chapter 3"
```

---

### Task 9: Chapter 3 - LossLandscape Component (3D Visualization)

**Files:**
- Create: `src/components/demos/ch3/LossLandscape.astro`
- Create: `src/js/demos/ch3/loss-landscape.ts`

**Description:** 3D surface visualization of loss landscape with optimizer trajectories. Unlocks after ConvergenceRace interaction.

- [ ] **Step 1: Install Three.js**

```bash
npm install three
```

- [ ] **Step 2: Create loss landscape utility**

Create `src/js/demos/ch3/loss-landscape.ts`:

```typescript
import * as THREE from 'three';

export class LossLandscape3D {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  mesh: THREE.Mesh | null = null;

  constructor(canvasId: string) {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.width = this.canvas.clientWidth;
    this.height = this.canvas.clientHeight;

    // Scene setup
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      this.width / this.height,
      0.1,
      1000
    );
    this.camera.position.z = 3;

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setClearColor(0xffffff);

    // Lighting
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 5, 5);
    this.scene.add(light);
  }

  createLandscape(data: number[][]) {
    // Create geometry from heightmap
    const geometry = new THREE.PlaneGeometry(10, 10, data.length - 1, data[0].length - 1);
    const positions = geometry.attributes.position.array as Float32Array;

    let idx = 0;
    for (let i = 0; i < data.length; i++) {
      for (let j = 0; j < data[i].length; j++) {
        positions[idx * 3 + 2] = data[i][j]; // z = loss
        idx++;
      }
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();

    // Material
    const material = new THREE.MeshPhongMaterial({
      color: 0x4a90e2,
      wireframe: false,
      shininess: 100,
    });

    // Mesh
    if (this.mesh) this.scene.remove(this.mesh);
    this.mesh = new THREE.Mesh(geometry, material);
    this.scene.add(this.mesh);

    // Auto-rotate
    this.animate();
  }

  private animate() {
    requestAnimationFrame(() => this.animate());

    if (this.mesh) {
      this.mesh.rotation.x += 0.001;
      this.mesh.rotation.y += 0.002;
    }

    this.renderer.render(this.scene, this.camera);
  }
}
```

- [ ] **Step 3: Create LossLandscape.astro component**

Create `src/components/demos/ch3/LossLandscape.astro`:

```astro
---
interface Props {
  demoId?: string;
}

const { demoId = 'ch3-loss-landscape' } = Astro.props;
---

<div class="loss-landscape" id={demoId}>
  <div class="landscape-header">
    <h3>Loss Landscape Explorer</h3>
    <p class="subtitle">See the 3D surface where optimization happens. Click and drag to rotate.</p>
  </div>

  <div class="landscape-canvas">
    <canvas id="loss-landscape-canvas" style="width: 100%; height: 500px;"></canvas>
  </div>

  <div class="landscape-info">
    <p>The surface shows how loss changes with respect to model parameters. Darker = lower loss. Watch the optimizer trajectories descend toward the minimum.</p>
  </div>
</div>

<style>
.loss-landscape {
  padding: 1.5rem;
  background: #f5f9ff;
  border: 2px solid #4a90e2;
  border-radius: 8px;
  margin: 2rem 0;
}

.landscape-header h3 {
  margin: 0 0 0.5rem 0;
  color: #4a90e2;
}

.subtitle {
  margin: 0 0 1.5rem 0;
  color: #666;
  font-size: 0.95rem;
}

.landscape-canvas {
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  overflow: hidden;
}

canvas {
  display: block;
  width: 100%;
  height: auto;
}

.landscape-info {
  background: white;
  border-left: 3px solid #4a90e2;
  padding: 1rem;
  border-radius: 4px;
}

.landscape-info p {
  margin: 0;
  color: #666;
  font-size: 0.9rem;
}

@media (prefers-color-scheme: dark) {
  .loss-landscape {
    background: #1a2a3a;
    border-color: #4a90e2;
  }

  .subtitle {
    color: #aaa;
  }

  .landscape-canvas {
    background: #1e1e1e;
    border-color: #333;
  }

  .landscape-info {
    background: #1e1e1e;
    border-color: #4a90e2;
  }

  .landscape-info p {
    color: #aaa;
  }
}
</style>

<script>
  import { LossLandscape3D } from '../../js/demos/ch3/loss-landscape';

  const viz = new LossLandscape3D('loss-landscape-canvas');

  // Create sample landscape data (quadratic bowl)
  const data = [];
  for (let i = 0; i < 20; i++) {
    const row = [];
    for (let j = 0; j < 20; j++) {
      const x = (i - 10) / 5;
      const y = (j - 10) / 5;
      const loss = x * x + y * y; // Quadratic
      row.push(loss);
    }
    data.push(row);
  }

  viz.createLandscape(data);
</script>
```

- [ ] **Step 4: Commit**

```bash
git add src/components/demos/ch3/LossLandscape.astro src/js/demos/ch3/loss-landscape.ts
git commit -m "feat: add Chapter 3 LossLandscape component (3D visualization, unlocked level)"
```

---

### Task 10: Chapter 3 - WeightUpdateVisualizer Component

**Files:**
- Create: `src/components/demos/ch3/WeightUpdateVisualizer.astro`
- Create: `src/js/demos/ch3/weight-visualizer.ts`

**Description:** Time-series visualization of how weights change during optimization. Unlocks after LossLandscape interaction.

- [ ] **Step 1: Create weight visualizer utility**

Create `src/js/demos/ch3/weight-visualizer.ts`:

```typescript
export class WeightVisualizer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  padding: number = 50;

  constructor(canvasId: string) {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.width = this.canvas.width;
    this.height = this.canvas.height;
  }

  drawWeightTrajectory(trajectories: { [key: string]: number[] }) {
    // Clear canvas
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Draw axes
    this.drawAxes();

    // Colors for different optimizers
    const colors: { [key: string]: string } = {
      sgd: '#4a90e2',
      adam: '#ff6b6b',
      'sgd-momentum': '#50c878',
    };

    // Draw trajectories
    for (const [name, weights] of Object.entries(trajectories)) {
      this.drawLine(weights, colors[name] || '#999');
    }

    // Draw legend
    this.drawLegend(Object.keys(trajectories), colors);
  }

  private drawAxes() {
    this.ctx.strokeStyle = '#cccccc';
    this.ctx.lineWidth = 1;

    // X axis
    this.ctx.beginPath();
    this.ctx.moveTo(this.padding, this.height - this.padding);
    this.ctx.lineTo(this.width - this.padding, this.height - this.padding);
    this.ctx.stroke();

    // Y axis
    this.ctx.beginPath();
    this.ctx.moveTo(this.padding, this.padding);
    this.ctx.lineTo(this.padding, this.height - this.padding);
    this.ctx.stroke();

    // Labels
    this.ctx.fillStyle = '#666';
    this.ctx.font = '12px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Iteration', this.width / 2, this.height - 10);
  }

  private drawLine(weights: number[], color: string) {
    const xScale = (this.width - 2 * this.padding) / weights.length;
    const minW = Math.min(...weights);
    const maxW = Math.max(...weights);
    const yScale = (this.height - 2 * this.padding) / (maxW - minW || 1);

    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();

    for (let i = 0; i < weights.length; i++) {
      const x = this.padding + i * xScale;
      const y = this.height - this.padding - (weights[i] - minW) * yScale;

      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }
    this.ctx.stroke();
  }

  private drawLegend(names: string[], colors: { [key: string]: string }) {
    const x = this.width - 150;
    const y = this.padding;

    for (let i = 0; i < names.length; i++) {
      const name = names[i];
      const color = colors[name];

      // Color box
      this.ctx.fillStyle = color;
      this.ctx.fillRect(x, y + i * 25, 15, 15);

      // Label
      this.ctx.fillStyle = '#333';
      this.ctx.font = '12px sans-serif';
      this.ctx.textAlign = 'left';
      this.ctx.fillText(name, x + 20, y + 12 + i * 25);
    }
  }
}
```

- [ ] **Step 2: Create WeightUpdateVisualizer.astro component**

Create `src/components/demos/ch3/WeightUpdateVisualizer.astro`:

```astro
---
interface Props {
  demoId?: string;
}

const { demoId = 'ch3-weight-visualizer' } = Astro.props;
---

<div class="weight-visualizer" id={demoId}>
  <div class="visualizer-header">
    <h3>Weight Update Trajectories</h3>
    <p class="subtitle">See how model weights change over iterations for different optimizers</p>
  </div>

  <div class="visualizer-canvas">
    <canvas id="weight-canvas" width="600" height="400"></canvas>
  </div>

  <div class="visualizer-info">
    <div class="info-item">
      <strong style="color: #4a90e2;">SGD</strong>: Constant step size, may get stuck
    </div>
    <div class="info-item">
      <strong style="color: #ff6b6b;">Adam</strong>: Adaptive step sizes, escapes faster
    </div>
    <div class="info-item">
      <strong style="color: #50c878;">SGD+Momentum</strong>: Remembers gradient direction
    </div>
  </div>
</div>

<style>
.weight-visualizer {
  padding: 1.5rem;
  background: #f5f9ff;
  border: 2px solid #4a90e2;
  border-radius: 8px;
  margin: 2rem 0;
}

.visualizer-header h3 {
  margin: 0 0 0.5rem 0;
  color: #4a90e2;
}

.subtitle {
  margin: 0 0 1.5rem 0;
  color: #666;
  font-size: 0.95rem;
}

.visualizer-canvas {
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 1rem;
  margin-bottom: 1.5rem;
}

canvas {
  display: block;
  max-width: 100%;
  height: auto;
}

.visualizer-info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.info-item {
  background: white;
  border-left: 3px solid #4a90e2;
  padding: 1rem;
  border-radius: 4px;
  font-size: 0.9rem;
  color: #666;
}

@media (prefers-color-scheme: dark) {
  .weight-visualizer {
    background: #1a2a3a;
    border-color: #4a90e2;
  }

  .subtitle {
    color: #aaa;
  }

  .visualizer-canvas {
    background: #1e1e1e;
    border-color: #333;
  }

  .info-item {
    background: #1e1e1e;
    border-color: #4a90e2;
    color: #aaa;
  }
}
</style>

<script>
  import { WeightVisualizer } from '../../js/demos/ch3/weight-visualizer';

  const viz = new WeightVisualizer('weight-canvas');

  // Sample data: weight trajectories for SGD vs Adam
  const sgdWeights = [];
  const adamWeights = [];

  for (let i = 0; i < 100; i++) {
    sgdWeights.push(5 * Math.exp(-i / 20) * Math.cos(i / 10));
    adamWeights.push(5 * Math.exp(-i / 15) * Math.cos(i / 15));
  }

  viz.drawWeightTrajectory({
    'SGD': sgdWeights,
    'Adam': adamWeights,
  });
</script>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/demos/ch3/WeightUpdateVisualizer.astro src/js/demos/ch3/weight-visualizer.ts
git commit -m "feat: add Chapter 3 WeightUpdateVisualizer component (unlocked level)"
```

---

### Task 11: Chapter 3 - AdvancedTuningPanel Component

**Files:**
- Create: `src/components/demos/ch3/AdvancedTuningPanel.astro`
- Create: `src/js/demos/ch3/optimizer-config.ts`

**Description:** Hyperparameter tuning sliders (momentum, beta1, beta2). Unlocks after WeightUpdateVisualizer interaction.

- [ ] **Step 1: Create optimizer configuration utility**

Create `src/js/demos/ch3/optimizer-config.ts`:

```typescript
export interface OptimizerConfig {
  optimizer: 'sgd' | 'adam';
  learningRate: number;
  momentum?: number;
  beta1?: number;
  beta2?: number;
}

export const OPTIMIZER_RANGES = {
  sgd: {
    learningRate: { min: 0.0001, max: 0.1, default: 0.01 },
    momentum: { min: 0, max: 0.99, default: 0.9 },
  },
  adam: {
    learningRate: { min: 0.0001, max: 0.01, default: 0.001 },
    beta1: { min: 0.8, max: 0.99, default: 0.9 },
    beta2: { min: 0.99, max: 0.9999, default: 0.999 },
  },
};

export function createConfig(optimizer: 'sgd' | 'adam', overrides: Partial<OptimizerConfig> = {}): OptimizerConfig {
  if (optimizer === 'sgd') {
    return {
      optimizer: 'sgd',
      learningRate: overrides.learningRate ?? OPTIMIZER_RANGES.sgd.learningRate.default,
      momentum: overrides.momentum ?? OPTIMIZER_RANGES.sgd.momentum.default,
    };
  } else {
    return {
      optimizer: 'adam',
      learningRate: overrides.learningRate ?? OPTIMIZER_RANGES.adam.learningRate.default,
      beta1: overrides.beta1 ?? OPTIMIZER_RANGES.adam.beta1.default,
      beta2: overrides.beta2 ?? OPTIMIZER_RANGES.adam.beta2.default,
    };
  }
}
```

- [ ] **Step 2: Create AdvancedTuningPanel.astro component**

Create `src/components/demos/ch3/AdvancedTuningPanel.astro`:

```astro
---
interface Props {
  demoId?: string;
  defaultOptimizer?: 'sgd' | 'adam';
}

const { demoId = 'ch3-tuning-panel', defaultOptimizer = 'sgd' } = Astro.props;
---

<div class="tuning-panel" id={demoId}>
  <div class="panel-header">
    <h3>Advanced Hyperparameter Tuning</h3>
    <p class="subtitle">Adjust optimizer parameters and see real-time effects</p>
  </div>

  <div class="panel-controls">
    <div class="control-group">
      <label>Optimizer:</label>
      <select id="optimizer-select">
        <option value="sgd" selected={defaultOptimizer === 'sgd'}>SGD</option>
        <option value="adam" selected={defaultOptimizer === 'adam'}>Adam</option>
      </select>
    </div>

    <div class="control-group" id="sgd-controls">
      <label for="lr-sgd-slider">Learning Rate (SGD):</label>
      <input type="range" id="lr-sgd-slider" min="-4" max="-1" step="0.1" value="-2" />
      <span id="lr-sgd-value">0.01</span>

      <label for="momentum-slider">Momentum:</label>
      <input type="range" id="momentum-slider" min="0" max="0.99" step="0.05" value="0.9" />
      <span id="momentum-value">0.9</span>
    </div>

    <div class="control-group" id="adam-controls" style="display: none;">
      <label for="lr-adam-slider">Learning Rate (Adam):</label>
      <input type="range" id="lr-adam-slider" min="-4" max="-2" step="0.1" value="-3" />
      <span id="lr-adam-value">0.001</span>

      <label for="beta1-slider">Beta 1:</label>
      <input type="range" id="beta1-slider" min="0.8" max="0.99" step="0.01" value="0.9" />
      <span id="beta1-value">0.9</span>

      <label for="beta2-slider">Beta 2:</label>
      <input type="range" id="beta2-slider" min="0.99" max="0.9999" step="0.001" value="0.999" />
      <span id="beta2-value">0.999</span>
    </div>
  </div>

  <div class="panel-summary">
    <div id="config-summary"></div>
  </div>
</div>

<style>
.tuning-panel {
  padding: 1.5rem;
  background: #f5f9ff;
  border: 2px solid #4a90e2;
  border-radius: 8px;
  margin: 2rem 0;
}

.panel-header h3 {
  margin: 0 0 0.5rem 0;
  color: #4a90e2;
}

.subtitle {
  margin: 0 0 1.5rem 0;
  color: #666;
  font-size: 0.95rem;
}

.panel-controls {
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.control-group {
  margin-bottom: 1.5rem;
}

.control-group:last-child {
  margin-bottom: 0;
}

.control-group label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #333;
  font-size: 0.95rem;
}

.control-group input[type="range"] {
  width: 100%;
  max-width: 300px;
  margin-right: 1rem;
}

.control-group span {
  font-family: monospace;
  font-weight: bold;
  color: #4a90e2;
}

#optimizer-select {
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.95rem;
}

.panel-summary {
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 1rem;
  font-family: monospace;
  font-size: 0.85rem;
  color: #666;
}

@media (prefers-color-scheme: dark) {
  .tuning-panel {
    background: #1a2a3a;
    border-color: #4a90e2;
  }

  .subtitle {
    color: #aaa;
  }

  .panel-controls {
    background: #1e1e1e;
    border-color: #333;
  }

  .control-group label {
    color: #f0f0f0;
  }

  .control-group span {
    color: #4a9fd8;
  }

  #optimizer-select {
    background: #1e1e1e;
    border-color: #333;
    color: #f0f0f0;
  }

  .panel-summary {
    background: #1e1e1e;
    border-color: #333;
    color: #aaa;
  }
}
</style>

<script define:vars={{ defaultOptimizer }}>
  import { OPTIMIZER_RANGES, createConfig } from '../../js/demos/ch3/optimizer-config';

  const optimizerSelect = document.getElementById('optimizer-select') as HTMLSelectElement;
  const sgdControls = document.getElementById('sgd-controls') as HTMLElement;
  const adamControls = document.getElementById('adam-controls') as HTMLElement;
  const configSummary = document.getElementById('config-summary') as HTMLElement;

  function updateUI() {
    const optimizer = optimizerSelect.value as 'sgd' | 'adam';
    sgdControls.style.display = optimizer === 'sgd' ? 'block' : 'none';
    adamControls.style.display = optimizer === 'adam' ? 'block' : 'none';
    updateSummary();
  }

  function updateSummary() {
    const optimizer = optimizerSelect.value as 'sgd' | 'adam';

    if (optimizer === 'sgd') {
      const lr = Math.pow(10, parseFloat((document.getElementById('lr-sgd-slider') as HTMLInputElement).value));
      const momentum = parseFloat((document.getElementById('momentum-slider') as HTMLInputElement).value);
      const config = createConfig('sgd', { learningRate: lr, momentum });

      configSummary.innerHTML = `
        <strong>SGD Configuration:</strong><br>
        learning_rate = ${config.learningRate?.toFixed(6)}<br>
        momentum = ${config.momentum?.toFixed(2)}
      `;

      (document.getElementById('lr-sgd-value') as HTMLElement).textContent = lr.toFixed(6);
      (document.getElementById('momentum-value') as HTMLElement).textContent = momentum.toFixed(2);
    } else {
      const lr = Math.pow(10, parseFloat((document.getElementById('lr-adam-slider') as HTMLInputElement).value));
      const beta1 = parseFloat((document.getElementById('beta1-slider') as HTMLInputElement).value);
      const beta2 = parseFloat((document.getElementById('beta2-slider') as HTMLInputElement).value);
      const config = createConfig('adam', { learningRate: lr, beta1, beta2 });

      configSummary.innerHTML = `
        <strong>Adam Configuration:</strong><br>
        learning_rate = ${config.learningRate?.toFixed(6)}<br>
        beta_1 = ${config.beta1?.toFixed(4)}<br>
        beta_2 = ${config.beta2?.toFixed(6)}
      `;

      (document.getElementById('lr-adam-value') as HTMLElement).textContent = lr.toFixed(6);
      (document.getElementById('beta1-value') as HTMLElement).textContent = beta1.toFixed(4);
      (document.getElementById('beta2-value') as HTMLElement).textContent = beta2.toFixed(6);
    }
  }

  optimizerSelect.addEventListener('change', updateUI);
  document.getElementById('lr-sgd-slider')?.addEventListener('input', updateSummary);
  document.getElementById('momentum-slider')?.addEventListener('input', updateSummary);
  document.getElementById('lr-adam-slider')?.addEventListener('input', updateSummary);
  document.getElementById('beta1-slider')?.addEventListener('input', updateSummary);
  document.getElementById('beta2-slider')?.addEventListener('input', updateSummary);

  // Initial
  updateUI();
</script>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/demos/ch3/AdvancedTuningPanel.astro src/js/demos/ch3/optimizer-config.ts
git commit -m "feat: add Chapter 3 AdvancedTuningPanel for hyperparameter exploration"
```

---

### Task 12: Create OptimizerPlayground Orchestrator & Update Chapter 3 Lesson

**Files:**
- Create: `src/components/demos/ch3/OptimizerPlayground.astro`
- Modify: `content/lessons/03-gradient-descent.mdx`

**Description:** Wire together all Chapter 3 components with proper unlock progression. Update lesson with full demo integration.

- [ ] **Step 1: Create OptimizerPlayground.astro**

Create `src/components/demos/ch3/OptimizerPlayground.astro`:

```astro
---
import ConvergenceRace from './ConvergenceRace.astro';
import LossLandscape from './LossLandscape.astro';
import WeightUpdateVisualizer from './WeightUpdateVisualizer.astro';
import AdvancedTuningPanel from './AdvancedTuningPanel.astro';
import CustomProblemBuilder from './CustomProblemBuilder.astro';

interface Props {
  showAllLevels?: boolean;  // For testing
}

const { showAllLevels = false } = Astro.props;
---

<div class="optimizer-playground">
  <CustomProblemBuilder client:load />

  <ConvergenceRace client:load />

  {showAllLevels && (
    <>
      <LossLandscape client:load />
      <WeightUpdateVisualizer client:load />
      <AdvancedTuningPanel client:load />
    </>
  )}
</div>

<style>
.optimizer-playground {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
</style>

<script>
  // Track unlock progression
  const unlockTriggers = {
    'convergence-race': () => {
      localStorage.setItem('unlock_ch3_landscape', 'true');
      window.dispatchEvent(new CustomEvent('unlock', { detail: { featureId: 'ch3_landscape' } }));
    },
    'loss-landscape': () => {
      localStorage.setItem('unlock_ch3_weights', 'true');
      window.dispatchEvent(new CustomEvent('unlock', { detail: { featureId: 'ch3_weights' } }));
    },
    'weight-visualizer': () => {
      localStorage.setItem('unlock_ch3_tuning', 'true');
      window.dispatchEvent(new CustomEvent('unlock', { detail: { featureId: 'ch3_tuning' } }));
    },
  };

  // Listen for interactions on convergence race
  window.addEventListener('input', (e: Event) => {
    const target = e.target as HTMLElement;
    if (target.closest('#ch3-convergence-race')) {
      unlockTriggers['convergence-race']();
    }
  });
</script>
```

- [ ] **Step 2: Update Chapter 3 lesson**

Modify `content/lessons/03-gradient-descent.mdx` to use OptimizerPlayground:

```markdown
## Interactive Optimizer Comparison

Explore how different optimizers behave on various problems. Start by watching the convergence race, then unlock advanced visualizations as you experiment.

<OptimizerPlayground client:load />

**Unlock Path:**
1. Adjust learning rate → Unlock "Loss Landscape"
2. Explore the landscape → Unlock "Weight Updates"
3. Compare weight trajectories → Unlock "Advanced Tuning"

Each unlock reveals a deeper understanding of how optimizers work.
```

- [ ] **Step 3: Build and test full integration**

```bash
npm run build
npm run preview
# Navigate to /lessons/03-gradient-descent
# Verify ConvergenceRace appears
# Adjust sliders to trigger unlocks
# Verify LossLandscape, WeightVisualizer, AdvancedTuning appear progressively
```

- [ ] **Step 4: Commit**

```bash
git add src/components/demos/ch3/OptimizerPlayground.astro content/lessons/03-gradient-descent.mdx
git commit -m "feat: integrate all Chapter 3 demos with progressive unlock progression"
```

---

## Summary

**Total Commits:** 12 task-based commits, each producing working, deployable code.

**Final file count:**
- 7 new Astro components
- 8 new TypeScript utilities
- 6 JSON trajectory data files
- 2 lesson updates

**Next:** These tasks are ready for execution using `superpowers:subagent-driven-development` (parallel task execution with review) or `superpowers:executing-plans` (sequential inline execution with checkpoints).

---

## Verification Checklist

- [ ] All 12 tasks committed to git
- [ ] npm run build completes with 0 errors
- [ ] All demo components render without console errors
- [ ] LocalStorage unlock state persists across page reloads
- [ ] Progressive disclosure unlocks feel natural (not gated, not too loose)
- [ ] Dark mode CSS works on all components
- [ ] Responsive design on mobile (test with devtools)
- [ ] Chapter 2-3 lessons integrate demos cleanly
- [ ] Trajectory data loads correctly
- [ ] 3D visualization renders smoothly (60 FPS target)
