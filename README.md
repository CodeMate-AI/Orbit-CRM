# Orbit CRM

Orbit CRM is an AI-native customer relationship management platform designed for startups, high-growth teams, and independent operators. The project is implemented as a modern monorepo containing two standalone applications:

* [`frontend/`](frontend): Next.js 16 App Router application built with React 19 and Tailwind CSS 4.
* [`backend/`](backend): NestJS 11 modular REST API with Prisma ORM 6 and PostgreSQL.

This document serves as the comprehensive, authoritative single source of truth for the entire Orbit CRM codebase. Every section below contains direct file paths and links to the implementing source code files for seamless navigation and maintenance.

---

## Table of Contents

1. [System Architecture and Core Entrypoints](#system-architecture-and-core-entrypoints)
2. [Tech Stack and Key Dependencies](#tech-stack-and-key-dependencies)
3. [Repository Directory Structure](#repository-directory-structure)
4. [Data Models and Database Schema](#data-models-and-database-schema)
5. [Complete API Surface and Backend Module Directory](#complete-api-surface-and-backend-module-directory)
6. [Frontend Routing and Component Architecture](#frontend-routing-and-component-architecture)
7. [AI Copilot Engine and Function Calling](#ai-copilot-engine-and-function-calling)
8. [Weighted Revenue Forecast Model](#weighted-revenue-forecast-model)
9. [Real-Time Event Architecture (SSE)](#real-time-event-architecture-sse)
10. [Environment Variables and Configuration](#environment-variables-and-configuration)
11. [Getting Started and Local Development](#getting-started-and-local-development)
12. [Docker Container Deployment](#docker-container-deployment)

---

## System Architecture and Core Entrypoints

Orbit CRM operates on a decoupled client-server architecture with specialized boundary services:

```text
[ Browser / Client ]
        │
        ├── Next.js 16 Frontend (React 19, Tailwind CSS 4, DND Kit, Recharts)
        │       │
        │       ├── Better Auth Client: frontend/lib/auth-client.ts
        │       ├── Resilient HTTP Client: frontend/lib/api-client.ts
        │       └── SSE Client Hook: frontend/hooks/useWorkspaceEvents.ts
        │
        ▼
[ NestJS 11 REST API ] (Port 4000)
        │  Entrypoint: backend/src/main.ts
        │  Root Module: backend/src/app.module.ts
        │
        ├── Better Auth Engine: backend/src/modules/auth/auth.ts
        ├── Feature Controllers & Services: backend/src/modules/*
        ├── Server-Sent Events (SSE) Broadcaster: backend/src/modules/events/events.service.ts
        └── AI Copilot Multi-tool Execution: backend/src/modules/ai/ai.service.ts
        │
        ├── PostgreSQL Database: backend/prisma/schema.prisma & backend/src/prisma.ts
        ├── Cloudinary Media Storage: backend/src/modules/attachments/attachments.service.ts
        ├── Brevo SMTP / Nodemailer: backend/src/modules/settings/email.service.ts
        └── OpenRouter LLM Gateway: backend/src/modules/ai/ai.service.ts
```

### Core Architecture Implementation Files

* **Backend Entrypoint**: [`backend/src/main.ts`](backend/src/main.ts) initializes NestFactory, configures JSON/URL-encoded body parsing bypass for auth streams, enforces global CORS whitelist, and binds the global `ValidationPipe`.
* **Root Application Module**: [`backend/src/app.module.ts`](backend/src/app.module.ts) registers environment variables via `dotenv` and aggregates all 20 feature modules.
* **Prisma Client Singleton**: [`backend/src/prisma.ts`](backend/src/prisma.ts) instantiates the global `PrismaClient` connected to PostgreSQL.
* **Frontend Root Layout**: [`frontend/app/layout.tsx`](frontend/app/layout.tsx) loads font configurations, metadata, theme providers, and the global Sonner toast manager.
* **Frontend App Shell**: [`frontend/components/AppLayout.tsx`](frontend/components/AppLayout.tsx) renders the responsive sidebar, mobile drawer, workspace selector, and global keyboard triggers.
* **Resilient HTTP Client**: [`frontend/lib/api-client.ts`](frontend/lib/api-client.ts) wraps `fetch` with a 30-second default timeout, a 120-second AI timeout, and an automatic retry to withstand cold-start database latency.

---

## Tech Stack and Key Dependencies

### Frontend (`frontend/package.json`)

* **Framework**: Next.js 16.2.9 (App Router) [`frontend/next.config.ts`](frontend/next.config.ts)
* **Core Libraries**: React 19.2.4, React DOM 19.2.4, TypeScript 6.0.0 [`frontend/tsconfig.json`](frontend/tsconfig.json)
* **Styling**: Tailwind CSS 4 (`@tailwindcss/postcss`) [`frontend/app/globals.css`](frontend/app/globals.css), Lucide Icons (`lucide-react`), Framer Motion (`framer-motion`)
* **UI Primitives**: Radix UI (`radix-ui`), Base UI (`@base-ui/react`), Shadcn UI patterns [`frontend/components.json`](frontend/components.json)
* **Rich Text Editing**: Tiptap (`@tiptap/react`, `@tiptap/starter-kit`)
* **Kanban Drag and Drop**: DND Kit (`@dnd-kit/core`, `@dnd-kit/utilities`)
* **Data Visualization**: Recharts 3.8.0 (`recharts`)
* **Authentication Client**: Better Auth Client 1.6.23 (`better-auth`)
* **Notifications**: Sonner 2.0.7 (`sonner`)

### Backend (`backend/package.json`)

* **Framework**: NestJS 11.1.6 (`@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express`) [`backend/tsconfig.json`](backend/tsconfig.json)
* **Language**: TypeScript 6.0.0, Node.js 22 LTS
* **Database ORM**: Prisma ORM 6.11.1 (`@prisma/client`, `prisma`) [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma)
* **Database Engine**: PostgreSQL
* **Authentication**: Better Auth 1.6.23 (`better-auth`) with PostgreSQL Prisma adapter
* **Validation & Transformation**: `class-validator` 0.14.2, `class-transformer` 0.5.1
* **File & Media Storage**: Cloudinary SDK 2.10.0 (`cloudinary`)
* **Email Delivery**: Nodemailer 9.0.3 (`nodemailer`)
* **CSV Processing**: `csv-parse` 7.0.1 (`csv-parse`)
* **AI Integration**: OpenRouter API via native fetch with streaming and tool calling

---

## Repository Directory Structure

```text
Orbit CRM/
├── frontend/                                   # Next.js 16 App Router application
│   ├── app/                                    # Route pages and layout handlers
│   │   ├── (auth)/                             # Authentication flows
│   │   │   ├── signin/page.tsx                 # Sign-in page
│   │   │   ├── signup/page.tsx                 # Sign-up page
│   │   │   └── onboarding/page.tsx             # New workspace onboarding
│   │   ├── dashboard/page.tsx                  # Executive dashboard overview
│   │   ├── leads/                              # Contacts / Leads
│   │   │   ├── page.tsx                        # Contacts table, filter chips, CSV actions
│   │   │   └── [id]/page.tsx                   # Contact detail page & activities
│   │   ├── companies/                          # Organizations
│   │   │   ├── page.tsx                        # Companies directory
│   │   │   └── [id]/page.tsx                   # 360-degree company detail view
│   │   ├── deals/                              # Opportunities / Pipeline
│   │   │   ├── page.tsx                        # DND Kit Kanban board
│   │   │   ├── [id]/page.tsx                   # Deal detail & contact links
│   │   │   ├── deal-normalizers.ts             # Currency and data normalizers
│   │   │   └── deal-detail-utils.js            # Deal detail helper utilities
│   │   ├── tasks/page.tsx                      # All workspace tasks table
│   │   ├── assigned-tasks/page.tsx             # User-specific assigned tasks
│   │   ├── reports/page.tsx                    # Forecasting & analytics visualizations
│   │   ├── settings/page.tsx                   # Profile, team members, invites, SMTP
│   │   ├── invite/accept/page.tsx              # Invitation verification and acceptance
│   │   ├── layout.tsx                          # Root layout, fonts, and toast container
│   │   ├── page.tsx                            # Marketing landing page
│   │   ├── providers.tsx                       # Client-side theme and context providers
│   │   ├── globals.css                         # Tailwind CSS 4 theme tokens and utilities
│   │   ├── robots.ts                           # Search engine crawling directives
│   │   └── sitemap.ts                          # XML sitemap configuration
│   ├── components/                             # Reusable UI and feature components
│   │   ├── ui/                                 # Base primitives (button, dialog, input, card)
│   │   ├── AppLayout.tsx                       # Main shell, responsive sidebar, workspace context
│   │   ├── AiChatDrawer.tsx                    # Slide-over AI assistant chat panel
│   │   ├── ai-message-formatting.js            # Formatter for AI plain text messages
│   │   ├── SearchDialog.tsx                    # Global multi-entity search modal (Cmd+K)
│   │   ├── ActivityTimeline.tsx                # Record interaction and audit log list
│   │   ├── NoteEditor.tsx                      # Tiptap rich text editor
│   │   ├── NotesTimeline.tsx                   # List of rich text notes
│   │   ├── ReadOnlyNoteContent.tsx             # Read-only Tiptap document renderer
│   │   ├── CSVImportModal.tsx                  # Two-step contact CSV import modal
│   │   ├── FileUploader.tsx                    # Cloudinary upload component
│   │   ├── AttachmentList.tsx                  # Attachment list with download links
│   │   ├── workspace-dropdown-helpers.js       # Workspace switcher dropdown helpers
│   │   ├── Navbar.tsx                          # Landing page header navigation
│   │   ├── HeroSection.tsx                     # Landing page hero visual
│   │   ├── FeaturesSection.tsx                 # Core CRM feature breakdown
│   │   ├── PersonasSection.tsx                 # Targeted user persona highlights
│   │   ├── SecuritySection.tsx                 # Security and compliance details
│   │   ├── AISection.tsx                       # AI Copilot interactive feature preview
│   │   ├── FinalCTA.tsx                        # Conversion call to action
│   │   └── Footer.tsx                          # Marketing footer
│   ├── hooks/                                  # React custom hooks
│   │   ├── useWorkspaceEvents.ts               # SSE listener for real-time updates
│   │   └── use-mobile.ts                       # Responsive breakpoint detection hook
│   ├── lib/                                    # Frontend API service layer
│   │   ├── api-client.ts                       # Resilient HTTP request client
│   │   ├── auth-client.ts                      # Better Auth client configuration
│   │   ├── workspace-context.js                # Active workspace state resolution
│   │   ├── csv-utils.ts                        # Client-side CSV generation & download
│   │   ├── utils.ts                            # ClassName merging utility (clsx + twMerge)
│   │   ├── activities-api.ts                   # Activities API service
│   │   ├── ai-api.ts                           # AI Copilot API service
│   │   ├── attachments-api.ts                  # Attachments API service
│   │   ├── companies-api.ts                    # Companies API service
│   │   ├── dashboard-api.ts                    # Dashboard metrics API service
│   │   ├── notes-api.ts                        # Notes API service
│   │   ├── opportunities-api.ts                # Deals and stages API service
│   │   ├── people-api.ts                       # Contacts and CSV import API service
│   │   ├── reports-api.ts                      # Forecasting reports API service
│   │   ├── search-api.ts                       # Global search API service
│   │   ├── settings-api.ts                     # User profile settings API service
│   │   ├── tasks-api.ts                        # Task management API service
│   │   └── workspaces-api.ts                   # Workspaces and invitations API service
│   ├── next.config.ts                          # Next.js configuration
│   ├── postcss.config.mjs                      # PostCSS plugin setup for Tailwind CSS 4
│   ├── components.json                         # Shadcn UI configuration
│   ├── tsconfig.json                           # Frontend TypeScript compiler options
│   └── package.json                            # Frontend dependencies and scripts
│
├── backend/                                    # NestJS 11 REST API application
│   ├── src/
│   │   ├── main.ts                             # Bootstrap file, CORS, pipes, body parsers
│   │   ├── app.module.ts                       # Root application module
│   │   ├── prisma.ts                           # PrismaClient instance
│   │   └── modules/                            # Feature modules
│   │       ├── activities/                     # Audit logs & timeline events
│   │       │   ├── activities.controller.ts    # Activities HTTP endpoints
│   │       │   ├── activities.service.ts       # Activity creation and querying
│   │       │   └── activities.module.ts        # Module declaration
│   │       ├── ai/                             # AI Copilot engine
│   │       │   ├── ai.controller.ts            # AI chat sessions and messaging endpoints
│   │       │   ├── ai.service.ts               # OpenRouter tool-calling execution loop
│   │       │   └── ai.module.ts                # Module declaration
│   │       ├── attachments/                    # Cloudinary media management
│   │       │   ├── attachments.controller.ts   # Attachment upload & retrieval endpoints
│   │       │   ├── attachments.service.ts      # Cloudinary signing and DB storage
│   │       │   └── attachments.module.ts       # Module declaration
│   │       ├── auth/                           # Better Auth & OTP recovery
│   │       │   ├── auth.controller.ts          # Auth forwarding, forgot/reset password
│   │       │   ├── auth.guard.ts               # NestJS authentication route guard
│   │       │   ├── auth.ts                     # Better Auth server configuration
│   │       │   ├── user.decorator.ts           # Custom `@CurrentUser()` param decorator
│   │       │   └── auth.module.ts              # Module declaration
│   │       ├── companies/                      # Company management
│   │       │   ├── companies.controller.ts     # Company CRUD endpoints
│   │       │   ├── companies.service.ts        # Company business logic
│   │       │   ├── dto/create-company.dto.ts   # Create company payload validator
│   │       │   └── companies.module.ts         # Module declaration
│   │       ├── dashboard/                      # Overview analytics
│   │       │   ├── dashboard.controller.ts     # Dashboard stats endpoint
│   │       │   ├── dashboard.service.ts        # Pipeline, contact, and task aggregation
│   │       │   └── dashboard.module.ts         # Module declaration
│   │       ├── email/                          # Email delivery utilities
│   │       │   └── email.module.ts             # Module declaration
│   │       ├── events/                         # Real-time event broadcasting
│   │       │   ├── events.controller.ts        # SSE stream subscription endpoint
│   │       │   ├── events.service.ts           # Workspace client connection manager
│   │       │   └── events.module.ts            # Module declaration
│   │       ├── health/                         # Health monitoring
│   │       │   └── health.controller.ts        # Health check probe endpoint
│   │       ├── notes/                          # Rich text notes
│   │       │   ├── notes.controller.ts         # Notes CRUD endpoints
│   │       │   ├── notes.service.ts            # Tiptap JSON body persistence
│   │       │   ├── dto/create-note.dto.ts      # Note payload validator
│   │       │   └── notes.module.ts             # Module declaration
│   │       ├── opportunities/                  # Deals & pipelines
│   │       │   ├── opportunities.controller.ts # Deals, stages, and contact link endpoints
│   │       │   ├── opportunities.service.ts    # Pipeline stage progression & deal CRUD
│   │       │   ├── dto/create-opportunity.dto.ts
│   │       │   ├── dto/update-opportunity.dto.ts
│   │       │   └── opportunities.module.ts     # Module declaration
│   │       ├── people/                         # Contacts / Leads
│   │       │   ├── people.controller.ts        # Contact CRUD, CSV dry-run & import
│   │       │   ├── people.service.ts           # Contact logic, phone validation, CSV parsing
│   │       │   ├── dto/create-person.dto.ts
│   │       │   ├── dto/update-person.dto.ts
│   │       │   ├── dto/dry-run-import.dto.ts
│   │       │   ├── dto/start-import.dto.ts
│   │       │   └── people.module.ts            # Module declaration
│   │       ├── reports/                        # Forecasting & reports
│   │       │   ├── reports.controller.ts       # Reports endpoint
│   │       │   ├── reports.service.ts          # Weighted revenue forecast SQL query
│   │       │   └── reports.module.ts           # Module declaration
│   │       ├── search/                         # Multi-entity global search
│   │       │   ├── search.controller.ts        # Global search endpoint
│   │       │   ├── search.service.ts           # Cross-table lookup logic
│   │       │   └── search.module.ts            # Module declaration
│   │       ├── settings/                       # Profile & Email settings
│   │       │   ├── settings.controller.ts      # User profile update endpoint
│   │       │   ├── settings.service.ts         # User profile persistence
│   │       │   ├── email.service.ts            # Nodemailer SMTP transport service
│   │       │   └── settings.module.ts          # Module declaration
│   │       ├── tasks/                          # Tasks & assignments
│   │       │   ├── tasks.controller.ts         # Tasks CRUD endpoints
│   │       │   ├── tasks.service.ts            # Task status, completion & relations
│   │       │   ├── dto/create-task.dto.ts
│   │       │   ├── dto/update-task.dto.ts
│   │       │   └── tasks.module.ts             # Module declaration
│   │       └── workspaces/                     # Multi-tenancy & invitations
│   │           ├── workspaces.controller.ts    # Workspace CRUD, members, invites
│   │           ├── workspaces.service.ts       # Seeding default pipeline, token dispatch
│   │           ├── dto/create-workspace.dto.ts
│   │           ├── dto/update-workspace.dto.ts
│   │           ├── dto/invite-member.dto.ts
│   │           └── workspaces.module.ts        # Module declaration
│   ├── prisma/
│   │   ├── schema.prisma                       # Authoritative Prisma schema definition
│   │   └── migrations/                         # SQL migration history
│   ├── tsconfig.json                           # Backend TypeScript configuration
│   ├── nest-cli.json                           # NestJS CLI configuration
│   └── package.json                            # Backend dependencies and scripts
│
├── Dockerfile                                  # Multi-stage production container build
├── server.md                                   # Server setup and production guide
└── README.md                                   # Single source of truth project documentation
```

---

## Data Models and Database Schema

The database schema is defined in [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma) and accessed through [`backend/src/prisma.ts`](backend/src/prisma.ts).

### 1. Identity, Authentication and Workspace Models

* **`User`** (`backend/prisma/schema.prisma:11`): Stores user accounts, profile details, and preferences. Handled in [`backend/src/modules/auth/auth.ts`](backend/src/modules/auth/auth.ts) and [`backend/src/modules/settings/settings.service.ts`](backend/src/modules/settings/settings.service.ts).
  * Fields: `id`, `email`, `name`, `avatarUrl`, `locale` (`"en-IN"`), `timezone` (`"Asia/Kolkata"`), `emailVerified`, `image`, `createdAt`, `updatedAt`.
  * Relations: `workspaces`, `activities`, `tasks`, `notes`, `attachments`, `ownedLeads`, `createdLeads`, `modifiedLeads`, `sessions`, `accounts`, `chatSessions`.
* **`Workspace`** (`backend/prisma/schema.prisma:39`): Manages multi-tenant boundaries. Handled in [`backend/src/modules/workspaces/workspaces.service.ts`](backend/src/modules/workspaces/workspaces.service.ts).
  * Fields: `id`, `name`, `logo`, `domain` (unique organization domain), `createdAt`.
  * Relations: `members`, `people`, `companies`, `opportunities`, `pipelines`, `pipelineStages`, `tasks`, `notes`, `attachments`, `opportunityContacts`, `activities`, `invitations`, `chatSessions`.
* **`WorkspaceMember`** (`backend/prisma/schema.prisma:63`): Maps users to workspaces with roles (`MemberRole`: `OWNER`, `MEMBER`). Enforced in [`backend/src/modules/workspaces/workspaces.service.ts`](backend/src/modules/workspaces/workspaces.service.ts).
* **`Invitation`** (`backend/prisma/schema.prisma:430`): Manages 7-day invitation tokens. Handled in [`backend/src/modules/workspaces/workspaces.service.ts:291`](backend/src/modules/workspaces/workspaces.service.ts).
* **`PasswordResetOtp`** (`backend/prisma/schema.prisma:441`): Stores 10-minute 6-digit OTP codes for password recovery. Handled in [`backend/src/modules/auth/auth.controller.ts:16`](backend/src/modules/auth/auth.controller.ts).
* **`Account`**, **`Session`**, **`Verification`** (`backend/prisma/schema.prisma:399-458`): Better Auth tables managing session tokens, Google OAuth tokens, and credential hashes.

---

### 2. Core CRM Entities

* **`Person` (Leads and Contacts)** (`backend/prisma/schema.prisma:110`): Handled in [`backend/src/modules/people/people.service.ts`](backend/src/modules/people/people.service.ts).
  * Fields: `id`, `firstName`, `lastName`, `email`, `phone`, `mobile`, `fax`, `jobTitle`, `city`, `address`, `annualRevenue`, `website`, `leadSource`, `industry`, `leadStatus`, `employeeCount`, `skypeId`, `secondaryEmail`, `twitter`, `linkedInUrl`, `description`, `version`, `workspaceId`, `companyId`, `leadOwnerId`, `createdById`, `modifiedById`, `createdAt`, `updatedAt`, `deletedAt`.
* **`Company`** (`backend/prisma/schema.prisma:160`): Handled in [`backend/src/modules/companies/companies.service.ts`](backend/src/modules/companies/companies.service.ts).
  * Fields: `id`, `name`, `domain`, `address`, `city`, `industry`, `employeeCount`, `annualRevenue`, `linkedInUrl`, `logoUrl`, `version`, `workspaceId`, `createdAt`, `updatedAt`, `deletedAt`.
* **`Pipeline` & `PipelineStage`** (`backend/prisma/schema.prisma:234-257`): Handled in [`backend/src/modules/opportunities/opportunities.service.ts`](backend/src/modules/opportunities/opportunities.service.ts).
  * Pipeline Fields: `id`, `name`, `isDefault`, `workspaceId`.
  * PipelineStage Fields: `id`, `name`, `color`, `position`, `probability` (0-100), `version`, `workspaceId`, `pipelineId`.
* **`Opportunity` (Deals)** (`backend/prisma/schema.prisma:190`): Handled in [`backend/src/modules/opportunities/opportunities.service.ts`](backend/src/modules/opportunities/opportunities.service.ts).
  * Fields: `id`, `name`, `amount`, `closeDate`, `probability`, `stageId`, `source`, `companyId`, `workspaceId`, `version`, `createdAt`, `updatedAt`, `deletedAt`.
* **`OpportunityContact`** (`backend/prisma/schema.prisma:221`): Many-to-many bridge linking contacts to deals with specific roles. Handled in [`backend/src/modules/opportunities/opportunities.service.ts:236`](backend/src/modules/opportunities/opportunities.service.ts).

---

### 3. Collaboration, Activities, Notes, and AI

* **`Task`** (`backend/prisma/schema.prisma:260`): Handled in [`backend/src/modules/tasks/tasks.service.ts`](backend/src/modules/tasks/tasks.service.ts).
  * Fields: `id`, `title`, `description`, `status` (`TODO`, `IN_PROGRESS`, `DONE`, `CANCELLED`), `priority` (`LOW`, `MEDIUM`, `HIGH`, `URGENT`), `dueDate`, `completedAt`, `version`, `workspaceId`, `assigneeId`, `personId`, `companyId`, `opportunityId`.
* **`Note`** (`backend/prisma/schema.prisma:305`): Handled in [`backend/src/modules/notes/notes.service.ts`](backend/src/modules/notes/notes.service.ts).
  * Fields: `id`, `title`, `body` (Tiptap JSON structure), `workspaceId`, `authorId`, `personId`, `companyId`, `opportunityId`, `createdAt`, `updatedAt`, `deletedAt`.
* **`Activity`** (`backend/prisma/schema.prisma:331`): Handled in [`backend/src/modules/activities/activities.service.ts`](backend/src/modules/activities/activities.service.ts).
  * Fields: `id`, `type` (`NOTE`, `EMAIL`, `CALL`, `MEETING`, `TASK_COMPLETED`, `DEAL_STAGE_CHANGED`, `RECORD_CREATED`, `RECORD_UPDATED`), `title`, `body`, `metadata` (JSON), `occurredAt`, `workspaceId`, `authorId`, `personId`, `companyId`, `opportunityId`.
* **`Attachment`** (`backend/prisma/schema.prisma:369`): Handled in [`backend/src/modules/attachments/attachments.service.ts`](backend/src/modules/attachments/attachments.service.ts).
  * Fields: `id`, `name`, `mimeType`, `sizeBytes`, `url`, `storageKey`, `checksum`, `isPublic`, `workspaceId`, `uploadedById`, `personId`, `companyId`, `opportunityId`.
* **`ChatSession` & `ChatMessage`** (`backend/prisma/schema.prisma:83-106`): Handled in [`backend/src/modules/ai/ai.service.ts`](backend/src/modules/ai/ai.service.ts).
  * ChatSession: `id`, `title`, `workspaceId`, `userId`, `createdAt`, `updatedAt`.
  * ChatMessage: `id`, `role` (`"user"`, `"assistant"`), `content`, `sessionId`, `createdAt`.

---

## Complete API Surface and Backend Module Directory

All endpoints are prefixed with `/api` as defined in [`backend/src/main.ts:36`](backend/src/main.ts).

### 1. Authentication Module (`backend/src/modules/auth/`)
* **Controller**: [`backend/src/modules/auth/auth.controller.ts`](backend/src/modules/auth/auth.controller.ts)
* **Better Auth Setup**: [`backend/src/modules/auth/auth.ts`](backend/src/modules/auth/auth.ts)
* **Email Dispatcher**: [`backend/src/modules/settings/email.service.ts`](backend/src/modules/settings/email.service.ts)

| Method | Endpoint | Description | Frontend Client Helper |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/sign-up/email` | Create account with name, email, and password | [`frontend/lib/auth-client.ts`](frontend/lib/auth-client.ts) |
| `POST` | `/api/auth/sign-in/email` | Sign in with email and password credentials | [`frontend/lib/auth-client.ts`](frontend/lib/auth-client.ts) |
| `POST` | `/api/auth/sign-in/social` | Sign in with Google OAuth | [`frontend/lib/auth-client.ts`](frontend/lib/auth-client.ts) |
| `POST` | `/api/auth/sign-out` | Destroy user session | [`frontend/lib/auth-client.ts`](frontend/lib/auth-client.ts) |
| `GET` | `/api/auth/get-session` | Retrieve active user session | [`frontend/lib/auth-client.ts`](frontend/lib/auth-client.ts) |
| `POST` | `/api/auth/forgot-password` | Dispatch 6-digit numeric OTP to email | [`frontend/lib/auth-client.ts`](frontend/lib/auth-client.ts) |
| `POST` | `/api/auth/reset-password` | Validate OTP and apply new password | [`frontend/lib/auth-client.ts`](frontend/lib/auth-client.ts) |

---

### 2. Workspaces Module (`backend/src/modules/workspaces/`)
* **Controller**: [`backend/src/modules/workspaces/workspaces.controller.ts`](backend/src/modules/workspaces/workspaces.controller.ts)
* **Service**: [`backend/src/modules/workspaces/workspaces.service.ts`](backend/src/modules/workspaces/workspaces.service.ts)
* **DTOs**: [`backend/src/modules/workspaces/dto/create-workspace.dto.ts`](backend/src/modules/workspaces/dto/create-workspace.dto.ts), [`backend/src/modules/workspaces/dto/update-workspace.dto.ts`](backend/src/modules/workspaces/dto/update-workspace.dto.ts), [`backend/src/modules/workspaces/dto/invite-member.dto.ts`](backend/src/modules/workspaces/dto/invite-member.dto.ts)

| Method | Endpoint | Description | Role Required | Frontend Client Helper |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/workspaces/mine` | List all user workspaces | Member | `workspacesApi.listMine()` in [`frontend/lib/workspaces-api.ts`](frontend/lib/workspaces-api.ts) |
| `POST` | `/api/workspaces` | Create workspace and seed Sales Pipeline | Authenticated | `workspacesApi.create()` in [`frontend/lib/workspaces-api.ts`](frontend/lib/workspaces-api.ts) |
| `PATCH` | `/api/workspaces/:id` | Update workspace name or domain | Owner | `workspacesApi.update()` in [`frontend/lib/workspaces-api.ts`](frontend/lib/workspaces-api.ts) |
| `GET` | `/api/workspaces/:id/members` | Get workspace team member list | Member | `workspacesApi.getMembers()` in [`frontend/lib/workspaces-api.ts`](frontend/lib/workspaces-api.ts) |
| `PATCH` | `/api/workspaces/:id/members/:memberId` | Update team member role (`MEMBER`/`OWNER`) | Owner | `workspacesApi.updateMemberRole()` in [`frontend/lib/workspaces-api.ts`](frontend/lib/workspaces-api.ts) |
| `DELETE` | `/api/workspaces/:id/members/:memberId` | Remove member from workspace | Owner | `workspacesApi.removeMember()` in [`frontend/lib/workspaces-api.ts`](frontend/lib/workspaces-api.ts) |
| `GET` | `/api/workspaces/:id/invitations` | Get pending email invitations | Member | `workspacesApi.getInvitations()` in [`frontend/lib/workspaces-api.ts`](frontend/lib/workspaces-api.ts) |
| `POST` | `/api/workspaces/:id/invitations` | Send email invitation with 7-day token | Owner | `workspacesApi.inviteMember()` in [`frontend/lib/workspaces-api.ts`](frontend/lib/workspaces-api.ts) |
| `DELETE` | `/api/workspaces/:id/invitations/:inviteId` | Revoke a pending invitation | Owner | `workspacesApi.revokeInvitation()` in [`frontend/lib/workspaces-api.ts`](frontend/lib/workspaces-api.ts) |
| `GET` | `/api/workspaces/invitations/:token` | Fetch invitation metadata for accept screen | Public | `workspacesApi.getInvitation()` in [`frontend/lib/workspaces-api.ts`](frontend/lib/workspaces-api.ts) |
| `POST` | `/api/workspaces/invitations/:token/accept` | Accept invitation and join workspace | Authenticated | `workspacesApi.acceptInvitation()` in [`frontend/lib/workspaces-api.ts`](frontend/lib/workspaces-api.ts) |

---

### 3. Contacts / People Module (`backend/src/modules/people/`)
* **Controller**: [`backend/src/modules/people/people.controller.ts`](backend/src/modules/people/people.controller.ts)
* **Service**: [`backend/src/modules/people/people.service.ts`](backend/src/modules/people/people.service.ts)
* **DTOs**: [`backend/src/modules/people/dto/create-person.dto.ts`](backend/src/modules/people/dto/create-person.dto.ts), [`backend/src/modules/people/dto/update-person.dto.ts`](backend/src/modules/people/dto/update-person.dto.ts), [`backend/src/modules/people/dto/dry-run-import.dto.ts`](backend/src/modules/people/dto/dry-run-import.dto.ts), [`backend/src/modules/people/dto/start-import.dto.ts`](backend/src/modules/people/dto/start-import.dto.ts)

| Method | Endpoint | Description | Frontend Client Helper |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/people?workspaceId=:id` | List contacts in workspace | `peopleApi.listByWorkspace()` in [`frontend/lib/people-api.ts`](frontend/lib/people-api.ts) |
| `POST` | `/api/people` | Create new contact | `peopleApi.create()` in [`frontend/lib/people-api.ts`](frontend/lib/people-api.ts) |
| `GET` | `/api/people/:id` | Get single contact profile | `peopleApi.findOne()` in [`frontend/lib/people-api.ts`](frontend/lib/people-api.ts) |
| `PATCH` | `/api/people/:id` | Update contact attributes | `peopleApi.update()` in [`frontend/lib/people-api.ts`](frontend/lib/people-api.ts) |
| `DELETE` | `/api/people/:id` | Soft delete contact (Owner only) | `peopleApi.delete()` in [`frontend/lib/people-api.ts`](frontend/lib/people-api.ts) |
| `GET` | `/api/people/export?workspaceId=:id` | Download contacts as formatted CSV | `peopleApi.exportCsv()` in [`frontend/lib/people-api.ts`](frontend/lib/people-api.ts) |
| `POST` | `/api/people/dry-run` | Parse and preview CSV contacts | `peopleApi.dryRunImport()` in [`frontend/lib/people-api.ts`](frontend/lib/people-api.ts) |
| `POST` | `/api/people/import` | Start background CSV contact import | `peopleApi.startImport()` in [`frontend/lib/people-api.ts`](frontend/lib/people-api.ts) |

---

### 4. Companies Module (`backend/src/modules/companies/`)
* **Controller**: [`backend/src/modules/companies/companies.controller.ts`](backend/src/modules/companies/companies.controller.ts)
* **Service**: [`backend/src/modules/companies/companies.service.ts`](backend/src/modules/companies/companies.service.ts)
* **DTO**: [`backend/src/modules/companies/dto/create-company.dto.ts`](backend/src/modules/companies/dto/create-company.dto.ts)

| Method | Endpoint | Description | Frontend Client Helper |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/companies?workspaceId=:id` | List all companies in workspace | `companiesApi.listByWorkspace()` in [`frontend/lib/companies-api.ts`](frontend/lib/companies-api.ts) |
| `POST` | `/api/companies` | Create new company record | `companiesApi.create()` in [`frontend/lib/companies-api.ts`](frontend/lib/companies-api.ts) |
| `GET` | `/api/companies/:id` | Get company detail and linked contacts | `companiesApi.findOne()` in [`frontend/lib/companies-api.ts`](frontend/lib/companies-api.ts) |
| `PATCH` | `/api/companies/:id` | Update company information | `companiesApi.update()` in [`frontend/lib/companies-api.ts`](frontend/lib/companies-api.ts) |
| `DELETE` | `/api/companies/:id` | Soft delete company (Owner only) | `companiesApi.delete()` in [`frontend/lib/companies-api.ts`](frontend/lib/companies-api.ts) |

---

### 5. Deals / Opportunities Module (`backend/src/modules/opportunities/`)
* **Controller**: [`backend/src/modules/opportunities/opportunities.controller.ts`](backend/src/modules/opportunities/opportunities.controller.ts)
* **Service**: [`backend/src/modules/opportunities/opportunities.service.ts`](backend/src/modules/opportunities/opportunities.service.ts)
* **DTOs**: [`backend/src/modules/opportunities/dto/create-opportunity.dto.ts`](backend/src/modules/opportunities/dto/create-opportunity.dto.ts), [`backend/src/modules/opportunities/dto/update-opportunity.dto.ts`](backend/src/modules/opportunities/dto/update-opportunity.dto.ts)

| Method | Endpoint | Description | Frontend Client Helper |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/opportunities?workspaceId=:id` | Get default pipeline, stages, and deals | `opportunitiesApi.listByWorkspace()` in [`frontend/lib/opportunities-api.ts`](frontend/lib/opportunities-api.ts) |
| `POST` | `/api/opportunities` | Create new deal in pipeline | `opportunitiesApi.create()` in [`frontend/lib/opportunities-api.ts`](frontend/lib/opportunities-api.ts) |
| `GET` | `/api/opportunities/:id` | Get deal detail and linked contacts | `opportunitiesApi.findOne()` in [`frontend/lib/opportunities-api.ts`](frontend/lib/opportunities-api.ts) |
| `PATCH` | `/api/opportunities/:id` | Update deal amount, stage, or close date | `opportunitiesApi.update()` in [`frontend/lib/opportunities-api.ts`](frontend/lib/opportunities-api.ts) |
| `DELETE` | `/api/opportunities/:id` | Soft delete deal (Owner only) | `opportunitiesApi.delete()` in [`frontend/lib/opportunities-api.ts`](frontend/lib/opportunities-api.ts) |
| `POST` | `/api/opportunities/:id/contacts/:personId` | Associate contact with deal | `opportunitiesApi.linkContact()` in [`frontend/lib/opportunities-api.ts`](frontend/lib/opportunities-api.ts) |
| `DELETE` | `/api/opportunities/:id/contacts/:personId` | Unlink contact from deal | `opportunitiesApi.unlinkContact()` in [`frontend/lib/opportunities-api.ts`](frontend/lib/opportunities-api.ts) |

---

### 6. Tasks Module (`backend/src/modules/tasks/`)
* **Controller**: [`backend/src/modules/tasks/tasks.controller.ts`](backend/src/modules/tasks/tasks.controller.ts)
* **Service**: [`backend/src/modules/tasks/tasks.service.ts`](backend/src/modules/tasks/tasks.service.ts)
* **DTOs**: [`backend/src/modules/tasks/dto/create-task.dto.ts`](backend/src/modules/tasks/dto/create-task.dto.ts), [`backend/src/modules/tasks/dto/update-task.dto.ts`](backend/src/modules/tasks/dto/update-task.dto.ts)

| Method | Endpoint | Description | Frontend Client Helper |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/tasks?workspaceId=:id` | List all tasks ordered by due date | `tasksApi.listByWorkspace()` in [`frontend/lib/tasks-api.ts`](frontend/lib/tasks-api.ts) |
| `POST` | `/api/tasks` | Create task with optional entity links | `tasksApi.create()` in [`frontend/lib/tasks-api.ts`](frontend/lib/tasks-api.ts) |
| `PATCH` | `/api/tasks/:id` | Update task status, priority, or assignee | `tasksApi.update()` in [`frontend/lib/tasks-api.ts`](frontend/lib/tasks-api.ts) |
| `DELETE` | `/api/tasks/:id` | Soft delete task (Owner only) | `tasksApi.delete()` in [`frontend/lib/tasks-api.ts`](frontend/lib/tasks-api.ts) |

---

### 7. Notes, Activities, Attachments & Analytics Modules
* **Notes Controller & Service**: [`backend/src/modules/notes/notes.controller.ts`](backend/src/modules/notes/notes.controller.ts), [`backend/src/modules/notes/notes.service.ts`](backend/src/modules/notes/notes.service.ts)
* **Activities Controller & Service**: [`backend/src/modules/activities/activities.controller.ts`](backend/src/modules/activities/activities.controller.ts), [`backend/src/modules/activities/activities.service.ts`](backend/src/modules/activities/activities.service.ts)
* **Attachments Controller & Service**: [`backend/src/modules/attachments/attachments.controller.ts`](backend/src/modules/attachments/attachments.controller.ts), [`backend/src/modules/attachments/attachments.service.ts`](backend/src/modules/attachments/attachments.service.ts)
* **Dashboard Controller & Service**: [`backend/src/modules/dashboard/dashboard.controller.ts`](backend/src/modules/dashboard/dashboard.controller.ts), [`backend/src/modules/dashboard/dashboard.service.ts`](backend/src/modules/dashboard/dashboard.service.ts)
* **Reports Controller & Service**: [`backend/src/modules/reports/reports.controller.ts`](backend/src/modules/reports/reports.controller.ts), [`backend/src/modules/reports/reports.service.ts`](backend/src/modules/reports/reports.service.ts)
* **Search Controller & Service**: [`backend/src/modules/search/search.controller.ts`](backend/src/modules/search/search.controller.ts), [`backend/src/modules/search/search.service.ts`](backend/src/modules/search/search.service.ts)
* **Events Controller & Service**: [`backend/src/modules/events/events.controller.ts`](backend/src/modules/events/events.controller.ts), [`backend/src/modules/events/events.service.ts`](backend/src/modules/events/events.service.ts)
* **AI Controller & Service**: [`backend/src/modules/ai/ai.controller.ts`](backend/src/modules/ai/ai.controller.ts), [`backend/src/modules/ai/ai.service.ts`](backend/src/modules/ai/ai.service.ts)
* **Settings Controller & Service**: [`backend/src/modules/settings/settings.controller.ts`](backend/src/modules/settings/settings.controller.ts), [`backend/src/modules/settings/settings.service.ts`](backend/src/modules/settings/settings.service.ts)
* **Health Controller**: [`backend/src/modules/health/health.controller.ts`](backend/src/modules/health/health.controller.ts)

---

## Frontend Routing and Component Architecture

### 1. Route Map and Pages (`frontend/app/`)

| Route | Page File | Purpose | Key Components & APIs Used |
| :--- | :--- | :--- | :--- |
| `/` | [`frontend/app/page.tsx`](frontend/app/page.tsx) | Marketing Landing Page | [`Navbar`](frontend/components/Navbar.tsx), [`HeroSection`](frontend/components/HeroSection.tsx), [`FeaturesSection`](frontend/components/FeaturesSection.tsx), [`PersonasSection`](frontend/components/PersonasSection.tsx), [`SecuritySection`](frontend/components/SecuritySection.tsx), [`AISection`](frontend/components/AISection.tsx), [`FinalCTA`](frontend/components/FinalCTA.tsx), [`Footer`](frontend/components/Footer.tsx) |
| `/signin` | [`frontend/app/signin/page.tsx`](frontend/app/signin/page.tsx) | User Authentication | [`authClient`](frontend/lib/auth-client.ts) credentials and Google social login |
| `/signup` | [`frontend/app/signup/page.tsx`](frontend/app/signup/page.tsx) | User Registration | [`authClient`](frontend/lib/auth-client.ts) signup form |
| `/onboarding` | [`frontend/app/onboarding/page.tsx`](frontend/app/onboarding/page.tsx) | First-time Workspace Setup | [`workspacesApi`](frontend/lib/workspaces-api.ts) workspace creation |
| `/invite/accept` | [`frontend/app/invite/accept/page.tsx`](frontend/app/invite/accept/page.tsx) | Invitation Accept Flow | [`workspacesApi.getInvitation()`](frontend/lib/workspaces-api.ts), [`workspacesApi.acceptInvitation()`](frontend/lib/workspaces-api.ts) |
| `/dashboard` | [`frontend/app/dashboard/page.tsx`](frontend/app/dashboard/page.tsx) | Executive KPI Overview | [`AppLayout`](frontend/components/AppLayout.tsx), [`dashboardApi`](frontend/lib/dashboard-api.ts) |
| `/leads` | [`frontend/app/leads/page.tsx`](frontend/app/leads/page.tsx) | Contacts Directory & Import | [`AppLayout`](frontend/components/AppLayout.tsx), [`CSVImportModal`](frontend/components/CSVImportModal.tsx), [`peopleApi`](frontend/lib/people-api.ts) |
| `/leads/[id]` | [`frontend/app/leads/[id]/page.tsx`](frontend/app/leads/[id]/page.tsx) | Contact 360 View | [`ActivityTimeline`](frontend/components/ActivityTimeline.tsx), [`NotesTimeline`](frontend/components/NotesTimeline.tsx), [`NoteEditor`](frontend/components/NoteEditor.tsx), [`FileUploader`](frontend/components/FileUploader.tsx) |
| `/companies` | [`frontend/app/companies/page.tsx`](frontend/app/companies/page.tsx) | Company Directory | [`AppLayout`](frontend/components/AppLayout.tsx), [`companiesApi`](frontend/lib/companies-api.ts) |
| `/companies/[id]` | [`frontend/app/companies/[id]/page.tsx`](frontend/app/companies/[id]/page.tsx) | Company Profile & Linked Data | [`companiesApi`](frontend/lib/companies-api.ts), [`ActivityTimeline`](frontend/components/ActivityTimeline.tsx), [`NotesTimeline`](frontend/components/NotesTimeline.tsx) |
| `/deals` | [`frontend/app/deals/page.tsx`](frontend/app/deals/page.tsx) | DND Kit Deals Kanban | [`AppLayout`](frontend/components/AppLayout.tsx), [`opportunitiesApi`](frontend/lib/opportunities-api.ts), `@dnd-kit/core` drag overlay |
| `/deals/[id]` | [`frontend/app/deals/[id]/page.tsx`](frontend/app/deals/[id]/page.tsx) | Deal Details & Contact Roles | [`opportunitiesApi`](frontend/lib/opportunities-api.ts), [`ActivityTimeline`](frontend/components/ActivityTimeline.tsx), [`NotesTimeline`](frontend/components/NotesTimeline.tsx) |
| `/tasks` | [`frontend/app/tasks/page.tsx`](frontend/app/tasks/page.tsx) | Workspace Tasks Queue | [`AppLayout`](frontend/components/AppLayout.tsx), [`tasksApi`](frontend/lib/tasks-api.ts) |
| `/assigned-tasks` | [`frontend/app/assigned-tasks/page.tsx`](frontend/app/assigned-tasks/page.tsx) | User Assigned Tasks Queue | [`AppLayout`](frontend/components/AppLayout.tsx), [`tasksApi`](frontend/lib/tasks-api.ts) |
| `/reports` | [`frontend/app/reports/page.tsx`](frontend/app/reports/page.tsx) | Forecast & Win/Loss Charts | [`AppLayout`](frontend/components/AppLayout.tsx), [`reportsApi`](frontend/lib/reports-api.ts), `Recharts` |
| `/settings` | [`frontend/app/settings/page.tsx`](frontend/app/settings/page.tsx) | Workspace & Profile Admin | [`AppLayout`](frontend/components/AppLayout.tsx), [`settingsApi`](frontend/lib/settings-api.ts), [`workspacesApi`](frontend/lib/workspaces-api.ts) |

---

### 2. Key Shared Components (`frontend/components/`)

* **[`AppLayout.tsx`](frontend/components/AppLayout.tsx)**: Main application container providing `WorkspaceContext`, responsive desktop sidebar, mobile navigation drawer, workspace switcher with [`workspace-dropdown-helpers.js`](frontend/components/workspace-dropdown-helpers.js), and global triggers.
* **[`AiChatDrawer.tsx`](frontend/components/AiChatDrawer.tsx)**: Slide-over AI assistant interface with chat session history, new chat initiation, markdown message formatting using [`ai-message-formatting.js`](frontend/components/ai-message-formatting.js), and API calls via [`frontend/lib/ai-api.ts`](frontend/lib/ai-api.ts).
* **[`SearchDialog.tsx`](frontend/components/SearchDialog.tsx)**: Global command palette (`Cmd+K` / `Ctrl+K`) searching across contacts, companies, and deals using [`frontend/lib/search-api.ts`](frontend/lib/search-api.ts).
* **[`ActivityTimeline.tsx`](frontend/components/ActivityTimeline.tsx)**: Displays chronological audit logs and logs manual interactions (`CALL`, `MEETING`, `EMAIL`) via [`frontend/lib/activities-api.ts`](frontend/lib/activities-api.ts).
* **[`NoteEditor.tsx`](frontend/components/NoteEditor.tsx)** & **[`NotesTimeline.tsx`](frontend/components/NotesTimeline.tsx)**: Tiptap rich text editor and timeline viewer using [`frontend/lib/notes-api.ts`](frontend/lib/notes-api.ts) and [`ReadOnlyNoteContent.tsx`](frontend/components/ReadOnlyNoteContent.tsx).
* **[`CSVImportModal.tsx`](frontend/components/CSVImportModal.tsx)**: Two-step contact CSV dry-run parser, column mapper, and background batch importer with [`frontend/lib/csv-utils.ts`](frontend/lib/csv-utils.ts).
* **[`FileUploader.tsx`](frontend/components/FileUploader.tsx)** & **[`AttachmentList.tsx`](frontend/components/AttachmentList.tsx)**: Cloudinary file uploader and document manager using [`frontend/lib/attachments-api.ts`](frontend/lib/attachments-api.ts).

---

## AI Copilot Engine and Function Calling

The AI Copilot is implemented in [`backend/src/modules/ai/ai.service.ts`](backend/src/modules/ai/ai.service.ts) and accessed via [`frontend/components/AiChatDrawer.tsx`](frontend/components/AiChatDrawer.tsx).

### Inference Rules and System Constraints

* **Strict Workspace Grounding**: Answers must only reflect actual workspace records retrieved through tool calls. External queries regarding competitors or general topics are politely declined.
* **Currency Standard**: Monetary outputs are formatted strictly in Indian Rupees (`₹`). Outputting dollar signs (`$`) is prohibited.
* **Clean Text Rendering**: Outputs clean plain text without raw markdown prefixes (`#`, `##`, `**`, or `-`).
* **Origin Attribution**: When asked about the founder or creator of Orbit CRM, the assistant states it was created and founded by CodeMate AI.

### Tool Calling Function Index

The assistant can invoke up to 5 iterative tool calls per turn to answer questions:

1. `listWorkspacePeople(searchQuery)`: Line 580 in [`backend/src/modules/ai/ai.service.ts`](backend/src/modules/ai/ai.service.ts). Searches contacts by name, email, job title, city, or company.
2. `listWorkspaceCompanies(searchQuery)`: Line 638 in [`backend/src/modules/ai/ai.service.ts`](backend/src/modules/ai/ai.service.ts). Searches companies by name, domain, city, or industry.
3. `listWorkspaceOpportunities(searchQuery)`: Line 682 in [`backend/src/modules/ai/ai.service.ts`](backend/src/modules/ai/ai.service.ts). Finds deals and retrieves amounts, stages, and linked contacts.
4. `listWorkspaceTasks(searchQuery)`: Line 745 in [`backend/src/modules/ai/ai.service.ts`](backend/src/modules/ai/ai.service.ts). Searches tasks by title, description, assignee, or related record.
5. `getWorkspaceSummary()`: Line 808 in [`backend/src/modules/ai/ai.service.ts`](backend/src/modules/ai/ai.service.ts). Computes record counts, lead source breakdown, total pipeline value, and task status distribution.
6. `listWorkspaceNotes(searchQuery)`: Line 905 in [`backend/src/modules/ai/ai.service.ts`](backend/src/modules/ai/ai.service.ts). Searches note titles and Tiptap JSON body content.
7. `listWorkspaceActivities(searchQuery, type)`: Line 960 in [`backend/src/modules/ai/ai.service.ts`](backend/src/modules/ai/ai.service.ts). Retrieves timeline audit entries and interaction logs.

---

## Weighted Revenue Forecast Model

The revenue forecast is computed in [`backend/src/modules/reports/reports.service.ts:110`](backend/src/modules/reports/reports.service.ts) and visualized via Recharts in [`frontend/app/reports/page.tsx`](frontend/app/reports/page.tsx).

### 1. Expected Value Formula

$$\text{Expected Value} = \text{Deal Amount} \times \left( \frac{\text{Probability}}{100} \right)$$

* Custom deal probability overrides the stage default if set.
* Falls back to active pipeline stage probability if custom deal probability is null.
* Defaults to 100% if neither is defined.

### 2. Default Seeded Stage Probabilities

Seeded during workspace creation in [`backend/src/modules/workspaces/workspaces.service.ts:168`](backend/src/modules/workspaces/workspaces.service.ts):

| Stage Name | Position | Default Probability | Description |
| :--- | :--- | :--- | :--- |
| **Lead** | 0 | **10%** | Inbound or captured opportunity |
| **Qualified** | 1 | **25%** | Verified interest and fit |
| **Proposal** | 2 | **50%** | Proposal or demonstration delivered |
| **Negotiation** | 3 | **75%** | Terms review and contract finalization |
| **Won** | 4 | **100%** | Deal closed successfully |
| **Lost** | 5 | **0%** | Deal lost or cancelled (₹0 value) |

### 3. PostgreSQL Database Aggregation Query

Defined in [`backend/src/modules/reports/reports.service.ts:110-123`](backend/src/modules/reports/reports.service.ts):

```sql
SELECT 
  date_trunc('month', o."closeDate") AS month, 
  SUM(COALESCE(o."amount", 0) * COALESCE(o."probability", s."probability", 100) / 100.0) AS amount
FROM "Opportunity" o
JOIN "PipelineStage" s ON o."stageId" = s."id"
WHERE o."workspaceId" = $1
  AND o."deletedAt" IS NULL
  AND o."closeDate" IS NOT NULL
  AND o."closeDate" >= $2
  AND o."closeDate" <= $3
GROUP BY 1
ORDER BY 1 ASC;
```

---

## Real-Time Event Architecture (SSE)

Real-time synchronization across workspace members is implemented in [`backend/src/modules/events/events.service.ts`](backend/src/modules/events/events.service.ts).

1. The frontend hook [`frontend/hooks/useWorkspaceEvents.ts`](frontend/hooks/useWorkspaceEvents.ts) connects an `EventSource` to `/api/events?workspaceId=:id` on mount.
2. The backend controller [`backend/src/modules/events/events.controller.ts`](backend/src/modules/events/events.controller.ts) registers the response stream in `EventsService`.
3. Backend service mutations emit events via `eventsService.emitToWorkspace(workspaceId, eventName, payload)`.
4. The client hook receives payloads (`person.created`, `person.updated`, `opportunity.updated`, `task.created`) and triggers window events to refresh UI tables and show toast alerts.

---

## Environment Variables and Configuration

### Backend Configuration (`backend/.env`)
Example template: [`backend/.env.example`](backend/.env.example)

```env
PORT=4000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/orbit_crm
BETTER_AUTH_SECRET=generate-a-random-32-char-string-for-dev-use
BETTER_AUTH_URL=http://localhost:4000/api/auth
BETTER_AUTH_TRUSTED_ORIGINS=http://localhost:3000,http://localhost:3001

# Google Social Sign-In (Optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Cloudinary Media Storage
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret

# Brevo SMTP Relay (Nodemailer)
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=2525
SMTP_USER=your-login@smtp-brevo.com
SMTP_PASSWORD=your-smtp-key
SMTP_PASS=your-smtp-key
SMTP_FROM_NAME="Orbit CRM"
SMTP_FROM_EMAIL=your-verified-email@domain.com

# URLs & OpenRouter AI Configuration
APP_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3000
OPENROUTER_SITE_URL=http://localhost:3000
OPENROUTER_APP_TITLE="Orbit CRM"
OPENROUTER_API_KEY=your-openrouter-key
OPENROUTER_MODEL=qwen/qwen3.7-flash
```

### Frontend Configuration (`frontend/.env.local`)
Example template: [`frontend/.env.example`](frontend/.env.example)

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:4000/api/auth
```

---

## Getting Started and Local Development

### Prerequisites

* Node.js 22 LTS
* npm 10+
* PostgreSQL 15+

### 1. Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Environment Files

```bash
# In backend/
cp .env.example .env

# In frontend/
cp .env.example .env.local
```

### 3. Initialize Database and Migrations

```bash
cd backend
npx prisma generate
npx prisma migrate deploy
```

### 4. Run Development Servers

Start the NestJS backend API:
```bash
cd backend
npm run start:dev
```

In a separate terminal, start the Next.js frontend:
```bash
cd frontend
npm run dev
```

* Frontend Application: `http://localhost:3000`
* Backend API Server: `http://localhost:4000/api`

---

## Docker Container Deployment

The project includes a multi-stage production [`Dockerfile`](Dockerfile) for building both applications into a unified container image.

```bash
# Build the production Docker image
docker build -t orbit-crm .

# Run the containerized service
docker run -p 3000:3000 -p 4000:4000 --env-file backend/.env orbit-crm
```
