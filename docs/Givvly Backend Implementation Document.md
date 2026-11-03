# Givvly: Backend Implementation Document

Version 1.0. Audience: backend developers. Stack: NestJS, Prisma, PostgreSQL, Redis, Nodemailer. Companion document: Givvly Frontend Implementation Document.

## 1. How to use this document

This is the single source of truth for building the Givvly API, workers and data layer. Build in the order of Section 19. If something is not specified, do not guess: raise it and record the decision in Section 20.

### Conventions

- **Money** is an integer in kobo everywhere (`Int` for single amounts, `BigInt` for ledger and aggregates). No floats, no `Decimal` for money. Currency is `NGN` in v1 but stored per record.
- **Time** is stored as UTC `timestamptz`. APIs return ISO 8601. Business-day logic uses `Africa/Lagos`.
- **IDs** are UUIDs (`@default(uuid())`). Public URLs use `slug` or an opaque token, never sequential IDs.
- **Soft delete** only where stated (`deletedAt`). Financial records are never deleted.
- "MUST" is required, "MUST NOT" is forbidden, "SHOULD" means do it unless you have a written reason.
- Section 12 (UI and UX) is interpreted for the backend as **API and notification UX**: consistency, pagination, error clarity, email and message design, and admin data needs.

### Guiding principles

1. **Money correctness beats everything.** Every naira that moves is recorded in a double-entry ledger, processed idempotently, and reconcilable against Paystack.
2. **The webhook is the source of truth for payments**, never the browser callback.
3. **Everything async is a queued, retryable, idempotent job.**
4. **Modular monolith first.** One deployable API plus one worker process, strict module boundaries, no microservices.
5. **Least privilege and defense in depth** for data and access.

## 2. Features and scope

### Phase 0: Foundations

Project skeleton, config validation, Prisma, Redis, queues, logging, health checks, CI, error format, auth scaffolding.

### Phase 1: Event core and money gifts (MVP)

- Auth: email and password, Google OAuth, email verification, password reset, sessions, rate limiting.
- Events: create, update, publish, public and private (access code), slugs, cover media, share data.
- Payout accounts: bank list, account name resolution, verification, encryption.
- Money gifts: initialize payment, webhook, verify, ledger, instant payout, retries, failure handling.
- Wall of love (text): create, profanity filter, owner hide and delete, reports.
- Owner dashboard data: stats, gift feed, thank-you tracking.
- Notifications: email (Nodemailer), in-app, SMS or WhatsApp via provider; preferences.
- Admin basics: users, events, payments, payouts, ledger, retry payout, moderation queue.

### Phase 2: Invites, RSVP and media

- Invite templates and per-event template data; RSVP (with plus-one); CSV export.
- Media uploads (presigned), image scanning and moderation, photo wall posts.
- International cards (Paystack channels), currency display data, anonymous giving rules.
- Keepsake page data; event auto-close after the event date.

### Phase 3: Registry, physical gifts, group gifts

- Catalog (products, collections, vendors), registry items, reservation holds.
- Group gifts (pools) with product mode and cash mode, deadlines, refunds.
- Orders (direct gifting and registry purchases), vendor portal APIs, status machine, tracking tokens.
- Reviews, disputes, refunds, vendor payouts or settlement reports.

### Phase 4 and later

- Digital gifts (airtime, vouchers, gift cards) through a bills provider, video messages, trending gifts, recipient-confirms-address, planner accounts.

### Out of scope for v1

Subscriptions, multi-currency settlement, in-app chat, marketplace vendor self-onboarding (admin onboards vendors), native push notifications.

## 3. Tech stack and justification

| Tool | Role | Why |
| --- | --- | --- |
| NestJS (TypeScript) | API framework | Modules, DI, guards, interceptors, testability, fits the team's stack |
| Prisma | ORM and migrations | Type-safe queries, migrations in source control, good DX |
| PostgreSQL | Primary database | Transactions, row locks, constraints, JSONB, strong consistency for money |
| Redis | Queues, cache, locks, rate limits | BullMQ queues, throttling store, short-lived state |
| Nodemailer | Email sending | SMTP transport to a transactional provider (SES, Mailgun, Resend or Postmark SMTP) |

### Supporting tools (justified)

- **BullMQ**: reliable Redis-backed queues with retries, backoff, delayed jobs and repeatable jobs. Required for payouts, webhooks, notifications.
- **zod with nestjs-zod** (or class-validator): request validation. Prefer zod so schemas can be shared with the frontend through the `contracts` package.
- **@nestjs/jwt, passport-jwt, passport-google-oauth20**: authentication. **argon2** (argon2id) for password hashing.
- **@nestjs/throttler** with Redis storage: rate limiting. **helmet**, **cookie-parser**, and a double-submit CSRF helper.
- **@nestjs/swagger**: OpenAPI generated from zod schemas, published in staging.
- **nestjs-pino**: structured JSON logs with request ids and redaction. **Sentry**: errors. **OpenTelemetry** (optional): traces and metrics.
- **@nestjs/schedule** or BullMQ repeatables: scheduled jobs. **@nestjs/event-emitter**: in-process domain events.
- **@aws-sdk/client-s3 and s3-request-presigner**: object storage (S3 or Cloudflare R2). **sharp**: image processing and EXIF stripping.
- **Paystack REST API** through a thin `PaystackClient` (axios or undici). **Bills provider** (VTpass or Flutterwave Bills) behind a `BillsProvider` interface. **SMS and WhatsApp** providers (for example Termii, Twilio, or Meta WhatsApp Cloud API) behind a `MessagingProvider` interface.
- **MJML plus Handlebars**: email templates. A profanity filter plus a custom wordlist: text moderation. A moderation provider (Sightengine, AWS Rekognition or Google Vision) behind a `ModerationProvider` interface for images.
- **Jest, Supertest, Testcontainers, nock or msw, k6**: testing. **ESLint, Prettier, Husky, commitlint**: quality. **pnpm workspace** with the shared `contracts` package.

### Rules for external providers

Every external service sits behind an interface in `infra/` with a real implementation and a fake for tests. Business modules never import a provider SDK directly. Provider calls have timeouts (10 s default), retries with jitter only for idempotent calls, and circuit-breaking logs.

## 4. Architecture and project structure

```
apps/api/src
  main.ts                  # API bootstrap
  worker.ts                # Worker bootstrap (same codebase, queue processors only)
  app.module.ts
  config/                  # env schema (zod), typed config
  common/                  # filters, interceptors, guards, decorators, pipes, errors, utils
  infra/                   # prisma, redis, queue, storage, mailer, messaging, paystack, bills, moderation
  modules/
    auth/ users/ events/ invites/ rsvps/ registry/ pools/ gifts/ payments/ payouts/ ledger/
    catalog/ vendors/ orders/ digital/ notifications/ media/ moderation/ reports/ admin/ webhooks/ health/
  jobs/                    # queue names, job payload types, processors
prisma/ schema.prisma, migrations/, seed.ts
packages/contracts/        # zod schemas and types shared with the web app
```

### Layering rules

- **Controller** (HTTP only: parse, authorize, call service, shape response) → **Service** (business rules, transactions) → **Repository or Prisma access** (inside the owning module only).
- A module MUST NOT read another module's tables directly. Call that module's exported service.
- Cross-module reactions use domain events (`gift.paid`, `payout.failed`, `order.status_changed`) that enqueue jobs. Services do not call notification code directly.
- Controllers contain no business logic; services never touch `req` or `res`.
- All multi-table writes happen in one `prisma.$transaction`. Side effects (queue jobs, emails) are enqueued AFTER commit using an outbox row or `afterCommit` hook so a rolled-back transaction never sends anything.
- Two processes from one image: `api` (HTTP) and `worker` (BullMQ processors and schedules). Workers scale independently.

### Request lifecycle

Request id middleware → helmet and CORS → cookie parse → rate limiter → auth guard (JWT from cookie) → CSRF guard (unsafe methods) → roles and ownership guard → zod validation pipe → controller → service → response interceptor (envelope) → exception filter (error envelope).

## 5. Database schema (PostgreSQL via Prisma)

### 5.1 Design rules

- Money columns end with `Kobo`. Statuses are enums. Every table has `createdAt`, and mutable tables have `updatedAt @updatedAt`.
- Foreign keys use `onDelete: Restrict` for financial data and `Cascade` only for pure child data (tokens, sessions).
- Unique constraints back every idempotency and dedupe rule. Do not rely on application checks alone.
- Sensitive fields (bank account number) are encrypted at the application layer.
- A raw SQL migration adds the ledger balance check (Section 5.4) and `CHECK (amountKobo > 0)` constraints.

### 5.2 Prisma schema

