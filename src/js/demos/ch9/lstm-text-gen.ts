/**
 * LSTM Text Generation Demo
 * Utility for character-level text generation with LSTM
 */

import { LSTMTextGenerator } from '../../wasm/lstm-inference';

export class LSTMTextGenDemo {
  private generator: LSTMTextGenerator | null = null;
  private isLoading = false;

  /**
   * Load the LSTM model asynchronously
   */
  async loadModel(): Promise<void> {
    if (this.generator) return;
    if (this.isLoading) return;

    this.isLoading = true;
    try {
      this.generator = await LSTMTextGenerator.load('lstm-tiny', 32, 64);
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
   * Generate text from a seed
   */
  generate(
    seed: string,
    maxChars: number,
    temperature: number,
    useGreedy: boolean = false
  ): string {
    if (!this.generator) {
      throw new Error('Model not loaded. Call loadModel() first.');
    }

    return this.generator.generateText(seed, maxChars, temperature, useGreedy);
  }
}
