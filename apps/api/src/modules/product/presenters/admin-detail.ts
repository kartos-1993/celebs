/**
 * Admin detail (add/edit form): the only consumer that sees everything,
 * including edit helpers (draft mirror, audit fields). Elevated only.
 */
export function formatAdminDetail(formatted: Record<string, unknown>): Record<string, unknown> {
  return formatted;
}
