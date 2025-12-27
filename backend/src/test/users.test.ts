import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../app';
import { connectTestDb, clearDb, disconnectTestDb } from './helpers/db';
import { sessionCookieFor } from './helpers/session';
import { createLicenceKey, createUser } from './helpers/factories';

const app = createApp();

before(connectTestDb);
after(disconnectTestDb);
beforeEach(clearDb);

test('Users: /users/me requires auth', async () => {
  const res = await request(app).get('/api/v1/users/me');

  assert.equal(res.status, 401);
  assert.equal(res.body?.error?.code, 'UNAUTHENTICATED');
});

test('Users: /users/me returns pendingTeamCreation when owner key exists', async () => {
  const user = await createUser({ email: 'user@example.com', displayName: 'User' });
  await createLicenceKey({ key: 'AAAA-BBBB-CCCC', ownerUserId: user._id });

  const res = await request(app).get('/api/v1/users/me').set('Cookie', sessionCookieFor(user));

  assert.equal(res.status, 200);
  assert.equal(res.body?.user?.pendingTeamCreation, true);
});
