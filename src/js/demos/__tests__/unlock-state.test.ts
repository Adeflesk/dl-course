import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useUnlockState } from '../utils/unlock-state';

// Mock localStorage for testing
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('useUnlockState', () => {
  const testFeatureId = 'test-feature';

  beforeEach(() => {
    // Clear localStorage before each test
    localStorageMock.clear();
  });

  afterEach(() => {
    // Clean up after each test
    localStorageMock.clear();
  });

  it('initializes with default unlocked state', () => {
    const { isUnlocked } = useUnlockState(testFeatureId, false);
    expect(isUnlocked()).toBe(false);

    const { isUnlocked: isUnlockedTrue } = useUnlockState('another-feature', true);
    expect(isUnlockedTrue()).toBe(true);
  });

  it('persists unlock state to LocalStorage', () => {
    const { unlock } = useUnlockState(testFeatureId, false);
    unlock();

    // Verify localStorage has the correct key and value
    const storedValue = localStorage.getItem(`unlock_${testFeatureId}`);
    expect(storedValue).toBe('true');
  });

  it('restores unlock state from LocalStorage', () => {
    // Set up localStorage manually
    localStorage.setItem(`unlock_${testFeatureId}`, 'true');

    // Create a new hook instance - should restore from storage
    const { isUnlocked } = useUnlockState(testFeatureId, false);
    expect(isUnlocked()).toBe(true);
  });

  it('supports manual unlock trigger', () => {
    const { isUnlocked, unlock } = useUnlockState(testFeatureId, false);
    expect(isUnlocked()).toBe(false);

    unlock();
    expect(isUnlocked()).toBe(true);
  });

  it('supports reset functionality', () => {
    const { isUnlocked, unlock, reset } = useUnlockState(testFeatureId, false);

    unlock();
    expect(isUnlocked()).toBe(true);

    reset();
    expect(isUnlocked()).toBe(false);
    expect(localStorage.getItem(`unlock_${testFeatureId}`)).toBeNull();
  });

  it('supports subscription listeners for unlock events', () => {
    const { unlock, subscribe } = useUnlockState(testFeatureId, false);
    const listener = { called: false };

    const unsubscribe = subscribe(() => {
      listener.called = true;
    });

    unlock();
    expect(listener.called).toBe(true);

    // Unsubscribe should work
    unsubscribe();
    listener.called = false;
    unlock(); // This should not trigger the listener again
    expect(listener.called).toBe(false);
  });

  it('maintains separate state for different feature IDs', () => {
    const feature1 = useUnlockState('feature-1', false);
    const feature2 = useUnlockState('feature-2', false);

    feature1.unlock();

    expect(feature1.isUnlocked()).toBe(true);
    expect(feature2.isUnlocked()).toBe(false);
    expect(localStorage.getItem('unlock_feature-1')).toBe('true');
    expect(localStorage.getItem('unlock_feature-2')).toBeNull();
  });
});
