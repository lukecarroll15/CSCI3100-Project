import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

import { createApp } from '../app';
import { env } from '../config/env';
import { UserModel } from '../models/User';
import { LicenceKeyModel } from '../models/LicenceKey';

const app = createApp();

function sessionCookieFor(user: { _id: unknown; email: string }): string {
  const token = jwt.sign({ email: user.email }, env.SESSION_SECRET, {
    subject: String(user._id),
    expiresIn: `${env.SESSION_TTL_HOURS}h`,
  });
  return `taskflow_session=${token}`;
}

before(async () => {
  await mongoose.connect(env.MONGO_URI);
});

after(async () => {
  await mongoose.disconnect();
});

beforeEach(async () => {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(env.MONGO_URI);
  }
  if (mongoose.connection.db) {
    await mongoose.connection.db.dropDatabase();
  }
});

test('POST /api/v1/admin/activate rejects missing code', async () => {
  const user = await UserModel.create({ email: 'u1@example.com', displayName: 'U1', role: 'user' });

  const res = await request(app)
    .post('/api/v1/admin/activate')
    .set('Cookie', sessionCookieFor(user))
    .send({});

  assert.equal(res.status, 400);
  assert.equal(res.body?.error?.code, 'VALIDATION_ERROR');
});

test('POST /api/v1/admin/activate rejects invalid format (must be AAAA-BBBB-CCCC)', async () => {
  const user = await UserModel.create({ email: 'u1@example.com', displayName: 'U1', role: 'user' });

  const res = await request(app)
    .post('/api/v1/admin/activate')
    .set('Cookie', sessionCookieFor(user))
    .send({ code: 'ABC123' });

  assert.equal(res.status, 400);
  assert.equal(res.body?.error?.code, 'INVALID_CODE_FORMAT');
});

test('POST /api/v1/admin/activate rejects valid-looking but unknown key', async () => {
  const user = await UserModel.create({ email: 'u1@example.com', displayName: 'U1', role: 'user' });

  const res = await request(app)
    .post('/api/v1/admin/activate')
    .set('Cookie', sessionCookieFor(user))
    .send({ code: 'AAAA-BBBB-CCCC' });

  assert.equal(res.status, 400);
  assert.equal(res.body?.error?.code, 'INVALID_CODE');
});

test('POST /api/v1/admin/activate rejects expired key', async () => {
  const user = await UserModel.create({ email: 'u1@example.com', displayName: 'U1', role: 'user' });
  await LicenceKeyModel.create({
    key: 'AAAA-BBBB-CCCC',
    redeemed: false,
    usesCount: 0,
    maxUses: 5,
    revoked: false,
    expiresAt: new Date(Date.now() - 60_000),
  });

  const res = await request(app)
    .post('/api/v1/admin/activate')
    .set('Cookie', sessionCookieFor(user))
    .send({ code: 'AAAA-BBBB-CCCC' });

  assert.equal(res.status, 400);
  assert.equal(res.body?.error?.code, 'KEY_EXPIRED');

  const updatedKey = await LicenceKeyModel.findOne({ key: 'AAAA-BBBB-CCCC' }).lean();
  assert.equal(updatedKey?.revoked, true);
});

test('POST /api/v1/admin/activate rejects exhausted key', async () => {
  const user = await UserModel.create({ email: 'u1@example.com', displayName: 'U1', role: 'user' });
  await LicenceKeyModel.create({
    key: 'AAAA-BBBB-CCCC',
    redeemed: false,
    usesCount: 2,
    maxUses: 2,
    revoked: false,
  });

  const res = await request(app)
    .post('/api/v1/admin/activate')
    .set('Cookie', sessionCookieFor(user))
    .send({ code: 'AAAA-BBBB-CCCC' });

  assert.equal(res.status, 400);
  assert.equal(res.body?.error?.code, 'KEY_EXHAUSTED');
});

test('POST /api/v1/admin/activate upgrades user role to admin when key is valid', async () => {
  const user = await UserModel.create({ email: 'u1@example.com', displayName: 'U1', role: 'user' });
  await LicenceKeyModel.create({
    key: 'AAAA-BBBB-CCCC',
    redeemed: false,
    usesCount: 0,
    maxUses: 5,
    revoked: false,
  });

  const res = await request(app)
    .post('/api/v1/admin/activate')
    .set('Cookie', sessionCookieFor(user))
    .send({ code: 'aaaa-bbbb-cccc' });

  assert.equal(res.status, 200);
  assert.equal(res.body?.user?.role, 'admin');

  const updated = await UserModel.findById(user._id).lean();
  assert.equal(updated?.role, 'admin');

  const key = await LicenceKeyModel.findOne({ key: 'AAAA-BBBB-CCCC' }).lean();
  assert.equal(key?.usesCount, 1);
  assert.equal(String(key?.usedBy), String(user._id));
  assert.ok(key?.usedAt instanceof Date);
  assert.equal(key?.revoked, false);
});

test('POST /api/v1/admin/activate rejects already-admin accounts', async () => {
  const admin = await UserModel.create({
    email: 'admin@example.com',
    displayName: 'Admin',
    role: 'admin',
  });
  await LicenceKeyModel.create({
    key: 'AAAA-BBBB-CCCC',
    redeemed: false,
    usesCount: 0,
    maxUses: 5,
    revoked: false,
  });

  const res = await request(app)
    .post('/api/v1/admin/activate')
    .set('Cookie', sessionCookieFor(admin))
    .send({ code: 'AAAA-BBBB-CCCC' });

  assert.equal(res.status, 400);
  assert.equal(res.body?.error?.code, 'ALREADY_ADMIN');
});

test('GET /api/v1/admin/stats is forbidden for non-admin', async () => {
  const user = await UserModel.create({ email: 'u1@example.com', displayName: 'U1', role: 'user' });

  const res = await request(app).get('/api/v1/admin/stats').set('Cookie', sessionCookieFor(user));

  assert.equal(res.status, 403);
  assert.equal(res.body?.error?.code, 'FORBIDDEN');
});

test('GET /api/v1/admin/stats returns admin data for admin users', async () => {
  const admin = await UserModel.create({
    email: 'admin@example.com',
    displayName: 'Admin',
    role: 'admin',
  });
  await LicenceKeyModel.create({
    key: 'ZZZZ-YYYY-XXXX',
    redeemed: false,
    usesCount: 1,
    maxUses: 5,
    revoked: false,
  });

  const res = await request(app).get('/api/v1/admin/stats').set('Cookie', sessionCookieFor(admin));

  assert.equal(res.status, 200);
  assert.equal(typeof res.body?.adminCount, 'number');
  assert.ok(Array.isArray(res.body?.activationKeys));
});
