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
RUN AUTH_SECRET=$AUTH_SECRET npm run build

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