```prisma
generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql"; url = env("DATABASE_URL") }

enum Role { USER VENDOR ADMIN }
enum UserStatus { ACTIVE SUSPENDED DELETED }
enum EventType { BIRTHDAY WEDDING BABY_SHOWER GRADUATION OTHER }
enum EventStatus { DRAFT PUBLISHED CLOSED ARCHIVED }
enum Visibility { PUBLIC PRIVATE }
enum GiftType { MONEY PRODUCT POOL DIGITAL }
enum GiftStatus { PENDING PAID FAILED REFUNDED }
enum PaymentStatus { INITIATED PENDING SUCCESS FAILED REFUNDED PARTIALLY_REFUNDED }
enum PayoutStatus { QUEUED PROCESSING SUCCESS FAILED REVERSED ON_HOLD }
enum AccountStatus { PENDING VERIFIED PENDING_REVIEW REJECTED }
enum ItemStatus { AVAILABLE RESERVED CLAIMED }
enum PoolMode { PRODUCT CASH }
enum PoolStatus { OPEN FUNDED EXPIRED CONVERTED REFUNDED }
enum OrderStatus { PENDING_PAYMENT CONFIRMED PACKED SHIPPED DELIVERED CANCELLED DISPUTED REFUNDED }
enum PostStatus { PENDING VISIBLE HIDDEN REMOVED }
enum RsvpResponse { YES NO MAYBE }
enum Channel { EMAIL SMS WHATSAPP IN_APP }
enum NotifStatus { QUEUED SENT FAILED READ }
enum LedgerType { ASSET LIABILITY REVENUE EXPENSE }
enum Direction { DEBIT CREDIT }
enum TokenType { EMAIL_VERIFY PASSWORD_RESET }
enum DisputeStatus { OPEN VENDOR_RESPONDED RESOLVED_REFUND RESOLVED_REJECTED }
enum MediaStatus { UPLOADING SCANNING READY REJECTED }
enum ReportStatus { OPEN ACTIONED DISMISSED }

model User {
  id String @id @default(uuid())
  email String @unique            // stored lowercase
  name String
  phone String?                   // E.164
  passwordHash String?            // null for Google-only users
  googleId String? @unique
  role Role @default(USER)
  status UserStatus @default(ACTIVE)
  emailVerifiedAt DateTime?
  avatarKey String?
  failedLogins Int @default(0)
  lockedUntil DateTime?
  lastLoginAt DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  deletedAt DateTime?
  sessions Session[]  tokens VerificationToken[]  payoutAccounts PayoutAccount[]
  events Event[]  notifications Notification[]  prefs NotificationPref[]
  @@index([status])
}

model Session {                    // refresh token rotation
  id String @id @default(uuid())
  userId String
  familyId String                  // all rotations of one login share this
  tokenHash String @unique         // sha256 of refresh token
  userAgent String?  ipHash String?
  expiresAt DateTime
  revokedAt DateTime?
  replacedById String?
  createdAt DateTime @default(now())
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId]) @@index([familyId])
}

model VerificationToken {
  id String @id @default(uuid())
  userId String
  type TokenType
  tokenHash String @unique
  expiresAt DateTime
  usedAt DateTime?
  createdAt DateTime @default(now())
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId, type])
}

model PayoutAccount {
  id String @id @default(uuid())
  userId String
  bankCode String
  bankName String
  accountNumberEnc String          // AES-256-GCM ciphertext (iv:tag:data)
  accountHash String               // HMAC-SHA256 for dedupe lookups
  accountLast4 String
  accountName String               // as resolved by the bank
  recipientCode String?            // Paystack transfer recipient
  status AccountStatus @default(PENDING)
  isDefault Boolean @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  user User @relation(fields: [userId], references: [id])
  @@unique([userId, accountHash])
  @@index([userId])
}

model Event {
  id String @id @default(uuid())
  ownerId String
  slug String @unique
  type EventType
  name String
  date DateTime
  story String?
  coverMediaId String?
  visibility Visibility @default(PUBLIC)
  accessCodeHash String?           // argon2 hash for PRIVATE events
  status EventStatus @default(DRAFT)
  allowPlusOne Boolean @default(true)
  payoutAccountId String?
  templateKey String?
  templateData Json?
  keepsakePublic Boolean @default(false)
  currency String @default("NGN")
  publishedAt DateTime?
  closedAt DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  owner User @relation(fields: [ownerId], references: [id])
  rsvps Rsvp[]  gifts Gift[]  registry RegistryItem[]  pools Pool[]  posts WallPost[]  orders Order[]  payouts Payout[]
  @@index([ownerId, status])
  @@index([status, visibility, date])
}

model Rsvp {
  id String @id @default(uuid())
  eventId String
  contactKey String                // lowercased email or E.164 phone, used for dedupe
  name String
  email String?  phone String?
  response RsvpResponse
  plusOneName String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  event Event @relation(fields: [eventId], references: [id], onDelete: Cascade)
  @@unique([eventId, contactKey])
}

model RegistryItem {
  id String @id @default(uuid())
  eventId String
  productId String?
  title String
  imageKey String?
  priceKobo Int
  status ItemStatus @default(AVAILABLE)
  reservedUntil DateTime?
  reservationToken String?         // identifies the guest session holding it
  claimedGiftId String? @unique
  position Int @default(0)
  createdAt DateTime @default(now())
  event Event @relation(fields: [eventId], references: [id], onDelete: Cascade)
  product Product? @relation(fields: [productId], references: [id])
  @@index([eventId, status]) @@index([status, reservedUntil])
}

model Pool {                       // group gift
  id String @id @default(uuid())
  eventId String
  productId String?
  title String
  mode PoolMode
  targetKobo Int
  raisedKobo Int @default(0)       // cached; truth = sum of PAID gifts
  allowOverfund Boolean @default(false)
  deadline DateTime?
  status PoolStatus @default(OPEN)
  orderId String? @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  event Event @relation(fields: [eventId], references: [id], onDelete: Cascade)
  gifts Gift[]
  @@index([status, deadline])
}

model Gift {
  id String @id @default(uuid())
  type GiftType
  eventId String?                  // null for direct gifts
  giverUserId String?
  giverName String?  giverEmail String?
  anonymous Boolean @default(false)
  message String?
  amountKobo Int                   // value credited to the recipient side
  feeKobo Int @default(0)          // platform fee for this gift
  status GiftStatus @default(PENDING)
  registryItemId String?  poolId String?  orderId String?
  paymentId String? @unique
  thankedAt DateTime?
  createdAt DateTime @default(now())
  event Event? @relation(fields: [eventId], references: [id])
  pool Pool? @relation(fields: [poolId], references: [id])
  payment Payment? @relation(fields: [paymentId], references: [id])
  payout Payout?
  @@index([eventId, createdAt(sort: Desc)]) @@index([eventId, status]) @@index([poolId, status]) @@index([giverUserId])
}

model Payment {
  id String @id @default(uuid())
  reference String @unique         // our reference sent to Paystack
  idempotencyKey String?
  scope String?                    // userId or ip hash the key belongs to
  provider String @default("PAYSTACK")
  amountKobo Int                   // total charged to the payer
  feeKobo Int @default(0)          // platform fee inside the total
  providerFeeKobo Int?             // as reported by Paystack
  currency String @default("NGN")
  status PaymentStatus @default(INITIATED)
  accessCode String?  authorizationUrl String?
  channel String?                  // card, bank_transfer, ussd...
  payerEmail String
  metadata Json?
  failureReason String?
  paidAt DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  gift Gift?  order Order?
  @@unique([scope, idempotencyKey])
  @@index([status, createdAt])
}

model Payout {
  id String @id @default(uuid())
  reference String @unique         // sent to Paystack as the transfer reference
  giftId String? @unique
  eventId String?
  poolId String?
  userId String                    // recipient
  payoutAccountId String
  amountKobo Int
  transferFeeKobo Int?
  status PayoutStatus @default(QUEUED)
  transferCode String?
  attempts Int @default(0)
  holdReason String?
  failureReason String?
  queuedAt DateTime @default(now())
  completedAt DateTime?
  updatedAt DateTime @updatedAt
  gift Gift? @relation(fields: [giftId], references: [id])
  event Event? @relation(fields: [eventId], references: [id])
  @@index([status, queuedAt]) @@index([userId])
}

model LedgerAccount {
  id String @id @default(uuid())
  code String @unique              // e.g. PROVIDER_CLEARING, PLATFORM_REVENUE, PROVIDER_FEES, OWNER_PAYABLE:<userId>, POOL_ESCROW:<poolId>, REFUNDS
  name String
  type LedgerType
  ownerId String?
  currency String @default("NGN")
  entries LedgerEntry[]
}
model LedgerTransaction {
  id String @id @default(uuid())
  reference String @unique         // idempotent business key, e.g. payment:<id>:capture
  kind String                      // PAYMENT_CAPTURE, PAYOUT, TRANSFER_FEE, REFUND, ADJUSTMENT
  description String
  paymentId String?  payoutId String?
  postedAt DateTime @default(now())
  metadata Json?
  entries LedgerEntry[]
}
model LedgerEntry {
  id String @id @default(uuid())
  transactionId String
  accountId String
  direction Direction
  amountKobo BigInt
  createdAt DateTime @default(now())
  transaction LedgerTransaction @relation(fields: [transactionId], references: [id])
  account LedgerAccount @relation(fields: [accountId], references: [id])
  @@index([accountId, createdAt]) @@index([transactionId])
}

model Vendor {
  id String @id @default(uuid())
  name String  slug String @unique
  contactEmail String  phone String?  city String?
  active Boolean @default(true)
  commissionBps Int @default(0)
  createdAt DateTime @default(now())
  members VendorMember[]  products Product[]  orders Order[]
}
model VendorMember {
  id String @id @default(uuid())
  vendorId String  userId String @unique
  vendor Vendor @relation(fields: [vendorId], references: [id])
}
model Product {
  id String @id @default(uuid())
  vendorId String
  slug String @unique
  title String  description String
  priceKobo Int
  images Json                      // [{key, alt}]
  occasions String[]  relationships String[]
  stock Int?                       // null = unlimited
  isDigital Boolean @default(false)
  digitalKind String?              // AIRTIME, VOUCHER, GIFTCARD
  active Boolean @default(true)
  ratingAvg Float @default(0)  ratingCount Int @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  vendor Vendor @relation(fields: [vendorId], references: [id])
  registry RegistryItem[]
  @@index([active, priceKobo]) @@index([vendorId])
}
model Collection {
  id String @id @default(uuid())
  slug String @unique  name String  kind String   // OCCASION, RELATIONSHIP, BUDGET
  productIds String[]
}

model Order {
  id String @id @default(uuid())
  number String @unique            // GV-2026-000123
  buyerUserId String?  buyerEmail String
  eventId String?
  vendorId String
  recipientName String  recipientPhone String?  recipientEmail String?
  address Json?                    // street, area, city, state
  giftNote String?  wrapStyle String?
  status OrderStatus @default(PENDING_PAYMENT)
  subtotalKobo Int  deliveryFeeKobo Int @default(0)  feeKobo Int @default(0)  totalKobo Int
  paymentId String? @unique
  trackingToken String @unique
  deliveredAt DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  event Event? @relation(fields: [eventId], references: [id])
  vendor Vendor @relation(fields: [vendorId], references: [id])
  payment Payment? @relation(fields: [paymentId], references: [id])
  items OrderItem[]  history OrderStatusHistory[]  review Review?  disputes Dispute[]
  @@index([buyerUserId, createdAt]) @@index([vendorId, status]) @@index([eventId])
}
model OrderItem {
  id String @id @default(uuid())
  orderId String  productId String
  title String  unitPriceKobo Int  qty Int @default(1)   // snapshots at purchase time
  order Order @relation(fields: [orderId], references: [id], onDelete: Cascade)
}
model OrderStatusHistory {
  id String @id @default(uuid())
  orderId String  status OrderStatus  note String?  actorId String?
  createdAt DateTime @default(now())
  order Order @relation(fields: [orderId], references: [id], onDelete: Cascade)
  @@index([orderId, createdAt])
}
model Review {
  id String @id @default(uuid())
  orderId String @unique  userId String  vendorId String
  rating Int  comment String?
  createdAt DateTime @default(now())
  order Order @relation(fields: [orderId], references: [id])
}
model Dispute {
  id String @id @default(uuid())
  orderId String  openedById String
  type String  description String
  status DisputeStatus @default(OPEN)
  resolution String?  resolvedById String?
  createdAt DateTime @default(now())  resolvedAt DateTime?
  order Order @relation(fields: [orderId], references: [id])
  @@index([status, createdAt])
}

model WallPost {
  id String @id @default(uuid())
  eventId String
  authorName String  authorUserId String?  authorEmail String?
  text String?
  status PostStatus @default(PENDING)
  moderationReason String?
  giftId String? @unique
  ipHash String?
  createdAt DateTime @default(now())
  event Event @relation(fields: [eventId], references: [id], onDelete: Cascade)
  media Media[]
  @@index([eventId, status, createdAt(sort: Desc)])
}
model Media {
  id String @id @default(uuid())
  ownerUserId String?
  key String @unique  mime String  sizeBytes Int  width Int?  height Int?
  kind String @default("IMAGE")  purpose String   // EVENT_COVER, WALL_POST, DISPUTE, PRODUCT
  status MediaStatus @default(UPLOADING)
  wallPostId String?  disputeId String?
  createdAt DateTime @default(now())
  wallPost WallPost? @relation(fields: [wallPostId], references: [id])
  @@index([status])
}
model Report {
  id String @id @default(uuid())
  targetType String  targetId String   // WALL_POST, EVENT
  reason String  note String?  reporterIpHash String?
  status ReportStatus @default(OPEN)
  reviewedById String?  reviewedAt DateTime?
  createdAt DateTime @default(now())
  @@index([status, createdAt])
}

model Notification {
  id String @id @default(uuid())
  userId String?  toAddress String?          // email or phone for non-users
  channel Channel  type String  title String  body String
  data Json?  status NotifStatus @default(QUEUED)
  attempts Int @default(0)  providerRef String?  error String?
  readAt DateTime?  sentAt DateTime?
  createdAt DateTime @default(now())
  user User? @relation(fields: [userId], references: [id])
  @@index([userId, readAt]) @@index([status, createdAt])
}
model NotificationPref {
  id String @id @default(uuid())
  userId String  channel Channel  category String   // GIFTS, ORDERS, RSVP, MARKETING
  enabled Boolean @default(true)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([userId, channel, category])
}

model WebhookEvent {
  id String @id @default(uuid())
  provider String  eventKey String      // provider event type + object id
  eventType String  payload Json
  status String @default("RECEIVED")     // RECEIVED, PROCESSED, FAILED, IGNORED
  attempts Int @default(0)  error String?
  receivedAt DateTime @default(now())  processedAt DateTime?
  @@unique([provider, eventKey])
  @@index([status, receivedAt])
}
model IdempotencyRecord {
  id String @id @default(uuid())
  scope String  key String  requestHash String
  responseStatus Int  responseBody Json
  createdAt DateTime @default(now())  expiresAt DateTime
  @@unique([scope, key])
  @@index([expiresAt])
}
model AuditLog {
  id String @id @default(uuid())
  actorId String?  action String  targetType String  targetId String
  ip String?  userAgent String?  diff Json?
  createdAt DateTime @default(now())
  @@index([targetType, targetId]) @@index([actorId, createdAt])
}
```

