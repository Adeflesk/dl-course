/**
 * Custom Problem Builder Utility
 *
 * Provides problem definitions and parameter tuning for creating
 * custom optimization landscapes.
 */

export interface ProblemParams {
  scale: number; // Controls magnitude/steepness
  rotation?: number; // Rotation angle for elliptical problems (degrees)
  noise?: number; // Noise magnitude (0-1)
}

export interface CustomProblem {
  id: string;
  name: string;
  description: string;
  defaultParams: ProblemParams;
  paramRanges: {
    scale: [number, number];
    rotation?: [number, number];
    noise?: [number, number];
  };
  fn: (x: number, y: number, params: ProblemParams) => number;
  gradient: (
    x: number,
    y: number,
    params: ProblemParams
  ) => [number, number];
}

// Problem definitions with tunable parameters
const PROBLEM_DEFINITIONS: Record<string, CustomProblem> = {
  quadratic: {
    id: 'quadratic',
    name: 'Quadratic Bowl',
    description: 'Simple parabolic landscape: f(x,y) = scale·(x² + y²)',
    defaultParams: { scale: 1.0 },
    paramRanges: { scale: [0.1, 5.0] },
    fn: (x, y, params) => params.scale * (x * x + y * y),
    gradient: (x, y, params) => [2 * params.scale * x, 2 * params.scale * y],
  },

  elliptical: {
    id: 'elliptical',
    name: 'Elliptical Valley',
    description:
      'Elongated valley that tests optimizer adaptation: f(x,y) = scale·(100x² + y²)',
    defaultParams: { scale: 1.0, rotation: 0 },
    paramRanges: {
      scale: [0.1, 5.0],
      rotation: [0, 360],
    },
    fn: (x, y, params) => {
      const angle = (params.rotation || 0) * (Math.PI / 180);
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const rx = cos * x - sin * y;
      const ry = sin * x + cos * y;
      return params.scale * (100 * rx * rx + ry * ry);
    },
    gradient: (x, y, params) => {
      const angle = (params.rotation || 0) * (Math.PI / 180);
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const rx = cos * x - sin * y;
      const ry = sin * x + cos * y;
      const dgdx = 200 * params.scale * rx;
      const dgdy = 2 * params.scale * ry;
      return [cos * dgdx + sin * dgdy, -sin * dgdx + cos * dgdy];
    },
  },

  rosenbrock: {
    id: 'rosenbrock',
    name: 'Rosenbrock Function',
    description: 'Non-convex valley with flat regions: f(x,y) = scale·((1-x)² + 100(y-x²)²)',
    defaultParams: { scale: 0.01 },
    paramRanges: { scale: [0.001, 0.1] },
    fn: (x, y, params) => {
      const s = params.scale;
      return s * ((1 - x) * (1 - x) + 100 * (y - x * x) * (y - x * x));
    },
    gradient: (x, y, params) => {
      const s = params.scale;
      const dx = -2 * (1 - x) - 400 * x * (y - x * x);
      const dy = 200 * (y - x * x);
      return [s * dx, s * dy];
    },
  },

  beale: {
    id: 'beale',
    name: 'Beale Function',
    description: 'Multi-modal landscape with curved ridges',
    defaultParams: { scale: 0.1 },
    paramRanges: { scale: [0.01, 1.0] },
    fn: (x, y, params) => {
      const s = params.scale;
      const t1 = 1.5 - x + x * y;
      const t2 = 2.25 - x + x * y * y;
      const t3 = 2.625 - x + x * y * y * y;
      return s * (t1 * t1 + t2 * t2 + t3 * t3);
    },
    gradient: (x, y, params) => {
      const s = params.scale;
      const t1 = 1.5 - x + x * y;
      const t2 = 2.25 - x + x * y * y;
      const t3 = 2.625 - x + x * y * y * y;
      const dx = s * 2 * (t1 * (y - 1) + t2 * (y * y - 1) + t3 * (y * y * y - 1));
      const dy = s * 2 * (t1 * x + t2 * 2 * x * y + t3 * 3 * x * y * y);
      return [dx, dy];
    },
  },

  noisy: {
    id: 'noisy',
    name: 'Noisy Quadratic',
    description: 'Quadratic with simulated gradient noise (tests robustness)',
    defaultParams: { scale: 1.0, noise: 0.1 },
    paramRanges: {
      scale: [0.1, 5.0],
      noise: [0, 0.5],
    },
    fn: (x, y, params) => params.scale * (x * x + y * y),
    gradient: (x, y, params) => {
      // Use a deterministic pseudo-random noise based on position
      const seed = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
      const noise1 = (seed - Math.floor(seed)) * 2 - 1;
      const noise2 = ((seed * 2) - Math.floor(seed * 2)) * 2 - 1;
      const noiseMag = params.noise || 0;
      const dx = 2 * params.scale * x + noiseMag * noise1;
      const dy = 2 * params.scale * y + noiseMag * noise2;
      return [dx, dy];
    },
  },
};

