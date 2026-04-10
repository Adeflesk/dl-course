# Course Improvement Plan

This document outlines the proposed corrections and improvements for the deep learning course materials located in `src/content/lessons`.

## Phase 1: Minor Corrections

### Lesson 05: Activations (`05-activations.mdx`)
- **Fix Casing Inconsistencies:** The code example for ReLU backward uses `reluOperation` (lowercase). This should be updated to `ReLUOperation` to maintain consistency with the surrounding C++ conventions used in the framework (e.g. `AddOperation`, `MulOperation`).

## Phase 2: Content Enhancements

### Lesson 06: Convolutional Networks (`06-cnns.mdx`)
- **Add Context to Conv2d Backward Pass:** The lesson expertly describes the `MaxPool2d(2)` backward pass utilizing the `argmax` index, but abstracts away the `Conv2d` backward pass.
- **Action:** Add a brief, 1-2 sentence clarification mentioning that the backward pass of a convolution is mathematically *another convolution* using a flipped version of the original kernels. This provides a satisfying conceptual answer to the reader without bogging them down in the full derivation.

### Lesson 08: MNIST Capstone (`08-mnist-capstone.mdx`)
- **Fix the Missing ReLU Anti-pattern:** The current architecture intentionally omits the `ReLU` between `Linear(1152, 64)` and `Linear(64, 10)` which acts as a mathematical collapse during inference. While the note explaining this is wonderfully transparent, it is better to teach standard practices directly.
- **Action:** In the code blocks and text diagrams, add `nn::ReLU()` before the `Dropout`. 
- **Action:** Update the prose note to reflect that the `ReLU` is there as a standard non-linearity to prevent linear collapse. (Note: Actual training performance metrics like `98.5%` won't strictly need updating unless the user explicitly wants to re-run the C++ snippet, but the addition of the ReLU is architecturally more robust).

## Phase 3: Review and Polish
- Read through formatting to ensure markdown tables, LaTeX equations (using standard `$$` and `$` delimeters), and custom diagrams (`<XXXDiagram />`) render identically across all modified files.
- Submit changes for completion.
