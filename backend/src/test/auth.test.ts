import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../app';
import { env } from '../config/env';
import { UserModel } from '../models/User';
import { OtpModel } from '../models/Otp';
import { connectTestDb, clearDb, disconnectTestDb } from './helpers/db';

const app = createApp();

before(connectTestDb);
after(disconnectTestDb);
beforeEach(clearDb);

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

test('request-otp rejects invalid email format', async () => {
  const res = await request(app)
    .post('/api/v1/auth/request-otp')
    .send({ email: 'invalid-email', purpose: 'signup' });

  assert.equal(res.status, 400);
  assert.equal(res.body?.error?.code, 'VALIDATION_ERROR');
});

test('request-otp enforces resend cooldown', async () => {
  const email = 'cooldown@example.com';
  const codeHash = await bcrypt.hash('000000', env.OTP_BCRYPT_ROUNDS);
  await OtpModel.create({
    email,
    purpose: 'signup',
    codeHash,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    attempts: 0,
    createdAt: new Date(),
  });

  const res = await request(app)
    .post('/api/v1/auth/request-otp')
    .send({ email, purpose: 'signup' });

  assert.equal(res.status, 429);
  assert.equal(res.body?.error?.code, 'OTP_COOLDOWN');
});

test('verify-otp rejects incorrect code', async () => {
  const email = 'wrongcode@example.com';
  await UserModel.create({ email, displayName: 'Existing', role: 'user' });

  const codeHash = await bcrypt.hash('111111', env.OTP_BCRYPT_ROUNDS);
  await OtpModel.create({
    email,
    purpose: 'login',
    codeHash,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    attempts: 0,
  });

  const res = await request(app)
    .post('/api/v1/auth/verify-otp')
    .send({ email, code: '222222', purpose: 'login' });

  assert.equal(res.status, 400);
  assert.equal(res.body?.error?.code, 'OTP_INVALID');
});

test('verify-otp rejects expired code', async () => {
  const email = 'expired@example.com';
  await UserModel.create({ email, displayName: 'Existing', role: 'user' });

  const codeHash = await bcrypt.hash('333333', env.OTP_BCRYPT_ROUNDS);
  await OtpModel.create({
    email,
    purpose: 'login',
    codeHash,
    expiresAt: new Date(Date.now() - 1000),
    attempts: 0,
  });

  const res = await request(app)
    .post('/api/v1/auth/verify-otp')
    .send({ email, code: '333333', purpose: 'login' });

  assert.equal(res.status, 400);
  assert.equal(res.body?.error?.code, 'OTP_NOT_FOUND');
});

test('verify-otp locks after too many attempts', async () => {
  const email = 'locked@example.com';
  await UserModel.create({ email, displayName: 'Existing', role: 'user' });

  const codeHash = await bcrypt.hash('444444', env.OTP_BCRYPT_ROUNDS);
  await OtpModel.create({
    email,
    purpose: 'login',
    codeHash,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    attempts: env.OTP_MAX_ATTEMPTS,
  });

  const res = await request(app)
    .post('/api/v1/auth/verify-otp')
    .send({ email, code: '444444', purpose: 'login' });

  assert.equal(res.status, 429);
  assert.equal(res.body?.error?.code, 'OTP_LOCKED');
});
