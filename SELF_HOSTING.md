# Self-Hosting Orbit CRM with Docker Compose

This guide explains how to deploy Orbit CRM on your own server or local machine using Docker Compose.

---

## Prerequisites

Ensure you have the following installed on your host system:
- **Docker** (v20.10+)
- **Docker Compose** (v2.0+)

---

## Configuration

Orbit CRM uses environment variables for config. Before running the stack, you should configure your secrets.

### 1. Root Environment File
Create a `.env` file in the **root** folder (next to `docker-compose.yml`) to customize your secrets. If left blank, default values from `docker-compose.yml` will be used:

```env
# Database Credentials
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_db_password
POSTGRES_DB=orbit_crm

# Better Auth Secret (Generate a secure 32-character string)
BETTER_AUTH_SECRET=a_very_long_secure_random_string_of_characters

# OpenRouter AI Keys (Optional)
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

### 2. Update `docker-compose.yml` Environment
If you customized the variables in your `.env` file, ensure the `DATABASE_URL` in the `backend` service definition of `docker-compose.yml` matches your new credentials:

```yaml
DATABASE_URL=postgresql://<POSTGRES_USER>:<POSTGRES_PASSWORD>@db:5432/<POSTGRES_DB>?schema=public
```

---

## Launching the Stack

To build and start all containers in detached mode:

```bash
docker compose up --build -d
```

### Checking Status
Monitor the startup logs to ensure migrations run successfully and all services start listening:

```bash
docker compose logs -f
```

Once loaded, you can access the platform at:
- **Frontend App**: `http://localhost:3000`
- **Backend API**: `http://localhost:4000/api`

---

## Database Migrations & Updates

When updating Orbit CRM to a newer version, run:
```bash
docker compose pull
docker compose down
docker compose up -d
```
The backend container is configured to automatically run `npx prisma migrate deploy` on startup to keep the schema up to date.

---

## Deploying Orbit CRM to Render as a Single Web Service

This repository now includes a root [`Dockerfile`](Dockerfile:1) that builds the backend, frontend, and worker into one container. The frontend serves the UI on port `3000`, and Next.js rewrites `/api/*` requests to the NestJS backend running locally on port `4000`.

### Render service settings

- **Root directory**: `.`
- **Environment**: Docker
- **Port**: `3000`
- **Health check path**: `/`

### Required environment variables

Set the production values in Render's environment settings:

```env
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
BETTER_AUTH_SECRET=...
BETTER_AUTH_TRUSTED_ORIGINS=https://your-render-service.onrender.com
AWS_REGION=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_BUCKET_NAME=...
SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASSWORD=...
SMTP_FROM_NAME=Orbit CRM
SMTP_FROM_EMAIL=noreply@yourdomain.com
OPENROUTER_API_KEY=...
OPENROUTER_MODEL=...
```

The Docker build already inlines these production-safe frontend values:

- `NEXT_PUBLIC_API_URL=/api`
- `NEXT_PUBLIC_BETTER_AUTH_URL=/api/auth`

### Startup flow inside the container

1. Prisma migrations run with `npx prisma migrate deploy`
2. NestJS backend starts on `localhost:4000`
3. BullMQ worker starts in the same backend context
4. Next.js starts on `0.0.0.0:3000`

---

## Backup & Recovery

### 1. Creating Backups (pg_dump)
To backup your production database without stopping the container, run:

```bash
docker compose exec -t db pg_dump -U postgres -d orbit_crm | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### 2. Restoring Backups
To restore a backup to the database:

```bash
# Decompress your backup file
gunzip backup_file.sql.gz

# Restore using psql
docker compose exec -T db psql -U postgres -d orbit_crm < backup_file.sql
```
