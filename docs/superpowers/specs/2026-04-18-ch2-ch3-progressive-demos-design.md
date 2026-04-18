# Design: Progressive Disclosure for Chapter 2-3 Interactive Demos

**Date:** April 18, 2026  
**Project:** dl-course companion website (Astro + WASM)  
**Phase:** Phase 1 Enhancement  
**Status:** Design Approved

---

## Executive Summary

This design extends Phase 1 of the dl-course companion site with two new interactive demo experiences for Chapters 2 and 3. Using **progressive disclosure**, both demos start simple and unlock advanced features as users interact, preventing cognitive overload while deepening understanding.

- **Chapter 2:** Derivative Visualizer → Backward Pass Debugger
- **Chapter 3:** Convergence Race → Loss Landscape → Weight Updates → Advanced Tuning

This approach prioritizes learning progression over feature completeness, making abstract concepts (derivatives, autodiff, optimization) concrete and intuitive.

---

## Goals

1. **Concretize abstract concepts** — Users see how derivatives work visually before diving into backward pass math
2. **Enable algorithmic comparison** — Users understand why different optimizers behave differently on the same problem
3. **Prevent cognitive overload** — Progressive unlocks keep beginners focused on one concept at a time
4. **Build problem-solving intuition** — Custom parameter tuning lets users explore how changes affect outcomes
5. **Complement tensorflowccp learning** — Connect theory (course) to implementation (C++ framework)

---

## Architecture: Progressive Disclosure Pattern

### Chapter 2: Autodiff Learning Journey

#### Foundation Level (First Load)

**Component:** `DerivativeVisualizer`

Users see a single interactive tool displaying:
- **Function plot** — Visual curve of f(x) for a selected function
- **Interactive slider** — Drag point x along the curve
- **Real-time metrics:**
  - Current x value
  - f(x) at that point
  - f'(x) (numerical derivative)
  - Visual tangent line at that point
- **Function selector** — Dropdown to switch between pre-designed functions
- **Annotation** — Clear explanation: "The slope of the tangent line is the derivative"

**Functions included:** x², sin(x), x³, exp(x), log(x), x⁴

**Data model:**
```typescript
interface DerivativeState {
  selectedFunction: string;
  currentX: number;
  epsilon: number;  // for numerical derivative calculation
}
```

#### Advanced Level (Unlocked After First Interaction)

**Component:** `BackwardPassDebugger`

Becomes visible alongside the Derivative Visualizer. Same functions, new perspective:

- **Computational graph** — DAG showing operations: x → operation → y
  - Example: `x → (Square) → y` or `x → (Sin) → y`
- **Forward pass execution** — Step through forward computation with values at each node
- **Backward pass execution** — Step through backward propagation showing gradient values
- **Debug table** — Display ∂L/∂x, ∂L/∂operation, ∂L/∂y at each step
- **Animation controls** — Play/pause/step through the backward pass

**Data model:**
```typescript
interface BackwardPassState {
  computationGraph: Operation[];
  forwardValues: Map<NodeId, number>;
  backwardGradients: Map<NodeId, number>;
  currentStep: number;
}
```

**Unlock trigger:** User interacts with DerivativeVisualizer (e.g., moves slider or changes function).

**Storage:** LocalStorage flag `ch2_debugger_unlocked` to persist across page reloads.

---

### Chapter 3: Optimizer Playground

#### Foundation: Convergence Race

**Component:** `ConvergenceRace`

Simplest view of optimization:
- **Problem selector** — Buttons for preset problems: "Quadratic Bowl", "Spiral", "Rosenbrock"
- **Optimizer comparison** — Side-by-side visualization of two optimizers (default: SGD vs Adam)
- **Learning rate slider** — Single slider adjusts learning rate for both optimizers
- **Metrics panel** — Display for each optimizer:
  - Number of iterations to converge
  - Final loss value
  - Convergence trajectory (2D line plot)
- **Reset button** — Re-run the optimization with current parameters

