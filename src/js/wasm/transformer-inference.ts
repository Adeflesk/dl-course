/**
 * Transformer Text Generator
 * Wraps WASM TransformerInference class for GPT-style text generation
 * Supports attention weight extraction for visualization
 */

import { getWasmModule } from './wasm-loader';
import { fetchWeights, fetchVocab, type ModelManifest } from './weight-loader';

export interface AttentionWeights {
  weights: number[][][][];  // [layer][head][token][token]
  tokens: string[];
}

export class TransformerTextGenerator {
  private model: any;  // Module.TransformerInference instance
  private vocab: ModelManifest;
  private embedDim: number;
  private numHeads: number;
  private numLayers: number;

  private constructor(
    model: any,
    vocab: ModelManifest,
    embedDim: number,
    numHeads: number,
    numLayers: number
  ) {
    this.model = model;
    this.vocab = vocab;
    this.embedDim = embedDim;
    this.numHeads = numHeads;
    this.numLayers = numLayers;
  }

  /**
   * Load Transformer model from WASM and model assets
   * @param modelName - model directory name (e.g., 'transformer-tiny' or 'minigpt')
   * @param embedDim - embedding dimension (default 64)
   * @param numHeads - number of attention heads (default 4)
   * @param numLayers - number of transformer layers (default 1 or 2)
   * @param maxSeqLen - maximum sequence length (default 64)
   */
  static async load(
    modelName: string,
    embedDim: number = 64,
    numHeads: number = 4,
    numLayers: number = 1,
    maxSeqLen: number = 64
  ): Promise<TransformerTextGenerator> {
    // Load WASM module
    const wasmModule = await getWasmModule();

    // Load vocabulary and weights
    const vocab = await fetchVocab(modelName);
    const weights = await fetchWeights(modelName);

    // Create WASM Transformer instance
    const vocabSize = vocab.chars.length;
    const model = new wasmModule.TransformerInference(
      vocabSize,
      embedDim,
      numHeads,
      numLayers,
      maxSeqLen
    );

    // Load weights
    model.loadWeights(weights);

    return new TransformerTextGenerator(model, vocab, embedDim, numHeads, numLayers);
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
   * Get attention weights from the model's last forward pass
   * Flattens 4D tensor [layer][head][seq_len][seq_len] into array
   */
  private getAttentionWeightsTensor(
    flatWeights: number[],
    seqLen: number
  ): number[][][][] {
    const weights: number[][][][] = [];
    let offset = 0;

    for (let l = 0; l < this.numLayers; ++l) {
      weights[l] = [];
      for (let h = 0; h < this.numHeads; ++h) {
        weights[l][h] = [];
        for (let i = 0; i < seqLen; ++i) {
          weights[l][h][i] = [];
          for (let j = 0; j < seqLen; ++j) {
            weights[l][h][i][j] = flatWeights[offset++];
          }
        }
      }
    }

    return weights;
  }

  /**
   * Get attention weights for a given input text
   * Returns structured attention weights ready for visualization
   */
  async getAttentionWeights(inputText: string): Promise<AttentionWeights> {
    // Tokenize and forward
    const tokens = this.tokenize(inputText);
    this.model.forward(tokens);

    // Get flattened attention weights from WASM
    const flatWeights = this.model.getAttentionWeights();

    // Reshape to 4D tensor
    const weights = this.getAttentionWeightsTensor(flatWeights, tokens.length);

    // Get token strings for axis labels
    const tokenStrings = tokens.map(idx => this.vocab.itos[idx] || '?');

    return { weights, tokens: tokenStrings };
  }

  /**
   * Generate text from a seed
   * @param seed - seed text
   * @param maxNew - number of characters to generate
   * @param temperature - sampling temperature (default 1.0)
   * @param useGreedy - use greedy (argmax) or temperature sampling (default false)
   */
  generateText(
    seed: string,
    maxNew: number,
    temperature: number = 1.0,
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

  /**
   * Get vocabulary info
   */
  getVocabInfo() {
    return {
      vocabSize: this.vocab.chars.length,
      chars: this.vocab.chars,
    };
  }
}
