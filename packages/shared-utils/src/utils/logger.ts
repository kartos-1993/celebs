import pino from 'pino';

const nodeEnv = process.env.NODE_ENV;
const logLevel = process.env.LOG_LEVEL || 'debug';

let logger: pino.Logger;

const canUsePretty = (() => {
  if (nodeEnv === 'production') return false;
  try {
    require.resolve('pino-pretty');
    return true;
  } catch (e) {
    return false;
  }
})();

if (canUsePretty) {
  logger = pino({
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
    level: logLevel,
  });
} else {
  logger = pino({ level: logLevel });
}

export { logger };
