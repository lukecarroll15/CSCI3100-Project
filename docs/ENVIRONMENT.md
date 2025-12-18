# Environment Configuration

Goal: a teammate/TA can set up and run the system from scratch.

## 1) Node version

Use Node 20 (see `.nvmrc`).

Verify:

```bash
node -v
```

## 2) Install dependencies

From repo root:

```bash
npm run install:all
```

## 3) Backend environment

```bash
cp backend/.env.example backend/.env
```

Minimum fields to check:

- `PORT` (default 5000)
- `CORS_ORIGIN` (default [http://localhost:5173](http://localhost:5173))
- `MONGO_URI`
- `SESSION_SECRET` (set a long random string)

## 4) Run (development)

```bash
npm run dev
```

Frontend: [http://localhost:5173](http://localhost:5173)
Backend: [http://localhost:5000](http://localhost:5000)

Health:

- GET [http://localhost:5000/api/health/live](http://localhost:5000/api/health/live)
- GET [http://localhost:5000/api/health/ready](http://localhost:5000/api/health/ready)

## 5) Troubleshooting

### EADDRINUSE (port 5000 already in use)

```bash
lsof -i :5000
kill -9 <PID>
```

Or change `PORT` in `backend/.env` and restart.

### Formatting fails

```bash
npm run format
npm run format:check
```
