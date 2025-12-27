import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../app';
import { TeamMembershipModel } from '../models/TeamMembership';
import { LicenceKeyModel } from '../models/LicenceKey';
import { connectTestDb, clearDb, disconnectTestDb } from './helpers/db';
import { sessionCookieFor } from './helpers/session';
import { addTeamMember, createLicenceKey, createOwnerTeam, createUser } from './helpers/factories';

const app = createApp();

before(connectTestDb);
after(disconnectTestDb);
beforeEach(clearDb);

test('Teams: invite creates membership on /teams/mine', async () => {
  const admin = await createUser({
    email: 'admin@example.com',
    displayName: 'Admin',
    role: 'admin',
  });
  const user = await createUser({
    email: 'member@example.com',
    displayName: 'Member',
  });

  const { team } = await createOwnerTeam(admin, 'Alpha Team');

  const inviteRes = await request(app)
    .post(`/api/v1/teams/${team._id}/invites`)
    .set('Cookie', sessionCookieFor(admin))
    .send({ email: user.email, role: 'member' });

  assert.equal(inviteRes.status, 201);

  const mineRes = await request(app)
    .get('/api/v1/teams/mine')
    .set('Cookie', sessionCookieFor(user));

  assert.equal(mineRes.status, 200);
  assert.ok(Array.isArray(mineRes.body?.teams), 'Expected teams list in /teams/mine response');
  assert.ok(
    mineRes.body.teams.some((t: { id: string }) => t.id === String(team._id)),
    'Expected invited team in /teams/mine response'
  );

  const membership = await TeamMembershipModel.findOne({
    teamId: team._id,
    userId: user._id,
  }).lean();
  assert.ok(membership, 'Expected membership to be created');
});

test('Teams: invite rejects unknown accounts', async () => {
  const admin = await createUser({
    email: 'admin@example.com',
    displayName: 'Admin',
    role: 'admin',
  });

  const { team } = await createOwnerTeam(admin, 'Alpha Team');

  const inviteRes = await request(app)
    .post(`/api/v1/teams/${team._id}/invites`)
    .set('Cookie', sessionCookieFor(admin))
    .send({ email: 'missing@example.com', role: 'member' });

  assert.equal(inviteRes.status, 404);
  assert.equal(inviteRes.body?.error?.code, 'ACCOUNT_NOT_FOUND');
});

test('Teams: create team requires pending activation key', async () => {
  const owner = await createUser({ email: 'owner@example.com', displayName: 'Owner' });

  const res = await request(app)
    .post('/api/v1/teams')
    .set('Cookie', sessionCookieFor(owner))
    .send({ name: 'Alpha Team' });

  assert.equal(res.status, 403);
  assert.equal(res.body?.error?.code, 'FORBIDDEN');
});

test('Teams: create team assigns owner and links pending key', async () => {
  const owner = await createUser({ email: 'owner@example.com', displayName: 'Owner' });
  const key = await createLicenceKey({ key: 'AAAA-BBBB-CCCC', ownerUserId: owner._id });

  const res = await request(app)
    .post('/api/v1/teams')
    .set('Cookie', sessionCookieFor(owner))
    .send({ name: 'Alpha Team' });

  assert.equal(res.status, 201);
  assert.equal(res.body?.role, 'owner');

  const membership = await TeamMembershipModel.findOne({
    teamId: res.body?.team?.id,
    userId: owner._id,
  }).lean();
  assert.ok(membership);

  const updatedKey = await LicenceKeyModel.findById(key._id).lean();
  assert.ok(updatedKey?.teamId);
});

test('Teams: only owners can invite admins', async () => {
  const owner = await createUser({ email: 'owner@example.com', displayName: 'Owner' });
  const admin = await createUser({ email: 'admin@example.com', displayName: 'Admin' });
  const member = await createUser({ email: 'member@example.com', displayName: 'Member' });
  const { team } = await createOwnerTeam(owner, 'Alpha Team');
  await addTeamMember({ teamId: team._id, userId: admin._id, role: 'admin' });

  const res = await request(app)
    .post(`/api/v1/teams/${team._id}/invites`)
    .set('Cookie', sessionCookieFor(admin))
    .send({ email: member.email, role: 'admin' });

  assert.equal(res.status, 403);
  assert.equal(res.body?.error?.code, 'FORBIDDEN');
});

test('Teams: owner can update member roles', async () => {
  const owner = await createUser({ email: 'owner@example.com', displayName: 'Owner' });
  const member = await createUser({ email: 'member@example.com', displayName: 'Member' });
  const { team } = await createOwnerTeam(owner, 'Alpha Team');
  await addTeamMember({ teamId: team._id, userId: member._id, role: 'member' });

  const res = await request(app)
    .patch(`/api/v1/teams/${team._id}/members/${member._id}`)
    .set('Cookie', sessionCookieFor(owner))
    .send({ role: 'admin' });

  assert.equal(res.status, 200);
  assert.equal(res.body?.member?.role, 'admin');
});

test('Teams: non-owners cannot update roles', async () => {
  const owner = await createUser({ email: 'owner@example.com', displayName: 'Owner' });
  const admin = await createUser({ email: 'admin@example.com', displayName: 'Admin' });
  const member = await createUser({ email: 'member@example.com', displayName: 'Member' });
  const { team } = await createOwnerTeam(owner, 'Alpha Team');
  await addTeamMember({ teamId: team._id, userId: admin._id, role: 'admin' });
  await addTeamMember({ teamId: team._id, userId: member._id, role: 'member' });

  const res = await request(app)
    .patch(`/api/v1/teams/${team._id}/members/${member._id}`)
    .set('Cookie', sessionCookieFor(admin))
    .send({ role: 'admin' });

  assert.equal(res.status, 403);
  assert.equal(res.body?.error?.code, 'FORBIDDEN');
});

test('Teams: delete requires exact team name', async () => {
  const owner = await createUser({ email: 'owner@example.com', displayName: 'Owner' });
  const { team } = await createOwnerTeam(owner, 'Alpha Team');

  const res = await request(app)
    .delete(`/api/v1/teams/${team._id}`)
    .set('Cookie', sessionCookieFor(owner))
    .send({ name: 'Wrong Name' });

  assert.equal(res.status, 400);
  assert.equal(res.body?.error?.code, 'TEAM_NAME_MISMATCH');
});
