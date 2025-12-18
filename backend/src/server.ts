import http from 'http';
import mongoose from 'mongoose';
import { createApp } from './app';
import { env } from './config/env';
import { connectDb } from './config/db';

async function start() {
  await connectDb();

  const app = createApp();
  const server = http.createServer(app);

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${env.PORT} is already in use. Stop the other process or change PORT.`);
      process.exit(1);
    }
    console.error('Server error:', err);
    process.exit(1);
  });

  server.listen(env.PORT, () => {
    console.log(`Server running at http://localhost:${env.PORT}`);
  });

  const shutdown = async () => {
    console.log('Shutting down...');
    server.close(async () => {
      await mongoose.connection.close().catch(() => undefined);
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
