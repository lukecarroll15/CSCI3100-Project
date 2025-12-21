import 'dotenv/config';
import mongoose from 'mongoose';
import { randomInt } from 'crypto';

const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/taskflow_dev';
const maxUsesRaw = Number(process.env.ADMIN_KEY_MAX_USES ?? 5);
const ttlDaysRaw = Number(process.env.ADMIN_KEY_TTL_DAYS ?? 30);

const ADMIN_KEY_REGEX = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function formatAdminKey12(raw) {
  const val = raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return `${val.slice(0, 4)}-${val.slice(4, 8)}-${val.slice(8, 12)}`;
}

function generateRandomAdminKey12() {
  let raw = '';
  for (let i = 0; i < 12; i++) {
    raw += ALPHABET[randomInt(ALPHABET.length)];
  }
  return formatAdminKey12(raw);
}

function getExpiryDate(ttlDays) {
  if (!Number.isFinite(ttlDays) || ttlDays <= 0) return null;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + ttlDays);
  return expiresAt;
}

async function run() {
  const input = process.argv[2];
  const key = input ? input.trim().toUpperCase() : generateRandomAdminKey12();
  if (!ADMIN_KEY_REGEX.test(key)) {
    console.error('Invalid key format. Use AAAA-BBBB-CCCC.');
    process.exit(1);
  }

  const maxUses = Number.isFinite(maxUsesRaw) && maxUsesRaw > 0 ? maxUsesRaw : 5;
  const expiresAt = getExpiryDate(ttlDaysRaw);

  await mongoose.connect(uri, {});
  const col = mongoose.connection.collection('licencekeys');
  const exists = await col.findOne({ key });
  if (exists) {
    console.error('Key already exists:', key);
    await mongoose.disconnect();
    process.exit(1);
  }

  const now = new Date();
  await col.insertOne({
    key,
    redeemed: false,
    usesCount: 0,
    maxUses,
    revoked: false,
    expiresAt,
    createdAt: now,
    updatedAt: now,
  });

  console.log('Generated activation key:', key);
  console.log('Max uses:', maxUses);
  console.log('Expires at:', expiresAt ? expiresAt.toISOString() : 'never');

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
