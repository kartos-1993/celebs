import pino from 'pino';

export interface LogEntry {
  level: number;
  time: number;
  msg?: string;
  durationMs?: number;
  query?: string;
  req?: { id?: string; method?: string; url?: string };
  res?: { statusCode?: number };
  err?: { type?: string; message?: string; stack?: string };
  [key: string]: unknown;
}

class LogEventEmitter {
  private listeners = new Map<string, Set<(...args: unknown[]) => void>>();

  on(event: string, fn: (...args: unknown[]) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(fn);
    return this;
  }

  off(event: string, fn: (...args: unknown[]) => void) {
    this.listeners.get(event)?.delete(fn);
    return this;
  }

  removeListener(event: string, fn: (...args: unknown[]) => void) {
    return this.off(event, fn);
  }

  emit(event: string, ...args: unknown[]) {
    const fns = this.listeners.get(event);
    if (!fns || fns.size === 0) return false;
    fns.forEach((fn) => {
      try {
        fn(...args);
      } catch {
        // Prevent listener error from bubbling
      }
    });
    return true;
  }

  setMaxListeners(_n: number) {
    return this;
  }
}

export const logEmitter = new LogEventEmitter();

const MAX_BUFFER_SIZE = 250;
export const logRingBuffer: LogEntry[] = [];

export function pushLogEntry(entry: LogEntry): void {
  logRingBuffer.push(entry);
  if (logRingBuffer.length > MAX_BUFFER_SIZE) {
    logRingBuffer.shift();
  }
  logEmitter.emit('log', entry);
}

const memoryStream = {
  write(chunk: unknown) {
    try {
      const raw = typeof chunk === 'string' ? chunk : (chunk as Buffer)?.toString?.() || '';
      const parsed = JSON.parse(raw) as LogEntry;
      pushLogEntry(parsed);
    } catch {
      // ignore non-json stream data
    }
  },
};

const isBrowser =
  typeof window !== 'undefined' ||
  (typeof process !== 'undefined' &&
    (process as unknown as { browser?: boolean })?.browser === true) ||
  typeof (globalThis as unknown as { document?: unknown })?.document !== 'undefined';

let logger: pino.Logger;

if (isBrowser) {
  const formatArgs = (first: unknown, ...rest: unknown[]) => {
    if (typeof first === 'object' && first !== null) {
      return [first, ...rest];
    }
    return [first, ...rest].filter(Boolean);
  };

  const createBrowserLogger = (): pino.Logger => {
    return {
      info: (arg: unknown, ...args: unknown[]) => console.info(...formatArgs(arg, ...args)),
      warn: (arg: unknown, ...args: unknown[]) => console.warn(...formatArgs(arg, ...args)),
      error: (arg: unknown, ...args: unknown[]) => console.error(...formatArgs(arg, ...args)),
      debug: (arg: unknown, ...args: unknown[]) => console.debug(...formatArgs(arg, ...args)),
      trace: (arg: unknown, ...args: unknown[]) => console.trace(...formatArgs(arg, ...args)),
      fatal: (arg: unknown, ...args: unknown[]) => console.error(...formatArgs(arg, ...args)),
      child: () => createBrowserLogger(),
      level: 'info',
    } as unknown as pino.Logger;
  };

  logger = createBrowserLogger();
} else {
  const nodeEnv = typeof process !== 'undefined' ? process.env?.NODE_ENV : 'development';
  const logLevel =
    (typeof process !== 'undefined' ? process.env?.LOG_LEVEL : undefined) ||
    (nodeEnv === 'test' ? 'silent' : 'info');

  const prettyPkg = 'pino-pretty';
  const canUsePretty = (() => {
    if (nodeEnv === 'production') return false;
    try {
      require.resolve(prettyPkg);
      return true;
    } catch {
      return false;
    }
  })();

  if (nodeEnv === 'production') {
    logger = pino({ level: logLevel }, process.stdout);
  } else if (canUsePretty) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pretty = require(prettyPkg);
      const prettyStream = pretty({
        colorize: true,
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname',
        singleLine: true,
      });

      logger = pino(
        { level: logLevel },
        pino.multistream([
          { stream: prettyStream, level: logLevel as pino.Level },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          { stream: memoryStream as any, level: logLevel as pino.Level },
        ]),
      );
    } catch {
      logger = pino(
        { level: logLevel },
        pino.multistream([
          { stream: process.stdout, level: logLevel as pino.Level },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          { stream: memoryStream as any, level: logLevel as pino.Level },
        ]),
      );
    }
  } else {
    logger = pino(
      { level: logLevel },
      pino.multistream([
        { stream: process.stdout, level: logLevel as pino.Level },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { stream: memoryStream as any, level: logLevel as pino.Level },
      ]),
    );
  }
}

export { logger };
