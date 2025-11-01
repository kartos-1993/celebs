import pino from 'pino';
import { config } from '../../config/app.config';

let logger: pino.Logger;

// In some runtime images (staging) devDependencies like `pino-pretty` may not be
// installed. Detect whether `pino-pretty` is resolvable and fall back to a plain
// pino logger when it's not available. This keeps staging Docker images working
// without requiring devDependencies in the runtime image.
const canUsePretty = (() => {
  if (config.NODE_ENV === 'production') return false;
  try {
    // Use require.resolve to check if the module exists in node_modules
    // at runtime. If not found, require.resolve throws.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
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
    level: 'debug',
  });
} else {
  // Fallback to plain pino. Keep debug log level for staging/local.
  logger = pino({ level: 'debug' });
}

export { logger };
