import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../app';
import { DepartmentModel } from '../models/Department';
import { connectTestDb, clearDb, disconnectTestDb } from './helpers/db';
import { sessionCookieFor } from './helpers/session';
import {
  addTeamMember,
  createDepartment,
  createFile,
  createOwnerTeam,
  createUser,
} from './helpers/factories';

const app = createApp();

before(connectTestDb);
after(disconnectTestDb);
beforeEach(clearDb);

test('Departments: list seeds default departments', async () => {
  const owner = await createUser({ email: 'owner@example.com', displayName: 'Owner' });
  const { team } = await createOwnerTeam(owner, 'Alpha Team');

  const res = await request(app)
    .get('/api/v1/departments')
    .set('Cookie', sessionCookieFor(owner))
    .set('X-Team-Id', team._id.toString());

  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body));
  assert.ok(res.body.some((dept: { name?: string }) => dept.name === 'General'));
});

test('Departments: create requires admin access', async () => {
  const owner = await createUser({ email: 'owner@example.com', displayName: 'Owner' });
  const member = await createUser({ email: 'member@example.com', displayName: 'Member' });
  const { team } = await createOwnerTeam(owner, 'Alpha Team');
  await addTeamMember({ teamId: team._id, userId: member._id, role: 'member' });

  const res = await request(app)
    .post('/api/v1/departments')
    .set('Cookie', sessionCookieFor(member))
    .set('X-Team-Id', team._id.toString())
    .send({ name: 'Engineering' });

  assert.equal(res.status, 403);
  assert.equal(res.body?.error?.code, 'FORBIDDEN');
});

test('Departments: create and reject duplicates', async () => {
  const owner = await createUser({ email: 'owner@example.com', displayName: 'Owner' });
  const { team } = await createOwnerTeam(owner, 'Alpha Team');

  const res = await request(app)
    .post('/api/v1/departments')
    .set('Cookie', sessionCookieFor(owner))
    .set('X-Team-Id', team._id.toString())
    .send({ name: 'Engineering' });

  assert.equal(res.status, 201);
  assert.equal(res.body?.name, 'Engineering');

  const dup = await request(app)
    .post('/api/v1/departments')
    .set('Cookie', sessionCookieFor(owner))
    .set('X-Team-Id', team._id.toString())
    .send({ name: 'Engineering' });

  assert.equal(dup.status, 400);
  assert.equal(dup.body?.error?.code, 'ALREADY_EXISTS');
});

test('Departments: cannot delete General', async () => {
  const owner = await createUser({ email: 'owner@example.com', displayName: 'Owner' });
  const { team } = await createOwnerTeam(owner, 'Alpha Team');
  const general = await DepartmentModel.create({
    name: 'General',
    createdBy: owner._id,
    teamId: team._id,
  });

  const res = await request(app)
    .delete(`/api/v1/departments/${general._id}`)
    .set('Cookie', sessionCookieFor(owner))
    .set('X-Team-Id', team._id.toString());

  assert.equal(res.status, 400);
  assert.equal(res.body?.error?.code, 'BAD_REQUEST');
});

test('Departments: delete requires force when in use', async () => {
  const owner = await createUser({ email: 'owner@example.com', displayName: 'Owner' });
  const { team } = await createOwnerTeam(owner, 'Alpha Team');
  const department = await createDepartment({
    teamId: team._id,
    createdBy: owner._id,
    name: 'Ops',
  });
  await createFile({
    teamId: team._id,
    uploadedBy: owner._id,
    department: department.name,
  });

  const res = await request(app)
    .delete(`/api/v1/departments/${department._id}`)
    .set('Cookie', sessionCookieFor(owner))
    .set('X-Team-Id', team._id.toString());

  assert.equal(res.status, 409);
  assert.equal(res.body?.error?.code, 'DEPARTMENT_IN_USE');

  const forced = await request(app)
    .delete(`/api/v1/departments/${department._id}?force=true`)
    .set('Cookie', sessionCookieFor(owner))
    .set('X-Team-Id', team._id.toString());

  assert.equal(forced.status, 204);
});