export class CustomProblemBuilder {
  private cachedProblems = new Map<string, CustomProblem>();

  getProblemDefinition(problemId: string): CustomProblem {
    if (!PROBLEM_DEFINITIONS[problemId]) {
      throw new Error(`Problem "${problemId}" not found`);
    }
    return PROBLEM_DEFINITIONS[problemId];
  }

  listProblems(): CustomProblem[] {
    return Object.values(PROBLEM_DEFINITIONS);
  }

  // Compute loss landscape for visualization
  computeLandscape(
    problemId: string,
    params: ProblemParams,
    xRange: [number, number],
    yRange: [number, number],
    resolution: number
  ): {
    x: number[];
    y: number[];
    z: number[][];
    min: number;
    max: number;
  } {
    const problem = this.getProblemDefinition(problemId);
    const [xMin, xMax] = xRange;
    const [yMin, yMax] = yRange;
    const step = Math.max(
      (xMax - xMin) / resolution,
      (yMax - yMin) / resolution
    );

    const x: number[] = [];
    const y: number[] = [];
    const z: number[][] = [];

    for (let yi = yMin; yi <= yMax; yi += step) {
      const row: number[] = [];
      for (let xi = xMin; xi <= xMax; xi += step) {
        const loss = problem.fn(xi, yi, params);
        row.push(loss);
        if (y.length === 0 || yi === yMin) {
          x.push(xi);
        }
      }
      z.push(row);
      y.push(yi);
    }

    const flat = z.flat();
    const min = Math.min(...flat);
    const max = Math.max(...flat);

    return { x, y, z, min, max };
  }

  // Simple SGD step for visualization
  sgdStep(
    x: number,
    y: number,
    problemId: string,
    params: ProblemParams,
    learningRate: number
  ): [number, number] {
    const problem = this.getProblemDefinition(problemId);
    const [gx, gy] = problem.gradient(x, y, params);
    return [x - learningRate * gx, y - learningRate * gy];
  }

  // Simple Adam step for visualization
  adamStep(
    x: number,
    y: number,
    problemId: string,
    params: ProblemParams,
    learningRate: number,
    m: [number, number],
    v: [number, number],
    t: number,
    beta1: number = 0.9,
    beta2: number = 0.999,
    epsilon: number = 1e-8
  ): {
    pos: [number, number];
    m: [number, number];
    v: [number, number];
  } {
    const problem = this.getProblemDefinition(problemId);
    const [gx, gy] = problem.gradient(x, y, params);

    const m1 = beta1 * m[0] + (1 - beta1) * gx;
    const m2 = beta1 * m[1] + (1 - beta1) * gy;
    const v1 = beta2 * v[0] + (1 - beta2) * gx * gx;
    const v2 = beta2 * v[1] + (1 - beta2) * gy * gy;

    const mHat1 = m1 / (1 - Math.pow(beta1, t));
    const mHat2 = m2 / (1 - Math.pow(beta1, t));
    const vHat1 = v1 / (1 - Math.pow(beta2, t));
    const vHat2 = v2 / (1 - Math.pow(beta2, t));

    const newX = x - (learningRate * mHat1) / (Math.sqrt(vHat1) + epsilon);
    const newY = y - (learningRate * mHat2) / (Math.sqrt(vHat2) + epsilon);

    return {
      pos: [newX, newY],
      m: [m1, m2],
      v: [v1, v2],
    };
  }

  // Compute trajectory for optimizer visualization
  computeTrajectory(
    problemId: string,
    params: ProblemParams,
    optimizer: 'sgd' | 'adam',
    learningRate: number,
    startX: number = 2.0,
    startY: number = 2.0,
    steps: number = 100
  ): Array<{ x: number; y: number; loss: number }> {
    const problem = this.getProblemDefinition(problemId);
    const trajectory: Array<{ x: number; y: number; loss: number }> = [];

    let x = startX;
    let y = startY;
    let m: [number, number] = [0, 0];
    let v: [number, number] = [0, 0];

    for (let t = 1; t <= steps; t++) {
      const loss = problem.fn(x, y, params);
      trajectory.push({ x, y, loss });

      if (optimizer === 'sgd') {
        [x, y] = this.sgdStep(x, y, problemId, params, learningRate);
      } else {
        const result = this.adamStep(x, y, problemId, params, learningRate, m, v, t);
        [x, y] = result.pos;
        m = result.m;
        v = result.v;
      }
    }

    return trajectory;
  }
}
