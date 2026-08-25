import * as Sentry from '@sentry/node';

let initialized = false;

export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    release: process.env.RENDER_GIT_COMMIT ?? 'local',
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0'),
  });
  initialized = true;
}

export function isSentryEnabled(): boolean {
  return initialized && Sentry.getClient() !== undefined;
}

export function captureSentryException(err: unknown, context?: Record<string, unknown>): void {
  if (!isSentryEnabled()) return;
  Sentry.captureException(err, context ? { extra: context } : undefined);
}

export function setSentryUser(user: { id: string; email?: string | null }): void {
  if (!isSentryEnabled()) return;
  Sentry.setUser({ id: user.id, email: user.email ?? undefined });
}

export async function closeSentry(timeoutMs = 2000): Promise<void> {
  if (!initialized) return;
  try {
    await Sentry.close(timeoutMs);
  } catch {
    return;
  }
}