### 5.3 Relationships summary

- User 1:N Event, PayoutAccount, Session, Notification. Event 1:N Rsvp, Gift, RegistryItem, Pool, WallPost, Order.
- Gift N:1 Event (optional), 1:1 Payment, 0..1 Payout. Order 1:1 Payment, N:1 Vendor, 1:N OrderItem and OrderStatusHistory.
- Pool 1:N Gift (contributions). RegistryItem N:1 Product (optional).
- Ledger: Transaction 1:N Entry, Account 1:N Entry. Every Payment, Payout and Refund has a ledger transaction.

### 5.4 Constraints and raw SQL (in a migration)

- `CHECK ("amountKobo" > 0)` on Gift (message-only wall posts are not Gift rows), Payment and Payout.
- Ledger balance: a deferred constraint trigger on `LedgerEntry` that asserts, per transaction, the sum of DEBIT amounts equals the sum of CREDIT amounts at commit.
- Partial unique indexes where Prisma cannot express them, for example one active default `PayoutAccount` per user.
- Row-level locks use `SELECT ... FOR UPDATE` through `$queryRaw` with tagged templates only.

### 5.5 Indexing and retention

- Every index is justified by a query in Section 6. Add `EXPLAIN ANALYZE` evidence to any new index PR.
- Retention: `IdempotencyRecord` 48 hours, `VerificationToken` 7 days after expiry, `WebhookEvent` payload 90 days, `Session` 30 days after expiry, `Notification` 12 months. Financial records are retained according to legal requirements (confirm period with counsel).

### 5.6 Supporting tables referenced elsewhere

```prisma
model OutboxEvent {                // written in the same transaction as business rows
  id String @id @default(uuid())
  type String                      // e.g. gift.paid, payout.queued, order.status_changed
  payload Json                     // ids only
  createdAt DateTime @default(now())
  sentAt DateTime?
  attempts Int @default(0)
  @@index([sentAt, createdAt])
}

model ReconciliationRun {
  id String @id @default(uuid())
  runDate DateTime                 // the day being reconciled (Lagos)
  status String                    // RUNNING, CLEAN, MISMATCHES
  paymentsChecked Int @default(0)
  payoutsChecked Int @default(0)
  mismatches Json?                 // [{ type, reference, expected, actual }]
  startedAt DateTime @default(now())
  finishedAt DateTime?
  @@unique([runDate])
}
```

System ledger accounts to seed: `PROVIDER_CLEARING` (asset), `PLATFORM_REVENUE` (revenue), `PROVIDER_FEES` (expense), `REFUNDS` (expense), `OWNER_RECEIVABLE` (asset, used when a refund follows a payout). Per-owner `OWNER_PAYABLE:<userId>`, per-vendor `VENDOR_PAYABLE:<vendorId>` and per-pool `POOL_ESCROW:<poolId>` accounts are created on first use inside the same transaction that posts to them.

## 6. API design

### 6.1 Conventions

- Base path `/api/v1`. JSON only (`application/json`), UTF-8. Field names camelCase. Money in kobo. Dates ISO 8601 UTC.
- Success envelope: `{ "data": T, "meta"?: { page, pageSize, total, nextCursor } }`. Error envelope: `{ "error": { "code", "message", "details"?, "requestId" } }`.
- Status codes: 200 OK, 201 created, 202 accepted (async), 204 no content, 400 malformed, 401 unauthenticated, 402 payment failed, 403 forbidden, 404 not found, 409 conflict or state error, 422 validation, 423 locked, 429 rate limited, 500 internal.
- Headers: `X-Request-Id` (generated if absent, always echoed), `Idempotency-Key` (required on payment-creating and order-creating POSTs), `X-CSRF-Token` (required on unsafe methods when authenticated by cookie), `Retry-After` on 429, `Idempotent-Replayed: true` on a replayed response.
- Pagination: feeds and lists use cursor pagination (`?cursor=&limit=20`, max 100); admin tables use `?page=&pageSize=` with `total`. Sorting `?sort=createdAt:desc` from a per-endpoint allowlist. Filters are explicit query params, never raw SQL or Prisma fragments.
- **Idempotency:** the first request with a key stores the response in `IdempotencyRecord` (scope = user id or IP hash). The same key with the same body returns the stored response. The same key while the first is still running returns 409 `DUPLICATE_REQUEST`. The same key with a different body returns 422 `IDEMPOTENCY_MISMATCH`.
- Every list and detail endpoint selects explicit fields. Never return `passwordHash`, `accountNumberEnc`, `accessCodeHash`, token hashes, `ipHash`, or other users' emails and phones.
- OpenAPI is generated and published at `/docs` in non-production.

### 6.2 Auth

| Method | Path | Auth | Request | Response |
| --- | --- | --- | --- | --- |
| POST | `/auth/register` | Public | `{ name, email, phone?, password, acceptTerms: true }` | 201 `{ user }`, sends verification email, sets cookies |
| POST | `/auth/login` | Public | `{ email, password }` | 200 `{ user }`, sets `givvly_at`, `givvly_rt`, `givvly_csrf` |
| POST | `/auth/refresh` | Refresh cookie | none | 200 new cookies (rotation); reuse of an old token revokes the whole family |
| POST | `/auth/logout` | Auth | none | 204, revokes the session and clears cookies |
| GET | `/auth/me` | Auth | none | 200 `{ user }` |
| POST | `/auth/verify-email` | Public | `{ token }` | 200 `{ user }` |
| POST | `/auth/resend-verification` | Auth | none | 204 (60 s cooldown) |
| POST | `/auth/forgot-password` | Public | `{ email }` | 204 always (no account enumeration) |
| POST | `/auth/reset-password` | Public | `{ token, password }` | 204, revokes all sessions |
| GET | `/auth/google/url` | Public | `?next=` | 200 `{ url }` (state and PKCE stored in Redis, 10 min) |
| GET | `/auth/google/callback` | Public | `code, state` | 302 to frontend with cookies set |
| GET | `/me/sessions` | Auth | none | 200 list of sessions (device, last used) |
| DELETE | `/me/sessions/:id` | Auth | none | 204 |

Token design: access JWT (15 minutes) with claims `sub`, `role`, `sid`, `iat`, `exp`; refresh token is 256-bit random, stored only as a SHA-256 hash, 30-day lifetime, rotated on each use. Cookies: `givvly_at` (HttpOnly, path `/`), `givvly_rt` (HttpOnly, path `/api/v1/auth`), `givvly_csrf` (readable, SameSite=Lax), all `Secure` with `Domain=.givvly.ng` in production.

### 6.3 Account and payout accounts

| Method | Path | Auth | Request | Response |
| --- | --- | --- | --- | --- |
| GET, PATCH | `/me` | Auth | PATCH `{ name?, phone?, avatarMediaId? }` | 200 `{ user }` |
| POST | `/me/change-password` | Auth + password | `{ currentPassword, newPassword }` | 204, revokes other sessions |
| DELETE | `/me` | Auth + password | `{ password }` | 202, schedules anonymization |
| GET, PUT | `/me/notification-preferences` | Auth | `{ prefs: [{ channel, category, enabled }] }` | 200 |
| GET | `/banks` | Auth | none | 200 `[ { code, name } ]` (cached 24 h in Redis) |
| POST | `/payout-accounts/resolve` | Auth | `{ bankCode, accountNumber }` | 200 `{ accountName }` |
| POST | `/payout-accounts` | Auth + password | `{ bankCode, accountNumber, confirmedName }` | 201 `{ id, bankName, last4, accountName, status }` |
| GET | `/payout-accounts` | Auth | none | 200 list (masked) |

A new account is `VERIFIED` when the resolved name fuzzy-matches the user's profile name (token-set ratio at or above the configured threshold) and `PENDING_REVIEW` otherwise (admin approves). Changing the default payout account triggers an email notice and a 24-hour hold on new payouts to the new account (configurable).

### 6.4 Events (owner)

| Method | Path | Auth | Request | Response |
| --- | --- | --- | --- | --- |
| POST | `/events` | Auth (verified email) | `{ type, name, date, story?, coverMediaId?, visibility, accessCode?, allowPlusOne?, templateKey?, templateData?, registry?: [{ title, productId?, priceKobo }] }` | 201 event (DRAFT) |
| GET | `/events` | Auth | `?status=&cursor=` | 200 my events with summary stats |
| GET | `/events/:id` | Owner | none | 200 event detail |
| PATCH | `/events/:id` | Owner | partial of create body | 200 event |
| POST | `/events/:id/publish` | Owner | none | 200 `{ slug, url, moneyGiftsEnabled }` |
| POST | `/events/:id/close` | Owner | none | 200 |
| POST | `/events/:id/archive` | Owner | none | 200 |
| PUT | `/events/:id/invite` | Owner | `{ templateKey, templateData }` | 200 |
| GET | `/events/:id/stats` | Owner | none | 200 `{ totalReceivedKobo, giftCount, rsvpYes, rsvpNo, rsvpMaybe, pendingPayoutsKobo }` |
| GET | `/events/:id/gifts` | Owner | `?type=&thanked=&cursor=` | 200 gifts (giver identity per anonymity rule) |
| PATCH | `/gifts/:id/thanked` | Owner of event | `{ thanked: boolean }` | 200 |
| GET | `/events/:id/thank-you` | Owner | none | 200 grouped givers and gifts |
| POST | `/events/:id/thank-you/bulk` | Owner | `{ giftIds[], message }` | 202 (queues messages) |
| GET, POST, PATCH, DELETE | `/events/:id/registry[/:itemId]` | Owner | item body | 200 or 201 or 204 |
| GET, POST, PATCH | `/events/:id/pools[/:poolId]` | Owner | `{ title, productId?, mode, targetKobo, deadline?, allowOverfund? }` | 200 or 201 |
| POST | `/events/:id/pools/:poolId/resolve` | Owner | `{ action: 'CONVERT_TO_CASH' \| 'REFUND' }` | 202 |
| GET | `/events/:id/rsvps` | Owner | `?response=` | 200 list |
| GET | `/events/:id/rsvps/export` | Owner | none | 200 `text/csv` |
| GET | `/events/:id/wall` | Owner | `?status=` | 200 all posts incl. hidden |
| PATCH | `/events/:id/wall/:postId` | Owner | `{ status: 'VISIBLE' \| 'HIDDEN' \| 'REMOVED' }` | 200 |
| PATCH | `/events/:id/keepsake` | Owner | `{ public: boolean }` | 200 |

Publishing rules: the event must have name, date, type, and visibility (and an access code if private). Publishing without a verified payout account is allowed; `moneyGiftsEnabled` is `false` until the owner has a `VERIFIED` account linked, at which point it flips to `true` automatically. Slug: slugified name plus a short random suffix, unique, immutable after publish.

### 6.5 Public (guest) endpoints

