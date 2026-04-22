/**
 * WASM Module Loader
 * Handles loading and caching the compiled WASM module (framework.wasm + framework.js)
 * Uses singleton pattern to prevent double-loading
 */

let moduleCache: any = null;
let loadingPromise: Promise<any> | null = null;

export async function getWasmModule(): Promise<any> {
  // Return cached module if already loaded
  if (moduleCache) {
    return moduleCache;
  }

  // Return loading promise if already in progress
  if (loadingPromise) {
    return loadingPromise;
  }

  // Start loading the WASM module
  loadingPromise = (async () => {
    try {
      // Dynamically import the Emscripten-generated factory function
      // This will only be available if WASM was compiled during build
      let factory;
      try {
        factory = await import(/* @vite-ignore */ '/wasm/framework.js');
      } catch (importError) {
        console.warn('WASM module not available. Building without WASM support.', importError);
        throw new Error(
          'WASM module not compiled. Run emscripten build to enable ML demos.'
        );
      }

      // Call the factory to instantiate the module
      // This handles WASM loading and initialization
      moduleCache = await factory.default();

      return moduleCache;
    } catch (error) {
      console.error('Failed to load WASM module:', error);
      throw new Error(`Could not load WASM module: ${error}`);
    }
  })();

  return loadingPromise;
}

/**
 * Check if WASM module is available and ready
 */
export function isWasmReady(): boolean {
  return moduleCache !== null;
}
