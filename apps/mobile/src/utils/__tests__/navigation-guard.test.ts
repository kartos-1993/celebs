import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_NAVIGATION_COOLDOWN_MS,
  guardNavigation,
  resetNavigationGuard,
} from '../navigation-guard';

describe('navigation-guard', () => {
  beforeEach(() => {
    resetNavigationGuard();
    vi.restoreAllMocks();
  });

  it('executes navigation on first call', () => {
    const fn = vi.fn();
    const executed = guardNavigation(fn);

    expect(executed).toBe(true);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('blocks duplicate navigation within the cooldown window', () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();

    const now = 100000;
    vi.spyOn(Date, 'now').mockReturnValue(now);

    const firstResult = guardNavigation(fn1, 500);
    expect(firstResult).toBe(true);
    expect(fn1).toHaveBeenCalledTimes(1);

    // Second tap 150ms later (simulating fast double tap during slide transition)
    vi.spyOn(Date, 'now').mockReturnValue(now + 150);
    const secondResult = guardNavigation(fn2, 500);

    expect(secondResult).toBe(false);
    expect(fn2).not.toHaveBeenCalled();
  });

  it('allows navigation after the cooldown window expires', () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();

    const now = 100000;
    vi.spyOn(Date, 'now').mockReturnValue(now);
    guardNavigation(fn1, DEFAULT_NAVIGATION_COOLDOWN_MS);

    // Next tap after 501ms
    vi.spyOn(Date, 'now').mockReturnValue(now + 501);
    const secondResult = guardNavigation(fn2, DEFAULT_NAVIGATION_COOLDOWN_MS);

    expect(secondResult).toBe(true);
    expect(fn2).toHaveBeenCalledTimes(1);
  });

  it('resets timestamp if callback throws an error synchronously', () => {
    const failingFn = vi.fn(() => {
      throw new Error('Navigation failed');
    });
    const succeedingFn = vi.fn();

    expect(() => guardNavigation(failingFn)).toThrow('Navigation failed');

    // Subsequent navigation should immediately succeed because timestamp was reset
    const result = guardNavigation(succeedingFn);
    expect(result).toBe(true);
    expect(succeedingFn).toHaveBeenCalledTimes(1);
  });
});