No authentication. Rate-limited per IP. Private events require the unlock cookie.

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| GET | `/public/events/:slug` | none | 200 event page data: name, date, story, cover, owner first name, template, registry (AVAILABLE, RESERVED, CLAIMED), pools with progress, `moneyGiftsEnabled`. 403 `EVENT_LOCKED` for private and locked. |
| POST | `/public/events/:slug/unlock` | `{ code }` | 204 and sets `givvly_ev_<slug>` (HttpOnly, 12 h). 403 `INVALID_ACCESS_CODE`. Max 5 attempts per 15 min per IP and slug. |
| GET | `/public/events/:slug/wall` | `?cursor=` | 200 VISIBLE posts only |
| POST | `/public/events/:slug/wall` | `{ authorName, text?, mediaIds? }` | 201 `{ id, status }` (status may be PENDING) |
| POST | `/public/events/:slug/rsvps` | `{ name, email?, phone?, response, plusOneName? }` | 201 or 200 (updates on same contact) |
| POST | `/public/events/:slug/gifts/money` | see below | 201 |
| POST | `/public/events/:slug/registry/:itemId/reserve` | `{ reservationToken? }` | 200 `{ reservedUntil, reservationToken }` |
| POST | `/public/events/:slug/gifts/item` | `{ itemId, reservationToken, giverName, email, message?, anonymous }` | 201 (payment init) |
| POST | `/public/events/:slug/gifts/pool` | `{ poolId, amountKobo, giverName, email, message?, anonymous }` | 201 (payment init) |
| GET | `/public/track/:token` | none | 200 limited order status and timeline |
| POST | `/reports` | `{ targetType, targetId, reason, note? }` | 201 |
| GET | `/catalog/products`, `/catalog/products/:slug`, `/catalog/collections` | filters | 200 |
| GET | `/payments/:reference` | none | 200 `{ status, receipt? }` (reference is unguessable) |

**Money gift request and response**

```http
POST /api/v1/public/events/tola-emeka-x7k2/gifts/money
Idempotency-Key: 6f1c0a0e-...
{ "amountKobo": 2000000, "giverName": "Chidi", "email": "chidi@example.com", "message": "Congrats!", "anonymous": false }

201 { "data": { "giftId": "...", "payment": {
  "reference": "gv_01J8Z...", "accessCode": "...", "authorizationUrl": "https://checkout.paystack.com/...",
  "amountKobo": 2000000, "feeKobo": 30000, "totalKobo": 2030000, "currency": "NGN" } } }
```

Server steps: validate; load event; ensure PUBLISHED, `moneyGiftsEnabled`, and owner payout `VERIFIED`; compute fee from config; create `Payment(INITIATED)` and `Gift(PENDING)` in one transaction; call Paystack initialize with our `reference`, `amount = totalKobo`, `email`, `metadata = { giftId, eventId }`; store `accessCode`; return. The fee mode comes from config (Section 9.2).

### 6.6 Orders and catalog (direct gifting)

| Method | Path | Auth | Request | Response |
| --- | --- | --- | --- | --- |
| POST | `/orders` | Auth (or guest with email) | `{ productId, qty?, eventId?, recipient: { name, phone?, email? }, address?, giftNote?, wrapStyle? }` + `Idempotency-Key` | 201 `{ order, payment }` |
| POST | `/orders/:id/pay` | Order buyer | none | 200 new payment init if the first attempt failed |
| GET | `/orders`, `/orders/:id` | Buyer | `?status=&cursor=` | 200 |
| POST | `/orders/:id/cancel` | Buyer | none | 200 (only before PACKED) |
| POST | `/orders/:id/review` | Buyer | `{ rating, comment? }` | 201 (only after DELIVERED, once) |
| POST | `/orders/:id/disputes` | Buyer | `{ type, description, mediaIds? }` | 201 |

### 6.7 Vendor

| Method | Path | Auth | Request | Response |
| --- | --- | --- | --- | --- |
| GET | `/vendor/orders` | VENDOR | `?status=` | 200 own orders only |
| GET | `/vendor/orders/:id` | VENDOR of that order | none | 200 incl. recipient delivery details |
| PATCH | `/vendor/orders/:id/status` | VENDOR | `{ status, note? }` | 200; only legal next status (Section 9.6) |
| GET, POST, PATCH | `/vendor/products[/:id]` | VENDOR | product body | 200 or 201 |
| POST | `/vendor/disputes/:id/respond` | VENDOR | `{ message }` | 200 |

### 6.8 Notifications and media

| Method | Path | Auth | Request | Response |
| --- | --- | --- | --- | --- |
| GET | `/notifications` | Auth | `?unread=&cursor=` | 200 |
| PATCH | `/notifications/:id/read`, POST `/notifications/read-all` | Auth | none | 204 |
| POST | `/uploads/presign` | Auth, or guest with captcha token for wall photos | `{ purpose, mime, sizeBytes }` | 200 `{ mediaId, uploadUrl, headers, expiresIn: 300 }` |
| POST | `/uploads/:mediaId/complete` | Same actor | none | 202 (queues scan and moderation) |

### 6.9 Admin (role ADMIN, 2FA recommended)

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/admin/users`, PATCH `/admin/users/:id` | Search, suspend, restore |
| GET | `/admin/events`, PATCH `/admin/events/:id` | Search, force close, disable gifting |
| GET | `/admin/payments`, `/admin/payments/:id` | Payments with provider payload (redacted) |
| GET | `/admin/payouts`, POST `/admin/payouts/:id/retry`, POST `/admin/payouts/:id/hold`, POST `/admin/payouts/:id/release` | Payout operations |
| GET | `/admin/ledger` | Entries by account and date; trial balance |
| GET | `/admin/reconciliation` | Latest reconciliation run and mismatches |
| GET | `/admin/moderation` | Union of PENDING posts and OPEN reports |
| PATCH | `/admin/moderation/:id` | `{ action: 'APPROVE' \| 'REMOVE' \| 'DISMISS' }` |
| GET, PATCH | `/admin/disputes[/:id]` | Resolve with refund or reject |
| POST | `/admin/refunds` | `{ paymentId, amountKobo, reason }` |
| GET, POST, PATCH | `/admin/vendors`, `/admin/products` | Vendor and catalog management |
| PATCH | `/admin/payout-accounts/:id` | Approve or reject PENDING\_REVIEW |

Every admin write creates an `AuditLog` row with actor, action, target, IP and before and after diff.

### 6.10 Webhooks

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/webhooks/paystack` | Verify `x-paystack-signature` (HMAC SHA-512 of the raw body with the secret key) BEFORE parsing. Store a `WebhookEvent` (unique on `provider + eventKey`), respond `200` immediately, process in a queue. Events handled: `charge.success`, `transfer.success`, `transfer.failed`, `transfer.reversed`, `refund.processed`, `refund.failed`. Unknown events are stored as IGNORED. |
| POST | `/webhooks/bills` | Provider callbacks for airtime and voucher status. Same pattern. |
| POST | `/webhooks/media` | Optional moderation provider callback. |

The raw body MUST be preserved (`rawBody: true` in Nest) for signature verification. Never verify against a re-serialized object.

## 7. Routing and access control

### 7.1 Roles and guards

| Guard | Purpose |
| --- | --- |
| `JwtAuthGuard` | Reads `givvly_at`, rejects missing or expired tokens (401 `UNAUTHENTICATED` or `TOKEN_EXPIRED`) |
| `CsrfGuard` | On POST, PUT, PATCH, DELETE with cookie auth, requires `X-CSRF-Token` equal to the `givvly_csrf` cookie (403 `CSRF_INVALID`). Webhooks and unauthenticated public POSTs are exempt but rate-limited. |
| `RolesGuard` | `@Roles('ADMIN')` etc. |
| `EmailVerifiedGuard` | Required for creating and publishing events |
| `OwnershipGuard` | Loads the resource and verifies `ownerId` equals the user (events and children), `buyerUserId` (orders), or vendor membership. Returns 404, not 403, for resources the user must not know exist. |
| `EventAccessGuard` | For `/public/events/:slug/*`: PUBLISHED required (CLOSED allowed read-only); PRIVATE requires a valid signed unlock cookie or being the owner |
| `ThrottlerGuard` | Per-route limits (Section 15.3) |
| `IdempotencyInterceptor` | Applies to routes marked `@Idempotent()` |

Every controller method declares its access explicitly with decorators (`@Public()`, `@Roles()`). Default is **deny**: a global `JwtAuthGuard` applies unless `@Public()` is present.

### 7.2 Access summary

| Area | Public | USER | VENDOR | ADMIN |
| --- | --- | --- | --- | --- |
| Auth endpoints | Yes | Yes | Yes | Yes |
| `/public/*`, `/catalog/*`, `/payments/:ref`, `/reports`, webhooks | Yes | Yes | Yes | Yes |
| `/me`, `/payout-accounts`, `/notifications`, `/uploads` | No | Own | Own | Own |
| `/events/*` (owner) | No | Own only | No | Read and moderate via `/admin` |
| `/orders/*` | No | Own only | No | Via `/admin` |
| `/vendor/*` | No | No | Own vendor only | Yes (read) |
| `/admin/*` | No | No | No | Yes |

### 7.3 Ownership and data-visibility rules

- An owner sees giver name and email for non-anonymous gifts. For anonymous gifts the owner sees "Anonymous" and the amount (decision recorded in Section 20; the giver is told at checkout). Admins can see the real identity for fraud and dispute handling and every such view is audited.
- Vendors see only the recipient name, phone, address and gift note for their own orders. They never see buyer email, event details beyond the event name, or payment data.
- Public responses never include emails, phones, bank data, or IDs of other users.
- Soft-deleted or suspended users' events return 404 publicly.

## 8. Validations

### 8.1 Global rules

- Zod validation pipe on every body, query and param. Unknown properties are **rejected** (`strict()`), not stripped silently. No mass assignment: services accept explicit DTO fields only.
- Strings are trimmed; emails lowercased and validated; phones normalized to E.164 (`+234...`); control characters stripped from free text; max body size 1 MB (uploads go direct to storage).
- UUID params validated as UUID; slugs validated against `^[a-z0-9-]{3,80}$`.
- Validation failure returns 422 `VALIDATION_FAILED` with `details: { field: [messages] }`.
- State validations (is the event published, is the item available) run in the service inside the transaction, and the database constraint is the final guard.

### 8.2 Rules by endpoint

| Endpoint | Field | Rule |
| --- | --- | --- |
| `POST /auth/register` | name | 2 to 60 chars |
|  | email | Valid, max 254, unique (409 `EMAIL_TAKEN` returned with the same timing as success to limit enumeration) |
|  | password | 10 to 72 chars, letter and number, not in the common password list |
|  | acceptTerms | Must be `true` |
| `POST /auth/login` | email, password | Required; after 5 failures lock the account 15 minutes (`ACCOUNT_LOCKED`) |
| `POST /events` | type | Enum |
|  | name | 3 to 80 |
|  | date | Not in the past (Lagos), at most 3 years ahead |
|  | story | Max 1500 |
|  | visibility, accessCode | PRIVATE requires 6 to 12 alphanumeric code (stored hashed) |
|  | coverMediaId | Must be READY, owned by the user, purpose EVENT\_COVER |
|  | registry | At most 50 items; price 50,000 to 500,000,000 kobo |
| `PATCH /events/:id` | any | Cannot change `type`, `slug` after publish; cannot set date in the past; CLOSED or ARCHIVED events are read-only |
| `POST /payout-accounts` | accountNumber | Exactly 10 digits; bankCode in the cached bank list |
|  | confirmedName | Must equal the name returned by resolve for this bank and number (re-resolved server side) |
|  | limit | Max 3 accounts per user |
| `POST .../gifts/money` | amountKobo | Integer, 50,000 to 100,000,000 (configurable `MIN_GIFT_KOBO`, `MAX_GIFT_KOBO`) |
|  | giverName | Required unless anonymous, 2 to 60 |
|  | email | Required, valid |
|  | message | Max 500, profanity filtered |
|  | event state | PUBLISHED, `moneyGiftsEnabled`, not past close date plus grace (default 30 days) |
|  | velocity | Max 10 initiated payments per IP per hour, 5 per email per hour |
| `POST .../gifts/pool` | amountKobo | Min 50,000; not more than remaining unless `allowOverfund`; pool OPEN and before deadline |
| `POST .../registry/:id/reserve` | item | AVAILABLE, or RESERVED by the same `reservationToken`; hold is 10 minutes |
| `POST .../gifts/item` | reservationToken | Must match a live reservation on the item |
| `POST .../rsvps` | response | Enum; `plusOneName` only if event `allowPlusOne`; one of email or phone required |
| `POST .../wall` | text | 1 to 500 chars, or media present |
|  | mediaIds | Up to 3, READY, purpose WALL\_POST, owned by this uploader |
| `POST /uploads/presign` | mime | Allowlist `image/jpeg`, `image/png`, `image/webp` |
|  | sizeBytes | Max 5 MB (cover) or 8 MB (wall); server enforces on the presigned URL conditions |
| `POST /orders` | productId | Active, in stock, vendor active |
|  | recipient.name | 2 to 60; phone required for physical goods |
|  | address | Required for physical; street, area, city, state; max 200 each |
|  | giftNote | Max 300 |
| `PATCH /vendor/orders/:id/status` | status | Must be the next legal transition (Section 9.6) |
| `POST /orders/:id/review` | rating | Integer 1 to 5; order DELIVERED; one review per order |
| `POST /orders/:id/disputes` | description | 20 to 1000 chars; order SHIPPED or DELIVERED; within 14 days of delivery |
| `POST /reports` | reason | Enum; note max 300; max 10 reports per IP per hour |
| `POST /admin/refunds` | amountKobo | Positive, not more than refundable amount; reason required |

