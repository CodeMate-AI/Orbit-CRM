# Orbit CRM

Orbit CRM is an AI-native, self-hostable customer relationship management platform for modern startups, small teams, and independent operators. It combines contact and company management, deal tracking, tasks, notes, reporting, automation, file attachments, and an AI assistant in a responsive interface built for mobile, tablet, and desktop.

## Table of contents

- [Overview](#overview)
- [Key features](#key-features)
- [Product goals](#product-goals)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Repository structure](#repository-structure)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Available scripts](#available-scripts)
- [API surface](#api-surface)
- [Self-hosting](#self-hosting)
- [Deployment notes](#deployment-notes)
- [Common workflows](#common-workflows)
- [Project conventions](#project-conventions)
- [License](#license)

## Overview

Orbit CRM is split into two standalone applications:

- `frontend/` — Next.js application for the user interface
- `backend/` — NestJS API server, background worker, and Prisma data layer

The product is designed around a clean CRM experience with a strong emphasis on speed, usability, and responsive layouts. It supports workspace-based collaboration, authenticated access, and a set of core sales and operations workflows.

## Key features

### CRM core

- Contact management
- Company management
- Opportunity / deal tracking
- Task management
- Notes and activity history
- Search across CRM data
- Reports and dashboard analytics
- Tags and custom fields
- Attachments and media upload support

### Collaboration and automation

- Workspace membership and invites
- Role-based workspace collaboration
- Workflow automation engine
- Event-driven processing
- Background jobs via BullMQ
- CSV import flow for people records

### AI and communications

- AI chat assistant
- Settings for email delivery
- SMTP configuration for transactional email
- OpenRouter integration hooks for AI features

### Authentication and security

- Email + password authentication through Better Auth
- Invite-aware sign-in and sign-up flows
- Global backend validation and CORS configuration
- Health endpoint for uptime checks

### Responsive experience

- Mobile-first layouts
- Tablet and desktop-friendly navigation
- Adaptive dashboard, forms, and workspace shell

## Product goals

Orbit CRM focuses on a small set of practical goals:

1. Provide a working CRM for contacts, companies, deals, tasks, and notes.
2. Offer table and Kanban-style workflows where relevant.
3. Support secure email/password authentication.
4. Enable lightweight workflow automation.
5. Include an AI assistant for productivity help.
6. Present dashboard metrics for day-to-day visibility.
7. Remain fully responsive across mobile, iPad, and desktop screens.
8. Stay self-hostable with a simple Docker-based deployment path.

## Architecture

Orbit CRM uses a two-app architecture:

- **Frontend**: Next.js App Router UI with client-side interaction, layout shells, and route-based pages.
- **Backend**: NestJS API server with modular feature domains, Prisma ORM, BullMQ workers, and auth handling.
- **Database**: PostgreSQL for persistent application data.
- **Queue / cache**: Redis for background processing and job queues.
- **Storage**: AWS S3 for attachments.
- **Email**: Nodemailer with SMTP.

### Runtime flow

1. The frontend renders the CRM experience and handles auth-aware navigation.
2. The backend exposes `/api/*` routes and the Better Auth endpoint.
3. Prisma manages the schema and migrations.
4. BullMQ processes asynchronous jobs such as imports and workflow tasks.
5. PostgreSQL stores CRM data, Redis supports queued jobs, and S3 stores files.

### Backend bootstrap behavior

The NestJS server:

- Parses JSON and URL-encoded bodies while preserving the auth request stream
- Exposes the API under the `/api` prefix
- Enables CORS with credentials
- Applies global validation pipes
- Listens on port `4000` by default

## Tech stack

### Frontend

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- shadcn-style UI components
- Zustand for client state
- Framer Motion for motion effects
- Recharts for charts
- Lucide React icons

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
- GraphQL packages are present in the backend dependency set, but the exposed application surface in this repository is controller-based REST.

## Repository structure

```text
c:\Users\biswa\Desktop\Orbit CRM/
├── frontend/                # Standalone Next.js 16 frontend application
│   ├── app/                 # Next.js App Router pages and routes
│   │   ├── automations/     # Workflow management UI
│   │   ├── companies/       # Company management list & details
│   │   ├── contacts/        # Contact (people) management list & details
│   │   ├── dashboard/       # Core analytics & charts
│   │   ├── deals/           # Kanban board deal pipeline
│   │   ├── settings/        # SMTP & profile settings
│   │   ├── signin/ / signup/# Authentication pages
│   │   └── tasks/           # Workspace task board
│   ├── components/          # Reusable UI component modules (shadcn/ui-based)
│   ├── hooks/               # Workspace event hooks & utility hooks
│   ├── lib/                 # API wrapper functions (contacts, companies, tasks, etc.)
│   └── package.json         # Frontend dependencies and run scripts
│
└── backend/                 # Standalone NestJS backend application
    ├── src/                 # Application source code
    │   ├── main.ts          # Gateway entry point and CORS/Prefix setups
    │   ├── app.module.ts    # Central NestJS AppModule
    │   ├── prisma.ts        # Prisma Client provider
    │   ├── worker.ts        # BullMQ background job processor
    │   ├── common/          # Custom decorators, guards, and middleware
    │   └── modules/         # Modular feature domains
    │       ├── auth/        # Better Auth integration
    │       ├── people/      # Contact (Person) management endpoints & CSV imports
    │       ├── companies/   # Company CRUD endpoints
    │       ├── opportunities/# Deal tracking & stage updates
    │       ├── tasks/       # Task manager endpoints
    │       ├── workflows/   # Custom trigger-action automation engine
    │       ├── ai/          # OpenRouter LLM agent with tools
    │       ├── settings/    # Workspace settings & SMTP configs
    │       └── dashboard/   # Analytics query controllers
    ├── prisma/
    │   └── schema.prisma    # Primary database schema definition
    └── package.json         # Backend dependencies & scripts

```

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

- `backend/.env` from `backend/.env.example`
- `frontend/.env.local` from `frontend/.env.example`

### Prepare the database

From the backend directory:

```bash
cd backend
npx prisma generate
npx prisma migrate deploy
```

For local development, you may use the Prisma migration workflow that matches your environment setup.

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
SMTP_FROM_NAME=Orbit CRM
SMTP_FROM_EMAIL=noreply@orbitcrm.com
OPENROUTER_API_KEY=
OPENROUTER_MODEL=
```

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_BETTER_AUTH_URL=/api/auth
```

## Available scripts

### Backend

From `backend/package.json`:

- `npm run build` — build the NestJS app
- `npm run start` — run the server once
- `npm run start:dev` — run the server in watch mode
- `npm run start:prod` — start the compiled app from `dist/`
- `npm run worker` — run the worker entrypoint
- `npm run prisma:generate` — generate Prisma client types

### Frontend

From `frontend/package.json`:

- `npm run dev` — start the Next.js dev server with Turbopack
- `npm run build` — build the production frontend
- `npm run start` — start the production frontend

## API surface

The backend is organized into feature modules under `backend/src/modules/`.

### Exposed controller areas

- `GET /api/healthz` — health endpoint
- `/api/auth` — Better Auth integration
- `/api/activities` — activity stream and logging
- `/api/ai/chat` — AI assistant chat
- `/api/attachments` — attachment upload helpers
- `/api/companies` — companies CRUD
- `/api/contacts` — contacts module
- `/api/custom-fields` — custom field definitions and values
- `/api/dashboard` — dashboard stats
- `/api/events` — event stream / event handling
- `/api/notes` — notes CRUD
- `/api/opportunities` — deals / opportunities
- `/api/people` — people records and import flow
- `/api/reports` — reporting data
- `/api/search` — global search
- `/api/settings` — workspace settings and SMTP configuration
- `/api/tags` — tagging
- `/api/tasks` — task management
- `/api/workflows` — workflow definitions and execution
- `/api/workspaces` — workspace membership and invitations

### Background processing

- BullMQ is configured in the backend root module.
- The people import flow registers a dedicated `people-import` queue.
- The backend also includes a worker entrypoint at `backend/src/worker.ts`.

## Self-hosting

Full Docker Compose self-hosting guidance is documented in [`SELF_HOSTING.md`](SELF_HOSTING.md).

That guide covers:

- Required host prerequisites
- Root `.env` configuration
- Docker Compose launch steps
- Migrations and update flow
- Backup and restore commands
- Render deployment notes for a single-service container build

## Deployment notes

### Frontend hosting

The frontend is compatible with standard Next.js hosting workflows. In production, the app is configured to call the backend through `/api`-style URLs.

### Backend hosting

The backend supports containerized deployment and listens on a configurable `PORT` value. Render, Railway, or another Docker-capable host can run it alongside PostgreSQL and Redis.

### Production environment checklist

Set the following before deploying:

- `DATABASE_URL`
- `REDIS_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_TRUSTED_ORIGINS`
- `AWS_*` values for file storage
- `SMTP_*` values for email
- `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` if AI features are enabled

## Common workflows

### Sign in and onboarding

- New users sign up with email and password.
- Invite-aware auth flows preserve invitation tokens through sign-in and sign-up.
- After authentication, users can move into onboarding or invitation acceptance flows.

### Workspace usage

- The app shell loads the current session and workspace context.
- Navigation includes dashboard, reports, contacts, companies, deals, tasks, automations, and settings.
- The AI assistant and search are available from the workspace shell.

### Dashboard usage

- The dashboard displays analytics for a selectable time range.
- Tasks can be toggled complete from the overview.
- Charting uses Recharts for visual summaries.

### Data import

- The people module includes import DTOs and a queue-driven processor.
- CSV-based imports can be validated before execution.

## Project conventions

- TypeScript is used across the frontend and backend.
- NestJS feature modules keep domain logic separated.
- Prisma owns the schema and migration history.
- The frontend uses route groups and reusable components for layout composition.
- Responsive behavior is expected across all major screens.

## License

No license has been specified in the repository.
