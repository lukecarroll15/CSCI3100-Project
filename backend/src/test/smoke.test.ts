import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../app';
import { env } from '../config/env';
import { OtpModel } from '../models/Otp';
import { connectTestDb, clearDb, disconnectTestDb } from './helpers/db';
import { createLicenceKey, createUser } from './helpers/factories';

const app = createApp();

before(connectTestDb);
after(disconnectTestDb);
beforeEach(clearDb);

test('Smoke: core API flow (auth -> team -> files -> tasks -> canvas)', async () => {
  const email = 'smoke@example.com';
  await createUser({ email, displayName: 'Smoke User' });
  const code = '123456';
  const codeHash = await bcrypt.hash(code, env.OTP_BCRYPT_ROUNDS);

  await OtpModel.create({
    email,
    purpose: 'login',
    codeHash,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    attempts: 0,
  });

  const loginRes = await request(app)
    .post('/api/v1/auth/verify-otp')
    .send({ email, code, purpose: 'login' });

  assert.equal(loginRes.status, 200);
  const cookie = loginRes.headers['set-cookie']?.[0];
  assert.ok(cookie);

  await createLicenceKey({ key: 'AAAA-BBBB-CCCC' });

  const activateRes = await request(app)
    .post('/api/v1/admin/activate')
    .set('Cookie', cookie)
    .send({ code: 'AAAA-BBBB-CCCC' });

  assert.equal(activateRes.status, 200);

  const teamRes = await request(app)
    .post('/api/v1/teams')
    .set('Cookie', cookie)
    .send({ name: 'Alpha Team' });

  assert.equal(teamRes.status, 201);
  const teamId = teamRes.body?.team?.id as string;
  assert.ok(teamId);

  const deptRes = await request(app)
    .post('/api/v1/departments')
    .set('Cookie', cookie)
    .set('X-Team-Id', teamId)
    .send({ name: 'Engineering' });

  assert.equal(deptRes.status, 201);

  const folderRes = await request(app)
    .post('/api/v1/folders')
    .set('Cookie', cookie)
    .set('X-Team-Id', teamId)
    .send({ name: 'Docs' });

  assert.equal(folderRes.status, 201);

  const fileRes = await request(app)
    .post('/api/v1/files')
    .set('Cookie', cookie)
    .set('X-Team-Id', teamId)
    .field('department', 'Engineering')
    .field('folder', folderRes.body?._id ?? '')
    .attach('file', Buffer.from('hello'), 'readme.txt');

  assert.equal(fileRes.status, 201);

  const taskRes = await request(app)
    .post('/api/v1/tasks')
    .set('Cookie', cookie)
    .set('X-Team-Id', teamId)
    .send({
      name: 'Smoke Task',
      priority: 'medium',
      department: 'Engineering',
      assignee: ['Smoke User'],
      dueDate: new Date(Date.now() + 86400000).toISOString(),
    });

  assert.equal(taskRes.status, 201);

  const canvasRes = await request(app)
    .put('/api/v1/canvas')
    .set('Cookie', cookie)
    .send({ data: { version: 1, nodes: [], edges: [] } });

  assert.equal(canvasRes.status, 200);
  assert.equal(canvasRes.body?.data?.version, 1);
});
