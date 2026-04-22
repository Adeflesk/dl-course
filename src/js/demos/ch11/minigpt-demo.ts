/**
 * MiniGPT Text Generation Demo
 * Character-level generation with a 2-layer Transformer
 */

import { TransformerTextGenerator } from '../../wasm/transformer-inference';

export class MiniGPTDemo {
  private generator: TransformerTextGenerator | null = null;
  private isLoading = false;

  /**
   * Load the MiniGPT model (2-layer Transformer)
   */
  async loadModel(): Promise<void> {
    if (this.generator) return;
    if (this.isLoading) return;

    this.isLoading = true;
    try {
      // Load minigpt model (2 layers, 4 heads, 64 embed_dim, 128 max_seq_len)
      this.generator = await TransformerTextGenerator.load(
        'minigpt',
        64,   // embed_dim
        4,    // num_heads
        2,    // num_layers
        128   // max_seq_len
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
   * Generate text from a seed with streaming output callback
   */
  async* generateTextStream(
    seed: string,
    maxTokens: number,
    temperature: number,
    useGreedy: boolean = false
  ): AsyncGenerator<string> {
    if (!this.generator) {
      throw new Error('Model not loaded. Call loadModel() first.');
    }

    // For streaming, we'll generate one token at a time
    // This allows the UI to update as text is generated
    const result = this.generator.generateText(seed, maxTokens, temperature, useGreedy);

    // Yield the full result at once (WASM doesn't support true streaming)
    // but structure it so the UI can process incrementally if desired
    for (let i = 0; i < result.length; ++i) {
      yield result[i];
      // Small delay to allow browser to render
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }

  /**
   * Generate full text at once
   */
  generateText(
    seed: string,
    maxTokens: number,
    temperature: number,
    useGreedy: boolean = false
  ): string {
    if (!this.generator) {
      throw new Error('Model not loaded. Call loadModel() first.');
    }

    return this.generator.generateText(seed, maxTokens, temperature, useGreedy);
  }

  /**
   * Get vocabulary info
   */
  getVocabInfo() {
    if (!this.generator) return null;
    return this.generator.getVocabInfo();
  }
}
