import pino from 'pino';

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

if (canUsePretty) {
  logger = pino({
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname',
        singleLine: true,
      },
    },
    level: logLevel,
  });
} else {
  logger = pino({ level: logLevel });
}

export { logger };
