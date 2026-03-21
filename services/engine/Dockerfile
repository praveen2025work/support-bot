FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV ENGINE_PORT=4001

RUN addgroup --system --gid 1001 engine && \
    adduser --system --uid 1001 engine

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/src/config ./src/config
COPY --from=builder /app/src/training ./src/training
COPY --from=builder /app/src/core/response/templates.ts ./src/core/response/templates.ts

RUN mkdir -p data/logs data/knowledge && chown -R engine:engine data

USER engine
EXPOSE 4001

CMD ["node", "dist/server.js"]
