/**
 * Weight Loader
 * Parses binary weight files (Serialization.h format) and loads vocabulary JSON
 */

export interface ModelManifest {
  chars: string[];
  stoi: Record<string, number>;  // character -> index
  itos: Record<number, string>;  // index -> character
}

/**
 * Parse weights from binary format (Serialization.h)
 * Format:
 *   [int32: num_params]
 *   per tensor:
 *     [int32: ndim]
 *     [int32 x ndim: shape]
 *     [float32 x total_elements: data]
 */
function parseWeightsBinary(buffer: ArrayBuffer): Float32Array {
  const view = new DataView(buffer);
  let offset = 0;

  // Read number of parameter tensors
  const numParams = view.getInt32(offset, true);
  offset += 4;

  const allWeights: number[] = [];

  // Process each parameter tensor
  for (let p = 0; p < numParams; ++p) {
    // Read number of dimensions
    const ndim = view.getInt32(offset, true);
    offset += 4;

    // Read shape dimensions
    const shape: number[] = [];
    let totalElements = 1;
    for (let i = 0; i < ndim; ++i) {
      const dim = view.getInt32(offset, true);
      offset += 4;
      shape.push(dim);
      totalElements *= dim;
    }

    // Read data (float32)
    for (let i = 0; i < totalElements; ++i) {
      const value = view.getFloat32(offset, true);
      offset += 4;
      allWeights.push(value);
    }
  }

  return new Float32Array(allWeights);
}

/**
 * Fetch and parse binary weight file from /public/models/{modelName}/weights.bin
 */
export async function fetchWeights(modelName: string): Promise<Float32Array> {
  try {
    const response = await fetch(`/models/${modelName}/weights.bin`);
    if (!response.ok) {
      throw new Error(`Failed to fetch weights: ${response.status} ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    const weights = parseWeightsBinary(buffer);

    console.log(`Loaded weights for ${modelName}: ${weights.length} floats`);
    return weights;
  } catch (error) {
    console.error(`Error fetching weights for ${modelName}:`, error);
    throw error;
  }
}

/**
 * Fetch vocabulary JSON file from /public/models/{modelName}/vocab.json
 */
export async function fetchVocab(modelName: string): Promise<ModelManifest> {
  try {
    const response = await fetch(`/models/${modelName}/vocab.json`);
    if (!response.ok) {
      throw new Error(`Failed to fetch vocabulary: ${response.status} ${response.statusText}`);
    }

    const vocab = (await response.json()) as ModelManifest;

    console.log(`Loaded vocabulary for ${modelName}: ${vocab.chars.length} chars`);
    return vocab;
  } catch (error) {
    console.error(`Error fetching vocabulary for ${modelName}:`, error);
    throw error;
  }
}
