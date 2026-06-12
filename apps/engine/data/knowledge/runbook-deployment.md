# Deployment Runbook: Production Release Process

## Pre-Deployment Checklist

### Code Readiness
- [ ] All PRs merged to `main` branch
- [ ] CI pipeline passing (unit tests, integration tests, linting)
- [ ] Security scan completed with no critical vulnerabilities
- [ ] Database migrations reviewed and tested in staging
- [ ] Feature flags configured for any gradual rollouts

### Environment Verification
- [ ] Staging deployment successful and smoke-tested
- [ ] Monitoring dashboards accessible and baseline metrics recorded
- [ ] On-call engineer identified and available
- [ ] Rollback plan documented and tested
- [ ] Communication sent to #deployments Slack channel

## Deployment Steps

### Step 1: Database Migrations
```
# Run migrations against production database
npm run db:migrate:production

# Verify migration status
npm run db:migrate:status
```
**Rollback:** `npm run db:migrate:rollback -- --step 1`
**Estimated time:** 2-5 minutes

### Step 2: Backend Services
```
# Deploy API services via Kubernetes
kubectl set image deployment/api-server api=registry.example.com/api:v${VERSION}

# Watch rollout status
kubectl rollout status deployment/api-server --timeout=300s
```
**Rollback:** `kubectl rollout undo deployment/api-server`
**Estimated time:** 3-5 minutes

### Step 3: Frontend Assets
```
# Deploy static assets to CDN
aws s3 sync dist/ s3://cdn-bucket/app/ --delete
aws cloudfront create-invalidation --distribution-id E1234 --paths "/*"
```
**Rollback:** Redeploy previous version tag
**Estimated time:** 2-3 minutes

### Step 4: Cache Invalidation
```
# Clear application cache
redis-cli -h redis.internal FLUSHDB

# Clear CDN cache
aws cloudfront create-invalidation --distribution-id E1234 --paths "/*"
```
**Estimated time:** 1-2 minutes

## Post-Deployment Verification

### Health Checks
1. Verify API health endpoint: `curl https://api.example.com/health`
2. Check all service pods are running: `kubectl get pods -l app=api-server`
3. Verify database connectivity from application logs
4. Confirm WebSocket connections are stable

### Smoke Tests
1. User login/logout flow
2. Create and execute a query
3. Verify dashboard data loads
4. Test payment flow in sandbox mode
5. Confirm email notifications are being sent

### Metrics to Monitor (First 30 Minutes)
| Metric | Normal Range | Alert Threshold |
|--------|-------------|-----------------|
| API error rate | < 0.1% | > 1% |
| Response time p95 | < 200ms | > 500ms |
| CPU utilization | 30-50% | > 80% |
| Memory utilization | 40-60% | > 85% |
| Active connections | 500-2000 | > 5000 |
| Queue depth | 0-10 | > 100 |

## Rollback Procedure

### When to Rollback
- Error rate exceeds 2% for more than 5 minutes
- P95 latency exceeds 1 second
- Any data integrity issues detected
- Customer-facing functionality broken

### Rollback Steps
1. Announce rollback in #deployments channel
2. Revert Kubernetes deployment: `kubectl rollout undo deployment/api-server`
3. Revert database migration if needed: `npm run db:migrate:rollback`
4. Clear all caches
5. Verify health checks pass
6. Create incident report if customer impact occurred

## Emergency Contacts

| Role | Name | Slack | Phone |
|------|------|-------|-------|
| Engineering Lead | Sarah Chen | @sarah.chen | +1-555-0101 |
| DevOps Lead | Marcus Rodriguez | @marcus.r | +1-555-0102 |
| Database Admin | Priya Patel | @priya.p | +1-555-0103 |
| Product Manager | Alex Kim | @alex.kim | +1-555-0104 |
