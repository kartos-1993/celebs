/**
 * Single source of truth for focus-ring styling across all shared-ui primitives.
 *
 * Standard: ring-2 + offset, `focus-visible` only (keyboard focus).
 * Using `focus:` (Badge, Select, DialogClose previously) caused mouse-click
 * rings to differ from keyboard rings. All primitives must use this token
 * via `cn()` so Input / Select / Textarea / Button render identically.
 */
export const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background';

export const focusWithinRing =
  'focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ring-offset-background';
