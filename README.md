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

### Backend

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

Recent backend additions include workspace-domain aware provisioning with a seeded default Sales Pipeline, and SMTP settings that can be stored per workspace with environment-based fallbacks for email delivery and verification.

## Architecture

Orbit CRM uses a two-app architecture:

- **Frontend**: Next.js App Router UI with route-based pages and client-side data access through API helpers.
- **Backend**: NestJS REST API with feature modules, auth integration, Prisma ORM, and BullMQ workers.
- **Database**: PostgreSQL for persistent CRM data.
- **Queue / cache**: Redis for BullMQ job processing.
- **Storage**: AWS S3 for attachments and uploaded files.
- **Email**: Nodemailer with SMTP for transactional email and workspace-specific SMTP configuration.
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
SMTP_FROM_EMAIL="your-email@gmail.com"
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
- `npm run test` — run the backend test suite
- `npm run test:watch` — run tests in watch mode
- `npm run test:cov` — run tests with coverage output

### Frontend

From [`frontend/package.json`](frontend/package.json):

- `npm run dev` — start the Next.js development server
- `npm run build` — create a production build
- `npm run start` — start the production frontend server
- `npm run lint` — run ESLint checks

## API surface

The backend is organized around controller-based REST modules. Primary areas include:

- authentication and user/session handling
- workspaces and workspace membership management
- people, companies, opportunities, tasks, notes, and activities CRUD flows
- dashboards, reports, and search
- attachments and upload URL generation
- settings, including profile updates and SMTP configuration
- AI and event orchestration endpoints

Workspace creation now seeds a default Sales Pipeline with standard stages (`Lead`, `Qualified`, `Proposal`, `Negotiation`, `Won`, `Lost`) so new workspaces have a usable pipeline immediately.

SMTP settings can be retrieved, stored, and tested per workspace. If a workspace does not have SMTP configured, the backend falls back to environment-based SMTP settings via [`backend/src/modules/settings/email.service.ts`](backend/src/modules/settings/email.service.ts).

## Background processing

Background jobs are wired through BullMQ in [`backend/src/app.module.ts`](backend/src/app.module.ts) and executed from [`backend/src/worker.ts`](backend/src/worker.ts). The queue infrastructure supports asynchronous workflows such as people imports and other longer-running tasks.

## Related docs

- [`backend/.env.example`](backend/.env.example)
- [`frontend/.env.example`](frontend/.env.example)
- [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma)
- [`backend/src/modules/workspaces/workspaces.service.ts`](backend/src/modules/workspaces/workspaces.service.ts)
- [`backend/src/modules/settings/email.service.ts`](backend/src/modules/settings/email.service.ts)
