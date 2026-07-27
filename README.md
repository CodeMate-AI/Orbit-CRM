# Orbit CRM

Orbit CRM is an AI-native customer relationship management platform for startups, small teams, and independent operators. The repository is split into two standalone applications:

- [`frontend/`](frontend)
- [`backend/`](backend)

The product covers contacts, companies, deals, tasks, notes, activities, attachments, search, reporting, workspace management, authentication, and an AI assistant. The UI is designed to stay responsive across mobile, tablet, and desktop layouts.

## Contents

- [Overview](#overview)
- [Repository structure](#repository-structure)
- [Core product areas](#core-product-areas)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Available scripts](#available-scripts)
- [API surface](#api-surface)
- [Background processing](#background-processing)
- [Related docs](#related-docs)

## Overview

Orbit CRM combines a Next.js frontend with a NestJS backend and Prisma data layer. The backend handles authentication, CRM CRUD operations, workspace membership, background jobs, uploads, settings, and orchestration around business workflows. The frontend provides the primary UI for dashboards, records, detail views, onboarding, sign-in, sign-up, and invitation acceptance.

## Repository structure

```text
Orbit CRM/
├── frontend/                 # Next.js app router frontend
│   ├── app/                  # Route pages and layouts
│   ├── components/           # Reusable UI and feature components
│   ├── hooks/                # Client-side hooks
│   ├── lib/                  # API helpers and client utilities
│   └── package.json          # Frontend scripts and dependencies
├── backend/                  # NestJS API, Prisma, and worker entrypoints
│   ├── src/                  # Application source code
│   │   ├── modules/          # Feature modules
│   │   ├── common/           # Shared utilities
│   │   ├── app.module.ts     # Root Nest module
│   │   ├── main.ts           # API bootstrap
│   │   └── worker.ts         # BullMQ worker entrypoint
│   ├── prisma/               # Prisma schema and migrations
│   └── package.json          # Backend scripts and dependencies
├── README.md
└── Dockerfile                # Root container build for full-stack deployment
```

## Core product areas

### Frontend

The frontend under [`frontend/app/`](frontend/app/) includes:

- marketing homepage
- dashboard
- contacts list and detail pages
- companies list and detail pages
- deals pipeline and deal detail pages
- tasks board
- reports
- settings
- sign-in and sign-up flows
- invitation acceptance flow
- onboarding flow

Shared UI components live in [`frontend/components/`](frontend/components/) and the application uses reusable route shells, dialogs, drawers, and responsive layouts throughout.


### Backend updated 

The backend under [`backend/src/modules/`](backend/src/modules/) is organized into feature modules:

- activities
- ai
- attachments
- auth
- companies
- dashboard
- events
- health
- notes
- opportunities
- people
- reports
- search
- settings
- tasks
- workspaces

The root module is defined in [`backend/src/app.module.ts`](backend/src/app.module.ts). The API entrypoint is [`backend/src/main.ts`](backend/src/main.ts), and background work is handled from [`backend/src/worker.ts`](backend/src/worker.ts).

## Architecture

Orbit CRM uses a two-app architecture:

- **Frontend**: Next.js App Router UI with route-based pages and client-side data access through API helpers.
- **Backend**: NestJS REST API with feature modules, auth integration, Prisma ORM, and BullMQ workers.
- **Database**: PostgreSQL for persistent CRM data.
- **Queue / cache**: Redis for BullMQ job processing.
- **Storage**: AWS S3 for attachments and uploaded files.
- **Email**: Nodemailer with SMTP for transactional email.
- **AI**: OpenRouter-backed integration hooks.

### Runtime flow

1. The frontend renders the shell and loads the current session.
2. Auth-aware routes redirect users into sign-in, sign-up, or onboarding flows when needed.
3. The frontend fetches CRM data from the backend REST API.
4. The backend resolves workspace context and reads or writes data through Prisma.
5. BullMQ processes asynchronous jobs such as people imports and related background work.
6. PostgreSQL stores CRM records, Redis supports queues, and S3 stores uploaded files.

## Tech stack

### Frontend

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- shadcn-style UI components
- Zustand
- Framer Motion
- Recharts
- Lucide React icons
- DnD Kit

### Backend

- NestJS 11
- Prisma
- PostgreSQL
- Redis
- BullMQ
- Better Auth
- Class Validator / Class Transformer
- Nodemailer
- AWS SDK for S3
- OpenRouter integration hooks

> Note: The backend dependency set includes GraphQL packages, but the application surface in this repository is controller-based REST.

## Getting started

### Prerequisites

- Node.js 22 LTS
- npm 10+
- PostgreSQL
- Redis

Optional, depending on feature usage:

- AWS S3 credentials for attachments
- SMTP credentials for email delivery
- OpenRouter API key for AI features

### Install dependencies

Install dependencies for both applications separately:

```bash
cd backend
npm install

cd ../frontend
npm install
```

### Configure environment variables

Create local environment files from the examples:

- [`backend/.env.example`](backend/.env.example) → `backend/.env`
- [`frontend/.env.example`](frontend/.env.example) → `frontend/.env.local`

### Prepare the database

From the backend directory:

```bash
cd backend
npx prisma generate
npx prisma migrate deploy
```

For local development, use the Prisma migration workflow that matches your environment setup.

### Run the apps

In one terminal, start the backend:

```bash
cd backend
npm run start:dev
```

In another terminal, start the frontend:

```bash
cd frontend
npm run dev
```

### Local URLs

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:4000/api`

## Environment variables

### Backend (`backend/.env`)

```env
PORT=4000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/orbit_crm
REDIS_URL=rediss://default:YOUR_UPSTASH_PASSWORD@your-db-id.upstash.io:6379
WORKFLOW_QUEUE_NAME=workflow-jobs
BETTER_AUTH_SECRET=generate-a-random-32-char-string-for-dev-use
BETTER_AUTH_URL=http://localhost:4000/api/auth
BETTER_AUTH_TRUSTED_ORIGINS=http://localhost:3000,http://localhost:3001
AWS_REGION=ap-southeast-2
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_BUCKET_NAME=orbit-crm
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_PASS=your-app-password
SMTP_FROM_NAME="Orbit CRM"
SMTP_FROM_EMAIL="noreply@orbitcrm.com"
APP_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3000
OPENROUTER_API_KEY=
OPENROUTER_MODEL=openrouter/free
OPENROUTER_SITE_URL=http://localhost:3000
OPENROUTER_APP_TITLE="Orbit CRM"
```

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_BETTER_AUTH_URL=/api/auth
```

## Available scripts

### Backend

From [`backend/package.json`](backend/package.json):

- `npm run build` — build the NestJS app
- `npm run start` — run the server once
- `npm run start:dev` — run the server in watch mode
- `npm run start:prod` — start the compiled app from `dist/`
- `npm run worker` — run the worker entrypoint
- `npm run prisma:generate` — generate Prisma client types

### Frontend

From [`frontend/package.json`](frontend/package.json):

- `npm run dev` — start the Next.js dev server with Turbopack
- `npm run build` — build the production frontend
- `npm run start` — start the production frontend

## API surface

The backend is organized into feature modules under [`backend/src/modules/`](backend/src/modules/).

### Exposed controller areas

- `GET /api/healthz` — health endpoint
- `/api/auth` — Better Auth integration
- `/api/activities` — activity stream and logging
- `/api/ai/chat` — AI assistant chat
- `/api/attachments` — attachment upload helpers
- `/api/companies` — company CRUD
- `/api/dashboard` — dashboard stats
- `/api/events` — event stream and coordination
- `/api/notes` — notes CRUD
- `/api/opportunities` — deals and opportunities (with company & contact linking)
- `/api/people` — contacts/people records and import flow
- `/api/reports` — reporting data
- `/api/search` — global search
- `/api/settings` — workspace settings and SMTP configuration
- `/api/tasks` — task management
- `/api/workspaces` — workspace membership and invitations

## Background processing

- BullMQ is configured in the backend root module.
- The people import flow registers a dedicated queue.
- The backend includes a worker entrypoint at [`backend/src/worker.ts`](backend/src/worker.ts).
- Event modules coordinate side effects and activity logging between features.



## AI Workspace Context (End-to-End)

Here is how the AI Assistant dynamically retrieves and reasons over workspace data:

### 1. Dynamic Tool Calling (On-Demand Context)
The AI model is never handed a full raw dump of the database. Instead, `generateAssistantReply` provides:
- The system instructions.
- A list of available tool schemas (function definitions).
- The chat history.

The model analyzes the query and decides which tools to invoke. This follows the standard OpenAI-style function-calling schema over OpenRouter.

### 2. The Tool-Calling Loop
To retrieve data and answer multi-step questions, the AI runs inside a bounded execution loop:

```typescript
while (loopCount < maxLoops) { // Bounded at 5 iterations max
  1. Send chat history + available tool schemas to OpenRouter.
  2. If the model returns 'tool_calls':
     - Execute each tool query locally using Prisma (scoped strictly to active workspaceId).
     - Format and append the tool results into chat history with the role 'tool'.
     - Re-run the loop so the model can inspect the results and determine next steps.
  3. If the model returns plain content (no tool calls):
     - Return the content immediately as the assistant's final response.
}
```

> [!NOTE]
> **Deduplication Guard**: To prevent infinite execution loops caused by repeating models, we maintain a `calledTools` cache (`Set` keyed by `tool_name:arguments`). If the model generates a duplicate tool call, it is skipped. If all calls in a cycle are repeats, the loop terminates immediately.

### 3. Available System Tools (Scoped to `workspaceId`)

| Tool Name | Scope & Queries |
| :--- | :--- |
| `listWorkspacePeople` | Searches contacts by name, email, job title, phone, city, lead source, industry, or company. |
| `listWorkspaceCompanies` | Queries companies by name, domain, industry, city, employee count, or annual revenue. |
| `listWorkspaceOpportunities` | Fetches opportunity deals, including stage, amount, close date, and associated company. |
| `listWorkspaceTasks` | Lists workspace tasks by title, description, or assignee (disabled for `VIEWER` role). |
| `getWorkspaceSummary` | Generates aggregated metrics (counts, pipeline value, deal stage breakdowns, task statuses). |
| `listWorkspaceNotes` | Searches and retrieves workspace note records matching title or body substrings. |
| `listWorkspaceActivities` | Lists logged activity histories, filterable by type (NOTE, CALL, EMAIL, MEETING, etc.). |