### 8.3 Business invariants (enforced in code and database)

1. A payment is credited exactly once (unique `reference`, locked row, state check).
2. Sum of ledger debits equals sum of credits for every transaction.
3. A registry item has at most one successful gift; a pool never exceeds its target unless overfunding is on.
4. A payout exists at most once per gift (`giftId` unique) and is never sent for an unverified account.
5. An order status only moves along the state machine.
6. A private event never leaks its content without a valid unlock cookie or ownership.

## 9. Expected flows (system behavior)

### 9.1 Fee model (configurable; confirm before launch)

`FEE_MODE` is one of `GUEST_PAYS`, `OWNER_PAYS`, `SPLIT`. Fee per gift = `max(FEE_FLAT_KOBO, round(amount * FEE_BPS / 10000))` capped by `FEE_CAP_KOBO`. Defaults for development: `GUEST_PAYS`, `FEE_BPS=150`. These are placeholders. Set real values after modelling Paystack's current published collection and transfer fees against typical gift sizes, because small gifts can lose money after the per-transfer fee.

- `GUEST_PAYS`: payer is charged `A + F`; owner receives `A`.
- `OWNER_PAYS`: payer is charged `A`; owner receives `A - F`.
- `SPLIT`: fee divided by `FEE_SPLIT_GUEST_PCT`.

The API always returns `amountKobo`, `feeKobo`, `totalKobo` so the frontend never calculates fees.

### 9.2 Money gift: from payment to payout

1. **Initialize** (Section 6.5): creates `Payment(INITIATED)` and `Gift(PENDING)`, calls Paystack initialize, returns `accessCode` and `reference`.
2. **Guest pays** in the Paystack popup. The browser may close at any time; nothing depends on it.
3. **Webhook** `charge.success` arrives at `/webhooks/paystack`: verify signature on the raw body, upsert `WebhookEvent` (unique key `charge.success:<reference>`), return 200, enqueue `payments-webhook` job.
4. **Process job** (idempotent):
   1. Load the payment with a row lock (`SELECT ... FOR UPDATE`). If status is already `SUCCESS`, stop.
   2. Call Paystack `GET /transaction/verify/:reference`. Check status is success, currency matches, and `amount` equals `payment.amountKobo`. On mismatch mark the payment `FAILED` with reason `AMOUNT_MISMATCH`, alert admins, and stop.
   3. In one DB transaction: set payment `SUCCESS` (`paidAt`, `channel`, `providerFeeKobo`), gift `PAID`, create the ledger transaction (below), create `Payout(QUEUED)` for MONEY gifts and CASH-mode pool contributions, update `Pool.raisedKobo` when relevant, write the outbox rows.
   4. After commit: enqueue `payout`, `notifications` (owner: gift received; giver: receipt), and `revalidate` (public event page tag) jobs.
5. **Payout job**: see 9.3.
6. **Frontend poll** `GET /payments/:reference` returns SUCCESS once step 4.3 commits.

**Ledger entries for a captured money gift (GUEST\_PAYS, amount A, fee F, total T = A + F):**

| Account | Debit | Credit |
| --- | --- | --- |
| `PROVIDER_CLEARING` (asset) | T |  |
| `OWNER_PAYABLE:<ownerId>` (liability) |  | A |
| `PLATFORM_REVENUE` (revenue) |  | F |

Payout of A: debit `OWNER_PAYABLE`, credit `PROVIDER_CLEARING` for A. Provider charges (collection fee `p`, transfer fee `t`): debit `PROVIDER_FEES`, credit `PROVIDER_CLEARING`. Ledger transaction references are deterministic (`payment:<id>:capture`, `payout:<id>:sent`, `payout:<id>:fee`) so a replay cannot double-post (unique `reference`). Pool escrow uses `POOL_ESCROW:<poolId>` in place of `OWNER_PAYABLE`. Order captures credit `VENDOR_PAYABLE:<vendorId>` and `PLATFORM_REVENUE` for commission and service fee.

### 9.3 Payout processing

1. Job locks the `Payout` row. If status is not `QUEUED` (or retryable `FAILED`), exit.
2. Pre-checks: the owner's `PayoutAccount` is `VERIFIED`; the account is not in its new-account hold window; risk rules pass (per-event and per-day velocity, single large gift threshold). A failed pre-check sets `ON_HOLD` with `holdReason`, notifies admins, and stops. Admin can release.
3. Ensure a Paystack transfer recipient exists (`recipientCode`, create on first use).
4. Call Paystack initiate transfer with `reference = payout.reference` (unique and idempotent), `amount`, `recipient`, and a reason. Set `PROCESSING`, increment `attempts`.
5. Final state arrives by webhook: `transfer.success` sets `SUCCESS` and posts the ledger entries; `transfer.failed` sets `FAILED` with reason; `transfer.reversed` sets `REVERSED` and reverses the ledger entries.
6. **Retries:** network errors and provider 5xx retry at 1 min, 5 min, 15 min, 1 h, 6 h (max 5 attempts, same reference, so Paystack deduplicates). Definite bank failures (invalid account) do not auto-retry: mark `FAILED`, notify the owner to fix their account, and expose admin retry. If a transfer response is ambiguous (timeout), query Paystack by reference before retrying. Never create a second transfer with a new reference for the same payout.
7. A sweeper finds `PROCESSING` payouts older than 30 minutes and reconciles them with Paystack.

### 9.4 Registry reservation and purchase

1. `reserve`: one atomic statement: `UPDATE RegistryItem SET status='RESERVED', reservedUntil=now()+10min, reservationToken=:t WHERE id=:id AND (status='AVAILABLE' OR (status='RESERVED' AND (reservedUntil < now() OR reservationToken=:t)))`. Zero rows updated means 409 `ITEM_ALREADY_CLAIMED`.
2. A delayed job at `reservedUntil` releases the hold if it is still unpaid (a minutely sweeper is the backup).
3. `gifts/item` verifies the token and creates `Payment` and `Gift(PENDING)`; the reservation is extended to cover the payment window (max 20 minutes).
4. On `charge.success`: set the item `CLAIMED`, `claimedGiftId`, create an `Order` for the product with the event owner as recipient, notify the owner and the vendor.
5. On payment failure or abandonment: release the item.

### 9.5 Group gifts (pools)

1. Contribution init: lock the `Pool` row. Reject if not OPEN or past deadline. If the amount exceeds `target - raised - pendingContributions` and overfunding is off, return 409 `POOL_OVERFUNDED` with the remaining amount. Pending contributions count toward the remaining amount for 20 minutes so concurrent guests cannot overshoot.
2. On success: increase `raisedKobo`. If `raisedKobo >= targetKobo`: status `FUNDED`. In PRODUCT mode create the order automatically using escrowed funds (ledger: debit `POOL_ESCROW`, credit `VENDOR_PAYABLE` and revenue). In CASH mode, each contribution already created its own payout.
3. At the deadline an underfunded PRODUCT pool becomes `EXPIRED`. The owner has 7 days (configurable) to choose `CONVERT_TO_CASH` (payouts for all contributions, ledger moves escrow to owner payable) or `REFUND` (Paystack refunds per contribution). If the owner does not choose, the system refunds automatically.
4. Holding contributions in escrow means Givvly holds customer funds for a period. Confirm the legal and licensing position with counsel before enabling PRODUCT-mode pools (Section 20).

### 9.6 Order state machine

| From | To | Actor | Conditions and side effects |
| --- | --- | --- | --- |
| (none) | PENDING\_PAYMENT | Buyer | Order and payment created; stock soft-reserved 20 min |
| PENDING\_PAYMENT | CONFIRMED | System | Payment SUCCESS; stock decremented; notify buyer, vendor, recipient |
| PENDING\_PAYMENT | CANCELLED | System or buyer | Payment failed, expired (1 h) or user cancel; stock released |
| CONFIRMED | PACKED | Vendor | Vendor note optional |
| CONFIRMED | CANCELLED | Buyer or admin | Only before PACKED; triggers refund |
| PACKED | SHIPPED | Vendor | Requires delivery partner or tracking note; notify buyer and recipient |
| SHIPPED | DELIVERED | Vendor or admin | Sets `deliveredAt`; opens review window; vendor settlement becomes due after the dispute window |
| SHIPPED or DELIVERED | DISPUTED | Buyer | Dispute opened within 14 days of delivery |
| DISPUTED | REFUNDED or DELIVERED | Admin | Refund creates a refund ledger transaction; rejection returns the status |

Any other transition returns 409 `INVALID_STATUS_TRANSITION`. Every change writes `OrderStatusHistory` and emits `order.status_changed`. Digital products skip PACKED and SHIPPED: they go CONFIRMED to DELIVERED when the bills provider confirms.

### 9.7 Wall of love moderation

1. Create post: text passes the profanity filter and link and spam rules. Clean text with no media becomes `VISIBLE`. Flagged text or any media makes the post `PENDING` with `moderationReason`.
2. Media: upload complete → `SCANNING` → virus and type check, strip EXIF, resize → image moderation provider → `READY` or `REJECTED`. A post with all media READY and clean text becomes VISIBLE; a flagged image keeps it PENDING for admin review.
3. Owner can hide, restore or remove any post on their event. Guests report content. Admins resolve the queue.
4. Every status change triggers `revalidate` for the event tag.

### 9.8 Refunds and disputes

- Refunds go through Paystack's refund API, are created by admins (or automatically for cancelled paid orders and expired pools), and are recorded in the ledger on `refund.processed`.
- If the gift was already paid out to the owner, the refund creates an `OWNER_RECEIVABLE` entry and the admin follows the recovery process. Document the policy in the terms of service.
- Disputes: buyer opens → vendor is notified and may respond within 3 days → admin decides refund or reject → both parties notified.

### 9.9 Reconciliation

Daily at 02:00 Lagos time: pull Paystack transactions and transfers for the previous day, compare with `Payment` and `Payout` by reference and amount, and write a `ReconciliationRun` summary (table defined in Section 5.6). Any mismatch (missing, extra, amount differs, status differs) raises an alert and appears in `/admin/reconciliation`. A second check asserts the ledger trial balance sums to zero and `PROVIDER_CLEARING` matches the expected Paystack balance within tolerance.

### 9.10 Scheduled jobs

| Job | Schedule | Action |
| --- | --- | --- |
| `release-expired-reservations` | every minute | Free held items and unpaid soft stock |
| `stuck-payment-sweeper` | every 5 minutes | Verify INITIATED or PENDING payments older than 15 minutes with Paystack |
| `payout-sweeper` | every 5 minutes | Reconcile PROCESSING over 30 minutes; enqueue due retries |
| `pool-deadline-check` | hourly | Expire pools, notify owners, auto-refund after grace |
| `abandoned-orders` | every 15 minutes | Cancel PENDING\_PAYMENT older than 1 hour |
| `close-past-events` | daily | Set events CLOSED 7 days after the date; allow gifts for a grace period if configured |
| `reconcile-paystack` | daily 02:00 | See 9.9 |
| `ledger-integrity` | daily | Trial balance and orphan checks |
| `notification-retry` | every 5 minutes | Retry FAILED notifications under 3 attempts |
| `cleanup` | daily | Purge expired tokens, sessions, idempotency records, old webhook payloads |
| `event-reminders` | daily | Remind RSVP-yes guests one day before |

