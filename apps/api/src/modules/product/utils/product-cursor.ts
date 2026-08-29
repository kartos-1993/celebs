export interface ProductCursorPayload {
  v: string | number;
  id: string;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Encodes sort value + ID tie-breaker into a URL-safe opaque cursor token.
 */
export function encodeProductCursor(payload: ProductCursorPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

/**
 * Decodes base64url cursor token into sort value + ID.
 * Backward-compatible with plain UUID cursor strings.
 */
export function decodeProductCursor(cursor: string): ProductCursorPayload | null {
  if (!cursor || typeof cursor !== 'string') return null;

  // Backward compatibility for raw UUID strings (e.g. from existing test specs)
  if (UUID_REGEX.test(cursor)) {
    return { v: '', id: cursor };
  }

  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && typeof parsed.id === 'string') {
      return {
        v: parsed.v !== undefined ? parsed.v : '',
        id: parsed.id,
      };
    }
  } catch {
    return null;
  }

  return null;
}
