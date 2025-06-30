import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file at the very beginning
const envPath = path.resolve(
  process.cwd(),
  'apps/admin/auth-api/.env.development'
);
dotenv.config({ path: envPath });

import app from './app';
import { config } from './config/app.config';

const port = config.PORT;
const server = app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`);
});
server.on('error', console.error);
