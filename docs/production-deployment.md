# Givvly - Production Deployment & Operations Guide

## 1. Architecture Overview

Givvly is an enterprise celebration gifting, registry, and group pooling platform configured as a high-performance monorepo:

- **Frontend (`apps/web`)**: Next.js 16 (App Router, React 19, Tailwind CSS v4, TanStack Query v5)
- **Backend API (`apps/api`)**: NestJS 11 (Fastify/Express, Prisma ORM, BullMQ, Passport, Helmet, Argon2id, Scalar API Reference)
- **Database**: PostgreSQL 16
- **Cache & Async Queue**: Redis 7
- **Payment Gateway**: Paystack (with HMAC-SHA512 webhook signature verification, zero-leakage balanced double-entry ledger)
- **Concierge**: WhatsApp Business integration (`+234 802 917 6372`)

---

## 2. Docker & Container Deployment

### 2.1 Multi-Container Production Topology (`docker-compose.prod.yml`)

The production topology orchestrates 4 core services:

1. `postgres`: Managed PostgreSQL 16 with persistent volume and health check.
2. `redis`: Redis 7 with LRU eviction and memory bounds.
3. `api`: Containerized NestJS API running on port `4000`.
4. `web`: Next.js web application running on port `3000`.

### 2.2 Launching in Production

```bash
# 1. Copy and populate production secrets
cp apps/api/.env.example apps/api/.env.production
cp apps/web/.env.example apps/web/.env.production

# 2. Build and launch container stack
docker compose -f docker-compose.prod.yml up -d --build

# 3. Verify health status of all containers
docker compose -f docker-compose.prod.yml ps
```

---

## 3. Database Migrations & Seeding

```bash
# Apply pending Prisma migrations
pnpm --filter @givvly/api prisma:migrate

# Seed initial system state (catalog, default admin, celebration events)
pnpm --filter @givvly/api seed
```

---

## 4. Payment Gateway & Webhook Invariants

### 4.1 Paystack Webhook Configuration

- **Webhook URL**: `https://api.givvly.store/api/v1/webhooks/paystack`
- **Secret Key**: Set `PAYSTACK_SECRET_KEY` in environment variables.
- **Header**: Paystack sends `x-paystack-signature` computed as HMAC-SHA512 of the exact raw request body.

### 4.2 Security & Financial Invariants

1. **Cryptographic Validation**: Any webhook with an invalid or missing signature is immediately rejected with `401 Unauthorized`.
2. **Amount Match Guard**: The captured subunit amount (`data.amount`) is strictly compared against `payment.amountKobo`. Underpaid or tampered transactions are marked `FAILED` with an alert logged.
3. **Idempotency**: Duplicate delivery of the same webhook reference returns `{ received: true, alreadyProcessed: true }` without duplicate ledger postings.
4. **Double-Entry Balance**: Every captured payment creates balanced double-entry transactions in `LedgerTransaction` and `LedgerEntry` (`sum(DEBIT) === sum(CREDIT)`).
5. **Host Payout Queueing**: Money gifts trigger automated host payouts directly to verified bank accounts (`payoutAccountId`).

---

## 5. Automated Verification Test Suites

To execute the end-to-end regression and verification test suite:

```bash
# 1. Monorepo Unit & Integration Tests (172/172 tests)
pnpm -r test

# 2. End-to-End Browser Walkthrough (27/27 assertions across 4 journeys)
node scripts/e2e-browser-walkthrough.mjs

# 3. Payment Webhooks & Financial Reconciliation Simulation (17/17 assertions)
node scripts/simulate-paystack-webhook.mjs

# 4. Production Monorepo Build (42 Next.js routes + NestJS API)
pnpm -r build
```

---

## 6. System Health & Observability

- **API Health Endpoint**: `GET /api/v1/health`
- **Scalar Interactive Documentation**: `http://localhost:4000/docs`
- **Admin Ledger Trial Balance**: `GET /api/v1/admin/ledger`
- **Admin Moderation Queue**: `GET /api/v1/admin/moderation`
