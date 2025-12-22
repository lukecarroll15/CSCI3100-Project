
import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

import { createApp } from '../app';
import { env } from '../config/env';
import { UserModel } from '../models/User';
import { FileModel } from '../models/File';
import FolderModel from '../models/Folder';
import { DepartmentModel } from '../models/Department';

const app = createApp();

function createSessionCookie(user: { _id: mongoose.Types.ObjectId; email: string }) {
  const token = jwt.sign({ email: user.email }, env.SESSION_SECRET, {
    subject: user._id.toString(),
    expiresIn: '1h',
  });
  return `taskflow_session=${token}`;
}

before(async () => {
  await mongoose.connect(env.MONGO_URI);
});

after(async () => {
  await mongoose.disconnect();
});

// We keep the DB clear before each top-level test
beforeEach(async () => {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(env.MONGO_URI);
  }
  if (mongoose.connection.db) {
    await mongoose.connection.db.dropDatabase();
  }
});

test('Feature: Department Management', async (t) => {
  await t.test('Create and List Departments', async () => {
    const admin = await UserModel.create({
      email: 'admin@example.com',
      displayName: 'Admin User',
      role: 'admin',
    });
    const adminCookie = createSessionCookie(admin);

    // Create
    const resCreate = await request(app)
      .post('/api/v1/departments')
      .set('Cookie', [adminCookie])
      .send({ name: 'Engineering' });
    assert.equal(resCreate.status, 201);

    // List
    const resList = await request(app)
      .get('/api/v1/departments')
      .set('Cookie', [adminCookie]);
    assert.equal(resList.status, 200);
    assert.ok(resList.body.some((d: any) => d.name === 'Engineering'));
  });
});

test('Feature: Folder Organization', async (t) => {
  await t.test('Full Folder Lifecycle', async () => {
    const admin = await UserModel.create({
      email: 'admin@example.com',
      displayName: 'Admin User',
      role: 'admin',
    });
    const adminCookie = createSessionCookie(admin);
    
    let rootFolderId: string;

    // 1. Create Root
    const resRoot = await request(app)
      .post('/api/v1/folders')
      .set('Cookie', [adminCookie])
      .send({ name: 'Engineering', department: 'Engineering' });
    
    assert.equal(resRoot.status, 201);
    rootFolderId = resRoot.body._id;

    // 2. Create Nested
    const resNested = await request(app)
      .post('/api/v1/folders')
      .set('Cookie', [adminCookie])
      .send({ name: 'Docs', parentFolder: rootFolderId, department: 'Engineering' });
    assert.equal(resNested.status, 201);

    // 3. List Tree
    const resList = await request(app)
      .get('/api/v1/folders?all=true')
      .set('Cookie', [adminCookie]);
    
    assert.equal(resList.status, 200);
    const root = resList.body.find((f: any) => f.name === 'Engineering');
    const child = resList.body.find((f: any) => f.name === 'Docs');
    
    assert.ok(root, 'Root folder should exist');
    assert.ok(child, 'Child folder should exist');
    assert.equal(child.parentFolder, root._id);
  });
});

test('Feature: File Management & Security', async (t) => {
  await t.test('Upload and Visibility', async () => {
    const admin = await UserModel.create({
      email: 'admin@example.com',
      displayName: 'Admin User',
      role: 'admin',
    });
    const user = await UserModel.create({
      email: 'user@example.com',
      displayName: 'Standard User',
      role: 'user',
    });

    const adminCookie = createSessionCookie(admin);
    const userCookie = createSessionCookie(user);

    const folder = await FolderModel.create({
      name: 'Public Docs',
      createdBy: admin._id,
      department: 'General'
    });

    // 1. Upload File
    const buffer = Buffer.from('dummy content');
    const resUpload = await request(app)
      .post('/api/v1/files') // Fixed URL
      .set('Cookie', [userCookie])
      .field('department', 'General')
      .field('folder', folder._id.toString())
      .attach('file', buffer, 'test.txt');

    assert.equal(resUpload.status, 201);
    assert.equal(resUpload.body.originalName, 'test.txt');

    // 2. Create Admin Only File (Direct DB for speed)
    await FileModel.create({
      originalName: 'secret.txt',
      storedName: 'secret.txt',
      mimeType: 'text/plain',
      size: 100,
      uploadedBy: admin._id,
      department: 'General',
      folder: folder._id, // Must be in the same folder to be tested
      isAdminOnly: true
    });

    // 3. User Check
    const userRes = await request(app)
      .get(`/api/v1/files?folder=${folder._id}`)
      .set('Cookie', [userCookie]);
    
    assert.ok(userRes.body.some((f: any) => f.originalName === 'test.txt'));
    assert.ok(!userRes.body.some((f: any) => f.originalName === 'secret.txt'), 'User should not see secret file');

    // 4. Admin Check
    const adminRes = await request(app)
      .get(`/api/v1/files?folder=${folder._id}`)
      .set('Cookie', [adminCookie]);
    
    assert.ok(adminRes.body.some((f: any) => f.originalName === 'test.txt'));
    assert.ok(adminRes.body.some((f: any) => f.originalName === 'secret.txt'), 'Admin should see secret file');
  });
});
