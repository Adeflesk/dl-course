/**
 * Convergence Race Utility
 *
 * Manages loading optimizer trajectories and preparing data for
 * side-by-side convergence curve visualization using Plotly.
 */

import { loadProblems, loadTrajectory } from '../utils/trajectory-loader';
import type { Trajectory, Problem } from '../utils/trajectory-loader';

export interface RaceConfig {
  problemId: string;
  selectedTrajectories: string[]; // keys like "sgd-0.01", "adam-0.01"
}

export class ConvergenceRace {
  private problems: Map<string, Problem> | null = null;
  private loadedTrajectories: Map<string, Trajectory> = new Map();

  async initializeProblems(): Promise<Map<string, Problem>> {
    if (!this.problems) {
      this.problems = await loadProblems();
    }
    return this.problems;
  }

  async loadTrajectories(config: RaceConfig): Promise<Trajectory[]> {
    const problem = this.problems?.get(config.problemId);
    if (!problem) {
      throw new Error(`Problem "${config.problemId}" not found`);
    }

    const trajectories: Trajectory[] = [];

    for (const key of config.selectedTrajectories) {
      const filename = problem.trajectories[key];
      if (!filename) {
        console.warn(`No trajectory file for "${key}" in problem "${config.problemId}"`);
        continue;
      }

      // Use cache if available
      if (!this.loadedTrajectories.has(filename)) {
        const traj = await loadTrajectory(filename);
        this.loadedTrajectories.set(filename, traj);
      }

      trajectories.push(this.loadedTrajectories.get(filename)!);
    }

    return trajectories;
  }

  // Get available trajectory keys for a problem (e.g., ["sgd-0.01", "adam-0.001"])
  getAvailableKeys(problemId: string): string[] {
    const problem = this.problems?.get(problemId);
    if (!problem) return [];
    return Object.keys(problem.trajectories);
  }

  // Prepare Plotly data for convergence curves
  preparePlotData(trajectories: Trajectory[], isDarkMode: boolean) {
    const colorMap: Record<string, string> = {
      sgd: isDarkMode ? '#60a5fa' : '#2563eb', // blue
      adam: isDarkMode ? '#f87171' : '#dc2626', // red
    };

    const traces = trajectories.map((traj) => {
      const color = traj.optimizer.toLowerCase().includes('adam')
        ? colorMap.adam
        : colorMap.sgd;
      const label = `${traj.optimizer} (lr=${traj.learningRate})`;

      return {
        x: traj.steps.map((s) => s.iteration),
        y: traj.steps.map((s) => s.loss),
        mode: 'lines',
        name: label,
        line: { color, width: 2 },
        hovertemplate: '%{x} iter<br>Loss: %{y:.6f}<extra></extra>',
      };
    });

    const layout = {
      title: 'Optimizer Convergence Race',
      xaxis: {
        title: 'Iteration',
        gridcolor: isDarkMode ? '#404040' : '#e5e7eb',
      },
      yaxis: {
        title: 'Loss',
        type: 'log',
        gridcolor: isDarkMode ? '#404040' : '#e5e7eb',
      },
      plot_bgcolor: isDarkMode ? '#1f2937' : '#ffffff',
      paper_bgcolor: isDarkMode ? '#111827' : '#ffffff',
      font: { color: isDarkMode ? '#e5e7eb' : '#1f2937' },
      hovermode: 'x unified',
      margin: { l: 60, r: 20, t: 40, b: 60 },
    };

    return { traces, layout };
  }

  // Get summary stats for a trajectory
  getStats(traj: Trajectory) {
    const finalLoss = traj.steps[traj.steps.length - 1].loss;
    const finalIter = traj.steps[traj.steps.length - 1].iteration;
    const minLoss = Math.min(...traj.steps.map((s) => s.loss));

    return { finalLoss, finalIter, minLoss };
  }
}
