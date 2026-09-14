import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';

/**
 * Shared ref tracking whether a navigation flight is active.
 * Shared across presentation components (cards, rails, grids) on the screen.
 * Reset deterministically by React Navigation's `useFocusEffect` when any screen
 * mounts or regains focus.
 */
const isNavigatingRef = { current: false };
let safetyTimer: ReturnType<typeof setTimeout> | null = null;

export function releaseNavigationGuard(): void {
  if (safetyTimer) {
    clearTimeout(safetyTimer);
    safetyTimer = null;
  }
  isNavigatingRef.current = false;
}

/**
 * Focus-based navigation guard hook.
 *
 * Deterministically resets the guard when the presenting screen (re)gains focus.
 * Returns a `navigateSafely` function that synchronously drops rapid duplicate
 * or concurrent navigation triggers (e.g. Card A -> Card B multi-touch).
 */
export function useNavigationGuard() {
  useFocusEffect(
    useCallback(() => {
      releaseNavigationGuard();
    }, []),
  );

  const navigateSafely = useCallback((navigateFn: () => void): boolean => {
    if (isNavigatingRef.current) {
      return false;
    }
    isNavigatingRef.current = true;

    if (safetyTimer) {
      clearTimeout(safetyTimer);
    }
    // Safety valve in case native transition is interrupted or no-ops
    safetyTimer = setTimeout(() => {
      releaseNavigationGuard();
    }, 1500);

    try {
      navigateFn();
      return true;
    } catch (err) {
      releaseNavigationGuard();
      throw err;
    }
  }, []);

  return navigateSafely;
}

/**
 * Standalone guard execution for non-hook callers.
 */
export function navigateOnce(navigateFn: () => void): boolean {
  if (isNavigatingRef.current) {
    return false;
  }
  isNavigatingRef.current = true;

  if (safetyTimer) {
    clearTimeout(safetyTimer);
  }
  safetyTimer = setTimeout(() => {
    releaseNavigationGuard();
  }, 1500);

  try {
    navigateFn();
    return true;
  } catch (err) {
    releaseNavigationGuard();
    throw err;
  }
}

/**
 * Reset helper for testing and development reset.
 */
export function resetNavigationGuard(): void {
  releaseNavigationGuard();
}

export const releaseNavigationLock = releaseNavigationGuard;
export const resetNavigationLock = resetNavigationGuard;
