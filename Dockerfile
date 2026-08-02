# --- Stage 1: Build Backend ---
FROM node:22-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/prisma ./prisma
RUN npx prisma generate
COPY backend/ ./
RUN npm run build

# --- Stage 2: Build Frontend ---
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./

# Inject relative paths at build-time for standalone routing
ARG NEXT_PUBLIC_API_URL=/api
ARG NEXT_PUBLIC_BETTER_AUTH_URL=/api/auth
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_BETTER_AUTH_URL=${NEXT_PUBLIC_BETTER_AUTH_URL}

RUN npm run build

# --- Stage 3: Runner ---
FROM node:22-alpine AS runner
WORKDIR /app

# Install concurrently to manage multiple Node processes in a single container
RUN npm install -g concurrently

# Copy Backend runtime artifacts
WORKDIR /app/backend
COPY --from=backend-builder /app/backend/package*.json ./
RUN npm ci --omit=dev
COPY --from=backend-builder /app/backend/node_modules/.prisma ./node_modules/.prisma
COPY --from=backend-builder /app/backend/dist ./dist
COPY --from=backend-builder /app/backend/prisma ./prisma

# Copy Frontend runtime artifacts
WORKDIR /app/frontend
COPY --from=frontend-builder /app/frontend/.next/standalone ./
COPY --from=frontend-builder /app/frontend/.next/static ./.next/static
COPY --from=frontend-builder /app/frontend/public ./public
COPY --from=frontend-builder /app/frontend/package*.json ./

WORKDIR /app

EXPOSE 3000

# Execute migrations on startup, boot the API backend, and start the Next.js frontend
CMD ["concurrently", \
     "sh -c 'cd backend && (npx prisma migrate deploy || true) && PORT=4000 node dist/main.js'", \
     "sh -c 'cd frontend && PORT=3000 HOSTNAME=0.0.0.0 node server.js'" \
]
