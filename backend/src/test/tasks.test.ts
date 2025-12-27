import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../app';
import { connectTestDb, clearDb, disconnectTestDb } from './helpers/db';
import { sessionCookieFor } from './helpers/session';
import { addTeamMember, createOwnerTeam, createTask, createUser } from './helpers/factories';

const app = createApp();

before(connectTestDb);
after(disconnectTestDb);
beforeEach(clearDb);

test('Tasks: member-created tasks force assignee to self', async () => {
  const owner = await createUser({
    email: 'owner@example.com',
    displayName: 'Owner',
    role: 'admin',
  });
  const member = await createUser({ email: 'member@example.com', displayName: 'Member' });
  const { team } = await createOwnerTeam(owner, 'Alpha Team');
  await addTeamMember({ teamId: team._id, userId: member._id, role: 'member' });

  const res = await request(app)
    .post('/api/v1/tasks')
    .set('Cookie', sessionCookieFor(member))
    .set('X-Team-Id', team._id.toString())
    .send({
      name: 'Member Task',
      priority: 'low',
      department: 'General',
      assignee: ['someone@example.com'],
      dueDate: new Date(Date.now() + 86400000).toISOString(),
    });

  assert.equal(res.status, 201);
  assert.ok(res.body?.task?.assignee?.includes('Member'));
  assert.equal(res.body?.task?.assignee?.length, 1);
});

test('Tasks: admin can create multi-assignee tasks', async () => {
  const owner = await createUser({
    email: 'owner@example.com',
    displayName: 'Owner',
    role: 'admin',
  });
  const member = await createUser({ email: 'member@example.com', displayName: 'Member' });
  const { team } = await createOwnerTeam(owner, 'Alpha Team');
  await addTeamMember({ teamId: team._id, userId: member._id, role: 'member' });

  const res = await request(app)
    .post('/api/v1/tasks')
    .set('Cookie', sessionCookieFor(owner))
    .set('X-Team-Id', team._id.toString())
    .send({
      name: 'Admin Task',
      priority: 'high',
      department: 'General',
      assignee: ['Owner', 'Member'],
      dueDate: new Date(Date.now() + 86400000).toISOString(),
    });

  assert.equal(res.status, 201);
  assert.equal(res.body?.task?.assignee?.length, 2);
});

test('Tasks: member can change status but not details on admin tasks', async () => {
  const owner = await createUser({
    email: 'owner@example.com',
    displayName: 'Owner',
    role: 'admin',
  });
  const member = await createUser({ email: 'member@example.com', displayName: 'Member' });
  const { team } = await createOwnerTeam(owner, 'Alpha Team');
  await addTeamMember({ teamId: team._id, userId: member._id, role: 'member' });

  const task = await createTask({
    teamId: team._id,
    createdBy: owner._id,
    name: 'Shared Task',
    assignee: ['Member'],
  });

  const detailsRes = await request(app)
    .patch(`/api/v1/tasks/${task._id}`)
    .set('Cookie', sessionCookieFor(member))
    .set('X-Team-Id', team._id.toString())
    .send({ description: 'Updated by member' });

  assert.equal(detailsRes.status, 403);
  assert.equal(detailsRes.body?.error?.code, 'FORBIDDEN');

  const statusRes = await request(app)
    .patch(`/api/v1/tasks/${task._id}`)
    .set('Cookie', sessionCookieFor(member))
    .set('X-Team-Id', team._id.toString())
    .send({ status: 'In Progress' });

  assert.equal(statusRes.status, 200);
  assert.equal(statusRes.body?.task?.status, 'In Progress');
});

test('Tasks: member personal tasks are hidden from admins', async () => {
  const owner = await createUser({
    email: 'owner@example.com',
    displayName: 'Owner',
    role: 'admin',
  });
  const member = await createUser({ email: 'member@example.com', displayName: 'Member' });
  const { team } = await createOwnerTeam(owner, 'Alpha Team');
  await addTeamMember({ teamId: team._id, userId: member._id, role: 'member' });

  await createTask({
    teamId: team._id,
    createdBy: member._id,
    name: 'Personal Task',
    assignee: ['Member'],
  });

  const res = await request(app)
    .get('/api/v1/tasks')
    .set('Cookie', sessionCookieFor(owner))
    .set('X-Team-Id', team._id.toString());

  assert.equal(res.status, 200);
  const names = (res.body?.tasks ?? []).map((t: { name: string }) => t.name);
  assert.ok(!names.includes('Personal Task'));
});

test('Tasks: admin cannot delete member personal tasks', async () => {
  const owner = await createUser({
    email: 'owner@example.com',
    displayName: 'Owner',
    role: 'admin',
  });
  const member = await createUser({ email: 'member@example.com', displayName: 'Member' });
  const { team } = await createOwnerTeam(owner, 'Alpha Team');
  await addTeamMember({ teamId: team._id, userId: member._id, role: 'member' });

  const personal = await createTask({
    teamId: team._id,
    createdBy: member._id,
    name: 'Personal Task',
    assignee: ['Member'],
  });

  const res = await request(app)
    .delete(`/api/v1/tasks/${personal._id}`)
    .set('Cookie', sessionCookieFor(owner))
    .set('X-Team-Id', team._id.toString());

  assert.equal(res.status, 403);
  assert.equal(res.body?.error?.code, 'FORBIDDEN');
});
