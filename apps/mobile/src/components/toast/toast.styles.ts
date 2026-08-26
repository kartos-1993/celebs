import { StyleSheet } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';

/**
 * SHEIN-style transient toast: a semi-transparent dark pill floating near the
 * top of the screen, above everything (including headers). White text, no
 * buttons — informational only. Errors add a small red accent icon.
 */
export const toastStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-start',
    alignItems: 'center',
    // Sits above the toast pill only; pointer events disabled so taps pass through.
    zIndex: 9999,
    elevation: 9999,
  },
  hitPadding: {
    width: '100%',
    height: 54,
  },
  pill: {
    maxWidth: '86%',
    minWidth: 120,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(24, 24, 27, 0.88)',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  message: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
    flexShrink: 1,
  },
});
