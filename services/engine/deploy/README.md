# Deployment Runbook (multi-instance, shared storage)

Step-by-step to deploy the **engine + UI** against a shared volume (NAS/NFS or a
Kubernetes `ReadWriteMany` PVC) with one or more engine instances.

- Full reference: [`docs/DEPLOYMENT.md`](../../../docs/DEPLOYMENT.md) → "Configuration and Shared Storage"
- NAS mount specifics: [`nas-setup.md`](./nas-setup.md)
- Reverse-proxy sample: [`nginx.conf`](./nginx.conf)

There is **no migration script to run** — config and the query catalog ship as
seed files you copy; indexes build themselves on engine init.

## 1. Prerequisites

- Node.js 20 LTS (or the provided Docker images).
- A shared volume readable **and writable** by every engine instance
  (`ReadWriteMany`: NFS/CephFS/EFS/Azure Files, or a Windows NAS share).
- Your data API reachable from the engine (used only to **execute** queries).

## 2. Build

```bash
npm ci && npm ci --prefix services/engine
npm run build            # builds the UI (.next) and the engine (dist/server.js)
```

## 3. Seed the shared volume (one time — copy, nothing is generated)

```bash
VOL=/mnt/nas/chatbot
mkdir -p "$VOL"/{config,data/queries,training}
cp services/engine/src/config/*.json    "$VOL/config/"          # groups, settings, users, filter-config, data-roles
cp services/mock-api/db.json             "$VOL/config/db.json"  # query definitions (admin Queries page reads/writes this)
cp services/engine/data/queries/*.json   "$VOL/data/queries/"   # per-group query catalog (pre-generated, shipped in repo)
cp -r services/engine/src/training/*     "$VOL/training/"       # NLP corpus/FAQ (only if used)
```

> Migrating an **existing** deployment? Use the source → destination table in
> `docs/DEPLOYMENT.md` to see exactly what to carry over (config, glossary, watch
> rules, workflows, saved views, knowledge uploads) vs. what to leave (learning,
> audit, logs, sessions — recreated at runtime).

## 4. Set environment (same storage paths on EVERY engine instance; unique `INSTANCE_ID`)

```ini
NODE_ENV=production
ENGINE_PORT=4001
CONFIG_DIR=/mnt/nas/chatbot/config
DATA_DIR=/mnt/nas/chatbot/data
DB_JSON_PATH=/mnt/nas/chatbot/config/db.json
TRAINING_DIR=/mnt/nas/chatbot/training
INSTANCE_ID=engine-pod-1                              # unique per instance (pod/host name)
API_BASE_URL=https://your-data-api.example.com/api   # real data source (query EXECUTION)
ENGINE_API_KEY=replace-with-strong-key
```

On the **UI** service set `ENGINE_URL=http://<engine-service>:4001`. Full env var
list + defaults: `docs/DEPLOYMENT.md` → "Storage env vars" and "Environment Files".

## 5. Start

- **Docker:** `docker compose -f docker-compose.prod.yml up --build -d`
- **Windows / IIS + NSSM** or bare host: see `docs/DEPLOYMENT.md`.

Search/NLP indexes build automatically on the first request per group — no step.

## 6. Verify

```bash
curl http://<engine>:4001/api/health         # → ok
curl http://<engine>:4001/api/health/ready    # → "dataDir": true
```

Then in the UI:

1. **Admin → Groups** shows your real groups (not the demo set).
2. Chat **`list queries`** lists each group's queries.
3. Create/edit a group on one instance, refresh the UI (served by another
   instance) — the change appears with **no restart** (mtime live-reload).

## What needs NO action

| Item                                                  | Why                                                      |
| ----------------------------------------------------- | -------------------------------------------------------- |
| Per-group query files                                 | Shipped as seed (step 3); admin edits keep them in sync. |
| Search indexes                                        | Built automatically on engine init (NLP train).          |
| Learning, audit, logs, sessions, preferences, anomaly | Created at runtime; safe to start empty.                 |
