/**
 * Weight Update Visualizer
 *
 * Tracks and visualizes loss + gradient norm during optimization.
 * Displays 2-subplot Plotly chart with shared x-axis (iterations).
 */

import { OptimizerUtils } from './optimizer-utils';
import type { ProblemParams, CustomProblem, DetailedStep } from './optimizer-utils';

export interface WeightPlotData {
  lossTraces: object[];
  gradTraces: object[];
  layout: object;
}

export class WeightUpdateViz {
  private utils: OptimizerUtils;

  constructor() {
    this.utils = new OptimizerUtils();
  }

  listProblems(): CustomProblem[] {
    return this.utils.listProblems();
  }

  getProblemDefinition(problemId: string): CustomProblem {
    return this.utils.getProblemDefinition(problemId);
  }

  getDefaultParams(problemId: string): ProblemParams {
    return this.utils.getDefaultParams(problemId);
  }

  runTrajectory(
    problemId: string,
    params: ProblemParams,
    optimizer: 'sgd' | 'adam',
    lr: number,
    steps: number
  ): DetailedStep[] {
    return this.utils.computeDetailedTrajectory(problemId, params, optimizer, lr, 2.0, 2.0, steps);
  }

  prepareWeightPlots(
    trajectory: DetailedStep[],
    optimizer: string,
    lr: number,
    isDarkMode: boolean
  ): WeightPlotData {
    const iterations = trajectory.map((s) => s.iteration);
    const losses = trajectory.map((s) => s.loss);
    const gradNorms = trajectory.map((s) => s.gradNorm);

    const lossColor = isDarkMode ? '#60a5fa' : '#2563eb'; // blue
    const gradColor = isDarkMode ? '#fbbf24' : '#f59e0b'; // amber

    const lossTrace = {
      x: iterations,
      y: losses,
      mode: 'lines',
      name: 'Loss',
      line: { color: lossColor, width: 2 },
      yaxis: 'y',
      xaxis: 'x',
      hovertemplate: 'Iter %{x}<br>Loss: %{y:.6f}<extra></extra>',
    };

    const gradTrace = {
      x: iterations,
      y: gradNorms,
      mode: 'lines',
      name: 'Gradient Norm',
      line: { color: gradColor, width: 2 },
      yaxis: 'y2',
      xaxis: 'x2',
      hovertemplate: 'Iter %{x}<br>Grad Norm: %{y:.6f}<extra></extra>',
    };

    // Find final gradient norm for reference line
    const finalGradNorm = gradNorms[gradNorms.length - 1];

    const layout = {
      title: `${optimizer.toUpperCase()} Training Dynamics (lr=${lr})`,
      grid: { rows: 2, cols: 1, pattern: 'independent' },
      xaxis: {
        title: 'Iteration',
        gridcolor: isDarkMode ? '#404040' : '#e5e7eb',
      },
      xaxis2: {
        title: 'Iteration',
        gridcolor: isDarkMode ? '#404040' : '#e5e7eb',
      },
      yaxis: {
        title: 'Loss',
        gridcolor: isDarkMode ? '#404040' : '#e5e7eb',
        type: 'log',
      },
      yaxis2: {
        title: 'Gradient Norm',
        gridcolor: isDarkMode ? '#404040' : '#e5e7eb',
      },
      plot_bgcolor: isDarkMode ? '#1f2937' : '#ffffff',
      paper_bgcolor: isDarkMode ? '#111827' : '#ffffff',
      font: { color: isDarkMode ? '#e5e7eb' : '#1f2937' },
      hovermode: 'x unified',
      margin: { l: 60, r: 60, t: 40, b: 60 },
      height: 500,
      showlegend: true,
      legend: {
        x: 0.02,
        y: 0.98,
        bgcolor: isDarkMode ? 'rgba(31, 41, 55, 0.8)' : 'rgba(255, 255, 255, 0.8)',
        bordercolor: isDarkMode ? '#374151' : '#e5e7eb',
        borderwidth: 1,
      },
    };

    return {
      lossTraces: [lossTrace],
      gradTraces: [gradTrace],
      layout,
    };
  }

  // Get summary statistics from trajectory
  getSummaryStats(trajectory: DetailedStep[]) {
    const finalLoss = trajectory[trajectory.length - 1].loss;
    const finalGradNorm = trajectory[trajectory.length - 1].gradNorm;

    // Find first iteration where loss < 0.01
    const convergeStep = trajectory.findIndex((s) => s.loss < 0.01);

    return {
      finalLoss,
      finalGradNorm,
      convergeStep: convergeStep >= 0 ? convergeStep : null,
    };
  }
}
