# Deep Learning from Scratch

A complete deep learning course built as a static [Astro](https://astro.build) site. Eight lessons covering tensors, automatic differentiation, gradient descent, linear layers, activations, CNNs, batch normalisation, dropout, and a full MNIST capstone — all implemented from first principles in C++.

## Lessons

| #  | Title              | Topics                                                   |
|----|--------------------|---------------------------------------------------------|
| 01 | Tensors            | N-D arrays, flat storage, row-major indexing, broadcasting |
| 02 | Autodiff           | Computation graphs, chain rule, topological sort backward |
| 03 | Gradient Descent   | SGD, learning rate, zero_grad, Adam with bias correction  |
| 04 | Linear Layers      | Matmul, bias, Xavier init, pointer lifetimes, XOR demo    |
| 05 | Activations        | ReLU, Sigmoid, Tanh, Softmax                             |
| 06 | CNNs               | Convolution, pooling, weight sharing, flatten             |
| 07 | BatchNorm + Dropout| Internal covariate shift, inverted dropout, train/eval    |
| 08 | MNIST Capstone     | Full CNN, training loop, 98.5% test accuracy              |

## Running locally

```bash
npm install
npm run dev        # http://localhost:4321
```

## Building for production

```bash
npm run build      # outputs to ./dist/
npm run preview    # preview the production build
```

## Project structure

```
src/
├── content/lessons/   # MDX lesson files (01–08)
├── components/        # SidebarNav, PrevNext
├── diagrams/          # Interactive canvas diagrams (Astro + JS)
├── layouts/           # LessonLayout
├── pages/             # Homepage + dynamic [slug] route
└── styles/            # global.css (design system)
```

## Tech stack

- **Astro 6** — static site generator
- **MDX** — markdown with components
- **KaTeX** — LaTeX math rendering (via remark-math + rehype-katex)
- **Shiki** — syntax highlighting (github-dark theme)
- **Canvas API** — interactive diagrams (no external charting library)
