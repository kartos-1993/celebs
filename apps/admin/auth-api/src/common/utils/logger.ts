import pino from 'pino';
import { config } from '../../config/app.config';

let logger: pino.Logger;

if (config.NODE_ENV === 'production') {
  logger = pino({ level: 'debug' });
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
    level: 'debug',
  });
}

export { logger };
