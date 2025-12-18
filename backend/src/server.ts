import { createApp } from './app';
import { env } from './config/env';
import { connectDb } from './config/db';

async function start() {
  await connectDb();

  const app = createApp();
  app.listen(env.PORT, () => {
    console.log(`Server running at http://localhost:${env.PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