**Data model:**
```typescript
interface ConvergenceRaceState {
  problemType: string;
  learningRate: number;
  optimizer1: 'sgd' | 'adam';
  optimizer2: 'adam' | 'sgd';
  trajectories: { steps: number; loss: number }[];
}
```

**Visualization:** 2D line plot showing loss vs iteration count for each optimizer.

#### Level 2: Loss Landscape Explorer

**Component:** `LossLandscape`

Unlocked after user adjusts learning rate slider or changes problems a few times.

- **3D/2D contour visualization** — Render loss surface as 3D surface or 2D contour plot
- **Optimizer trajectories** — Overlay paths taken by each optimizer on the landscape
- **Insights** — Annotations showing local minima, plateaus, steep regions
- **Interaction** — Pan, zoom, rotate 3D view; hover to see gradient magnitude at any point

**Data model:**
```typescript
interface LossLandscapeState {
  meshPoints: { x: number; y: number; z: number }[];  // z = loss
  trajectories: Array<{ optimizer: string; points: [x, y][] }>;
  selectedPoint?: { x: number; y: number; gradient: number };
}
```

**Libraries:** Three.js for 3D rendering or Plotly.js for contour.

#### Level 3: Weight Update Visualizer

**Component:** `WeightUpdateVisualizer`

Unlocked after user explores loss landscape.

- **Time-series plot** — Show how each weight (parameter) changes across iterations
- **Multi-optimizer comparison** — Overlay weight trajectories for SGD vs Adam vs SGD+Momentum
- **Adaptive visualization** — For Adam, show step size evolution (β₁, β₂ effect)
- **Statistics panel** — Mean, max, min weight change per iteration

**Data model:**
```typescript
interface WeightUpdateState {
  weights: Array<{ name: string; values: number[] }>;  // values per iteration
  optimizers: Array<{ name: string; trajectory: number[][] }>;
}
```

#### Level 4: Advanced Tuning Panel

**Component:** `AdvancedTuningPanel`

Unlocked after exploring weight updates.

- **SGD momentum slider** — Control momentum (0.0–0.99)
- **Adam beta1 slider** — Control exponential moving average for gradients (0.8–0.99)
- **Adam beta2 slider** — Control exponential moving average for squared gradients (0.999–0.9999)
- **Real-time effect display** — As user adjusts, show impact on convergence and weight trajectories

**Unlock trigger:** User has spent > 30 seconds in WeightUpdateVisualizer or clicked it 3+ times.

**Storage:** LocalStorage flags for each unlock state:
- `ch3_landscape_unlocked`
- `ch3_weights_unlocked`
- `ch3_tuning_unlocked`

#### Custom Problem Builder

**Component:** `CustomProblemSelector`

Available at all unlock levels. Allows parameter-based customization without full expression builder.

**Preset problems:**
1. **Quadratic Bowl** — f(x, y) = x² + y² (simple, convex)
2. **Rosenbrock** — f(x, y) = (1-x)² + 100(y-x²)² (valley, slow convergence)
3. **Spiral** — 2D classification problem (non-convex)
4. **Gaussian Mixture** — 2D classification with multiple peaks

**Parameter tuning:**
- **Difficulty slider** — Scales the landscape (narrow valleys vs wide bowl)
- **Noise level** — Add Gaussian noise to gradients (simulates real data variance)
- **Problem size** — Number of data points (affects gradient variance)

**Data model:**
```typescript
interface CustomProblem {
  type: string;
  difficulty: number;      // 0.1 to 2.0
  noiseLevel: number;       // 0.0 to 0.1
  problemSize: number;      // 10 to 1000
}
```

**No full expression builder yet** — Deferred to Phase 2 (requires safe expression evaluation in WASM).

---

## Component Hierarchy

