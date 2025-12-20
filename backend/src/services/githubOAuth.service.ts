import { env } from '../config/env';
import { AppError } from '../errors/AppError';

const GH_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
const GH_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GH_API_BASE = 'https://api.github.com';

type TokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type GithubUser = {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
};

type GithubEmail = {
  email: string;
  primary: boolean;
  verified: boolean;
  visibility: 'public' | 'private' | null;
};

export function isGithubConfigured(): boolean {
  return Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET);
}

export function buildGithubAuthorizeUrl(state: string): string {
  if (!env.GITHUB_CLIENT_ID) {
    throw new AppError(501, 'GITHUB_NOT_CONFIGURED', 'GitHub login is not configured.');
  }

  const url = new URL(GH_AUTHORIZE_URL);
  url.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  url.searchParams.set('redirect_uri', env.GITHUB_CALLBACK_URL);
  url.searchParams.set('scope', env.GITHUB_SCOPES);
  url.searchParams.set('state', state);
  return url.toString();
}

export async function exchangeGithubCodeForToken(code: string): Promise<string> {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    throw new AppError(501, 'GITHUB_NOT_CONFIGURED', 'GitHub login is not configured.');
  }

  const body = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    client_secret: env.GITHUB_CLIENT_SECRET,
    code,
    redirect_uri: env.GITHUB_CALLBACK_URL,
  });

  const res = await fetch(GH_TOKEN_URL, {
    method: 'POST',
    headers: { Accept: 'application/json' },
    body,
  });

  const data = (await res.json()) as TokenResponse;

  if (!res.ok || !data.access_token) {
    throw new AppError(
      401,
      'GITHUB_TOKEN_EXCHANGE_FAILED',
      data.error_description ?? 'Failed to exchange GitHub code for token.'
    );
  }

  return data.access_token;
}

async function githubApiGet<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${GH_API_BASE}${path}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'User-Agent': 'taskflow-dev',
    },
  });

  const data = (await res.json()) as T;
  if (!res.ok) {
    throw new AppError(401, 'GITHUB_API_FAILED', 'Failed to fetch GitHub profile.');
  }
  return data;
}

export async function fetchGithubUser(token: string): Promise<GithubUser> {
  return githubApiGet<GithubUser>('/user', token);
}

export async function fetchGithubPrimaryVerifiedEmail(token: string): Promise<string | null> {
  const emails = await githubApiGet<GithubEmail[]>('/user/emails', token);

  const primary = emails.find((e) => e.primary && e.verified);
  if (primary?.email) return primary.email;

  const anyVerified = emails.find((e) => e.verified);
  return anyVerified?.email ?? null;
}
