# Self-contained image — build context is THIS folder (apps/csv-xlsx-connector).
# Build:  docker build -t csv-xlsx-connector apps/csv-xlsx-connector
FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:20-bookworm-slim AS prod-deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

FROM node:20-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-bookworm-slim AS runner
ARG CONNECTOR_PORT=4004
WORKDIR /app
ENV NODE_ENV=production
ENV CONNECTOR_PORT=${CONNECTOR_PORT}

RUN groupadd --system --gid 1001 connector && \
    useradd --system --uid 1001 --gid connector connector

COPY --from=builder /app/dist ./dist
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/data ./data

RUN mkdir -p data/connectors data/queries && chown -R connector:connector data

USER connector
EXPOSE ${CONNECTOR_PORT}

CMD ["node", "dist/server.js"]
