import 'dotenv/config';
import mongoose from 'mongoose';

const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/taskflow_dev';
const keyArg = process.argv[2];
if (!keyArg) {
  console.error('Usage: node seedLicence.mjs <KEY>');
  process.exit(1);
}
const key = String(keyArg).trim().toUpperCase();

function formatKey12(raw) {
  const val = raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 12);
  return `${val.slice(0, 4)}-${val.slice(4, 8)}-${val.slice(8, 12)}`;
 }

async function run() {
  await mongoose.connect(uri, {});
  const col = mongoose.connection.collection('licencekeys');
  const formatted = formatKey12(keyArg);
  const existing = await col.findOne({ key: formatted });
  if (existing) {
    console.log('Key already exists:', key);
    await mongoose.disconnect();
    return;
  }
  const res = await col.insertOne({ key: formatted, redeemed: false, createdAt: new Date() });
  console.log('Inserted licence key:', formatted, 'id:', res.insertedId.toString());
  await mongoose.disconnect();
}

run().catch((err) => { console.error(err); process.exit(1); });
