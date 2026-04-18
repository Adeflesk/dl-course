export type UnlockStateListener = () => void;

export interface UnlockState {
  isUnlocked: () => boolean;
  unlock: () => void;
  reset: () => void;
  subscribe: (listener: UnlockStateListener) => () => void;
}

/**
 * Hook for managing unlock state with localStorage persistence
 * @param featureId - Unique identifier for the feature
 * @param defaultUnlocked - Default unlocked state if not in localStorage
 * @returns Object with isUnlocked, unlock, reset, and subscribe methods
 */
export function useUnlockState(
  featureId: string,
  defaultUnlocked: boolean = false
): UnlockState {
  const storageKey = `unlock_${featureId}`;
  const listeners: Set<UnlockStateListener> = new Set();

  // Initialize state from localStorage or use default
  let unlocked = restoreFromStorage() || defaultUnlocked;

  function restoreFromStorage(): boolean | null {
    if (typeof localStorage === 'undefined') return null;
    const stored = localStorage.getItem(storageKey);
    return stored !== null ? stored === 'true' : null;
  }

  function persistToStorage(): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(storageKey, String(unlocked));
  }

  function isUnlocked(): boolean {
    return unlocked;
  }

  function unlock(): void {
    if (!unlocked) {
      unlocked = true;
      persistToStorage();
      notifyListeners();
    }
  }

  function reset(): void {
    unlocked = false;
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(storageKey);
    }
    notifyListeners();
  }

  function notifyListeners(): void {
    listeners.forEach((listener) => listener());
  }

  function subscribe(listener: UnlockStateListener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  return {
    isUnlocked,
    unlock,
    reset,
    subscribe,
  };
}
