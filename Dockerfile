# Stage 1: install dependencies
FROM node:20-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y python3 make g++ openssl && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci

# Stage 2: build
FROM node:20-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
# AUTH_SECRET is required by NextAuth at build time (page data collection).
# This dummy value is only used during the build — runtime value comes from compose env.
ARG AUTH_SECRET=build-time-placeholder
# NEXT_PUBLIC_* vars are inlined into the client bundle at build time; SENTRY_ORG/
# PROJECT/AUTH_TOKEN are read by withSentryConfig for source map upload during
# `next build`. All six must be build args — setting them later in docker-compose's
# `environment:` block has no effect on a client bundle that's already been built.
ARG SENTRY_ORG=""
ARG SENTRY_PROJECT=""
ARG SENTRY_AUTH_TOKEN=""
ARG NEXT_PUBLIC_SENTRY_DSN=""
ARG NEXT_PUBLIC_POSTHOG_KEY=""
ARG NEXT_PUBLIC_POSTHOG_HOST=""
RUN AUTH_SECRET=$AUTH_SECRET \
    SENTRY_ORG=$SENTRY_ORG \
    SENTRY_PROJECT=$SENTRY_PROJECT \
    SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN \
    NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN \
    NEXT_PUBLIC_POSTHOG_KEY=$NEXT_PUBLIC_POSTHOG_KEY \
    NEXT_PUBLIC_POSTHOG_HOST=$NEXT_PUBLIC_POSTHOG_HOST \
    npm run build

# Stage 3: production runner
FROM node:20-slim AS runner
WORKDIR /app

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3000

# Copy pre-built node_modules — avoids recompiling native modules, includes Prisma CLI
COPY --from=deps /app/node_modules ./node_modules

# Next.js standalone output (has its own node_modules subset — merges on top)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Prisma: schema + migrations + plain JS config (prisma.config.ts not copied, .js takes effect)
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.docker.js ./prisma.config.js

# Generated Prisma client (custom output path: src/generated/prisma)
COPY --from=builder /app/src/generated ./src/generated

COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["./entrypoint.sh"]
