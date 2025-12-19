import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

import { createApp } from '../app';
import { env } from '../config/env';
import { UserModel } from '../models/User';
import { OtpModel } from '../models/Otp';

const app = createApp();

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

test('login request-otp rejects unregistered email', async () => {
  const res = await request(app)
    .post('/api/v1/auth/request-otp')
    .send({ email: 'newuser@example.com', purpose: 'login' });

  assert.equal(res.status, 404);
  assert.equal(res.body?.error?.code, 'ACCOUNT_NOT_FOUND');
});

test('signup request-otp creates OTP record when email is available', async () => {
  const res = await request(app)
    .post('/api/v1/auth/request-otp')
    .send({ email: 'newuser@example.com', purpose: 'signup' });

  assert.equal(res.status, 200);

  const count = await OtpModel.countDocuments({ email: 'newuser@example.com', purpose: 'signup' });
  assert.equal(count, 1);
});

test('signup verify-otp creates user and logs in', async () => {
  const email = 'newuser@example.com';
  const code = '123456';

  const codeHash = await bcrypt.hash(code, env.OTP_BCRYPT_ROUNDS);
  await OtpModel.create({
    email,
    purpose: 'signup',
    codeHash,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    attempts: 0,
  });

  const res = await request(app)
    .post('/api/v1/auth/verify-otp')
    .send({ email, code, purpose: 'signup', displayName: 'New User' });

  assert.equal(res.status, 200);
  assert.equal(res.body?.user?.email, email);

  const created = await UserModel.findOne({ email }).lean();
  assert.ok(created);
  assert.equal(created?.displayName, 'New User');
});

test('login verify-otp does not create user', async () => {
  const email = 'existing@example.com';
  const code = '654321';

  await UserModel.create({ email, displayName: 'Existing', role: 'user' });

  const codeHash = await bcrypt.hash(code, env.OTP_BCRYPT_ROUNDS);
  await OtpModel.create({
    email,
    purpose: 'login',
    codeHash,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    attempts: 0,
  });

  const res = await request(app)
    .post('/api/v1/auth/verify-otp')
    .send({ email, code, purpose: 'login' });

  assert.equal(res.status, 200);

  const users = await UserModel.find({ email }).lean();
  assert.equal(users.length, 1);
});