```
<DemoLesson ch="2">
  <DerivativeVisualizer 
    functions={['x^2', 'sin(x)', 'x^3', 'exp(x)', 'log(x)', 'x^4']}
    onInteraction={() => unlockBackwardPass()}
  />
  {ch2_debugger_unlocked && (
    <BackwardPassDebugger 
      selectedFunction={selectedFunction}
      currentX={currentX}
    />
  )}
</DemoLesson>

<DemoLesson ch="3">
  <OptimizerPlayground>
    <ProblemSelector 
      problems={['quadratic', 'rosenbrock', 'spiral', 'gaussian']}
      onSelect={(problem) => setProblem(problem)}
    />
    <CustomProblemBuilder onCustomize={(params) => createCustom(params)} />
    
    <ConvergenceRace 
      problem={problem}
      onLearningRateChange={(lr) => updateLR(lr)}
      onProblemChange={() => checkUnlockLandscape()}
    />
    
    {ch3_landscape_unlocked && (
      <LossLandscape 
        trajectories={optimizerTrajectories}
        problem={problem}
        onExplore={() => checkUnlockWeights()}
      />
    )}
    
    {ch3_weights_unlocked && (
      <WeightUpdateVisualizer 
        optimizers={['sgd', 'adam']}
        weights={modelWeights}
        onExplore={() => checkUnlockTuning()}
      />
    )}
    
    {ch3_tuning_unlocked && (
      <AdvancedTuningPanel 
        onChange={(params) => updateHyperparameters(params)}
      />
    )}
  </OptimizerPlayground>
</DemoLesson>
```

---

## Unlock Mechanics

### Implicit Unlocks (User-Driven)

1. **Ch 2 Backward Debugger** — Unlocked when user interacts with DerivativeVisualizer (slider moved, function changed)
2. **Ch 3 Loss Landscape** — Unlocked after learning rate adjustment or 2+ problem switches
3. **Ch 3 Weight Updates** — Unlocked after 30+ seconds in Loss Landscape or 3+ interactions
4. **Ch 3 Tuning Panel** — Unlocked after exploring Weight Visualizer

### Persistence

- Store unlock state in **LocalStorage** with keys: `ch2_debugger_unlocked`, `ch3_landscape_unlocked`, etc.
- Each demo page loads with user's unlock history (progressive disclosure remembers progress)

---

## Data & Examples

### Chapter 2 Functions

| Function | Formula | Why | Difficulty |
|----------|---------|-----|------------|
| x² | Simple quadratic | Even function, symmetric derivative | Easy |
| sin(x) | Trigonometric | Periodic, sign-changing derivative | Medium |
| x³ | Cubic | Inflection point at x=0 | Medium |
| exp(x) | Exponential | Always positive derivative, accelerating growth | Hard |
| log(x) | Logarithmic | Domain x > 0, decreasing derivative | Hard |
| x⁴ | Quartic | Higher-order polynomial | Hard |

### Chapter 3 Problems

| Problem | Formula | Why | When It Shines |
|---------|---------|-----|----------------|
| Quadratic Bowl | f(x,y) = x² + y² | Convex, simple gradient direction | All optimizers converge quickly |
| Rosenbrock | f(x,y) = (1-x)² + 100(y-x²)² | Non-convex valley, slow convergence | Shows momentum advantage (SGD+M vs Adam) |
| Spiral | 2D Classification | Non-convex, local minima, neural network landscape | Shows need for escaping local minima |
| Gaussian Mixture | 2D Classification | Multiple peaks, high variance gradients | Shows advantage of adaptive learning rates (Adam) |

### Data Generation

- **Pre-computed trajectories:** Generate optimizer runs offline (SGD, Adam with various LRs)
- **Store as JSON:** Trajectory data embedded in component or loaded from `/public/trajectories/`
- **Minimal WASM:** No live computation needed; visualization is lightweight

---

## Technical Implementation

### Tools & Libraries

- **Visualization:** Three.js (3D landscapes), Plotly.js (2D contours), Canvas (line plots)
- **Computation:** Pre-computed trajectories (no WASM needed for this phase)
- **Interaction:** Astro + TypeScript for demo logic, standard DOM for sliders/buttons
- **State management:** React hooks or Astro's client directives for unlock state

### File Structure

