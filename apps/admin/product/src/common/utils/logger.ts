import pino from 'pino';
import { config } from '../../config/app.config';

let logger: pino.Logger;

if (config.NODE_ENV === 'production') {
  logger = pino({ level: config.LOG_LEVEL || 'info' });
} else {
  logger = pino({
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
    level: config.LOG_LEVEL || 'debug',
  });
}

export { logger };