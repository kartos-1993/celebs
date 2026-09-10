import { EventEmitter } from 'events';
import pino from 'pino';
import { Writable } from 'stream';

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

export const logEmitter = new EventEmitter();
logEmitter.setMaxListeners(100);

const MAX_BUFFER_SIZE = 250;
export const logRingBuffer: LogEntry[] = [];

export function pushLogEntry(entry: LogEntry): void {
  logRingBuffer.push(entry);
  if (logRingBuffer.length > MAX_BUFFER_SIZE) {
    logRingBuffer.shift();
  }
  logEmitter.emit('log', entry);
}

const memoryStream = new Writable({
  write(chunk, _encoding, callback) {
    try {
      const raw = chunk.toString();
      const parsed = JSON.parse(raw) as LogEntry;
      pushLogEntry(parsed);
    } catch {
      // ignore non-json stream data
    }
    callback();
  },
});

const nodeEnv = process.env.NODE_ENV;
const logLevel = process.env.LOG_LEVEL || (nodeEnv === 'test' ? 'silent' : 'info');

let logger: pino.Logger;

const canUsePretty = (() => {
  if (nodeEnv === 'production') return false;
  try {
    require.resolve('pino-pretty');
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
    const pretty = require('pino-pretty');
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
        { stream: memoryStream, level: logLevel as pino.Level },
      ]),
    );
  } catch {
    logger = pino(
      { level: logLevel },
      pino.multistream([
        { stream: process.stdout, level: logLevel as pino.Level },
        { stream: memoryStream, level: logLevel as pino.Level },
      ]),
    );
  }
} else {
  logger = pino(
    { level: logLevel },
    pino.multistream([
      { stream: process.stdout, level: logLevel as pino.Level },
      { stream: memoryStream, level: logLevel as pino.Level },
    ]),
  );
}

export { logger };
