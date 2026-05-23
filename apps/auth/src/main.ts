import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

const envName = process.env.NODE_ENV ?? 'development';
const envPath = path.resolve(process.cwd(), `apps/auth/.env.${envName}`);

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

import app from './app';
import { config } from './config/app.config';

const port = config.PORT;
const server = app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`);
});
server.on('error', console.error);
