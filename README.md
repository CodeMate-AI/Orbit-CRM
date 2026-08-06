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
│   │   └── main.ts           # API bootstrap
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
- leads list and detail pages
- companies list and detail pages
- deals pipeline and deal detail pages
- tasks table list
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

The root module is defined in [`backend/src/app.module.ts`](backend/src/app.module.ts). The API entrypoint is [`backend/src/main.ts`](backend/src/main.ts).

Recent backend additions include workspace-domain aware provisioning with a seeded default Sales Pipeline, and SMTP settings that can be stored per workspace with environment-based fallbacks for email delivery and verification.

## Architecture

Orbit CRM uses a two-app architecture:

- **Frontend**: Next.js App Router UI with route-based pages and client-side data access through API helpers.
- **Backend**: NestJS REST API with feature modules, auth integration, and Prisma ORM.
- **Database**: PostgreSQL for persistent CRM data.
- **Storage**: Cloudinary for attachments and uploaded files.
- **Email**: Brevo SMTP (via Nodemailer driver) for transactional email and workspace-specific SMTP configurations.
- **AI**: OpenRouter-backed integration hooks.

### Runtime flow

1. The frontend renders the shell and loads the current session.
2. Auth-aware routes redirect users into sign-in, sign-up, or onboarding flows when needed.
3. The frontend fetches CRM data from the backend REST API.
4. The backend resolves workspace context and reads or writes data through Prisma.
5. PostgreSQL stores CRM records, and Cloudinary stores uploaded files.

## Tech stack

### Frontend

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- shadcn-style UI components
- Framer Motion
- Recharts
- Lucide React icons
- DnD Kit

### Backend

- NestJS 11
- Prisma
- PostgreSQL
- Better Auth
- Class Validator / Class Transformer
- Nodemailer (Brevo SMTP driver)
- Cloudinary
- OpenRouter integration hooks

## Getting started

### Prerequisites

- Node.js 22 LTS
- npm 10+
- PostgreSQL

Optional, depending on feature usage:

- Cloudinary credentials for attachments
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
BETTER_AUTH_SECRET=generate-a-random-32-char-string-for-dev-use
BETTER_AUTH_URL=http://localhost:4000/api/auth
BETTER_AUTH_TRUSTED_ORIGINS=http://localhost:3000,http://localhost:3001
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=2525
SMTP_USER=your-login@smtp-brevo.com
SMTP_PASSWORD=your-smtp-key
SMTP_PASS=your-smtp-key
SMTP_FROM_NAME="Orbit CRM"
SMTP_FROM_EMAIL=your-verified-email@domain.com
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

### Frontend

From [`frontend/package.json`](frontend/package.json):

- `npm run dev` — start the Next.js development server
- `npm run build` — create a production build
- `npm run start` — start the production frontend server

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

### Revenue Forecast Calculation

The **Revenue Forecast** widget aggregates future expected revenue by month. Rather than simply summing up the total value of all deals, Orbit CRM uses a **Weighted Pipeline Forecasting Model** to calculate a realistic projection.

#### 1. The Forecasting Formula
For each opportunity (deal), the platform computes its **Expected Value**:

$$\text{Expected Value} = \text{Deal Amount} \times \left( \frac{\text{Probability}}{100} \right)$$

* **Deal Amount**: The total financial value of the deal.
* **Probability**: The estimated percentage chance of winning the deal:
  1. **Custom Deal Probability**: If you manually set a custom probability on a deal, that specific percentage is used.
  2. **Pipeline Stage Fallback**: If no custom probability is set on the deal, the system falls back to the default probability of the deal's active pipeline stage (e.g. *Proposal* = 50%, *Negotiation* = 75%).
  3. **Fallback Default**: If both are missing, it defaults to 100%.

#### 2. Default Pipeline Stages & Probabilities
When a workspace is created, it is seeded with a default Sales Pipeline containing the following stages:

| Stage Name | Position | Default Probability | Description / Status |
| :--- | :--- | :--- | :--- |
| **Lead** | 0 | **10%** | New opportunity from forms, events, or inquiries |
| **Qualified** | 1 | **25%** | Initial contact established and requirements verified |
| **Proposal** | 2 | **50%** | Proposal, quote, or demo presented to prospect |
| **Negotiation** | 3 | **75%** | Under review, contract terms being finalized |
| **Won** | 4 | **100%** | Deal closed successfully and contract signed |
| **Lost** | 5 | **0%** | Deal lost or cancelled (revenue forecast is ₹0) |

#### 3. Practical Example
Suppose you have three deals closing in August 2026:
* **Deal A**: Value of ₹10,00,000, in *Proposal* stage (50% default probability).
  $$\text{Expected Value} = \text{₹10,00,000} \times 0.50 = \text{₹5,00,000}$$
* **Deal B**: Value of ₹20,00,000, in *Negotiation* stage (75% default probability).
  $$\text{Expected Value} = \text{₹20,00,000} \times 0.75 = \text{₹15,00,000}$$
* **Deal C**: Value of ₹5,00,000, in *Lost* stage (0% default probability).
  $$\text{Expected Value} = \text{₹5,00,000} \times 0.00 = \text{₹0}$$

**August 2026 Forecast Sum**:
$$\text{Total Forecast} = \text{₹5,00,000} + \text{₹15,00,000} + \text{₹0} = \text{₹20,00,000}$$

#### 4. Filtering and Inclusion Criteria
To ensure data accuracy, the database query filters deals based on:
* **Deletion Status**: Deleted opportunities (`deletedAt IS NOT NULL`) are excluded.
* **Date Range**: Only deals with a valid close date (`closeDate`) falling within the selected time window (e.g., *This Quarter* or *This Year*) are counted.
* **Monthly Grouping**: Expected values are grouped and sorted chronologically by month (`date_trunc('month', closeDate)`).

## Related docs

- [`backend/.env.example`](backend/.env.example)
- [`frontend/.env.example`](frontend/.env.example)
- [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma)
- [`backend/src/modules/workspaces/workspaces.service.ts`](backend/src/modules/workspaces/workspaces.service.ts)
- [`backend/src/modules/settings/email.service.ts`](backend/src/modules/settings/email.service.ts)


In NestJS, the three core building blocks serve the following purposes:

1. Controllers: Handle incoming HTTP requests, map routes/endpoints, parse payloads, and return responses back to the client.

2. Services: Contain the core business logic, database queries (via ORMs like Prisma), and 
internal processing rules.

3. Modules: Act as organizers that group related controllers and services together, managing dependency injection boundaries and exports.