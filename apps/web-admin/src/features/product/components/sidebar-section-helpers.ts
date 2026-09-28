import type { ProductSidebarSection } from '../types';

// Errors rendered inline before the overflow link appears; the exact remainder
// is always shown so a truncated slice never hides a blocker silently.
export const VISIBLE_ERRORS_PER_SECTION = 3;

export const SIDEBAR_EYEBROW =
  'text-xs font-semibold uppercase tracking-wide text-muted-foreground';
export const SIDEBAR_CARD = 'rounded-2xl border border-border bg-card p-3.5 shadow-xs';
export const SIDEBAR_SCORE_BADGE = 'rounded-full border-border bg-card px-2 py-0 text-xs';

export interface ScoreMeta {
  label: string;
  tone: string;
}

export const scoreMeta = (score: number): ScoreMeta => {
  if (score >= 90) return { label: 'Excellent', tone: 'text-success' };
  if (score >= 70) return { label: 'Good', tone: 'text-info' };
  if (score >= 40) return { label: 'Fair', tone: 'text-warning' };
  return { label: 'Needs Info', tone: 'text-warning' };
};

/**
 * A section speaks up only when the seller has engaged with IT, or once they
 * have tried to submit.
 *
 * `incomplete` is by construction "answered here and still short", so it needs
 * no global flag — the tri-state already carries the engagement. `untouched`
 * waits for a submit attempt. Gating all of this on "any field was touched
 * anywhere" is what made one keystroke in Fabric dump the pricing and image
 * failures too.
 */
export const shouldRevealSection = (
  section: ProductSidebarSection,
  hasAttemptedSubmit: boolean,
): boolean => {
  if (section.status === 'complete') return false;
  return section.status === 'incomplete' || hasAttemptedSubmit;
};

/** The slice of a section's errors that may be rendered right now. */
export interface RevealedErrors {
  hiddenCount: number;
  visible: string[];
}

export const revealedErrors = (
  section: ProductSidebarSection,
  hasAttemptedSubmit: boolean,
): RevealedErrors => {
  if (!shouldRevealSection(section, hasAttemptedSubmit)) return { hiddenCount: 0, visible: [] };
  const visible = section.errors.slice(0, VISIBLE_ERRORS_PER_SECTION);
  return { hiddenCount: section.errors.length - visible.length, visible };
};
