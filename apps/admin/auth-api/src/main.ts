import app from './app';
import { config } from './config/app.config';

const port = config.PORT;
const server = app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`);
});
server.on('error', console.error);
