import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../app';
import { connectTestDb, clearDb, disconnectTestDb } from './helpers/db';

const app = createApp();

before(connectTestDb);
after(disconnectTestDb);
beforeEach(clearDb);

test('GitHub OAuth: start redirects to GitHub when configured or error when disabled', async () => {
  const res = await request(app).get('/api/v1/auth/github');

  assert.equal(res.status, 302);
  const location = res.headers.location ?? '';
  assert.ok(location.length > 0);

  if (location.includes('github.com/login/oauth/authorize')) {
    assert.ok(location.includes('client_id='));
    assert.ok(location.includes('redirect_uri='));
  } else {
    assert.ok(location.includes('error=GITHUB_NOT_CONFIGURED'));
  }
});

test('GitHub OAuth: callback rejects invalid state', async () => {
  const res = await request(app)
    .get('/api/v1/auth/github/callback')
    .query({ code: 'abc', state: 'bad' });

  assert.equal(res.status, 302);
  assert.ok(res.headers.location?.includes('error=OAUTH_STATE_INVALID'));
});
