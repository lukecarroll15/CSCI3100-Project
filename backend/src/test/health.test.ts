import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../app';

test('GET /api/v1/health/live returns OK', async () => {
  process.env.MONGO_URI = process.env.MONGO_URI ?? 'mongodb://127.0.0.1:27017/taskflow_test';
  process.env.SESSION_SECRET = process.env.SESSION_SECRET ?? 'test_secret_test_secret_test';
  const app = createApp();

  const res = await request(app).get('/api/v1/health/live');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'OK');
});
