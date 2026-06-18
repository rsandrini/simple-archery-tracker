FROM node:20-alpine AS builder
WORKDIR /app

# Build tools needed for better-sqlite3 native addon
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
RUN npm ci --omit=dev

# Copy built app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./
# Prisma files
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src/generated ./src/generated

RUN chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000

# Run migrations on startup, then start the app
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
