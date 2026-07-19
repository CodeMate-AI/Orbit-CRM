# Orbit CRM

Orbit CRM is an AI-native, self-hostable customer relationship management platform for modern startups, small teams, and independent operators. It combines contact and company management, deal tracking, tasks, notes, reporting, attachments, a workspace model, and an AI assistant in a responsive interface built for mobile, tablet, and desktop.

## Table of contents

- [Overview](#overview)
- [Product goals](#product-goals)
- [Architecture](#architecture)
- [Backend architecture](#backend-architecture)
- [Frontend architecture](#frontend-architecture)
- [Primary flows](#primary-flows)
- [Tech stack](#tech-stack)
- [Repository structure](#repository-structure)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Available scripts](#available-scripts)
- [API surface](#api-surface)
- [Background processing](#background-processing)
- [Self-hosting](#self-hosting)
- [Deployment notes](#deployment-notes)
- [Project conventions](#project-conventions)
- [License](#license)

## Overview

Orbit CRM is split into two standalone applications:

- `frontend/` — Next.js application for the user interface
- `backend/` — NestJS API server, authentication gateway, background worker, and Prisma data layer

The product is centered on a clean CRM experience with a strong emphasis on speed, usability, and responsive layouts. It supports workspace-based collaboration, authenticated access, and a set of practical sales and operations workflows.

## Product goals

Orbit CRM focuses on a small set of practical goals:

1. Provide a working CRM for contacts, companies, deals, tasks, notes, and attachments.
2. Offer clear table, detail, and Kanban-style workflows where relevant.
3. Support secure email/password authentication and invitation-based workspace access.
4. Enable lightweight automation and background processing.
5. Include an AI assistant for productivity help.
6. Present dashboard metrics and reports for day-to-day visibility.
7. Remain fully responsive across mobile, iPad, and desktop screens.
8. Stay self-hostable with a straightforward Docker-based deployment path.

## Architecture

Orbit CRM uses a two-app architecture:

- **Frontend**: Next.js App Router UI with route-based pages, workspace shell composition, and client-side data fetching through API wrappers.
- **Backend**: NestJS API server with feature modules, Prisma ORM, Better Auth integration, and BullMQ workers.
- **Database**: PostgreSQL for persistent application data.
- **Queue / cache**: Redis for background jobs and asynchronous processing.
- **Storage**: AWS S3 for attachments and uploaded files.
- **Email**: Nodemailer with SMTP for transactional mail.
- **AI**: OpenRouter-backed assistant integration hooks.

### Runtime flow

1. The frontend boots the workspace shell and loads the active session.
2. Auth-aware routes either redirect to sign-in/sign-up or continue into the app shell.
3. The frontend fetches CRM data from the backend REST API.
4. The backend validates requests, resolves workspace context, and reads/writes data through Prisma.
5. BullMQ processes asynchronous jobs such as people imports and workflow-related background work.
6. PostgreSQL stores CRM records, Redis supports queues, and S3 stores uploaded files.

## Backend architecture

The backend is organized as a NestJS application with a single root module and feature modules under `backend/src/modules/`.

### Bootstrap behavior

The NestJS entrypoint in [`backend/src/main.ts`](backend/src/main.ts) performs the following steps:

- disables the default body parser so auth requests preserve their input stream
- applies JSON and URL-encoded parsing to non-auth routes
- sets the global API prefix to `/api`
- enables CORS with credentials
- applies a global validation pipe with whitelist and transformation enabled
- listens on port `4000` by default

### Root module composition

The root application module in [`backend/src/app.module.ts`](backend/src/app.module.ts) wires together:

- BullMQ root connection
- Activities module
- AI module
- Attachments module
- Auth module
- Companies module
- Contacts module
- Dashboard module
- Events module
- Custom fields module
- Notes module
- Opportunities module
- People module
- Reports module
- Search module
- Settings module
- Tasks module
- Workspaces module
- Health controller

### Module responsibilities

| Module | Responsibility |
| --- | --- |
| [`backend/src/modules/auth/auth.module.ts`](backend/src/modules/auth/auth.module.ts) | Better Auth HTTP bridge |
| [`backend/src/modules/workspaces/workspaces.module.ts`](backend/src/modules/workspaces/workspaces.module.ts) | Workspace membership, invitations, and workspace services |
| [`backend/src/modules/people/people.module.ts`](backend/src/modules/people/people.module.ts) | People records, contact import flow, and queue processing |
| [`backend/src/modules/companies/companies.module.ts`](backend/src/modules/companies/companies.module.ts) | Company CRUD and related data access |
| [`backend/src/modules/opportunities/opportunities.module.ts`](backend/src/modules/opportunities/opportunities.module.ts) | Deal pipeline, stage movement, and related updates |
| [`backend/src/modules/tasks/tasks.module.ts`](backend/src/modules/tasks/tasks.module.ts) | Task CRUD and task status workflows |
| [`backend/src/modules/notes/notes.module.ts`](backend/src/modules/notes/notes.module.ts) | Notes attached to people, companies, and opportunities |
| [`backend/src/modules/attachments/attachments.module.ts`](backend/src/modules/attachments/attachments.module.ts) | Upload URL generation and attachment metadata |
| [`backend/src/modules/custom-fields/custom-fields.module.ts`](backend/src/modules/custom-fields/custom-fields.module.ts) | Custom field definitions and entity values |
| [`backend/src/modules/dashboard/dashboard.module.ts`](backend/src/modules/dashboard/dashboard.module.ts) | Analytics and summary statistics |
| [`backend/src/modules/reports/reports.module.ts`](backend/src/modules/reports/reports.module.ts) | Report data aggregation |
| [`backend/src/modules/search/search.module.ts`](backend/src/modules/search/search.module.ts) | Global CRM search |
| [`backend/src/modules/settings/settings.module.ts`](backend/src/modules/settings/settings.module.ts) | Workspace settings and SMTP configuration |
| [`backend/src/modules/activities/activities.module.ts`](backend/src/modules/activities/activities.module.ts) | Activity timeline and event history |
| [`backend/src/modules/events/events.module.ts`](backend/src/modules/events/events.module.ts) | Shared event publishing and event-driven coordination |
| [`backend/src/modules/ai/ai.module.ts`](backend/src/modules/ai/ai.module.ts) | AI assistant endpoints and orchestration |
| [`backend/src/modules/contacts/contacts.module.ts`](backend/src/modules/contacts/contacts.module.ts) | Contact-facing API surface used by shared flows |
| [`backend/src/modules/health/health.controller.ts`](backend/src/modules/health/health.controller.ts) | Health check endpoint |

### Data layer

Prisma owns the schema and migration history under [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma) and `backend/prisma/migrations/`.

The database layer is used to store:

- users and workspace membership
- people / contacts
- companies
- opportunities and stages
- tasks
- notes
- activities
- custom fields
- attachments metadata
- settings and email configuration
- invitation records
- import / automation support data

### Auth architecture

Authentication is handled through Better Auth and exposed by the Nest controller in [`backend/src/modules/auth/auth.controller.ts`](backend/src/modules/auth/auth.controller.ts).

The auth flow is intentionally routed through `/api/auth` so the frontend can rely on the same origin API path in development and production. The auth layer supports:

- sign-up and sign-in with email/password
- session lookup from the frontend
- invitation-aware workspace entry flows
- sign-out and profile updates from settings

## Frontend architecture

The frontend is a Next.js App Router application under [`frontend/app/`](frontend/app/).

### App shell

The root layout in [`frontend/app/layout.tsx`](frontend/app/layout.tsx) sets up:

- document metadata and social preview information
- Google fonts for the UI
- the global providers wrapper
- the default dark visual theme

The homepage in [`frontend/app/page.tsx`](frontend/app/page.tsx) composes the marketing and product story sections:

- navbar
- hero
- feature highlights
- personas
- AI section
- security section
- final call to action
- footer

### Route families

The application routes are organized around the CRM workflow:

- [`frontend/app/dashboard/page.tsx`](frontend/app/dashboard/page.tsx) — analytics overview
- [`frontend/app/contacts/page.tsx`](frontend/app/contacts/page.tsx) — contacts list and management
- [`frontend/app/contacts/[id]/page.tsx`](frontend/app/contacts/[id]/page.tsx) — contact detail view
- [`frontend/app/companies/page.tsx`](frontend/app/companies/page.tsx) — companies list and management
- [`frontend/app/companies/[id]/page.tsx`](frontend/app/companies/[id]/page.tsx) — company detail view
- [`frontend/app/deals/page.tsx`](frontend/app/deals/page.tsx) — Kanban-style deal pipeline
- [`frontend/app/deals/[id]/page.tsx`](frontend/app/deals/[id]/page.tsx) — deal detail drawer and linked contacts
- [`frontend/app/tasks/page.tsx`](frontend/app/tasks/page.tsx) — task board and task filtering
- [`frontend/app/reports/page.tsx`](frontend/app/reports/page.tsx) — reporting dashboard
- [`frontend/app/settings/page.tsx`](frontend/app/settings/page.tsx) — personal profile settings
- [`frontend/app/signin/page.tsx`](frontend/app/signin/page.tsx) — sign-in flow
- [`frontend/app/signup/page.tsx`](frontend/app/signup/page.tsx) — sign-up flow
- [`frontend/app/invite/accept/page.tsx`](frontend/app/invite/accept/page.tsx) — invitation acceptance flow
- [`frontend/app/onboarding/page.tsx`](frontend/app/onboarding/page.tsx) — onboarding flow

### UI behavior

The frontend emphasizes:

- responsive layouts for mobile, tablet, and desktop
- reusable shell components
- client-side interactivity for editing, drawers, and modals
- API wrapper modules in [`frontend/lib/`](frontend/lib/) for typed data access
- shared UI primitives in [`frontend/components/ui/`](frontend/components/ui/)
- drag-and-drop and charting where the workflow benefits from it

## Primary flows

### 1. Authentication and session flow

1. A user opens the app and lands on the marketing homepage or an authenticated route.
2. The frontend checks the current session through Better Auth.
3. If the user is not authenticated, they are redirected to sign in or sign up.
4. Invitation tokens are preserved during the auth flow so invited users can join the correct workspace.
5. After authentication, the workspace shell loads and the app routes become available.

### 2. Invitation acceptance flow

1. An admin sends a workspace invitation.
2. The recipient opens the invitation link in [`frontend/app/invite/accept/page.tsx`](frontend/app/invite/accept/page.tsx).
3. The frontend verifies the token and compares the invitation email with the active session email.
4. If no session exists, the user is routed to sign up or sign in with the invitation context preserved.
5. If the session email does not match, the app signs the user out and redirects to the correct login path.
6. Once accepted, the user joins the workspace and lands in the CRM shell.

### 3. Workspace shell flow

1. The authenticated app loads the workspace context.
2. Navigation exposes dashboard, contacts, companies, deals, tasks, reports, and settings.
3. Shared widgets such as search and the AI assistant remain available from the shell.
4. Page-level data is fetched from the backend through the route-specific API wrapper modules.

### 4. Contact management flow

1. The contacts page loads a workspace-wide contact list.
2. Users can create, edit, sort, search, export, and delete contacts.
3. A contact detail page aggregates notes, tasks, attachments, custom fields, and activity history.
4. Updates are saved through the backend API and reflected immediately in the UI.
5. CSV import support enables bulk contact creation and validation before execution.

### 5. Company management flow

1. The companies page lists organization records with search and sorting.
2. A company detail page shows related contacts, tasks, attachments, notes, activity, and custom field values.
3. Inline editing supports quick updates without leaving the detail page.
4. Notes and custom field values are saved through dedicated API calls.

### 6. Deal pipeline flow

1. The deals page loads pipeline stages and opportunity cards.
2. Deals can be created from a modal and moved between stages.
3. The pipeline view supports drag-and-drop interactions on supported devices.
4. A deal detail view exposes linked contacts, stage changes, notes, attachments, and activity history.
5. Deal updates are persisted on the backend and reloaded into the UI for consistency.

### 7. Task flow

1. The tasks page loads workspace tasks and related entities.
2. Tasks can be filtered, searched, created, edited, and marked complete.
3. Tasks may be linked to people, companies, and opportunities.
4. Task completion is reflected in the dashboard overview as part of the productivity flow.

### 8. Dashboard and reporting flow

1. The dashboard requests workspace statistics for a selected time range.
2. Metrics are rendered as cards, charts, and task lists.
3. Users can toggle task completion directly from the overview.
4. Reporting pages provide deeper views over the same workspace data.

### 9. Attachment flow

1. A page requests an upload URL from the backend.
2. The backend prepares the storage target using AWS S3 settings.
3. The frontend uploads the file and records the returned attachment metadata.
4. Attachment lists are shown on contact, company, and deal details.

### 10. AI assistant flow

1. The user opens the AI assistant panel from the workspace shell.
2. The frontend sends the prompt and context to the backend AI endpoint.
3. The backend coordinates the request using the configured AI provider.
4. The assistant response is returned to the frontend for display.

### 11. Settings and profile flow

1. The settings page loads the current authenticated user session.
2. The user can update their display name.
3. Email, timezone, and locale are shown for reference.
4. Profile updates are persisted through the auth client and reflected across the app.

### 12. Background import and event flow

1. A bulk contact import is initiated from the people workflow.
2. The backend validates the request and queues background processing.
3. BullMQ workers process the import asynchronously.
4. Shared event modules propagate downstream changes to the rest of the CRM.

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
- DnD Kit for drag-and-drop workflows

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
- GraphQL packages are present in the backend dependency set, but the exposed application surface in this repository is controller-based REST.

## Repository structure

```text
c:\Users\biswa\Desktop\Orbit CRM/
├── frontend/                # Standalone Next.js 16 frontend application
│   ├── app/                 # Next.js App Router pages and routes
│   ├── components/         # Reusable UI component modules
│   ├── lib/                 # API wrapper functions and client helpers
│   └── package.json         # Frontend dependencies and run scripts
│
└── backend/                 # Standalone NestJS backend application
    ├── src/                 # Application source code
    │   ├── main.ts          # API bootstrap, body parsing, CORS, and validation
    │   ├── app.module.ts    # Central NestJS AppModule
    │   ├── prisma.ts        # Prisma Client provider
    │   ├── worker.ts        # BullMQ background job processor
    │   ├── common/          # Shared decorators, guards, and helpers
    │   └── modules/         # Modular feature domains
    ├── prisma/              # Primary database schema and migrations
    └── package.json         # Backend dependencies and scripts
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
- `/api/companies` — companies CRUD
- `/api/contacts` — contacts module
- `/api/custom-fields` — custom field definitions and values
- `/api/dashboard` — dashboard stats
- `/api/events` — event stream and event handling
- `/api/notes` — notes CRUD
- `/api/opportunities` — deals / opportunities
- `/api/people` — people records and import flow
- `/api/reports` — reporting data
- `/api/search` — global search
- `/api/settings` — workspace settings and SMTP configuration
- `/api/tasks` — task management
- `/api/workspaces` — workspace membership and invitations

## Background processing

- BullMQ is configured in the backend root module.
- The people import flow registers a dedicated `people-import` queue.
- The backend includes a worker entrypoint at [`backend/src/worker.ts`](backend/src/worker.ts).
- Event modules coordinate side effects and activity logging between features.

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

## Project conventions

- TypeScript is used across the frontend and backend.
- NestJS feature modules keep domain logic separated.
- Prisma owns the schema and migration history.
- The frontend uses route-based pages and reusable components for layout composition.
- Responsive behavior is expected across all major screens.
- API wrapper modules in [`frontend/lib/`](frontend/lib/) isolate transport concerns from the page components.

## License

No license has been specified in the repository.