Scheduled jobs run only on the worker and use a Redis lock so two workers never run the same schedule.

## 10. Success criteria

| Flow | Success means | Verified by |
| --- | --- | --- |
| Register and verify | User row created, verification email sent in under 60 s, token single-use, login works after verification | Integration test; email provider logs |
| Login and refresh | Cookies set with correct flags; refresh rotates; token reuse revokes the family | Integration tests |
| Create and publish event | Event DRAFT then PUBLISHED, unique slug, public GET returns data, private event locked without cookie | Integration test |
| Payout account setup | Name resolved, encrypted account stored, recipient code created, status VERIFIED or PENDING\_REVIEW as per rules | Integration test with Paystack fake |
| Money gift | Payment SUCCESS exactly once, gift PAID, ledger balanced, payout created, owner notified within 30 s, public page updated within 60 s | E2E test; metric `gift_paid_to_notified_seconds` |
| Payout | Transfer reference unique, final status SUCCESS via webhook, ledger posted, no duplicate transfers under retries | Fault-injection tests; daily reconciliation shows zero mismatches |
| Duplicate webhook or double submit | State unchanged on the second delivery; one gift, one payout | Concurrency tests |
| Reservation | At most one buyer per item under 50 concurrent attempts; holds expire on time | Concurrency test |
| Pool | `raisedKobo` equals the sum of PAID contributions; no overshoot; refund path returns every contribution | Property and integration tests |
| Order | Legal transitions only; each change notifies buyer and recipient; history complete | State machine unit tests |
| Moderation | PENDING content never appears publicly; hide takes effect within 60 s | Integration test |
| Reconciliation | Daily run completes; mismatches below 0.1% of volume and all explained | Job output and dashboard |
| Performance | Public event GET p95 under 200 ms (cached); gift initialize p95 under 800 ms excluding Paystack time | k6 load test |

## 11. Error handling

### 11.1 Error format and mapping

A global exception filter converts everything to the error envelope. Domain code throws typed `AppError(code, httpStatus, message, details?)`. Unknown errors become `INTERNAL_ERROR` (500) with the real error logged and sent to Sentry; the client sees only the request id.

| Source | Mapped to |
| --- | --- |
| Zod validation | 422 `VALIDATION_FAILED` with field details |
| Prisma `P2002` unique violation | 409 with a domain code (`EMAIL_TAKEN`, `DUPLICATE_REQUEST`, `ALREADY_EXISTS`) chosen by constraint name |
| Prisma `P2025` not found | 404 `NOT_FOUND` |
| Prisma `P2034` serialization or deadlock | Retry the transaction up to 3 times with jitter, then 409 `CONFLICT_RETRY` |
| Paystack 4xx | 402 `PAYMENT_FAILED` (card errors) or 502 `PROVIDER_ERROR` (our request invalid; alert) |
| Paystack 5xx or timeout | 503 `PROVIDER_UNAVAILABLE` with `Retry-After`; payment stays INITIATED and the sweeper reconciles |
| JWT errors | 401 `UNAUTHENTICATED` or `TOKEN_EXPIRED` |

### 11.2 Error catalog

| Code | HTTP | When |
| --- | --- | --- |
| `VALIDATION_FAILED` | 422 | Input invalid |
| `UNAUTHENTICATED`, `TOKEN_EXPIRED` | 401 | No or expired token |
| `INVALID_CREDENTIALS` | 401 | Wrong email or password |
| `ACCOUNT_LOCKED` | 423 | Too many failed logins |
| `EMAIL_NOT_VERIFIED` | 403 | Action needs a verified email |
| `FORBIDDEN`, `CSRF_INVALID` | 403 | Role or CSRF failure |
| `NOT_FOUND` | 404 | Missing or not visible to the actor |
| `EMAIL_TAKEN` | 409 | Registration conflict |
| `EVENT_LOCKED`, `INVALID_ACCESS_CODE` | 403 | Private event access |
| `EVENT_NOT_PUBLISHED`, `EVENT_CLOSED` | 409 | Event state forbids the action |
| `PAYOUT_NOT_READY` | 409 | Owner has no verified payout account |
| `ITEM_ALREADY_CLAIMED`, `RESERVATION_EXPIRED` | 409 | Registry conflicts |
| `POOL_OVERFUNDED`, `POOL_CLOSED` | 409 | Pool rules |
| `AMOUNT_OUT_OF_RANGE` | 422 | Below minimum or above maximum gift |
| `PAYMENT_FAILED` | 402 | Charge failed |
| `PAYMENT_PENDING` | 202 | Not yet confirmed |
| `DUPLICATE_REQUEST`, `IDEMPOTENCY_MISMATCH` | 409, 422 | Idempotency rules (Section 6.1) |
| `UPLOAD_REJECTED` | 422 | Type, size or scan failure |
| `CONTENT_FLAGGED` | 202 | Accepted but pending review |
| `INVALID_STATUS_TRANSITION` | 409 | State machine violation |
| `OUT_OF_STOCK` | 409 | Product unavailable |
| `RATE_LIMITED` | 429 | Throttled |
| `PROVIDER_UNAVAILABLE`, `PROVIDER_ERROR` | 503, 502 | Upstream issue |
| `INTERNAL_ERROR` | 500 | Unexpected |

The frontend document maps these codes to UI behavior. Adding a code requires updating both documents and the `contracts` package.

### 11.3 Failure handling rules

- **Jobs:** every processor is idempotent. Retries use exponential backoff with jitter. After the final attempt the job moves to a failed set (dead letter), raises an alert, and appears in an admin view. Failed jobs are never silently dropped.
- **Transactions:** keep them short. Never call external APIs inside a DB transaction. Call providers first or after, and make the DB step idempotent.
- **Compensation:** if the DB commit succeeds but an enqueue fails, the outbox sweeper re-enqueues. If a provider call succeeds but the DB write fails, the reference-based reconciliation repairs state (stuck sweepers).
- **Degradation:** Redis down: API returns 503 on rate-limited and queue-dependent routes but serves public cached reads from Postgres. Email provider down: notifications retry and fall back to in-app. SMS or WhatsApp down: fall back to email. Paystack down: money-gift init returns 503 `PROVIDER_UNAVAILABLE`; the event page stays up.
- **Logging levels:** validation errors `info`, auth failures `warn`, provider failures `error`, ledger or reconciliation mismatches `fatal` plus page.

## 12. API and notification UX

The backend has no screens. Its "UX" is how predictable the API is for developers and how clear the messages are for end users.

### 12.1 API experience rules

- Consistent naming and envelopes everywhere; no endpoint returns bare arrays or strings.
- Messages in errors are human-readable, specific and safe to show. Codes are stable and documented; messages may change.
- Lists are paginated and sorted deterministically (always add `id` as a tie-breaker).
- Responses include everything a screen needs in one call where practical (for example event detail includes `moneyGiftsEnabled`, stats, and next actions) to avoid waterfalls.
- Breaking changes need a new version path; additive fields are allowed.

### 12.2 Notification catalog

| Event | Recipient | Channels | Notes |
| --- | --- | --- | --- |
| Verify email, password reset | User | Email | Link with single-use token |
| Gift received | Event owner | In-app, email, WhatsApp or SMS | Shows amount and giver (per anonymity rule); batch if more than 5 per minute |
| Receipt | Giver | Email | Reference, amount, fee, total, event name |
| Payout sent | Owner | In-app, email | Amount and bank last four digits |
| Payout failed or on hold | Owner and admins | In-app, email | Owner told to check bank details; admin alerted with details |
| RSVP received | Owner | In-app, email digest | Daily digest option |
| Registry item claimed, pool contribution, pool funded or expired | Owner | In-app, email |  |
| Wall post pending review | Owner (if their event) | In-app |  |
| Order confirmed, shipped, delivered | Buyer and recipient | In-app, email, WhatsApp or SMS | Recipient message hides the price |
| New order | Vendor | Email, dashboard | Contains recipient delivery details |
| Dispute opened or resolved | Buyer, vendor, admin | Email, in-app |  |
| Thank-you | Giver | Email, WhatsApp or SMS | From the owner, via bulk thank-you |
| Security alert (new payout account, password change) | User | Email | Always sent; cannot be disabled |
| Event reminder | RSVP-yes guests | Email, WhatsApp or SMS | One day before |

### 12.3 Message design and delivery rules

- Email: MJML and Handlebars templates, responsive, plain-text alternative, one primary call to action, unsubscribe link on non-transactional mail, sender `Givvly <no-reply@givvly.ng>` with SPF, DKIM and DMARC set. Subject lines under 60 characters and specific ("Chidi sent you a gift").
- SMS and WhatsApp: short templates (WhatsApp requires pre-approved templates for business-initiated messages), no sensitive data, respect each user's channel preferences and quiet hours (default 22:00 to 07:00 Lagos for non-transactional). Keep an opt-out path.
- Preferences are stored per channel and category; security alerts bypass preferences.
- Idempotent sending: a `Notification` row has a deterministic dedupe key (`type:entityId:channel:recipient`) so retries never double-send.
- All templates have a fake renderer in tests and a preview endpoint in staging.

### 12.4 Admin console data needs

Searchable and filterable tables (user, event, payment reference, payout status), detail pages that join payment, gift, ledger entries and webhook events, one-click retry and hold for payouts, a moderation queue with context (event, author, previous posts), reconciliation results, and an audit trail view.

## 13. State management (server side)

### 13.1 Where state lives

| Store | Holds | Rule |
| --- | --- | --- |
| PostgreSQL | All durable truth: users, events, gifts, payments, payouts, ledger, orders | Source of truth; all money state transitions happen in transactions |
| Redis | Queues (BullMQ), rate limit counters, Google OAuth state, caches, distributed locks, short reservation helpers | Ephemeral; losing it never loses money records |
| Object storage | Media binaries | Referenced by `Media.key` |
| Request context | Request id, user, locale (AsyncLocalStorage) | Never global mutable state |

The API is stateless: any instance can serve any request, and sessions live in the database (refresh tokens) and signed cookies.

### 13.2 Entity state machines

| Entity | States and transitions |
| --- | --- |
| Event | DRAFT → PUBLISHED → CLOSED → ARCHIVED (owner may archive from any non-DRAFT state; DRAFT may be deleted) |
| Payment | INITIATED → PENDING → SUCCESS or FAILED; SUCCESS → REFUNDED or PARTIALLY\_REFUNDED |
| Gift | PENDING → PAID or FAILED; PAID → REFUNDED |
| Payout | QUEUED → PROCESSING → SUCCESS, FAILED or REVERSED; QUEUED → ON\_HOLD → QUEUED; FAILED → QUEUED on retry |
| Registry item | AVAILABLE → RESERVED → CLAIMED; RESERVED → AVAILABLE on expiry or failure |
| Pool | OPEN → FUNDED, or EXPIRED → CONVERTED or REFUNDED |
| Order | See 9.6 |
| Wall post | PENDING → VISIBLE, HIDDEN or REMOVED; VISIBLE ↔ HIDDEN; any → REMOVED |
| Payout account | PENDING → VERIFIED, PENDING\_REVIEW or REJECTED; PENDING\_REVIEW → VERIFIED or REJECTED |

Each machine is implemented as one pure function (`canTransition(from, to, actor)`) with unit tests for every allowed and forbidden pair. Services call it; controllers never set status directly.

### 13.3 Concurrency and consistency

