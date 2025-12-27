import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../app';
import { LicenceKeyModel } from '../models/LicenceKey';
import { UserModel } from '../models/User';
import { TeamMembershipModel } from '../models/TeamMembership';
import { connectTestDb, clearDb, disconnectTestDb } from './helpers/db';
import { sessionCookieFor } from './helpers/session';
import { createLicenceKey, createOwnerTeam, createUser } from './helpers/factories';

const app = createApp();

before(connectTestDb);
after(disconnectTestDb);
beforeEach(clearDb);

test('POST /api/v1/admin/activate rejects missing code', async () => {
  const user = await createUser({ email: 'u1@example.com', displayName: 'U1' });

  const res = await request(app)
    .post('/api/v1/admin/activate')
    .set('Cookie', sessionCookieFor(user))
    .send({});

  assert.equal(res.status, 400);
  assert.equal(res.body?.error?.code, 'VALIDATION_ERROR');
});

test('POST /api/v1/admin/activate rejects invalid format (must be AAAA-BBBB-CCCC)', async () => {
  const user = await createUser({ email: 'u1@example.com', displayName: 'U1' });

  const res = await request(app)
    .post('/api/v1/admin/activate')
    .set('Cookie', sessionCookieFor(user))
    .send({ code: 'ABC123' });

  assert.equal(res.status, 400);
  assert.equal(res.body?.error?.code, 'INVALID_CODE_FORMAT');
});

test('POST /api/v1/admin/activate rejects valid-looking but unknown key', async () => {
  const user = await createUser({ email: 'u1@example.com', displayName: 'U1' });

  const res = await request(app)
    .post('/api/v1/admin/activate')
    .set('Cookie', sessionCookieFor(user))
    .send({ code: 'AAAA-BBBB-CCCC' });

  assert.equal(res.status, 400);
  assert.equal(res.body?.error?.code, 'INVALID_CODE');
});

test('POST /api/v1/admin/activate rejects expired key', async () => {
  const user = await createUser({ email: 'u1@example.com', displayName: 'U1' });
  await createLicenceKey({ key: 'AAAA-BBBB-CCCC', expiresAt: new Date(Date.now() - 60_000) });

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
  const user = await createUser({ email: 'u1@example.com', displayName: 'U1' });
  await createLicenceKey({ key: 'AAAA-BBBB-CCCC', usesCount: 2, maxUses: 2 });

  const res = await request(app)
    .post('/api/v1/admin/activate')
    .set('Cookie', sessionCookieFor(user))
    .send({ code: 'AAAA-BBBB-CCCC' });

  assert.equal(res.status, 400);
  assert.equal(res.body?.error?.code, 'KEY_EXHAUSTED');
});

test('POST /api/v1/admin/activate upgrades user role to admin when key is valid', async () => {
  const user = await createUser({ email: 'u1@example.com', displayName: 'U1' });
  await createLicenceKey({ key: 'AAAA-BBBB-CCCC' });

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
  const admin = await createUser({
    email: 'admin@example.com',
    displayName: 'Admin',
    role: 'admin',
  });
  await createLicenceKey({ key: 'AAAA-BBBB-CCCC' });

  const res = await request(app)
    .post('/api/v1/admin/activate')
    .set('Cookie', sessionCookieFor(admin))
    .send({ code: 'AAAA-BBBB-CCCC' });

  assert.equal(res.status, 400);
  assert.equal(res.body?.error?.code, 'ALREADY_ADMIN');
});

test('POST /api/v1/admin/activate rejects unauthenticated requests', async () => {
  const res = await request(app).post('/api/v1/admin/activate').send({ code: 'AAAA-BBBB-CCCC' });

  assert.equal(res.status, 401);
  assert.equal(res.body?.error?.code, 'UNAUTHENTICATED');
});

test('POST /api/v1/admin/activate blocks when team setup is pending', async () => {
  const keyOwner = await createUser({ email: 'owner@example.com', displayName: 'Owner' });
  const member = await createUser({ email: 'member@example.com', displayName: 'Member' });
  await createLicenceKey({
    key: 'AAAA-BBBB-CCCC',
    ownerUserId: keyOwner._id,
    teamId: null,
  });

  const res = await request(app)
    .post('/api/v1/admin/activate')
    .set('Cookie', sessionCookieFor(member))
    .send({ code: 'AAAA-BBBB-CCCC' });

  assert.equal(res.status, 409);
  assert.equal(res.body?.error?.code, 'TEAM_PENDING');
});

test('POST /api/v1/admin/activate rotates key when reaching max uses', async () => {
  const user = await createUser({ email: 'u1@example.com', displayName: 'U1' });
  await createLicenceKey({
    key: 'AAAA-BBBB-CCCC',
    usesCount: 0,
    maxUses: 1,
    revoked: false,
    redeemed: false,
  });

  const res = await request(app)
    .post('/api/v1/admin/activate')
    .set('Cookie', sessionCookieFor(user))
    .send({ code: 'AAAA-BBBB-CCCC' });

  assert.equal(res.status, 200);

  const oldKey = await LicenceKeyModel.findOne({ key: 'AAAA-BBBB-CCCC' }).lean();
  assert.equal(oldKey?.revoked, true);
  assert.equal(oldKey?.redeemed, true);

  const nextKey = await LicenceKeyModel.findOne({
    ownerUserId: user._id,
    key: { $ne: 'AAAA-BBBB-CCCC' },
    revoked: false,
  }).lean();
  assert.ok(nextKey);
});

test('GET /api/v1/admin/stats is forbidden for team members', async () => {
  const owner = await createUser({
    email: 'owner@example.com',
    displayName: 'Owner',
    role: 'admin',
  });
  const member = await createUser({ email: 'member@example.com', displayName: 'Member' });
  const { team } = await createOwnerTeam(owner);
  await TeamMembershipModel.create({ teamId: team._id, userId: member._id, role: 'member' });

  const res = await request(app)
    .get('/api/v1/admin/stats')
    .set('Cookie', sessionCookieFor(member))
    .set('X-Team-Id', team._id.toString());

  assert.equal(res.status, 403);
  assert.equal(res.body?.error?.code, 'FORBIDDEN');
});

test('GET /api/v1/admin/stats returns admin data for team admins', async () => {
  const owner = await createUser({
    email: 'owner@example.com',
    displayName: 'Owner',
    role: 'admin',
  });
  const admin = await createUser({ email: 'admin@example.com', displayName: 'Admin' });
  const { team } = await createOwnerTeam(owner);
  await TeamMembershipModel.create({ teamId: team._id, userId: admin._id, role: 'admin' });
  await createLicenceKey({ key: 'ZZZZ-YYYY-XXXX', usesCount: 1, teamId: team._id });

  const res = await request(app)
    .get('/api/v1/admin/stats')
    .set('Cookie', sessionCookieFor(admin))
    .set('X-Team-Id', team._id.toString());

  assert.equal(res.status, 200);
  assert.equal(typeof res.body?.adminCount, 'number');
  assert.ok(Array.isArray(res.body?.activationKeys));
  assert.equal(res.body?.activationKeys?.length ?? 0, 0);
});
