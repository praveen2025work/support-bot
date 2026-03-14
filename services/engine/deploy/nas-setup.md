# NAS/NFS Setup Guide for Multi-Instance Deployment

## Directory Structure on NAS

```
\\NAS\chatbot\                         (Windows UNC path)
/mnt/nas/chatbot/                      (Linux mount path)
├── data/
│   ├── audit/                         # Audit trail logs
│   │   └── audit.jsonl
│   ├── learning/                      # Per-group learning data
│   │   ├── default/
│   │   │   ├── interactions.jsonl
│   │   │   ├── review-queue.jsonl
│   │   │   ├── auto-learned.jsonl
│   │   │   ├── signal-aggregates.json
│   │   │   ├── co-occurrence.json
│   │   │   └── auto-faqs.json
│   │   └── {groupId}/
│   ├── indexes/                       # TF-IDF search indexes
│   │   ├── default/
│   │   │   ├── tfidf-index.json
│   │   │   └── documents.json
│   │   └── {groupId}/
│   ├── knowledge/                     # Uploaded documents
│   ├── logs/
│   │   └── conversations.jsonl
│   └── preferences/                   # Per-user preference files
│       └── {userId}.json
├── config/
│   ├── groups.json
│   ├── settings.json
│   ├── users.json
│   └── filter-config.json
└── training/
    ├── corpus.json
    └── groups/
        ├── corpus-{groupId}.json
        └── faq-{groupId}.json
```

## Windows Mount

```cmd
# Map NAS drive (run as the service account)
net use Z: \\NAS-SERVER\chatbot /persistent:yes /user:DOMAIN\svc_chatbot

# In .env file:
DATA_DIR=Z:\data
CONFIG_DIR=Z:\config
TRAINING_DIR=Z:\training
```

## Linux Mount (fstab)

```bash
# /etc/fstab entry
//NAS-SERVER/chatbot /mnt/nas/chatbot cifs credentials=/etc/samba/chatbot.creds,uid=chatbot,gid=chatbot,file_mode=0660,dir_mode=0770 0 0

# In .env file:
DATA_DIR=/mnt/nas/chatbot/data
CONFIG_DIR=/mnt/nas/chatbot/config
TRAINING_DIR=/mnt/nas/chatbot/training
```

## Initial Setup

1. Create the directory structure on NAS
2. Copy current local data to NAS:
   ```bash
   # From the engine directory on one server
   cp -r data/* /mnt/nas/chatbot/data/
   cp src/config/groups.json src/config/settings.json src/config/users.json src/config/filter-config.json /mnt/nas/chatbot/config/
   cp -r src/training/* /mnt/nas/chatbot/training/
   ```
3. Set permissions (system account must have read+write)
4. Configure .env on each server pointing to NAS paths
5. Start engines on both servers

## Permissions

The system account running the engine service needs:
- **Read + Write** on `data/` (logs, learning, audit)
- **Read + Write** on `config/` (admin changes settings)
- **Read + Write** on `training/` (auto-learn modifies corpus)

## Health Check

After starting, verify both instances see the NAS:
```bash
curl http://server-a:4001/api/health/ready
curl http://server-b:4001/api/health/ready
```

Both should show `"dataDir": true`.