- Use row locks (`FOR UPDATE`) for payments, payouts, pools and registry items; use conditional `UPDATE ... WHERE status = ...` for compare-and-set transitions and check the affected row count.
- Unique constraints are the last line of defence for idempotency (payment reference, ledger transaction reference, webhook event key, gift payout).
- Use the outbox pattern: a transaction writes business rows plus an `OutboxEvent` row; a poller enqueues jobs from the outbox and marks them sent. (Add an `OutboxEvent` table with `id`, `type`, `payload`, `createdAt`, `sentAt` when building.)
- Isolation level: default READ COMMITTED with explicit locks; use SERIALIZABLE only for ledger posting if needed, with retry on serialization failure.

### 13.4 Queues

| Queue | Jobs | Concurrency | Attempts and backoff |
| --- | --- | --- | --- |
| `webhooks` | Process Paystack and bills events | 10 | 8, exponential from 10 s |
| `payouts` | Initiate transfers, retries | 5 (and provider rate limit) | 5, per 9.3 schedule |
| `notifications` | Email, SMS, WhatsApp, in-app | 20 | 3, exponential from 30 s |
| `media` | Scan, resize, moderate | 5 | 3 |
| `orders` | Vendor notifications, stock, digital fulfilment | 5 | 5 |
| `revalidate` | Call the web app revalidation endpoint | 10 | 5, short backoff |
| `reconcile` | Daily reconciliation and checks | 1 | 2 |

Job payloads contain IDs only, never full records or secrets. Job names and payload types live in `jobs/` and are covered by unit tests.

### 13.5 Caching

| Key | TTL | Invalidated by |
| --- | --- | --- |
| `banks:v1` | 24 h | Manual or daily refresh |
| `event:public:<slug>` | 30 s | Gift paid, wall change, event edit (also tells the web app to revalidate) |
| `catalog:list:<hash>` | 5 min | Product changes |
| `ratelimit:*` | Window length | Expiry |
| `lock:<name>` | Short with renewal | Release or expiry |

Cache only public, non-sensitive data. Never cache per-user data keyed loosely. Redis keys use the prefix `givvly:<env>:`.

## 14. Testing plan

### 14.1 Strategy and targets

| Level | Tools | Scope | Target |
| --- | --- | --- | --- |
| Unit | Jest | Services with mocked repositories, fee calculation, state machines (`canTransition`), ledger posting builders, validators, encryption helpers, slug and reference generators | 90% on `payments`, `payouts`, `ledger`, `gifts`, `orders`; 80% overall |
| Integration | Jest + Supertest + Testcontainers (real Postgres and Redis) | Every endpoint: success, validation failure, unauthenticated, wrong role, wrong owner, wrong state | 100% of endpoints have an authorization-matrix test |
| Provider contract | nock or msw fakes of Paystack, bills, messaging, moderation | Request shapes, signature checks, error and timeout behavior | Recorded fixtures reviewed when providers change |
| Concurrency | Jest with parallel promises | Reservation races, pool overfunding, duplicate webhooks, double submit with the same idempotency key | No double-credit, no oversell in 100 runs |
| Property | fast-check | Ledger always balances; fee mode math: owner net plus fee equals charged amount; state machines never reach illegal states | Run in CI |
| Migration | Script in CI | Apply all migrations to an empty database and to a snapshot of the previous release; run seed | Zero errors; no destructive change without an approved plan |
| End-to-end | Playwright against the full stack (shared with the frontend repo) | P0 journeys from the Frontend document, plus payout success through the Paystack test environment | Green on every release |
| Load | k6 | Public event page, gift initialize, webhook burst, wall reads | Section 10 performance targets |
| Security | OWASP ZAP baseline, `pnpm audit`, secret scanning, authz tests | Whole API | No high findings at release |
| Fault injection | Scripts | Kill the worker mid-job, drop Redis, delay Paystack, deliver webhooks out of order | System converges to the correct state |

### 14.2 Must-have test cases (money paths)

1. Valid `charge.success` webhook credits once; second delivery is a no-op; delivery before the client even polls works.
2. Invalid signature returns 401 and stores nothing. Signature verified against the raw body, not re-serialized JSON.
3. Webhook amount differs from the payment: payment marked FAILED, admin alerted, no ledger entries, no payout.
4. `transfer.success` arriving before our PROCESSING update is committed still ends in SUCCESS exactly once.
5. Payout timeout then retry reuses the same reference; only one transfer exists at the provider.
6. `transfer.failed` leaves the ledger consistent, notifies the owner, and allows admin retry.
7. Fee modes: GUEST\_PAYS, OWNER\_PAYS, SPLIT produce correct totals and ledger lines for small and large amounts and rounding edge cases (for example 1 kobo remainder).
8. 50 parallel `reserve` calls on one item: exactly one succeeds. Expired hold can be taken by another buyer; the late payer of the old hold is refunded or rejected.
9. Pool: concurrent contributions near the target never overshoot when overfunding is off; deadline expiry plus refund returns every contribution; convert-to-cash creates the right payouts.
10. Stuck payment sweeper repairs a payment whose webhook was never received.
11. Refund after payout creates the receivable entry and keeps the ledger balanced.
12. Idempotency: same key and body replays the stored response; same key different body returns `IDEMPOTENCY_MISMATCH`.

### 14.3 Security and access tests

- Auto-generated matrix: for every route, call as anonymous, USER, other USER, VENDOR, ADMIN and assert the expected status.
- A user cannot read another user's event, orders, payout accounts or notifications (expect 404).
- A private event is invisible without the unlock cookie, including through the wall, RSVP and gift endpoints.
- CSRF: unsafe cookie-authenticated request without the token returns 403.
- Rate limit tests for login, unlock, register, gift initialize.
- Refresh token reuse revokes the whole family.

### 14.4 Rules

- Tests run against real Postgres and Redis (Testcontainers), not SQLite or mocks, for anything involving transactions, locks, or constraints.
- Each test creates its own data through factories; no shared fixtures that couple tests.
- Time is injected (a `Clock` service) so expiry and schedules are testable without sleeping.
- No test calls real providers in CI. A separate nightly job runs a small smoke suite against Paystack's test environment.
- Flaky tests are fixed or quarantined within 48 hours.

## 15. Security plan

### 15.1 Authentication and authorization

- Passwords hashed with argon2id (memory 19 MiB or higher, time cost 2 or higher, tuned on the production hardware). Never log or return hashes.
- JWT signed with RS256 (private key only on the API). Short access token (15 minutes). Refresh tokens rotate, are stored hashed, and reuse revokes the family.
- Cookies: `HttpOnly`, `Secure`, `SameSite=Lax`, domain-scoped, with a double-submit CSRF token for unsafe methods.
- Login lockout after 5 failures (15 minutes), uniform error messages, and equal-time responses for unknown emails.
- Authorization is deny-by-default (Section 7.1). Ownership checks happen in the service or guard, never in the client. Return 404 for resources the actor must not know about.
- Admins: strong passwords, TOTP two-factor authentication (required before launch), IP and device audit, short sessions (2 hours), and every action audited.
- Google sign-in: authorization code flow with PKCE and `state`; link accounts only when the Google email is verified.

### 15.2 Data protection

- Bank account numbers: AES-256-GCM application-level encryption with a key from a secrets manager or KMS (`ENCRYPTION_KEY`), unique IV per record, key id stored for rotation. Lookups use an HMAC (`accountHash`). API responses show only the last four digits.
- Access codes (private events) and tokens are stored as hashes; reset and verification tokens are single-use with short expiry.
- No card data ever touches Givvly (Paystack collects it). Do not log request bodies for payment routes.
- Encryption in transit everywhere (TLS 1.2 or higher, including database and Redis connections). Encryption at rest for the database, Redis persistence, backups and object storage.
- Logs redact: `authorization`, cookies, `password`, `token`, `accountNumber`, `email` where not needed, `phone`.
- Data minimization: guests are not required to create accounts; store only what the flow needs.

### 15.3 Rate limiting and abuse controls

| Route | Limit |
| --- | --- |
| `POST /auth/login` | 10 per minute per IP; 5 failures per 15 minutes per account |
| `POST /auth/register` | 5 per hour per IP |
| `POST /auth/forgot-password` | 3 per hour per email, 10 per hour per IP |
| `POST /auth/resend-verification` | 1 per minute per user |
| `POST /public/events/:slug/unlock` | 5 per 15 minutes per IP and slug |
| `POST /public/events/:slug/gifts/*` | 10 per hour per IP, 5 per hour per email |
| `POST /public/events/:slug/rsvps` | 20 per hour per IP |
| `POST /public/events/:slug/wall` | 10 per hour per IP |
| `POST /reports` | 10 per hour per IP |
| `POST /uploads/presign` | 20 per hour per user or per IP for guests (with captcha) |
| Public GETs | 120 per minute per IP |
| Authenticated API (default) | 300 per minute per user |
| Webhooks | Exempt from throttling, protected by signature verification |

Use Redis-backed counters. Return 429 with `Retry-After`. Add CAPTCHA (Cloudflare Turnstile or hCaptcha) to guest wall posts with media and to registration under suspicious conditions. Maintain an IP and email blocklist managed from admin.

### 15.4 Payment and fraud controls

- The server decides amounts and fees. Client amounts are only inputs that are re-validated and bounded.
- Verify every payment with Paystack (`verify`) before crediting, even after a signed webhook.
- Event owner verification: bank account name must match the profile name (fuzzy) or go to manual review. New-account payout hold (default 24 hours). Large first payouts and unusual velocity go to `ON_HOLD` for review.
- Block creation of events that match fraud patterns (sensitive keywords for fake charity or emergency appeals) into admin review before publish; admins can disable gifting on an event instantly.
- Per-event and per-day gift limits; anomaly alerts (many small gifts from one IP, many chargebacks).
- Refund and chargeback handling documented in the terms; admin-only refunds with audit.
- Never trust webhook payload fields alone; never process a webhook that fails signature verification; treat webhook ordering as unreliable.

### 15.5 File uploads

- Presigned PUT URLs with enforced content type and content length conditions, 5-minute expiry, random keys (`uploads/<purpose>/<uuid>`).
- After upload: verify magic bytes (not just the declared MIME), cap dimensions, strip EXIF (including GPS) and re-encode with `sharp`, scan for malware, and run image moderation. Only READY media is ever linked or served.
- Serve through a CDN domain separate from the app origin, with `Content-Disposition` and `X-Content-Type-Options: nosniff`. Do not accept SVG or any executable or HTML-capable type.

### 15.6 Application security (OWASP)

- **Injection:** Prisma parameterizes queries; `$queryRaw` only with tagged template literals; never string-build SQL.
- **Mass assignment:** strict DTOs; services map fields explicitly.
- **SSRF:** the server never fetches user-supplied URLs.
- **XSS:** the API returns JSON only and escapes nothing into HTML except email templates, where all user text is escaped by Handlebars (use `{{ }}`, never `{{{ }}}` for user content).
- **Security headers:** `helmet` defaults, strict CORS allowlist (`CORS_ORIGINS`), no wildcard with credentials.
- **Error messages:** no stack traces or SQL in responses.
- **Dependencies:** lockfile, weekly Dependabot, `pnpm audit` gate, review new packages, pin versions, prefer well-maintained libraries.
- **Config:** secrets only from the environment or secrets manager; `.env` files never committed; production config validated at boot.

### 15.7 Privacy and compliance (Nigeria)

- Follow the Nigeria Data Protection Act (NDPA) and its regulator's guidance. Confirm obligations with counsel, including registration or filing requirements, lawful basis for each data use, and data processing agreements with Paystack, email, SMS, WhatsApp, moderation and cloud providers.
- Record consent for notifications and marketing; honor opt-outs.
- Data subject requests: export (`GET /me/export`, async) and deletion (`DELETE /me`: anonymize personal fields, keep financial records required by law, remove wall posts on request).
- Breach response: written incident process, notification timelines as required by law, and an on-call owner.
- Regulatory check for money handling: Givvly instructs payment collection and transfers through a licensed provider and does not hold balances for owners in the cash flow. PRODUCT-mode pools and any delayed settlement change this position; obtain legal advice before launching them.
- Terms and privacy documents must describe fees, refunds, anonymous giving visibility, content rules and account suspension.