```
src/
  components/
    ch2/
      DerivativeVisualizer.astro       [~150 lines]
      BackwardPassDebugger.astro       [~200 lines]
    ch3/
      OptimizerPlayground.astro        [~100 lines, orchestrator]
      ConvergenceRace.astro            [~150 lines]
      LossLandscape.astro              [~250 lines, 3D visualization]
      WeightUpdateVisualizer.astro     [~150 lines]
      AdvancedTuningPanel.astro        [~100 lines]
      CustomProblemBuilder.astro       [~120 lines]
  js/
    demos/
      derivative-visualizer.ts         [~100 lines, canvas logic]
      backward-pass-debugger.ts        [~150 lines, execution logic]
      convergence-race.ts              [~120 lines]
      loss-landscape.ts                [~200 lines, 3D rendering]
      weight-visualizer.ts             [~100 lines]
      optimizer-tuning.ts              [~80 lines]
public/
  trajectories/
    quadratic-bowl-sgd.json            [optimizer runs]
    quadratic-bowl-adam.json
    rosenbrock-*.json
    spiral-*.json
    gaussian-*.json
```

### No New WASM Required

All demos use **pre-computed trajectories**. For Phase 2, if we want live optimization runs, we'll add WASM bindings for the optimizer class.

---

## Success Criteria

- ✅ Ch 2: User understands what a derivative is visually before seeing the computational graph
- ✅ Ch 3: User sees three different optimizer behaviors (convergence speed, trajectory shape, weight updates) on the same problem
- ✅ Progressive unlocks don't feel gated; they feel natural (each unlock reveals a new insight)
- ✅ All demos run at 60 FPS (smooth interactions)
- ✅ Custom problems let users test their understanding (e.g., "what happens if I add noise?")
- ✅ No runtime errors across all preset and custom configurations
- ✅ Responsive design works on mobile (touch controls for sliders)

---

## Known Limitations & Phase 2 Enhancements

### Current Phase (Phase 1 Enhancement)

- Pre-computed trajectories only (no live WASM optimization)
- Custom problem builder supports parameter tuning only (no expression builder)
- Loss landscape is 2D (contours) or simple 3D (not highly interactive)

### Phase 2 Possibilities

1. **Live WASM optimization** — Bind C++ optimizers to JavaScript; let users write custom loss functions
2. **Expression builder** — Safe expression parsing for custom problems (f(x,y) = ... syntax)
3. **3D interactive loss landscapes** — Full 360° rotation, high-resolution surfaces
4. **Network layer visualization** — Show how a neural network transforms data through layers (builds on existing TensorVisualizer)
5. **Gradient flow animation** — Animated backward pass showing real numbers flowing through a network

---

## Scope Summary

| Component | Lines | Complexity | Timeline |
|-----------|-------|-----------|----------|
| DerivativeVisualizer | 150 | Low | 2-3 hrs |
| BackwardPassDebugger | 200 | Medium | 3-4 hrs |
| ConvergenceRace | 150 | Low | 2-3 hrs |
| LossLandscape (3D) | 250 | High | 4-5 hrs |
| WeightUpdateVisualizer | 150 | Medium | 3-4 hrs |
| AdvancedTuningPanel | 100 | Low | 1-2 hrs |
| CustomProblemBuilder | 120 | Low | 1-2 hrs |
| Support utilities | 200 | Low | 2 hrs |
| **Total** | **~1300** | **Comprehensive** | **~18-23 hrs** |

---

## Next Steps

1. **User approval** — Review this spec and confirm alignment
2. **Implementation plan** — Invoke writing-plans skill to create detailed task breakdown
3. **Execution** — Build components in priority order (Derivative Visualizer → ConvergenceRace → others)
4. **Testing** — All demos tested across Chrome, Firefox, Safari, mobile
5. **Integration** — Merge into Phase 1, update Ch 2-3 lesson content to reference demos

---

## Review Checklist

- [x] Goals clearly stated
- [x] Architecture (progressive disclosure) explained with concrete examples
- [x] Component hierarchy defined
- [x] Unlock mechanics specified (implicit, persistent)
- [x] Data & examples documented
- [x] Technical implementation scoped
- [x] File structure provided
- [x] Success criteria measurable
- [x] Known limitations and Phase 2 enhancements listed
- [x] Scope summary with effort estimates
