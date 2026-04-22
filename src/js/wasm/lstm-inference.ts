/**
 * LSTM Text Generator
 * Wraps WASM LSTMInference class for character-level text generation
 */

import { getWasmModule } from './wasm-loader';
import { fetchWeights, fetchVocab, type ModelManifest } from './weight-loader';

export class LSTMTextGenerator {
  private model: any;  // Module.LSTMInference instance
  private vocab: ModelManifest;

  private constructor(model: any, vocab: ModelManifest) {
    this.model = model;
    this.vocab = vocab;
  }

  /**
   * Load LSTM model from WASM and model assets
   * @param modelName - model directory name (e.g., 'lstm-tiny')
   * @param inputSize - embedding dimension (default 32)
   * @param hiddenSize - LSTM hidden dimension (default 64)
   */
  static async load(
    modelName: string,
    inputSize: number = 32,
    hiddenSize: number = 64
  ): Promise<LSTMTextGenerator> {
    // Load WASM module
    const wasmModule = await getWasmModule();

    // Load vocabulary and weights
    const vocab = await fetchVocab(modelName);
    const weights = await fetchWeights(modelName);

    // Create WASM LSTM instance
    const vocabSize = vocab.chars.length;
    const model = new wasmModule.LSTMInference(inputSize, hiddenSize, vocabSize);

    // Load weights
    model.loadWeights(weights);

    return new LSTMTextGenerator(model, vocab);
  }

  /**
   * Tokenize text to indices
   */
  tokenize(text: string): number[] {
    const tokens: number[] = [];
    for (const char of text) {
      const idx = this.vocab.stoi[char];
      if (idx !== undefined) {
        tokens.push(idx);
      }
    }
    return tokens;
  }

  /**
   * Detokenize indices to text
   */
  detokenize(tokens: number[]): string {
    let text = '';
    for (const idx of tokens) {
      const char = this.vocab.itos[idx];
      if (char !== undefined) {
        text += char;
      }
    }
    return text;
  }

  /**
   * Generate text from a seed
   * @param seed - seed text
   * @param maxNew - number of characters to generate
   * @param temperature - sampling temperature (default 0.8)
   * @param useGreedy - use greedy (argmax) or temperature sampling (default false)
   */
  generateText(
    seed: string,
    maxNew: number,
    temperature: number = 0.8,
    useGreedy: boolean = false
  ): string {
    // Tokenize seed
    const seedTokens = this.tokenize(seed);

    // Generate
    let resultTokens: number[];
    if (useGreedy) {
      resultTokens = this.model.generateGreedy(seedTokens, maxNew);
    } else {
      resultTokens = this.model.generateSample(seedTokens, maxNew, temperature);
    }

    // Detokenize
    return this.detokenize(resultTokens);
  }
}
