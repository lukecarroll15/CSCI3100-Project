import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../app';
import { connectTestDb, clearDb, disconnectTestDb } from './helpers/db';
import { sessionCookieFor } from './helpers/session';
import { createUser } from './helpers/factories';

const app = createApp();

before(connectTestDb);
after(disconnectTestDb);
beforeEach(clearDb);

test('Canvas: returns null when empty', async () => {
  const user = await createUser({ email: 'user@example.com', displayName: 'User' });

  const res = await request(app).get('/api/v1/canvas').set('Cookie', sessionCookieFor(user));

  assert.equal(res.status, 200);
  assert.equal(res.body?.data, null);
});

test('Canvas: upsert stores data', async () => {
  const user = await createUser({ email: 'user@example.com', displayName: 'User' });
  const payload = { data: { version: 1, nodes: [], edges: [] } };

  const putRes = await request(app)
    .put('/api/v1/canvas')
    .set('Cookie', sessionCookieFor(user))
    .send(payload);

  assert.equal(putRes.status, 200);
  assert.equal(putRes.body?.data?.version, 1);

  const getRes = await request(app).get('/api/v1/canvas').set('Cookie', sessionCookieFor(user));

  assert.equal(getRes.status, 200);
  assert.equal(getRes.body?.data?.version, 1);
});

test('Canvas: rejects non-object data', async () => {
  const user = await createUser({ email: 'user@example.com', displayName: 'User' });

  const res = await request(app)
    .put('/api/v1/canvas')
    .set('Cookie', sessionCookieFor(user))
    .send({ data: 'oops' });

  assert.equal(res.status, 400);
  assert.equal(res.body?.error?.code, 'INVALID_CANVAS_DATA');
});

test('Canvas: rejects oversized payloads', async () => {
  const user = await createUser({ email: 'user@example.com', displayName: 'User' });
  const largePayload = {
    data: { version: 1, nodes: [], edges: [], pad: 'x'.repeat(260_000) },
  };

  const res = await request(app)
    .put('/api/v1/canvas')
    .set('Cookie', sessionCookieFor(user))
    .send(largePayload);

  assert.equal(res.status, 413);
  assert.equal(res.body?.error?.code, 'CANVAS_TOO_LARGE');
});
