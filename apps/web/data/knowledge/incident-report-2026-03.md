# Incident Report: Payment Gateway Outage

**Incident ID:** INC-2026-0342
**Severity:** P1 - Critical
**Duration:** 47 minutes (2026-03-05 14:23 UTC to 2026-03-05 15:10 UTC)
**Impact:** All payment processing suspended, affecting approximately 12,400 transactions
**Status:** Resolved

## Timeline

### Detection
- **14:23 UTC** — PagerDuty alert triggered: Payment success rate dropped below 50%
- **14:25 UTC** — On-call engineer acknowledged alert and began investigation
- **14:27 UTC** — Confirmed that Stripe API calls were returning 503 errors

### Investigation
- **14:28 UTC** — Checked Stripe status page: No reported incidents
- **14:30 UTC** — Discovered our API gateway was sending malformed headers after a config deployment at 14:20 UTC
- **14:33 UTC** — Identified root cause: A configuration change to enable HTTP/2 upstream broke the Stripe webhook signature verification

### Mitigation
- **14:35 UTC** — Rolled back the API gateway configuration to previous version
- **14:38 UTC** — Verified rollback was successful, payment success rate recovering
- **14:45 UTC** — Payment success rate back to 98%
- **15:10 UTC** — All queued transactions processed, incident declared resolved

### Post-Resolution
- **15:30 UTC** — Identified 342 transactions that failed during the outage
- **16:00 UTC** — Automated retry processed 310 of 342 failed transactions
- **17:00 UTC** — Remaining 32 transactions manually reconciled by finance team

## Root Cause Analysis

The root cause was a configuration change deployed to the API gateway at 14:20 UTC. The change enabled HTTP/2 for upstream connections to third-party services. However, Stripe's webhook verification library does not support HTTP/2 trailer headers, causing signature verification to fail on all incoming webhook callbacks.

The configuration change was tested in staging but the staging environment uses a mock Stripe endpoint that does not perform signature verification, so the incompatibility was not detected.

## Impact Assessment

| Metric | Value |
|--------|-------|
| Duration | 47 minutes |
| Failed transactions | 342 |
| Revenue at risk | $29,847 |
| Recovered automatically | $27,090 (310 transactions) |
| Manual reconciliation | $2,757 (32 transactions) |
| Customer complaints | 18 |
| SLA breach | Yes (monthly uptime dropped to 99.94%) |

## Action Items

| # | Action | Owner | Due Date | Status |
|---|--------|-------|----------|--------|
| 1 | Add Stripe integration test to staging pipeline | Platform Team | 2026-03-12 | In Progress |
| 2 | Implement canary deployment for gateway config changes | DevOps | 2026-03-19 | Not Started |
| 3 | Add HTTP/2 compatibility check for all upstream services | Platform Team | 2026-03-15 | In Progress |
| 4 | Create runbook for payment gateway rollback | On-Call Team | 2026-03-10 | Completed |
| 5 | Set up automated transaction reconciliation for outage scenarios | Finance Eng | 2026-03-26 | Not Started |
| 6 | Review and update SLA monitoring thresholds | SRE | 2026-03-14 | Not Started |

## Lessons Learned

1. **Configuration changes need the same rigor as code changes.** The gateway config change bypassed the standard code review process.
2. **Staging must mirror production for critical integrations.** Mock services hide real-world incompatibilities.
3. **Automated rollback should be faster.** Manual investigation added 10 minutes to resolution time. We should implement automatic rollback when payment success rate drops below 80%.
4. **Transaction retry mechanism worked well.** The automated retry system recovered 90.6% of failed transactions without manual intervention.
