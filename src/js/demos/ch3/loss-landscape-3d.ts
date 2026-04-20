/**
 * Loss Landscape 3D Visualization
 *
 * Renders 3D loss surfaces using Plotly with optional optimizer trajectory overlay.
 */

import { OptimizerUtils } from './optimizer-utils';
import type { ProblemParams, CustomProblem, DetailedStep } from './optimizer-utils';

export interface LandscapeData {
  x: number[];
  y: number[];
  z: number[][];
  min: number;
  max: number;
}

export interface Landscape3DPlotData {
  surfaceTrace: object;
  trajectoryTrace: object | null;
  layout: object;
}

export class LossLandscape3D {
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

  computeLandscape(
    problemId: string,
    params: ProblemParams,
    resolution: number
  ): LandscapeData {
    return this.utils.computeLandscape(
      problemId,
      params,
      [-3, 3],
      [-3, 3],
      resolution
    );
  }

  computeTrajectoryFor3D(
    problemId: string,
    params: ProblemParams,
    optimizer: 'sgd' | 'adam',
    lr: number,
    steps: number = 80
  ): DetailedStep[] {
    return this.utils.computeDetailedTrajectory(
      problemId,
      params,
      optimizer,
      lr,
      2.0,
      2.0,
      steps
    );
  }

  preparePlotData(
    landscape: LandscapeData,
    trajectory: DetailedStep[] | null,
    problemName: string,
    isDarkMode: boolean
  ): Landscape3DPlotData {
    const colorscale = isDarkMode ? 'Viridis' : 'RdYlBu';

    const surfaceTrace = {
      x: landscape.x,
      y: landscape.y,
      z: landscape.z,
      type: 'surface',
      colorscale,
      opacity: 0.85,
      showscale: true,
      contours: {
        z: {
          show: true,
          usecolorscale: true,
          highlightcolor: 'limegreen',
          project: { z: true },
        },
      },
      colorbar: {
        thickness: 15,
        len: 0.7,
        tickfont: { color: isDarkMode ? '#e5e7eb' : '#1f2937' },
      },
    };

    let trajectoryTrace: object | null = null;

    if (trajectory && trajectory.length > 0) {
      const zOffset = 0.05 * (landscape.max - landscape.min);
      const problem = this.getProblemDefinition(
        (this.utils as any).currentProblemId || ''
      );

      trajectoryTrace = {
        x: trajectory.map((s) => s.x),
        y: trajectory.map((s) => s.y),
        z: trajectory.map((s) => s.loss + zOffset),
        mode: 'lines+markers',
        type: 'scatter3d',
        name: 'Trajectory',
        line: {
          color: isDarkMode ? '#f87171' : '#dc2626',
          width: 3,
        },
        marker: {
          size: 4,
          color: isDarkMode ? '#f87171' : '#dc2626',
          opacity: 0.8,
        },
        hovertemplate: 'x: %{x:.3f}<br>y: %{y:.3f}<br>loss: %{z:.6f}<extra></extra>',
      };
    }

    const layout = {
      title: `${problemName} Landscape (3D)`,
      scene: {
        xaxis: {
          title: 'x',
          gridcolor: isDarkMode ? '#404040' : '#e5e7eb',
          showgrid: true,
          showbackground: true,
          backgroundcolor: isDarkMode ? '#1f2937' : '#f9fafb',
        },
        yaxis: {
          title: 'y',
          gridcolor: isDarkMode ? '#404040' : '#e5e7eb',
          showgrid: true,
          showbackground: true,
          backgroundcolor: isDarkMode ? '#1f2937' : '#f9fafb',
        },
        zaxis: {
          title: 'Loss',
          gridcolor: isDarkMode ? '#404040' : '#e5e7eb',
          showgrid: true,
          showbackground: true,
          backgroundcolor: isDarkMode ? '#1f2937' : '#f9fafb',
        },
        camera: {
          eye: { x: 1.5, y: 1.5, z: 1.2 },
        },
        bgcolor: isDarkMode ? '#111827' : '#ffffff',
      },
      plot_bgcolor: isDarkMode ? '#111827' : '#ffffff',
      paper_bgcolor: isDarkMode ? '#111827' : '#ffffff',
      font: { color: isDarkMode ? '#e5e7eb' : '#1f2937' },
      margin: { l: 0, r: 0, t: 40, b: 0 },
      hovermode: 'closest',
    };

    return { surfaceTrace, trajectoryTrace, layout };
  }
}
