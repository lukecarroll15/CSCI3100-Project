import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../app';
import { connectTestDb, clearDb, disconnectTestDb } from './helpers/db';
import { sessionCookieFor } from './helpers/session';
import Folder from '../models/Folder';
import {
  addTeamMember,
  createFile,
  createFolder,
  createOwnerTeam,
  createUser,
} from './helpers/factories';

const app = createApp();

before(connectTestDb);
after(disconnectTestDb);
beforeEach(clearDb);

test('Folders: create root folder', async () => {
  const owner = await createUser({ email: 'owner@example.com', displayName: 'Owner' });
  const { team } = await createOwnerTeam(owner, 'Alpha Team');

  const res = await request(app)
    .post('/api/v1/folders')
    .set('Cookie', sessionCookieFor(owner))
    .set('X-Team-Id', team._id.toString())
    .send({ name: 'Root' });

  assert.equal(res.status, 201);
  assert.equal(res.body?.name, 'Root');
});

test('Folders: enforce max depth', async () => {
  const owner = await createUser({ email: 'owner@example.com', displayName: 'Owner' });
  const { team } = await createOwnerTeam(owner, 'Alpha Team');

  const root = await request(app)
    .post('/api/v1/folders')
    .set('Cookie', sessionCookieFor(owner))
    .set('X-Team-Id', team._id.toString())
    .send({ name: 'Root' });

  const level2 = await request(app)
    .post('/api/v1/folders')
    .set('Cookie', sessionCookieFor(owner))
    .set('X-Team-Id', team._id.toString())
    .send({ name: 'Level2', parentFolder: root.body._id });

  const level3 = await request(app)
    .post('/api/v1/folders')
    .set('Cookie', sessionCookieFor(owner))
    .set('X-Team-Id', team._id.toString())
    .send({ name: 'Level3', parentFolder: level2.body._id });

  const level4 = await request(app)
    .post('/api/v1/folders')
    .set('Cookie', sessionCookieFor(owner))
    .set('X-Team-Id', team._id.toString())
    .send({ name: 'Level4', parentFolder: level3.body._id });

  assert.equal(level4.status, 201);

  const tooDeep = await request(app)
    .post('/api/v1/folders')
    .set('Cookie', sessionCookieFor(owner))
    .set('X-Team-Id', team._id.toString())
    .send({ name: 'Level5', parentFolder: level4.body._id });

  assert.equal(tooDeep.status, 400);
  assert.equal(tooDeep.body?.error?.code, 'MAX_DEPTH');
});

test('Folders: reject duplicate names in same parent', async () => {
  const owner = await createUser({ email: 'owner@example.com', displayName: 'Owner' });
  const { team } = await createOwnerTeam(owner, 'Alpha Team');

  const first = await request(app)
    .post('/api/v1/folders')
    .set('Cookie', sessionCookieFor(owner))
    .set('X-Team-Id', team._id.toString())
    .send({ name: 'Docs' });

  assert.equal(first.status, 201);

  await Folder.syncIndexes();

  const dup = await request(app)
    .post('/api/v1/folders')
    .set('Cookie', sessionCookieFor(owner))
    .set('X-Team-Id', team._id.toString())
    .send({ name: 'Docs' });

  assert.equal(dup.status, 400);
  assert.equal(dup.body?.error?.code, 'FOLDER_EXISTS');
});

test('Folders: cannot delete when non-empty', async () => {
  const owner = await createUser({ email: 'owner@example.com', displayName: 'Owner' });
  const { team } = await createOwnerTeam(owner, 'Alpha Team');
  const folder = await createFolder({ teamId: team._id, createdBy: owner._id, name: 'Docs' });
  await createFile({ teamId: team._id, uploadedBy: owner._id, folder: folder._id });

  const res = await request(app)
    .delete(`/api/v1/folders/${folder._id}`)
    .set('Cookie', sessionCookieFor(owner))
    .set('X-Team-Id', team._id.toString());

  assert.equal(res.status, 400);
  assert.equal(res.body?.error?.code, 'FOLDER_NOT_EMPTY');
});

test('Folders: only creator or admin can delete', async () => {
  const owner = await createUser({ email: 'owner@example.com', displayName: 'Owner' });
  const member = await createUser({ email: 'member@example.com', displayName: 'Member' });
  const { team } = await createOwnerTeam(owner, 'Alpha Team');
  await addTeamMember({ teamId: team._id, userId: member._id, role: 'member' });

  const folder = await createFolder({ teamId: team._id, createdBy: owner._id, name: 'Docs' });

  const res = await request(app)
    .delete(`/api/v1/folders/${folder._id}`)
    .set('Cookie', sessionCookieFor(member))
    .set('X-Team-Id', team._id.toString());

  assert.equal(res.status, 403);
  assert.equal(res.body?.error?.code, 'FORBIDDEN');
});
