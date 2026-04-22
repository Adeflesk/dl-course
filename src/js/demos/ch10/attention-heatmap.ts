/**
 * Attention Heatmap Visualization
 * Extracts and prepares attention weights for Plotly heatmap rendering
 */

import { TransformerTextGenerator } from '../../wasm/transformer-inference';

export interface HeatmapData {
  z: number[][];
  x: string[];
  y: string[];
  layer: number;
  head: number;
  colorscale: string;
}

export class AttentionHeatmapDemo {
  private generator: TransformerTextGenerator | null = null;
  private isLoading = false;

  /**
   * Load the Transformer model (1-layer, 4-head)
   */
  async loadModel(): Promise<void> {
    if (this.generator) return;
    if (this.isLoading) return;

    this.isLoading = true;
    try {
      // Load transformer-tiny (1 layer, 4 heads, 64 embed_dim)
      this.generator = await TransformerTextGenerator.load(
        'transformer-tiny',
        64,  // embed_dim
        4,   // num_heads
        1,   // num_layers
        64   // max_seq_len
      );
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Check if model is loaded
   */
  isReady(): boolean {
    return this.generator !== null;
  }

  /**
   * Get attention weights for input text and prepare heatmap data
   */
  async getHeatmapData(
    inputText: string,
    layer: number = 0,
    head: number = 0,
    isDarkMode: boolean = false
  ): Promise<HeatmapData> {
    if (!this.generator) {
      throw new Error('Model not loaded. Call loadModel() first.');
    }

    // Get attention weights
    const { weights, tokens } = await this.generator.getAttentionWeights(inputText);

    // Extract heatmap for this layer and head
    const heatmap = weights[layer][head];

    return {
      z: heatmap,
      x: tokens,
      y: tokens,
      layer,
      head,
      colorscale: isDarkMode ? 'Viridis' : 'Blues',
    };
  }

  /**
   * Prepare Plotly trace and layout for heatmap
   */
  preparePlotlyTrace(
    heatmapData: HeatmapData,
    isDarkMode: boolean
  ): { data: object[]; layout: object } {
    const { z, x, y, layer, head, colorscale } = heatmapData;

    const trace = {
      z,
      x,
      y,
      type: 'heatmap',
      colorscale,
      hovertemplate: 'Query: %{y}<br>Key: %{x}<br>Weight: %{z:.3f}<extra></extra>',
    };

    const layout = {
      title: `Attention Weights (Layer ${layer}, Head ${head})`,
      xaxis: { title: 'Keys (query context)', side: 'bottom' },
      yaxis: { title: 'Queries (generating token)' },
      width: Math.min(600, Math.max(400, (x.length + 2) * 40)),
      height: Math.min(600, Math.max(400, (y.length + 2) * 40)),
      plot_bgcolor: isDarkMode ? '#1f2937' : '#ffffff',
      paper_bgcolor: isDarkMode ? '#111827' : '#ffffff',
      font: { color: isDarkMode ? '#e5e7eb' : '#1f2937' },
      margin: { l: 80, r: 20, t: 60, b: 80 },
    };

    return { data: [trace], layout };
  }
}
