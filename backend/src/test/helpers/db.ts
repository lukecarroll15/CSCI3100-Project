import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { env } from '../../config/env';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

export async function connectTestDb() {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(env.MONGO_URI);
  }
}

export async function clearUploadsDir() {
  if (!fs.existsSync(UPLOAD_DIR)) return;
  const entries = await fs.promises.readdir(UPLOAD_DIR);
  await Promise.all(
    entries.map(async (entry) => {
      const filePath = path.join(UPLOAD_DIR, entry);
      try {
        await fs.promises.unlink(filePath);
      } catch {
        // Ignore missing files or transient errors.
      }
    })
  );
}

export async function clearDb() {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(env.MONGO_URI);
  }
  if (mongoose.connection.db) {
    await mongoose.connection.db.dropDatabase();
  }
  await clearUploadsDir();
}

export async function disconnectTestDb() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}
