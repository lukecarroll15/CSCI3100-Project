# CSCI3100 Project (TaskFlow) — Monorepo

Jira-like web application for CSCI3100 Software Engineering.

## Tech Stack

- Frontend: React + Vite + Tailwind CSS (minimal shadcn/ui where helpful)
- Backend: Node.js + Express + TypeScript
- Database: MongoDB (local dev; hosted DB allowed for demo)

## Repository Structure

- `frontend/` — UI
- `backend/` — API server
- `docs/` — course deliverables and process evidence

## Prerequisites

- Node.js 20 (see `.nvmrc`)
- npm
- MongoDB (local) OR MongoDB Atlas connection string

Verify:

```bash
node -v
```

## Setup (first time)

```bash
git clone <your-repo-url>
cd CSCI3100-Project
npm run install:all
```

## Environment files

Backend:

```bash
cp backend/.env.example backend/.env
```

Frontend (only if your frontend requires env):

```bash
cp frontend/.env.example frontend/.env
```

Do NOT commit `.env` files.

## Run (development)

```bash
npm run dev
```

Frontend: [http://localhost:5173](http://localhost:5173)
Backend: [http://localhost:5000](http://localhost:5000)

## Build

```bash
npm run build
```

## Code style / quality

```bash
npm run format
npm run format:check
npm run lint
```

## Course deliverables

See `docs/DELIVERABLES.md` for how repo docs map to submission PDFs.
