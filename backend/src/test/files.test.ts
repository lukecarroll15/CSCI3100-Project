import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../app';
import { connectTestDb, clearDb, disconnectTestDb } from './helpers/db';
import { sessionCookieFor } from './helpers/session';
import { addTeamMember, createFile, createOwnerTeam, createUser } from './helpers/factories';

const app = createApp();

before(connectTestDb);
after(disconnectTestDb);
beforeEach(clearDb);

test('Files: member upload cannot mark admin-only', async () => {
  const owner = await createUser({
    email: 'owner@example.com',
    displayName: 'Owner',
    role: 'admin',
  });
  const member = await createUser({ email: 'member@example.com', displayName: 'Member' });
  const { team } = await createOwnerTeam(owner, 'Alpha Team');
  await addTeamMember({ teamId: team._id, userId: member._id, role: 'member' });

  const res = await request(app)
    .post('/api/v1/files')
    .set('Cookie', sessionCookieFor(member))
    .set('X-Team-Id', team._id.toString())
    .field('isAdminOnly', 'true')
    .field('department', 'General')
    .attach('file', Buffer.from('hello'), 'note.txt');

  assert.equal(res.status, 201);
  assert.equal(res.body?.isAdminOnly, false);
});

test('Files: admin can upload admin-only file', async () => {
  const owner = await createUser({
    email: 'owner@example.com',
    displayName: 'Owner',
    role: 'admin',
  });
  const { team } = await createOwnerTeam(owner, 'Alpha Team');

  const res = await request(app)
    .post('/api/v1/files')
    .set('Cookie', sessionCookieFor(owner))
    .set('X-Team-Id', team._id.toString())
    .field('isAdminOnly', 'true')
    .field('department', 'General')
    .attach('file', Buffer.from('secret'), 'secret.txt');

  assert.equal(res.status, 201);
  assert.equal(res.body?.isAdminOnly, true);
});

test('Files: members cannot list admin-only files', async () => {
  const owner = await createUser({
    email: 'owner@example.com',
    displayName: 'Owner',
    role: 'admin',
  });
  const member = await createUser({ email: 'member@example.com', displayName: 'Member' });
  const { team } = await createOwnerTeam(owner, 'Alpha Team');
  await addTeamMember({ teamId: team._id, userId: member._id, role: 'member' });

  await createFile({
    teamId: team._id,
    uploadedBy: owner._id,
    originalName: 'public.txt',
  });
  await createFile({
    teamId: team._id,
    uploadedBy: owner._id,
    originalName: 'secret.txt',
    isAdminOnly: true,
  });

  const res = await request(app)
    .get('/api/v1/files')
    .set('Cookie', sessionCookieFor(member))
    .set('X-Team-Id', team._id.toString());

  assert.equal(res.status, 200);
  const names = (res.body as Array<{ originalName: string }>).map((f) => f.originalName);
  assert.ok(names.includes('public.txt'));
  assert.ok(!names.includes('secret.txt'));
});

test('Files: download rejects admin-only access for members', async () => {
  const owner = await createUser({
    email: 'owner@example.com',
    displayName: 'Owner',
    role: 'admin',
  });
  const member = await createUser({ email: 'member@example.com', displayName: 'Member' });
  const { team } = await createOwnerTeam(owner, 'Alpha Team');
  await addTeamMember({ teamId: team._id, userId: member._id, role: 'member' });

  const file = await createFile({
    teamId: team._id,
    uploadedBy: owner._id,
    originalName: 'secret.txt',
    storedName: 'secret.txt',
    isAdminOnly: true,
  });

  const res = await request(app)
    .get(`/api/v1/files/${file._id}/download`)
    .set('Cookie', sessionCookieFor(member))
    .set('X-Team-Id', team._id.toString());

  assert.equal(res.status, 403);
  assert.equal(res.body?.error?.code, 'FORBIDDEN');
});

test('Files: delete allowed for admin or uploader only', async () => {
  const owner = await createUser({
    email: 'owner@example.com',
    displayName: 'Owner',
    role: 'admin',
  });
  const member = await createUser({ email: 'member@example.com', displayName: 'Member' });
  const other = await createUser({ email: 'other@example.com', displayName: 'Other' });
  const { team } = await createOwnerTeam(owner, 'Alpha Team');
  await addTeamMember({ teamId: team._id, userId: member._id, role: 'member' });
  await addTeamMember({ teamId: team._id, userId: other._id, role: 'member' });

  const file = await createFile({
    teamId: team._id,
    uploadedBy: member._id,
    originalName: 'mine.txt',
    storedName: 'mine.txt',
  });

  const forbidden = await request(app)
    .delete(`/api/v1/files/${file._id}`)
    .set('Cookie', sessionCookieFor(other))
    .set('X-Team-Id', team._id.toString());

  assert.equal(forbidden.status, 403);

  const ok = await request(app)
    .delete(`/api/v1/files/${file._id}`)
    .set('Cookie', sessionCookieFor(owner))
    .set('X-Team-Id', team._id.toString());

  assert.equal(ok.status, 204);
});
