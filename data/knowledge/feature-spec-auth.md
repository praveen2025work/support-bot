# Feature Specification: Authentication & Authorization Module v3.0

## Overview

This document specifies the redesigned authentication and authorization system for the platform. The new system replaces the legacy session-based auth with a modern JWT + OAuth 2.0 architecture supporting SSO, MFA, and role-based access control (RBAC).

## Goals

- Migrate from session cookies to stateless JWT tokens
- Support enterprise SSO via SAML 2.0 and OpenID Connect
- Implement multi-factor authentication (MFA) with TOTP and SMS
- Introduce granular role-based access control (RBAC) with custom roles
- Achieve sub-100ms token validation latency at 99th percentile

## Authentication Flow

### Login Flow

1. User submits credentials to `/api/v3/auth/login`
2. Server validates credentials against user store (PostgreSQL)
3. If MFA is enabled, server returns a `mfa_challenge` token
4. User submits MFA code to `/api/v3/auth/mfa/verify`
5. Server issues access token (15 min TTL) and refresh token (7 day TTL)
6. Access token is a signed JWT containing user ID, roles, and permissions

### Token Refresh

- Client calls `/api/v3/auth/refresh` with valid refresh token
- Server rotates the refresh token (one-time use)
- Old refresh tokens are invalidated immediately
- Token rotation prevents replay attacks

### SSO Integration

Supported identity providers:
- **Okta** — via OpenID Connect
- **Azure AD** — via SAML 2.0 and OpenID Connect
- **Google Workspace** — via OpenID Connect
- **Custom SAML** — any SAML 2.0 compliant IdP

SSO flow uses authorization code grant with PKCE for security.

## Authorization Model

### Role Hierarchy

| Role | Description | Permissions |
|------|-------------|-------------|
| super_admin | Full system access | All permissions |
| org_admin | Organization management | manage_users, manage_roles, manage_settings, view_audit_log |
| team_lead | Team management | manage_team, view_reports, execute_queries, manage_dashboards |
| analyst | Data access | view_reports, execute_queries, export_data |
| viewer | Read-only access | view_reports, view_dashboards |

### Permission Checks

Permissions are checked at three levels:
1. **API Gateway** — validates JWT signature and expiry
2. **Service Layer** — checks role-based permissions
3. **Data Layer** — applies row-level security filters

### Rate Limiting

- Login attempts: 5 per minute per IP, 10 per minute per account
- Token refresh: 30 per hour per user
- API calls: 1000 per minute per user (configurable per role)
- Failed MFA attempts: 3 before lockout (30 minute cooldown)

## Database Schema

### Users Table
- id (UUID, PK)
- email (VARCHAR, unique, indexed)
- password_hash (VARCHAR, bcrypt)
- mfa_enabled (BOOLEAN, default false)
- mfa_secret (VARCHAR, encrypted)
- status (ENUM: active, suspended, pending)
- created_at, updated_at (TIMESTAMP)

### Sessions Table
- id (UUID, PK)
- user_id (UUID, FK → users)
- refresh_token_hash (VARCHAR)
- device_info (JSONB)
- ip_address (INET)
- expires_at (TIMESTAMP)
- revoked (BOOLEAN, default false)

## Security Requirements

- All tokens signed with RS256 (RSA + SHA-256)
- Key rotation every 90 days via JWKS endpoint
- Passwords require minimum 12 characters, 1 uppercase, 1 number, 1 special
- Account lockout after 5 failed login attempts (15 minute window)
- Audit log for all authentication events (login, logout, MFA, token refresh)
- CSRF protection via double-submit cookie pattern
- All auth endpoints require TLS 1.3

## Migration Plan

### Phase 1 (Week 1-2): Infrastructure
- Deploy JWT signing service
- Set up JWKS endpoint
- Configure Redis for token blacklist

### Phase 2 (Week 3-4): Core Auth
- Implement login/logout with JWT
- Add refresh token rotation
- Deploy MFA enrollment flow

### Phase 3 (Week 5-6): SSO
- Integrate Okta connector
- Integrate Azure AD connector
- Test SAML assertion parsing

### Phase 4 (Week 7-8): RBAC
- Implement permission engine
- Create admin UI for role management
- Add row-level security to data queries

## API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| /api/v3/auth/login | POST | None | Authenticate with credentials |
| /api/v3/auth/logout | POST | Bearer | Invalidate session |
| /api/v3/auth/refresh | POST | Refresh | Rotate tokens |
| /api/v3/auth/mfa/enroll | POST | Bearer | Start MFA enrollment |
| /api/v3/auth/mfa/verify | POST | MFA Token | Verify MFA code |
| /api/v3/auth/sso/init | GET | None | Start SSO flow |
| /api/v3/auth/sso/callback | POST | None | SSO callback handler |
| /api/v3/auth/password/reset | POST | None | Request password reset |
| /api/v3/roles | GET/POST | Admin | Manage roles |
| /api/v3/permissions | GET | Admin | List permissions |

## Testing Requirements

- Unit tests: 90% coverage for auth middleware
- Integration tests: All SSO flows with mock IdPs
- Load tests: 10,000 concurrent token validations under 100ms p99
- Penetration testing: OWASP top 10 compliance check
- Security audit by third-party before production release
