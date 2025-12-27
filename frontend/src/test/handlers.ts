import { http, HttpResponse } from 'msw';

const apiBaseUrl = process.env.VITE_API_BASE_URL ?? 'http://localhost:5001/api/v1';

export const handlers = [
  http.get(`${apiBaseUrl}/tasks`, () =>
    HttpResponse.json({
      tasks: [],
    })
  ),
  http.post(`${apiBaseUrl}/tasks`, async ({ request }) => {
    const body = (await request.json()) as {
      name: string;
      description?: string;
      priority: string;
      department: string;
      assignee: string[];
      dueDate: string;
    };
    return HttpResponse.json({
      task: {
        _id: 'task-1',
        name: body.name,
        description: body.description ?? '',
        priority: body.priority,
        department: body.department,
        assignee: body.assignee ?? [],
        dueDate: body.dueDate,
        status: 'Not Started',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'user-1',
      },
    });
  }),
  http.get(`${apiBaseUrl}/departments`, () =>
    HttpResponse.json([
      { _id: 'dept-1', name: 'General' },
      { _id: 'dept-2', name: 'Engineering' },
    ])
  ),
  http.get(`${apiBaseUrl}/teams/:teamId/members`, () =>
    HttpResponse.json({
      members: [],
    })
  ),
  http.get(`${apiBaseUrl}/files`, () => HttpResponse.json([])),
  http.get(`${apiBaseUrl}/folders`, () => HttpResponse.json([])),
  http.get(`${apiBaseUrl}/canvas`, () => HttpResponse.json({ data: null })),
  http.put(`${apiBaseUrl}/canvas`, async ({ request }) => {
    const body = (await request.json()) as { data: unknown };
    return HttpResponse.json({ data: body.data });
  }),
  http.post(`${apiBaseUrl}/auth/request-otp`, () => HttpResponse.json({ message: 'OTP sent' })),
  http.post(`${apiBaseUrl}/auth/verify-otp`, async ({ request }) => {
    const body = (await request.json()) as { email: string };
    return HttpResponse.json({
      user: {
        id: 'user-1',
        email: body.email,
        displayName: 'Test User',
        role: 'user',
        adminLevel: null,
        pendingTeamCreation: false,
      },
    });
  }),
];
