# Orbit CRM

Orbit CRM is an AI-native customer relationship management platform designed for startups, high-growth teams, and independent operators. The project is implemented as a unified full-stack Next.js 16 App Router application backed by MongoDB Atlas and Prisma ORM 6.

* **Architecture**: Unified Next.js 16 Full-Stack Application (React 19, Tailwind CSS 4, App Router API Handlers).
* **Database**: MongoDB Atlas with Prisma ORM (`mongodb` provider).
* **Authentication**: Better Auth with MongoDB Adapter and session isolation.
* **AI Copilot**: Multi-tool agentic chat engine powered by OpenRouter (`openrouter/free`).

This document serves as the comprehensive, authoritative single source of truth for the entire Orbit CRM codebase. Every section below contains direct file paths and links to the implementing source code files for seamless navigation and maintenance.

---

## Table of Contents

1. [System Architecture and Core Entrypoints](#system-architecture-and-core-entrypoints)
2. [Tech Stack and Key Dependencies](#tech-stack-and-key-dependencies)
3. [Repository Directory Structure](#repository-directory-structure)
4. [Data Models and Database Schema](#data-models-and-database-schema)
5. [Complete API Surface and Server Services Directory](#complete-api-surface-and-server-services-directory)
6. [Frontend Routing and Component Architecture](#frontend-routing-and-component-architecture)
7. [AI Copilot Engine and Function Calling](#ai-copilot-engine-and-function-calling)
8. [Weighted Revenue Forecast Model](#weighted-revenue-forecast-model)
9. [Tab-Isolated Authentication & Token Revocation](#tab-isolated-authentication--token-revocation)
10. [Environment Variables and Configuration](#environment-variables-and-configuration)
11. [Getting Started and Local Development](#getting-started-and-local-development)
12. [Docker Container Deployment](#docker-container-deployment)

---

## System Architecture and Core Entrypoints

Orbit CRM operates as a unified full-stack application with client and server components living harmoniously:

```text
[ Browser / Client ]
        │
        ├── Next.js 16 Frontend (React 19, Tailwind CSS 4, DND Kit, Recharts)
        │       │
        │       ├── Better Auth Client: lib/auth-client.ts
        │       ├── Resilient HTTP Client: lib/api-client.ts
        │       └── SSE Client Hook: hooks/useWorkspaceEvents.ts
        │
        ▼
[ Next.js 16 App Router API Handlers ] (Port 3000)
        │  Entrypoint: app/api/*
        │
        ├── Better Auth Engine: lib/auth.ts & app/api/auth/[...all]/route.ts
        ├── Feature Services: lib/services/*
        ├── Server Session & Workspace Guards: lib/server-auth.ts
        └── AI Copilot Multi-tool Execution: lib/services/ai.ts
        │
        ├── MongoDB Atlas Database: prisma/schema.prisma & lib/prisma.ts
        ├── Cloudinary Media Storage: lib/services/attachments.ts
        ├── SMTP / Nodemailer: lib/services/email.ts
        └── OpenRouter LLM Gateway: lib/services/ai.ts
```

### Core Architecture Implementation Files

* **Database & Prisma Client**: [`lib/prisma.ts`](lib/prisma.ts) instantiates the global `PrismaClient` singleton connected to MongoDB Atlas.
* **Authentication Layer**: [`lib/auth.ts`](lib/auth.ts) configures Better Auth with the MongoDB adapter, and [`lib/server-auth.ts`](lib/server-auth.ts) provides route guards and workspace authorization helpers.
* **Frontend Root Layout**: [`app/layout.tsx`](app/layout.tsx) loads font configurations, metadata, theme providers, and the global Sonner toast manager.
* **Frontend App Shell**: [`components/AppLayout.tsx`](components/AppLayout.tsx) renders the responsive sidebar, mobile drawer, workspace selector, and global keyboard triggers.
* **Resilient HTTP Client**: [`lib/api-client.ts`](lib/api-client.ts) wraps `fetch` with a 30-second default timeout, a 120-second AI timeout, and automatic retry.

---

## Tech Stack and Key Dependencies

* **Framework**: Next.js 16.2.9 (App Router) [`next.config.ts`](next.config.ts)
* **Core Libraries**: React 19.2.4, React DOM 19.2.4, TypeScript 6.0.0 [`tsconfig.json`](tsconfig.json)
* **Styling**: Tailwind CSS 4 (`@tailwindcss/postcss`) [`app/globals.css`](app/globals.css), Lucide Icons (`lucide-react`), Framer Motion (`framer-motion`)
* **UI Primitives**: Radix UI (`radix-ui`), Base UI (`@base-ui/react`), Shadcn UI patterns [`components.json`](components.json)
* **Rich Text Editing**: Tiptap (`@tiptap/react`, `@tiptap/starter-kit`)
* **Kanban Drag and Drop**: DND Kit (`@dnd-kit/core`, `@dnd-kit/utilities`)
* **Data Visualization**: Recharts 3.8.0 (`recharts`)
* **Database ORM**: Prisma ORM 6.19.3 (`@prisma/client`, `prisma`) [`prisma/schema.prisma`](prisma/schema.prisma)
* **Database Engine**: MongoDB Atlas (`Orbit_CRM`)
* **Authentication**: Better Auth 1.6.23 (`better-auth`) with MongoDB Prisma adapter
* **File & Media Storage**: Cloudinary SDK 2.10.0 (`cloudinary`)
* **Email Delivery**: Nodemailer 9.0.3 (`nodemailer`)
* **CSV Processing**: `csv-parse` 7.0.1 (`csv-parse`)
* **AI Integration**: OpenRouter API with `openrouter/free` model

---

## Repository Directory Structure

```text
Orbit CRM/
├── app/                                        # Next.js 16 App Router pages and API routes
│   ├── (auth)/                                 # Authentication flows
│   │   ├── signin/page.tsx                     # Sign-in page
│   │   ├── signup/page.tsx                     # Sign-up page
│   │   └── onboarding/page.tsx                 # New workspace onboarding
│   ├── api/                                    # Serverless App Router API endpoints
│   │   ├── activities/route.ts                 # Activities list & creation
│   │   ├── ai/chat/sessions/                   # AI Copilot chat sessions
│   │   │   ├── route.ts                        # Session list & creation
│   │   │   └── [id]/route.ts                   # Session detail, messaging, deletion
│   │   ├── attachments/                        # Media & file attachments
│   │   │   ├── route.ts                        # List attachments
│   │   │   ├── presigned-url/route.ts          # Upload URL generation
│   │   │   └── [id]/route.ts                   # Attachment delete & download
│   │   ├── auth/                               # Better Auth & OTP recovery
│   │   │   ├── [...all]/route.ts               # Better Auth catch-all handler
│   │   │   ├── forgot-password/route.ts        # OTP password reset request
│   │   │   └── reset-password/route.ts         # OTP verification and password update
│   │   ├── companies/                          # Organizations
│   │   │   ├── route.ts                        # Company list & creation
│   │   │   └── [id]/route.ts                   # Company detail, update, delete
│   │   ├── dashboard/stats/route.ts            # Executive dashboard metrics
│   │   ├── healthz/route.ts                    # Health check probe
│   │   ├── notes/                              # Rich text notes
│   │   │   ├── route.ts                        # Notes list & creation
│   │   │   └── [id]/route.ts                   # Note update & delete
│   │   ├── opportunities/                      # Deals & pipelines
│   │   │   ├── route.ts                        # Deals list & creation
│   │   │   ├── [id]/route.ts                   # Deal detail, update, delete
│   │   │   └── [id]/contacts/                  # Associated contacts
│   │   ├── people/                             # Contacts / Leads
│   │   │   ├── route.ts                        # Contacts list & creation
│   │   │   ├── [id]/route.ts                   # Contact detail, update, delete
│   │   │   ├── export/route.ts                 # CSV export endpoint
│   │   │   └── import/                         # CSV dry-run and bulk import
│   │   ├── reports/route.ts                    # Revenue forecasting and analytics
│   │   ├── search/route.ts                     # Multi-entity global search
│   │   ├── settings/profile/route.ts           # User profile settings
│   │   ├── tasks/                              # Tasks
│   │   │   ├── route.ts                        # Task list & creation
│   │   │   └── [id]/route.ts                   # Task update & delete
│   │   └── workspaces/                         # Workspace management
│   │       ├── route.ts                        # Workspace list & creation
│   │       ├── mine/route.ts                   # Current user workspaces
│   │       ├── [id]/route.ts                   # Workspace update
│   │       ├── [id]/members/route.ts           # Member list & role management
│   │       └── [id]/invitations/route.ts       # Invitation creation & revocation
│   ├── dashboard/page.tsx                      # Executive dashboard overview
│   ├── leads/                                  # Contacts / Leads views
│   ├── companies/                              # Organizations views
│   ├── deals/                                  # Opportunities / Pipeline Kanban
│   ├── tasks/page.tsx                          # All workspace tasks
│   ├── assigned-tasks/page.tsx                 # User-assigned tasks
│   ├── reports/page.tsx                        # Forecasting & analytics visualizations
│   ├── settings/page.tsx                       # Profile, team members, invites, SMTP
│   ├── invite/accept/page.tsx                  # Invitation acceptance
│   ├── layout.tsx                              # Root layout, fonts, toast container
│   ├── page.tsx                                # Marketing landing page
│   └── globals.css                             # Tailwind CSS 4 theme tokens
├── components/                                 # Reusable UI and feature components
│   ├── ui/                                     # Base primitives (button, dialog, input, card)
│   ├── AppLayout.tsx                           # Main shell, responsive sidebar, workspace context
│   ├── AiChatDrawer.tsx                        # Slide-over AI assistant chat panel
│   ├── SearchDialog.tsx                        # Global multi-entity search modal (Cmd+K)
│   ├── ActivityTimeline.tsx                    # Record interaction and audit log list
│   ├── NoteEditor.tsx                          # Tiptap rich text editor
│   ├── CSVImportModal.tsx                      # Two-step contact CSV import modal
│   └── FileUploader.tsx                        # Cloudinary upload component
├── hooks/                                      # React custom hooks
├── lib/                                        # Services, Prisma client, and API clients
│   ├── prisma.ts                               # Prisma client singleton
│   ├── auth.ts                                 # Better Auth server configuration
│   ├── server-auth.ts                          # Server auth and workspace guards
│   ├── api-client.ts                           # Resilient HTTP request client
│   ├── auth-client.ts                          # Better Auth React client
│   └── services/                               # Core backend domain services
│       ├── activities.ts                       # Activity timeline service
│       ├── ai.ts                               # AI Copilot engine
│       ├── attachments.ts                      # Media management service
│       ├── companies.ts                        # Company domain service
│       ├── dashboard.ts                        # Dashboard metrics service
│       ├── email.ts                            # Nodemailer delivery service
│       ├── notes.ts                            # Rich text notes service
│       ├── opportunities.ts                    # Deals and stages service
│       ├── people.ts                           # Contacts and CSV import service
│       ├── reports.ts                          # Forecasting service
│       ├── search.ts                           # Global search service
│       └── workspaces.ts                       # Workspaces and invitations service
├── prisma/
│   └── schema.prisma                           # MongoDB Prisma schema
├── public/                                     # Static assets and icons
├── Dockerfile                                  # Standalone Next.js multi-stage container
├── next.config.ts                              # Next.js configuration
├── package.json                                # Project dependencies and scripts
└── tsconfig.json                               # TypeScript configuration
```

---

## Data Models and Database Schema

Database schema definition in [`prisma/schema.prisma`](prisma/schema.prisma):

```prisma
datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}
```

### Primary Collections

1. **`User`**: System user records, names, emails, credentials, and relations.
2. **`Workspace`**: Multi-tenant organizations with member rosters and configurations.
3. **`WorkspaceMember`**: Membership roles (`OWNER`, `MEMBER`) linking users and workspaces.
4. **`Pipeline` & `PipelineStage`**: Customizable sales pipelines and colored deal stages.
5. **`Company`**: B2B customer accounts, domains, employee count, and annual revenue.
6. **`Person`**: Leads and contacts linked to companies and workspace owners.
7. **`Opportunity`**: Sales deals with amounts, probabilities, close dates, and stage IDs.
8. **`OpportunityContact`**: Many-to-many link between deals and contact persons.
9. **`Task`**: Workspace tasks with statuses (`TODO`, `IN_PROGRESS`, `DONE`), priorities, and assignees.
10. **`Note`**: Rich text documents associated with leads, companies, or deals.
11. **`Activity`**: Audit logs and interaction records (`NOTE`, `EMAIL`, `CALL`, `MEETING`, etc.).
12. **`Attachment`**: Uploaded file metadata backed by Cloudinary storage.
13. **`ChatSession` & `ChatMessage`**: AI Copilot conversation threads and history.
14. **`Invitation`**: Workspace team member email invitations with expiring tokens.
15. **`PasswordResetOtp`**: 6-digit OTP verification codes for secure password resets.

---

## Complete API Surface and Server Services Directory

All API endpoints are implemented as Next.js 16 App Router Route Handlers under [`app/api/`](app/api):

| Endpoint | Method | Service / Handler | Description |
| :--- | :--- | :--- | :--- |
| `/api/healthz` | `GET` | [`app/api/healthz/route.ts`](app/api/healthz/route.ts) | Database connectivity health probe |
| `/api/auth/[...all]` | `ALL` | [`app/api/auth/[...all]/route.ts`](app/api/auth/[...all]/route.ts) | Better Auth session & auth flows |
| `/api/auth/forgot-password` | `POST` | [`app/api/auth/forgot-password/route.ts`](app/api/auth/forgot-password/route.ts) | Sends 6-digit OTP verification code |
| `/api/auth/reset-password` | `POST` | [`app/api/auth/reset-password/route.ts`](app/api/auth/reset-password/route.ts) | Verifies OTP and updates password |
| `/api/auth/token` | `POST`, `DELETE` | [`app/api/auth/token/route.ts`](app/api/auth/token/route.ts) | Issue tab-isolated Bearer token (`POST`) or revoke all tokens (`DELETE`) |
| `/api/events/stream` | `GET` | [`app/api/events/stream/route.ts`](app/api/events/stream/route.ts) | Workspace real-time Server-Sent Events (SSE) stream |
| `/api/workspaces` | `GET`, `POST` | [`app/api/workspaces/route.ts`](app/api/workspaces/route.ts) | List user workspaces or create workspace |
| `/api/workspaces/mine` | `GET` | [`app/api/workspaces/mine/route.ts`](app/api/workspaces/mine/route.ts) | List current user workspaces |
| `/api/workspaces/[id]` | `PATCH` | [`app/api/workspaces/[id]/route.ts`](app/api/workspaces/[id]/route.ts) | Update workspace details |
| `/api/workspaces/[id]/members` | `GET` | [`app/api/workspaces/[id]/members/route.ts`](app/api/workspaces/[id]/members/route.ts) | List workspace members |
| `/api/workspaces/[id]/members/[memberId]` | `PATCH`, `DELETE` | [`app/api/workspaces/[id]/members/[memberId]/route.ts`](app/api/workspaces/[id]/members/[memberId]/route.ts) | Update member role or remove member |
| `/api/workspaces/[id]/invitations` | `GET`, `POST` | [`app/api/workspaces/[id]/invitations/route.ts`](app/api/workspaces/[id]/invitations/route.ts) | List invitations or send new invite |
| `/api/workspaces/invitations/[token]` | `GET` | [`app/api/workspaces/invitations/[token]/route.ts`](app/api/workspaces/invitations/[token]/route.ts) | Retrieve invitation details |
| `/api/workspaces/invitations/[token]/accept` | `POST` | [`app/api/workspaces/invitations/[token]/accept/route.ts`](app/api/workspaces/invitations/[token]/accept/route.ts) | Accept workspace invitation |
| `/api/people` | `GET`, `POST` | [`app/api/people/route.ts`](app/api/people/route.ts) | List contacts or create contact |
| `/api/people/[id]` | `GET`, `PATCH`, `DELETE` | [`app/api/people/[id]/route.ts`](app/api/people/[id]/route.ts) | Contact detail, update, or soft-delete |
| `/api/people/export` | `GET` | [`app/api/people/export/route.ts`](app/api/people/export/route.ts) | Export contacts to CSV |
| `/api/people/import/dry-run` | `POST` | [`app/api/people/import/dry-run/route.ts`](app/api/people/import/dry-run/route.ts) | Validate CSV import batch |
| `/api/people/import` | `POST` | [`app/api/people/import/route.ts`](app/api/people/import/route.ts) | Execute bulk CSV contact import |
| `/api/companies` | `GET`, `POST` | [`app/api/companies/route.ts`](app/api/companies/route.ts) | List companies or create company |
| `/api/companies/[id]` | `GET`, `PATCH`, `DELETE` | [`app/api/companies/[id]/route.ts`](app/api/companies/[id]/route.ts) | Company detail, update, or delete |
| `/api/opportunities` | `GET`, `POST` | [`app/api/opportunities/route.ts`](app/api/opportunities/route.ts) | List pipeline deals or create deal |
| `/api/opportunities/[id]` | `GET`, `PATCH`, `DELETE` | [`app/api/opportunities/[id]/route.ts`](app/api/opportunities/[id]/route.ts) | Deal detail, stage change, or delete |
| `/api/opportunities/[id]/contacts` | `POST` | [`app/api/opportunities/[id]/contacts/route.ts`](app/api/opportunities/[id]/contacts/route.ts) | Link person to opportunity |
| `/api/opportunities/[id]/contacts/[personId]` | `DELETE` | [`app/api/opportunities/[id]/contacts/[personId]/route.ts`](app/api/opportunities/[id]/contacts/[personId]/route.ts) | Unlink contact from opportunity |
| `/api/tasks` | `GET`, `POST` | [`app/api/tasks/route.ts`](app/api/tasks/route.ts) | List workspace tasks or create task |
| `/api/tasks/[id]` | `PATCH`, `DELETE` | [`app/api/tasks/[id]/route.ts`](app/api/tasks/[id]/route.ts) | Update task status or delete task |
| `/api/notes` | `GET`, `POST` | [`app/api/notes/route.ts`](app/api/notes/route.ts) | List entity notes or create note |
| `/api/notes/[id]` | `PATCH`, `DELETE` | [`app/api/notes/[id]/route.ts`](app/api/notes/[id]/route.ts) | Update note body or delete note |
| `/api/activities` | `GET`, `POST` | [`app/api/activities/route.ts`](app/api/activities/route.ts) | List timeline activities or log activity |
| `/api/attachments` | `GET` | [`app/api/attachments/route.ts`](app/api/attachments/route.ts) | List entity attachments |
| `/api/attachments/presigned-url` | `POST` | [`app/api/attachments/presigned-url/route.ts`](app/api/attachments/presigned-url/route.ts) | Generate Cloudinary upload signature |
| `/api/attachments/[id]` | `DELETE` | [`app/api/attachments/[id]/route.ts`](app/api/attachments/[id]/route.ts) | Remove attachment from Cloudinary & DB |
| `/api/attachments/[id]/download-url` | `GET` | [`app/api/attachments/[id]/download-url/route.ts`](app/api/attachments/[id]/download-url/route.ts) | Generate signed download URL |
| `/api/dashboard/stats` | `GET` | [`app/api/dashboard/stats/route.ts`](app/api/dashboard/stats/route.ts) | Aggregated KPIs and pipeline values |
| `/api/reports` | `GET` | [`app/api/reports/route.ts`](app/api/reports/route.ts) | Forecasting and analytics metrics |
| `/api/search` | `GET` | [`app/api/search/route.ts`](app/api/search/route.ts) | Cross-entity global search |
| `/api/ai/chat/sessions` | `GET`, `POST` | [`app/api/ai/chat/sessions/route.ts`](app/api/ai/chat/sessions/route.ts) | List or create AI chat sessions |
| `/api/ai/chat/sessions/[id]` | `GET`, `POST`, `DELETE` | [`app/api/ai/chat/sessions/[id]/route.ts`](app/api/ai/chat/sessions/[id]/route.ts) | Get session, send prompt, delete session |
| `/api/settings/profile` | `PATCH` | [`app/api/settings/profile/route.ts`](app/api/settings/profile/route.ts) | Update user profile and locale |

---

## AI Copilot Engine and Function Calling

The AI Copilot engine is implemented in [`lib/services/ai.ts`](lib/services/ai.ts).

### Capabilities & Tools

1. **Context-Aware Analytics**: Queries live workspace stats, pipelines, and overdue tasks.
2. **Autonomous Tool Calling**:
   * `searchRecords`: Discovers contacts, companies, or deals by search terms.
   * `createLead`: Creates new leads with phone/email validation directly from chat prompts.
   * `createTask`: Schedules reminders and assigns tasks with priorities.
   * `summarizeEntity`: Aggregates 360-degree context for an organization or contact.
3. **Model Configuration**: Default model is `openrouter/free` configured via OpenRouter with custom system instructions and dynamic schemas.

---

## Weighted Revenue Forecast Model

Implemented in [`lib/services/reports.ts`](lib/services/reports.ts), the forecasting engine calculates monthly expected revenue:

$$\text{Expected Value} = \sum (\text{Deal Amount} \times \frac{\text{Stage Probability}}{100})$$

Aggregations are grouped by target close months across open deals in active stages.

---

## Environment Variables and Configuration

Create a `.env` (or `.env.local`) file at the root directory based on [`.env.example`](.env.example):

```env
# Database Connection (MongoDB Atlas)
DATABASE_URL="mongodb+srv://<username>:<password>@cluster0.mongodb.net/Orbit_CRM?retryWrites=true&w=majority"

# Better Auth Configuration
BETTER_AUTH_SECRET="your-32-character-secret-key"
BETTER_AUTH_URL="http://localhost:3000/api/auth"
BETTER_AUTH_TRUSTED_ORIGINS="http://localhost:3000"

# Application Endpoints
NEXT_PUBLIC_API_URL="/api"
NEXT_PUBLIC_BETTER_AUTH_URL="/api/auth"

# Google Social Sign-In (Optional)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Cloudinary Media Storage
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# SMTP / Nodemailer
EMAIL_PROVIDER="smtp"
SMTP_HOST="smtp-relay.brevo.com"
SMTP_PORT=2525
SMTP_USER=""
SMTP_PASSWORD=""
SMTP_PASS=""
SMTP_FROM_NAME="Orbit CRM"
SMTP_FROM_EMAIL="noreply@orbitcrm.com"

# AI Copilot Gateway (OpenRouter)
OPENROUTER_API_KEY="your-openrouter-key"
OPENROUTER_MODEL="openrouter/free"
```

---

---

## Tab-Isolated Authentication & Token Revocation

Orbit CRM implements strict tab-isolated authentication using browser `sessionStorage` for client Bearer tokens with server-side HMAC-SHA256 JWT signature verification and database `tokenVersion` revocation checks:

```
[ Browser Tab (sessionStorage) ]
      │
      │ 1. Reads 'orbit_bearer_token' from sessionStorage
      │ 2. Sends HTTP Request with "Authorization: Bearer <token>"
      ▼
[ Next.js Protected API Route Handler ]
      │
      │ 3. getAuthUser(req): Extracts Bearer token
      │ 4. verifyAccessToken(token): Verifies HMAC-SHA256 signature using BETTER_AUTH_SECRET
      │ 5. Decodes payload: { userId, email, tokenVersion, exp }
      ▼
[ MongoDB Atlas (User Collection) ]
      │
      │ 6. Fetches user by userId
      │ 7. Checks user.tokenVersion === payload.tokenVersion
      │    - If Match & Not Expired: Returns User object
      │    - If Mismatch or Revoked: Returns 401 Unauthorized
      ▼
[ Authorized Handler Execution ]
```

### Key Security Modules:
* **Token Utility**: [`lib/token.ts`](lib/token.ts) generates 24h HMAC-SHA256 signed JWTs and verifies signatures with timing-safe comparisons.
* **Server Guard**: [`lib/server-auth.ts`](lib/server-auth.ts) validates tokens against MongoDB Atlas `user.tokenVersion`.
* **Token API**: [`app/api/auth/token/route.ts`](app/api/auth/token/route.ts) handles token issuance (`POST`) and instant database-level token revocation (`DELETE`).
* **Client Isolation**: [`lib/api-client.ts`](lib/api-client.ts) stores and attaches Bearer tokens strictly from `sessionStorage`, ensuring opening a new tab does not leak authenticated state.

---

## Getting Started and Local Development

### Prerequisites

* Node.js 22 LTS
* npm 10+
* MongoDB Atlas Database URL

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Update DATABASE_URL, BETTER_AUTH_SECRET, and OPENROUTER_API_KEY with your values
```

### 3. Generate Prisma Client & Sync Database

```bash
npx prisma generate
npx prisma db push
```

### 4. Run Automated Test Suite

```bash
npm test
```

### 5. Run Development Server

```bash
npm run dev
```

* Application & API: `http://localhost:3000`
* Health Check: `http://localhost:3000/api/healthz`

### 6. Production Build and Start

```bash
# Build production bundle
npm run build

# Start production server
npm start
```

---

## Docker Container Deployment

Build and run the production standalone container image using [`Dockerfile`](Dockerfile):

```bash
# Build Docker image
docker build -t orbit-crm .

# Run container
docker run -p 3000:3000 --env-file .env orbit-crm
```

