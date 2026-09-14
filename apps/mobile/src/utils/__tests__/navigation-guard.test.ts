import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock expo-router's useFocusEffect
let focusCallback: (() => void) | null = null;
vi.mock('expo-router', () => ({
  useFocusEffect: (cb: () => void) => {
    focusCallback = cb;
  },
}));

vi.mock('react', () => ({
  useCallback: <T extends (...args: unknown[]) => unknown>(fn: T) => fn,
}));

import { navigateOnce, resetNavigationGuard, useNavigationGuard } from '../navigation-guard';

describe('navigation-guard', () => {
  beforeEach(() => {
    resetNavigationGuard();
    focusCallback = null;
  });

  it('allows the first navigation call and blocks immediate subsequent calls', () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();

    const res1 = navigateOnce(fn1);
    const res2 = navigateOnce(fn2);

    expect(res1).toBe(true);
    expect(fn1).toHaveBeenCalledTimes(1);

    // Second rapid tap (e.g. Card B tapped right after Card A) is dropped
    expect(res2).toBe(false);
    expect(fn2).not.toHaveBeenCalled();
  });

  it('unlocks when navigation focus effect fires upon returning to screen', () => {
    const navigateSafely = useNavigationGuard();
    const fn1 = vi.fn();
    const fn2 = vi.fn();

    // Tap Card A
    expect(navigateSafely(fn1)).toBe(true);
    expect(fn1).toHaveBeenCalledTimes(1);

    // Tap Card B while still navigating -> blocked
    expect(navigateSafely(fn2)).toBe(false);
    expect(fn2).not.toHaveBeenCalled();

    // User returns back to screen (focus effect fires)
    expect(focusCallback).not.toBeNull();
    focusCallback?.();

    // Now Card B or another tap is permitted again
    const fn3 = vi.fn();
    expect(navigateSafely(fn3)).toBe(true);
    expect(fn3).toHaveBeenCalledTimes(1);
  });

  it('releases lock if the navigation callback throws', () => {
    const errorFn = () => {
      throw new Error('Navigation error');
    };

    expect(() => navigateOnce(errorFn)).toThrow('Navigation error');

    // Lock was released in catch block
    const fn2 = vi.fn();
    expect(navigateOnce(fn2)).toBe(true);
    expect(fn2).toHaveBeenCalledTimes(1);
  });
});
