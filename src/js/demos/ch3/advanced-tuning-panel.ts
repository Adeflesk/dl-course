/**
 * Advanced Tuning Panel
 *
 * Hyperparameter sensitivity explorer: save multiple configs and compare
 * their convergence behavior with an overlay plot.
 */

import { OptimizerUtils } from './optimizer-utils';
import type { ProblemParams, CustomProblem, TuningConfig, ComparisonResult } from './optimizer-utils';

export interface ComparisonPlotData {
  traces: object[];
  layout: object;
}

const COLOR_PALETTE = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#a855f7', // purple
  '#ec4899', // pink
  '#f43f5e', // rose
  '#64748b', // slate
];

export class AdvancedTuningPanel {
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

  generateLabel(config: TuningConfig): string {
    return this.utils.generateLabel(config);
  }

  // Run all configs and return comparison results
  runAllConfigs(
    configs: TuningConfig[],
    problemId: string,
    params: ProblemParams,
    steps: number = 150
  ): ComparisonResult[] {
    return this.utils.runAllConfigs(configs, problemId, params, steps);
  }

  // Get a color for a config by index
  getColorForIndex(index: number): string {
    return COLOR_PALETTE[index % COLOR_PALETTE.length];
  }

  // Build Plotly traces for comparison
  prepareComparisonPlot(results: ComparisonResult[], isDarkMode: boolean): ComparisonPlotData {
    const traces = results.map((result, index) => {
      const color = this.getColorForIndex(index);
      const label = result.config.label;

      return {
        x: Array.from({ length: result.losses.length }, (_, i) => i),
        y: result.losses,
        mode: 'lines',
        name: label,
        line: { color, width: 2 },
        hovertemplate: '%{x} iter<br>Loss: %{y:.6f}<extra></extra>',
      };
    });

    const layout = {
      title: 'Hyperparameter Comparison',
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
      legend: {
        x: 0.02,
        y: 0.98,
        bgcolor: isDarkMode ? 'rgba(31, 41, 55, 0.8)' : 'rgba(255, 255, 255, 0.8)',
        bordercolor: isDarkMode ? '#374151' : '#e5e7eb',
        borderwidth: 1,
      },
    };

    return { traces, layout };
  }

  // Generate summary table data
  getResultsTableData(results: ComparisonResult[]): Array<{
    label: string;
    finalLoss: string;
    convergedAt: string;
    converged: string;
  }> {
    return results.map((result) => ({
      label: result.config.label,
      finalLoss: result.finalLoss.toExponential(3),
      convergedAt: result.convergedAt !== null ? result.convergedAt.toString() : '—',
      converged: result.convergedAt !== null ? 'Yes' : 'No',
    }));
  }
}
