import 'dotenv/config';
import mongoose from 'mongoose';

const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/taskflow_dev';
const keyArg = process.argv[2];
if (!keyArg) {
  console.error('Usage: node seedLicence.mjs <KEY>');
  process.exit(1);
}
const key = String(keyArg).trim().toUpperCase();

async function run() {
  await mongoose.connect(uri, {});
  const col = mongoose.connection.collection('licencekeys');
  const existing = await col.findOne({ key });
  if (existing) {
    console.log('Key already exists:', key);
    await mongoose.disconnect();
    return;
  }
  const res = await col.insertOne({ key, redeemed: false, createdAt: new Date() });
  console.log('Inserted licence key:', key, 'id:', res.insertedId.toString());
  await mongoose.disconnect();
}

run().catch((err) => { console.error(err); process.exit(1); });
