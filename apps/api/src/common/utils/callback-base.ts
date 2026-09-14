const TRUSTED_DOMAIN_SUFFIXES = [
  'celebs.com.np',
  'onrender.com',
  'ngrok.io',
  'ngrok-free.app',
  'trycloudflare.com',
];

function isLoopback(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

function isPrivateIPv4(hostname: string): boolean {
  const parts = hostname.split('.');
  if (parts.length !== 4 || parts.some((p) => !/^\d{1,3}$/.test(p))) return false;
  const [a, b] = parts.map(Number) as [number, number, number, number];
  if (parts.some((p) => Number(p) > 255)) return false;
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

function matchesTrustedSuffix(hostname: string): boolean {
  return TRUSTED_DOMAIN_SUFFIXES.some(
    (suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`),
  );
}

function stripPort(host: string): string {
  // req.get('host') may be "name:port" — strip the port, keep IPv6 intact.
  if (host.startsWith('[')) return host.split(']')[0]?.replace('[', '') || host;
  const lastColon = host.lastIndexOf(':');
  if (lastColon === -1) return host;
  const after = host.slice(lastColon + 1);
  return /^\d+$/.test(after) ? host.slice(0, lastColon) : host;
}

/**
 * Resolve the per-order callback origin for wallet redirects.
 *
 * The mobile client sends the API origin its own browser can reach
 * (LAN IP on same Wi-Fi, tunnel, staging). Trust rules, in order:
 *  1. Same host the request arrived on (covers every deployment + LAN IP).
 *  2. Loopback / RFC-1918 private IPv4 (dev phones on the same network).
 *  3. Known platform/tunnel domain suffixes (boundary-checked).
 * Anything else — including parse failures — falls back to the static env
 * URL so checkout never 500s on a hostile or malformed value.
 */
export function resolveCallbackBase(
  explicit: string | undefined,
  requestHost: string | undefined,
  fallback: string,
): string {
  try {
    if (!explicit) return fallback;
    const parsed = new URL(explicit);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return fallback;
    if (parsed.username || parsed.password) return fallback;

    const hostname = parsed.hostname.toLowerCase();
    const sameHost =
      !!requestHost &&
      hostname ===
        stripPort(requestHost)
          .toLowerCase()
          .replace(/^\[|\]$/g, '');

    if (
      sameHost ||
      isLoopback(hostname) ||
      isPrivateIPv4(hostname) ||
      matchesTrustedSuffix(hostname)
    ) {
      return parsed.origin;
    }
    return fallback;
  } catch {
    return fallback;
  }
}
