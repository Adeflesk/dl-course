import type { UnlockState } from '../js/demos/utils/unlock-state';

declare global {
  interface Window {
    __unlockStates?: Record<string, UnlockState>;
  }
}

export {};
