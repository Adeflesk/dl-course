/**
 * Trajectory Loader Utility
 *
 * Provides utilities for loading pre-computed optimizer trajectory data
 * from JSON files, with built-in caching and error handling.
 */

export interface TrajectoryStep {
  iteration: number;
  loss: number;
  x: number;
  y: number;
  weights: [number, number];
}

export interface Trajectory {
  optimizer: string;
  learningRate: number;
  momentum?: number;
  steps: TrajectoryStep[];
}

export interface Problem {
  id: string;
  name: string;
  description: string;
  difficulty: number;
  trajectories: Record<string, string>; // map of optimizer-lr to filename
}

// Caches for loaded data
const trajectoriesCache = new Map<string, Trajectory>();

let cachedProblems: Map<string, Problem> | null = null;

/**
 * Load all problems metadata from /trajectories/problems.json
 * Results are cached to avoid repeated network requests.
 *
 * @returns Promise resolving to a Map of problem ID to Problem object
 * @throws Error if network request fails or JSON is invalid
 */
export async function loadProblems(): Promise<Map<string, Problem>> {
  // Return cached result if available
  if (cachedProblems !== null) {
    return cachedProblems;
  }

  try {
    const response = await fetch('/trajectories/problems.json');

    if (!response.ok) {
      throw new Error(`Failed to fetch problems.json: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data || typeof data !== 'object' || !Array.isArray(data.problems)) {
      throw new Error('Invalid problems.json format: expected { problems: Problem[] }');
    }

    // Convert array to Map
    cachedProblems = new Map();
    for (const problem of data.problems) {
      if (!problem.id) {
        throw new Error('Invalid problem: missing id field');
      }
      cachedProblems.set(problem.id, problem as Problem);
    }

    return cachedProblems;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error loading problems: ${message}`);
    throw new Error(`Failed to load problems: ${message}`);
  }
}

/**
 * Load a single trajectory from /trajectories/{filename}
 * Results are cached to avoid repeated network requests.
 *
 * @param filename - The filename (without path) to load from /trajectories/
 * @returns Promise resolving to a Trajectory object
 * @throws Error if network request fails or JSON is invalid
 */
export async function loadTrajectory(filename: string): Promise<Trajectory> {
  // Validate filename - prevent path traversal attacks
  if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
    throw new Error('Invalid filename: path separators not allowed');
  }

  // Return cached result if available
  if (trajectoriesCache.has(filename)) {
    return trajectoriesCache.get(filename)!;
  }

  try {
    const response = await fetch(`/trajectories/${filename}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch trajectory: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as Trajectory;

    // Validate trajectory structure
    if (!data.optimizer || data.learningRate === undefined || !Array.isArray(data.steps)) {
      throw new Error('Invalid trajectory format: missing optimizer, learningRate, or steps fields');
    }

    if (data.steps.length === 0) {
      throw new Error('Invalid trajectory: steps array is empty');
    }

    // Validate each step
    for (const step of data.steps) {
      if (step.iteration === undefined || step.loss === undefined ||
          step.x === undefined || step.y === undefined || !Array.isArray(step.weights)) {
        throw new Error('Invalid trajectory step: missing required fields');
      }
    }

    trajectoriesCache.set(filename, data);
    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error loading trajectory ${filename}: ${message}`);
    throw new Error(`Failed to load trajectory: ${message}`);
  }
}

/**
 * Clear all cached data (problems and trajectories).
 * Useful for testing or forcing a refresh from the server.
 */
export function clearCache(): void {
  cachedProblems = null;
  trajectoriesCache.clear();
}
