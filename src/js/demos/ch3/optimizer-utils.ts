/**
 * Optimizer Utilities
 *
 * Shared utilities for Tasks 9-12: loss landscape, trajectory computation,
 * and multi-config comparison. Wraps CustomProblemBuilder and extends it
 * with gradient norm tracking and config-based execution.
 */

import { CustomProblemBuilder } from './custom-problem-builder';
import type { ProblemParams, CustomProblem } from './custom-problem-builder';

export interface DetailedStep {
  x: number;
  y: number;
  loss: number;
  gradNorm: number; // Math.sqrt(gx² + gy²)
  iteration: number;
}

export interface TuningConfig {
  label: string;
  optimizer: 'sgd' | 'adam';
  lr: number;
  beta1?: number; // used only when optimizer === 'adam'
  beta2?: number; // used only when optimizer === 'adam'
  epsilon?: number; // used only when optimizer === 'adam'
}

export interface ComparisonResult {
  config: TuningConfig;
  losses: number[];
  finalLoss: number;
  convergedAt: number | null; // iteration where loss < 1e-4, or null
}

export class OptimizerUtils {
  private builder: CustomProblemBuilder;

  constructor() {
    this.builder = new CustomProblemBuilder();
  }

  // Accessors
  listProblems(): CustomProblem[] {
    return this.builder.listProblems();
  }

  getProblemDefinition(problemId: string): CustomProblem {
    return this.builder.getProblemDefinition(problemId);
  }

  // Passthrough to builder's landscape computation
  computeLandscape(
    problemId: string,
    params: ProblemParams,
    xRange: [number, number],
    yRange: [number, number],
    resolution: number
  ) {
    return this.builder.computeLandscape(problemId, params, xRange, yRange, resolution);
  }

  // Extended trajectory with gradient norm tracking
  computeDetailedTrajectory(
    problemId: string,
    params: ProblemParams,
    optimizer: 'sgd' | 'adam',
    learningRate: number,
    startX: number = 2.0,
    startY: number = 2.0,
    steps: number = 100,
    beta1: number = 0.9,
    beta2: number = 0.999,
    epsilon: number = 1e-8
  ): DetailedStep[] {
    const problem = this.builder.getProblemDefinition(problemId);
    const trajectory: DetailedStep[] = [];

    let x = startX;
    let y = startY;
    let m: [number, number] = [0, 0];
    let v: [number, number] = [0, 0];

    for (let t = 1; t <= steps; t++) {
      const loss = problem.fn(x, y, params);
      const [gx, gy] = problem.gradient(x, y, params);
      const gradNorm = Math.sqrt(gx * gx + gy * gy);

      trajectory.push({ x, y, loss, gradNorm, iteration: t - 1 });

      if (optimizer === 'sgd') {
        [x, y] = this.builder['sgdStep'](x, y, problemId, params, learningRate) as [
          number,
          number,
        ];
      } else {
        const result = this.builder['adamStep'](
          x,
          y,
          problemId,
          params,
          learningRate,
          m,
          v,
          t,
          beta1,
          beta2,
          epsilon
        ) as { pos: [number, number]; m: [number, number]; v: [number, number] };
        [x, y] = result.pos;
        m = result.m;
        v = result.v;
      }
    }

    return trajectory;
  }

  // Run a single config and return loss array
  runConfig(
    config: TuningConfig,
    problemId: string,
    params: ProblemParams,
    steps: number = 150
  ): number[] {
    const trajectory = this.computeDetailedTrajectory(
      problemId,
      params,
      config.optimizer,
      config.lr,
      2.0,
      2.0,
      steps,
      config.beta1 ?? 0.9,
      config.beta2 ?? 0.999,
      config.epsilon ?? 1e-8
    );

    return trajectory.map((s) => s.loss);
  }

  // Run all configs and return comparison results
  runAllConfigs(
    configs: TuningConfig[],
    problemId: string,
    params: ProblemParams,
    steps: number = 150
  ): ComparisonResult[] {
    return configs.map((config) => {
      const losses = this.runConfig(config, problemId, params, steps);
      const finalLoss = losses[losses.length - 1];

      // Find first iteration where loss < 1e-4
      const convergedAt = losses.findIndex((loss) => loss < 1e-4);

      return {
        config,
        losses,
        finalLoss,
        convergedAt: convergedAt >= 0 ? convergedAt : null,
      };
    });
  }

  // Generate a human-readable label for a config
  generateLabel(config: TuningConfig): string {
    const optimizer = config.optimizer.toUpperCase();
    if (config.optimizer === 'sgd') {
      return `${optimizer} lr=${config.lr.toFixed(4)}`;
    } else {
      return `${optimizer} lr=${config.lr.toFixed(4)} β₁=${(config.beta1 ?? 0.9).toFixed(3)} β₂=${(config.beta2 ?? 0.999).toFixed(4)}`;
    }
  }

  // Get default params for a problem
  getDefaultParams(problemId: string): ProblemParams {
    const problem = this.getProblemDefinition(problemId);
    return { ...problem.defaultParams };
  }
}
