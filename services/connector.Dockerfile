ARG SERVICE_DIR
ARG SERVICE_PORT

FROM node:20-bookworm-slim AS deps
ARG SERVICE_DIR
WORKDIR /app
COPY ${SERVICE_DIR}/package.json ${SERVICE_DIR}/package-lock.json* ./
RUN npm ci

FROM node:20-bookworm-slim AS prod-deps
ARG SERVICE_DIR
WORKDIR /app
COPY ${SERVICE_DIR}/package.json ${SERVICE_DIR}/package-lock.json* ./
RUN npm ci --omit=dev

FROM node:20-bookworm-slim AS builder
ARG SERVICE_DIR
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY ${SERVICE_DIR}/ ./
COPY services/shared/ /shared/
RUN npm run build

FROM node:20-bookworm-slim AS runner
ARG SERVICE_PORT
WORKDIR /app
ENV NODE_ENV=production
ENV CONNECTOR_PORT=${SERVICE_PORT}

RUN groupadd --system --gid 1001 connector && \
    useradd --system --uid 1001 --gid connector connector

COPY --from=builder /app/dist ./dist
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/data ./data

RUN mkdir -p data/connectors data/queries && chown -R connector:connector data

USER connector
EXPOSE ${SERVICE_PORT}

CMD ["node", "dist/server.js"]
