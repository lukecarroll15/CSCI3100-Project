const rawApiBase =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:5001/api/v1';
export const apiBaseUrl = rawApiBase.replace(/\/$/, '');

const rawGithubOAuthUrl =
  (import.meta.env.VITE_GITHUB_OAUTH_URL as string | undefined) ?? `${apiBaseUrl}/auth/github`;
export const githubOAuthUrl = rawGithubOAuthUrl.replace(/\/$/, '');
