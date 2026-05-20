FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
ARG ENGINE_URL=http://engine:4001
ARG NEXT_PUBLIC_WIJMO_LICENSE_KEY=
ENV ENGINE_URL=${ENGINE_URL}
ENV NEXT_PUBLIC_WIJMO_LICENSE_KEY=${NEXT_PUBLIC_WIJMO_LICENSE_KEY}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build:ui

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/data ./data
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3001

CMD ["node", "server.js"]
