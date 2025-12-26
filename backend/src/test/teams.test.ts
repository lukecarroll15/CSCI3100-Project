import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

import { createApp } from '../app';
import { env } from '../config/env';
import { UserModel } from '../models/User';
import { TeamModel } from '../models/Team';
import { TeamMembershipModel } from '../models/TeamMembership';

const app = createApp();

function sessionCookieFor(user: { _id: unknown; email: string; role?: 'user' | 'admin' }): string {
  const token = jwt.sign({ email: user.email, role: user.role ?? 'user' }, env.SESSION_SECRET, {
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

test('Teams: invite creates membership on /teams/mine', async () => {
  const admin = await UserModel.create({
    email: 'admin@example.com',
    displayName: 'Admin',
    role: 'admin',
  });
  const user = await UserModel.create({
    email: 'member@example.com',
    displayName: 'Member',
    role: 'user',
  });

  const team = await TeamModel.create({
    name: 'Alpha Team',
    createdBy: admin._id,
    inviteOnly: true,
  });
  await TeamMembershipModel.create({
    teamId: team._id,
    userId: admin._id,
    role: 'owner',
  });

  const inviteRes = await request(app)
    .post(`/api/v1/teams/${team._id}/invites`)
    .set('Cookie', sessionCookieFor(admin))
    .send({ email: user.email, role: 'member' });

  assert.equal(inviteRes.status, 201);

  const mineRes = await request(app)
    .get('/api/v1/teams/mine')
    .set('Cookie', sessionCookieFor(user));

  assert.equal(mineRes.status, 200);
  assert.ok(
    Array.isArray(mineRes.body?.teams),
    'Expected teams list in /teams/mine response'
  );
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
  const admin = await UserModel.create({
    email: 'admin@example.com',
    displayName: 'Admin',
    role: 'admin',
  });

  const team = await TeamModel.create({
    name: 'Alpha Team',
    createdBy: admin._id,
    inviteOnly: true,
  });
  await TeamMembershipModel.create({
    teamId: team._id,
    userId: admin._id,
    role: 'owner',
  });

  const inviteRes = await request(app)
    .post(`/api/v1/teams/${team._id}/invites`)
    .set('Cookie', sessionCookieFor(admin))
    .send({ email: 'missing@example.com', role: 'member' });

  assert.equal(inviteRes.status, 404);
  assert.equal(inviteRes.body?.error?.code, 'ACCOUNT_NOT_FOUND');
});
