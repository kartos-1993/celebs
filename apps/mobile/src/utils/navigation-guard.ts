import { useCallback } from 'react';

/** Default duration (ms) during which subsequent navigation attempts are dropped. */
export const DEFAULT_NAVIGATION_COOLDOWN_MS = 500;

let lastNavigationTime = 0;

/**
 * Synchronously guards a navigation action against rapid multi-touch or duplicate triggers.
 * Operates at the app/module level to prevent dual-screen stack push races during native transitions.
 *
 * @param fn Navigation callback to invoke (e.g. router.push).
 * @param delayMs Cooldown window in milliseconds.
 * @returns true if navigation was executed, false if dropped.
 */
export function guardNavigation(
  fn: () => void,
  delayMs: number = DEFAULT_NAVIGATION_COOLDOWN_MS,
): boolean {
  const now = Date.now();
  if (now - lastNavigationTime < delayMs) {
    return false;
  }

  lastNavigationTime = now;
  try {
    fn();
    return true;
  } catch (err) {
    // Reset timestamp so future navigations are not blocked if action throws synchronously
    lastNavigationTime = 0;
    throw err;
  }
}

/**
 * React hook providing a memoized navigation guard function.
 *
 * @param delayMs Cooldown window in milliseconds (default: 500ms).
 */
export function useNavigationGuard(delayMs: number = DEFAULT_NAVIGATION_COOLDOWN_MS) {
  return useCallback(
    (fn: () => void): boolean => {
      return guardNavigation(fn, delayMs);
    },
    [delayMs],
  );
}

/**
 * Reset the global navigation cooldown.
 * Intended for test suites and mock setups.
 */
export function resetNavigationGuard(): void {
  lastNavigationTime = 0;
}