### 15.8 Secrets, access and operations

- Secrets in a managed store (AWS Secrets Manager, Doppler, Vault or the platform's encrypted variables). Separate keys per environment. Rotate on staff changes and on a schedule (Paystack keys, JWT keys with overlap via key ids, encryption keys with re-encryption job).
- Least-privilege database users (app user cannot drop tables; migration user is separate). No direct production database access except break-glass with audit.
- Production access through SSO and MFA; staging data is synthetic.
- Backups encrypted, restore tested quarterly.
- A security review and external penetration test before public launch and after major payment changes.

## 16. Deployment plan

### 16.1 Environments

| Env | Purpose | Data | Providers |
| --- | --- | --- | --- |
| Local | Development via Docker Compose (Postgres, Redis, Mailpit, MinIO) | Seed data | Fakes and Paystack test keys |
| CI | Tests with Testcontainers | Ephemeral | Fakes |
| Staging | Integration, QA, demos, e2e | Synthetic | Paystack test, sandbox providers |
| Production | Live | Real | Live keys |

### 16.2 Runtime architecture

- **API** container (stateless, 2 or more instances behind a load balancer) and **Worker** container (same image, command `node dist/worker.js`, scaled by queue depth). One cron owner via Redis locks.
- **PostgreSQL**: managed service with automated backups and point-in-time recovery, TLS, connection pooling (PgBouncer or provider pooler) for Prisma, and a read replica later for reporting.
- **Redis**: managed, persistence enabled (AOF), `maxmemory-policy noeviction` (BullMQ requires it), not a serverless HTTP Redis.
- **Object storage** (S3 or Cloudflare R2) behind a CDN; separate buckets per environment, private by default.
- **Email** via SMTP transactional provider with a verified domain; **SMS and WhatsApp** providers configured per environment.
- **Reverse proxy and TLS** at the platform edge; HSTS on.

Hosting is a team decision (container platform such as Railway, Render, Fly.io, AWS ECS, or a VPS with Docker). Choose one that supports private networking to the database, multiple instances, secrets management and zero-downtime deploys.

### 16.3 Environment variables

| Variable | Notes |
| --- | --- |
| `NODE_ENV`, `PORT`, `LOG_LEVEL` | Runtime |
| `APP_URL`, `API_URL`, `CORS_ORIGINS`, `COOKIE_DOMAIN` | URLs and cookie scope |
| `DATABASE_URL`, `DIRECT_URL` | Pooled and direct (migrations) connections |
| `REDIS_URL` | Queues, cache, throttling |
| `JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY`, `JWT_KEY_ID` | RS256 signing and rotation |
| `ENCRYPTION_KEY`, `ENCRYPTION_KEY_ID`, `ACCOUNT_HASH_KEY` | Field encryption and HMAC |
| `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY`, `PAYSTACK_BASE_URL` | Payments, transfers, webhook signature |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | Nodemailer |
| `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `CDN_URL` | Media |
| `SMS_API_KEY`, `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID` | Messaging |
| `BILLS_API_KEY`, `BILLS_BASE_URL` | Digital gifts |
| `MODERATION_API_KEY` | Image moderation |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | OAuth |
| `REVALIDATE_URL`, `REVALIDATE_SECRET` | Web app cache revalidation |
| `FEE_MODE`, `FEE_BPS`, `FEE_FLAT_KOBO`, `FEE_CAP_KOBO`, `MIN_GIFT_KOBO`, `MAX_GIFT_KOBO` | Business rules |
| `PAYOUT_NEW_ACCOUNT_HOLD_HOURS`, `PAYOUT_LARGE_GIFT_KOBO`, `RESERVATION_MINUTES` | Risk and timing rules |
| `SENTRY_DSN`, `OTEL_EXPORTER_OTLP_ENDPOINT` | Observability |
| `TURNSTILE_SECRET` | CAPTCHA |

Validate all variables with zod at boot; the process exits with a clear message if one is missing or malformed. Provide `.env.example` without secrets.

### 16.4 Build and release

1. Multi-stage Dockerfile: install with frozen lockfile, `prisma generate`, build, prune dev dependencies, run as a non-root user. One image for API and worker.
2. CI (GitHub Actions): lint, type-check, unit tests, integration tests (Testcontainers), migration check, build image, vulnerability scan (Trivy), push to registry.
3. Deploy to staging automatically from `main`; run smoke tests and the P0 e2e suite.
4. Production: manual approval. Release order: (a) run `prisma migrate deploy` as a one-off job, (b) roll out workers, (c) roll out API instances gradually, (d) smoke test, (e) tag release. A failed health check rolls back automatically.
5. **Migrations use expand then contract:** add columns and tables first (backward compatible), deploy code that writes both, backfill, switch reads, and remove old columns in a later release. Never rename or drop in the same release as the code change. Destructive migrations need review.
6. Rollback: redeploy the previous image; database stays compatible by the expand and contract rule. Feature flags (environment-driven) guard risky features such as PRODUCT-mode pools and digital gifts.

### 16.5 Health, scaling and recovery

- `GET /health/live` (process up) and `GET /health/ready` (database, Redis, and queue reachable). Graceful shutdown: stop accepting requests, finish in-flight work, close queues cleanly.
- Scale API on CPU and latency; scale workers on queue depth. Respect Paystack rate limits in the payouts queue.
- Backups: daily full plus continuous WAL (point-in-time recovery). Targets: RPO 5 minutes, RTO 1 hour. Test a restore each quarter and record the result.
- Disaster plan: documented steps to restore the database, re-point services, replay unprocessed webhooks (`WebhookEvent` with status RECEIVED or FAILED) and run reconciliation.

### 16.6 First-time setup and go-live checklist

- Provision environments, secrets, DNS (`api.givvly.ng`), TLS, email domain (SPF, DKIM, DMARC), storage and CDN.
- Run migrations and seed system data: ledger accounts (`PROVIDER_CLEARING`, `PLATFORM_REVENUE`, `PROVIDER_FEES`, `REFUNDS`), invite templates, collections, an admin user with 2FA.
- Configure Paystack: live keys, webhook URL `https://api.givvly.ng/api/v1/webhooks/paystack`, transfers enabled on the account (and confirm any OTP requirement for transfers is disabled for API-initiated payouts), IP allowlist if offered.
- Verify: signature check with a live test event, a real small payment end to end, payout lands, reconciliation job passes, refund path works.
- Alerts and dashboards live (Section 17); on-call rota and runbooks published; legal pages and consent in place; penetration test findings closed.

## 17. Observability and operations

### 17.1 Logging, metrics and tracing

- Structured JSON logs with `requestId`, `userId` (hashed), route, latency, and status. Correlate jobs with the originating request id.
- Metrics: HTTP rate, latency p50 p95 p99, error rate by route, queue depth and age per queue, job failures, payment initiate to success time, payout success rate and time, webhook lag, notification send success by channel, DB pool usage, Redis memory.
- Optional OpenTelemetry traces across API, queue and provider calls.

### 17.2 Alerts (page on call)

| Alert | Condition |
| --- | --- |
| Payment success rate drop | Below 85% over 15 minutes (tune after launch) |
| Webhook backlog | Oldest unprocessed `WebhookEvent` older than 5 minutes |
| Payout failures | More than 3 FAILED in 15 minutes, or any payout PROCESSING over 30 minutes |
| Payouts ON\_HOLD | Count above 0 for more than 4 hours |
| Reconciliation mismatch | Any unexplained difference |
| Ledger imbalance | Trial balance not zero (critical) |
| API errors | 5xx rate above 2% for 5 minutes; p95 above 1.5 s |
| Queue depth | Notifications or payouts older than 10 minutes |
| Infrastructure | Database CPU or connections above 80%, Redis memory above 80%, disk above 80% |

### 17.3 Runbooks (write before launch)

1. Payout failed or stuck. 2. Webhook not received or failing signature. 3. Reconciliation mismatch. 4. Paystack outage (disable new gifts gracefully, communicate). 5. Redis outage and recovery. 6. Database failover and restore. 7. Fraud report (disable event, hold payouts, notify). 8. Leaked secret (rotate and audit). 9. Email or SMS provider outage. 10. Data subject request.

## 18. Master list: do and do not

**Do**

- Keep money in integer kobo and record every movement in the ledger.
- Treat the verified webhook as truth; verify with the provider before crediting.
- Make every job and endpoint that moves money idempotent, with unique constraints behind it.
- Use transactions with row locks for state changes; check affected row counts.
- Hide providers behind interfaces and test with fakes.
- Default to deny in authorization and return 404 for resources the actor must not know about.
- Write tests with the code, especially for payments, payouts, ledger and state machines.
- Keep controllers thin and modules independent.

**Do not**

- Do not trust the browser callback or any client-supplied amount.
- Do not call external APIs inside a database transaction.
- Do not delete or edit ledger or payment records; post reversing entries instead.
- Do not log secrets, tokens, bank numbers or full request bodies on payment routes.
- Do not return raw database models; shape responses explicitly.
- Do not read another module's tables directly.
- Do not change an order or payout status without the state machine function.
- Do not run migrations that drop or rename in the same release as the dependent code change.
- Do not ship a feature that can hold customer funds before the legal position is confirmed.

## 19. Build order and definition of done

### 19.1 Order of work

1. **Setup (week 1):** monorepo, config validation, Prisma, Docker Compose, CI, logging, error envelope, health checks, queue and Redis wiring, provider interfaces with fakes.
2. **Auth (weeks 1 to 2):** register, login, refresh rotation, email verification, reset, Google, sessions, CSRF, rate limits, roles.
3. **Events and payout accounts (weeks 2 to 3):** events CRUD and publish, slugs, private access, media presign, banks, resolve, encrypted accounts, Paystack recipient.
4. **Money gifts and ledger (weeks 3 to 5):** payments initialize, webhook pipeline, verify, ledger posting, payouts queue with retries, reconciliation job, stuck sweepers, owner stats and feed.
5. **Wall, notifications, admin basics (weeks 5 to 6):** posts and moderation, notification pipeline with Nodemailer and preferences, admin payments, payouts, moderation, audit log.
6. **Phase 2 (weeks 7 to 8):** invites, RSVP and export, image pipeline, keepsake, event auto-close.
7. **Phase 3 (weeks 9 to 13):** catalog, vendors, registry and reservations, pools, orders and state machine, vendor APIs, reviews, disputes, refunds.
8. **Phase 4 (later):** digital gifts, video, trending, recipient-confirms-address.
9. **Hardening before each launch:** load tests, fault injection, security review, runbooks, backup restore drill.

Timings assume one to two backend developers; adjust to your team.

### 19.2 Definition of done (every ticket)

- Implements the spec here, including validation, authorization and error codes.
- Unit and integration tests added and passing, including the authorization matrix for new routes.
- Migration is backward compatible and reviewed; OpenAPI and `contracts` updated.
- Logs, metrics and alerts added where money or jobs are involved.
- No secrets in code; config added to the env schema and `.env.example`.
- Reviewed by another developer; deployed to staging and smoke tested.

## 20. Open decisions to confirm before build

1. Fee model and numbers (`FEE_MODE`, `FEE_BPS`, caps) after modelling provider fees against typical gift sizes.
2. Whether the owner sees the identity of anonymous givers (this document assumes the owner sees "Anonymous" and the amount; admins can see identity).
3. Legal position on PRODUCT-mode pools and any escrow, and on refund and chargeback recovery after payout.
4. Hosting platform and region for API, worker, database and Redis.
5. Email, SMS and WhatsApp providers; WhatsApp template approvals and lead time.
6. Image moderation provider and thresholds; CAPTCHA provider.
7. Gift limits (minimum, maximum, daily per event) and payout hold rules.
8. Whether guests must have an email for money gifts (assumed yes, for receipts).
9. Retention period for financial records and the account deletion policy.
10. Vendor settlement terms (timing, commission, dispute window) for Phase 3.
