# Givvly: Frontend Implementation Document

Version 1.0. Audience: frontend developers. Stack: Next.js, TypeScript, Tailwind CSS, Zustand, shadcn/ui, TanStack Query. Companion document: Givvly Backend Implementation Document.

## 1. How to use this document

This document is the single source of truth for building the Givvly web app. Build in the order of Section 17. Every screen, form, route, state slice and error case is specified. If something is not specified, do not invent it: raise it as a question and add the answer here.

Two notes on sections that normally describe a backend:

- **Database schema (Section 12)** means the client-side data model: TypeScript types that mirror API responses, plus what is persisted in browser storage.
- **API design (Section 7)** means the API contract as the frontend consumes it: which endpoints each screen calls, the fetch layer, query keys, and error mapping. The server side of those endpoints is in the Backend document.

### Conventions used

- Money is always an integer in kobo (1 naira = 100 kobo) in code, API and state. Format only at the edge with `formatNaira(kobo)`. Never use floats for money.
- Dates travel as ISO 8601 UTC strings. Display in the user's locale with `date-fns`, default timezone Africa/Lagos.
- "MUST" means required. "MUST NOT" means forbidden. "SHOULD" means do it unless you have a written reason.

## 2. Product scope and features

Givvly is an events-first gifting platform: an owner creates an event, guests RSVP and give money, registry items or group gifts, and everyone can also send direct gifts from a curated catalog. Delivery is handled by vendors; payments and payouts by the platform.

### Phase 0: Foundations

- App shell, design system, auth pages, API client, error boundaries, analytics hooks, feature flags.

### Phase 1: Event core and money gifts (MVP)

- Sign up and sign in (email and password, Google). Email verification. Password reset.
- Create event wizard: type, name, date, cover image, story, visibility (public or private with access code).
- Payout setup: bank, account number, name verification, required before money gifts are enabled.
- Public event page with link preview (Open Graph image), server rendered.
- Guest money gift flow with optional anonymous giving, message, and receipt.
- Wall of love (text messages), owner hide and delete, guest report button.
- Owner dashboard: live gift feed, totals, payouts status, thank-you list, share tools.
- Notification preferences (email, WhatsApp or SMS, in-app).

### Phase 2: Invites, RSVP and media

- Invite template picker (3 to 5 templates), fill-in editor, live preview, publish. The invite page and event page are one URL.
- RSVP form with plus-one; owner guest list with export to CSV.
- Photo upload on the wall of love with moderation states. Keepsake summary page after the event.
- International card support: currency display for diaspora guests.

### Phase 3: Registry, physical gifts, group gifts

- Curated catalog (browse, filter by occasion, relationship, budget), product detail.
- Registry management for owners. Guest buy flow with a reservation hold.
- Group gifts (pooled items) with progress bar and deadline.
- Direct gifting (no event): checkout with recipient details, gift note, wrapping options.
- Order tracking for gifter, recipient (token link) and guest. Ratings and dispute form.
- Vendor portal: orders, status updates, products.
- Admin console: moderation queue, events, payments, payouts, ledger, vendors, disputes.

### Phase 4 and later

- Digital gifts (airtime, vouchers, gift cards), video messages, trending gifts, recipient-confirms-address, planner accounts.

### Out of scope for the web app v1

- Native mobile apps, in-app chat, social feed, multi-currency settlement, subscription plans.

## 3. Tech stack and justification

| Tool                 | Role                 | Why                                                                                     | Rules                                                                                                 |
| -------------------- | -------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Next.js (App Router) | Framework            | SSR and ISR for shareable event pages, file routing, route handlers, image optimization | Use Server Components by default. Add `'use client'` only when needed (state, effects, browser APIs). |
| TypeScript (strict)  | Language             | Types shared with API contract                                                          | `strict: true`, `noUncheckedIndexedAccess: true`. No `any`. Use `unknown` and narrow.                 |
| Tailwind CSS         | Styling              | Fast, consistent, small CSS                                                             | Design tokens in `tailwind.config.ts`. No inline hex colors in components.                            |
| shadcn/ui            | Component primitives | Accessible Radix-based components you own                                               | Copy components into `src/components/ui`. Do not edit behavior; wrap them instead.                    |
| TanStack Query       | Server state         | Caching, retries, invalidation, polling                                                 | All API data lives here. Never copy it into Zustand.                                                  |
| Zustand              | Client state         | Small global UI and draft state                                                         | Only for client-only state (see Section 6).                                                           |

### Supporting tools (justified)

- **react-hook-form + zod + @hookform/resolvers**: form state and schema validation. Zod schemas live in a shared `contracts` package so the backend uses the same rules.
- **date-fns, date-fns-tz**: date handling. Do not use moment.
- **next-safe-action or plain route handlers**: only for BFF needs (cookie refresh). Do not build a second API in Next.
- **jose**: verify JWT in middleware to read role. Not for signing.
- **sonner** (via shadcn): toasts. **lucide-react**: icons. **react-dropzone**: uploads. **qrcode.react**: event QR codes.
- **Paystack Inline JS**: payment popup (loaded only on pages that need it).
- **Sentry**: error tracking. **PostHog** or Plausible: analytics. **web-vitals**: performance.
- **Vitest, React Testing Library, MSW, Playwright, axe-core**: testing (Section 13).
- **ESLint (next, typescript-eslint, jsx-a11y), Prettier, Husky, lint-staged, commitlint**: code quality.
- **pnpm** workspace with Turborepo recommended: `apps/web`, `packages/contracts` (zod schemas and types), `packages/config`.

### Versions

Pin exact versions in `package.json` and commit `pnpm-lock.yaml`. Upgrade deliberately, one major at a time, with the test suite green.

## 4. Project structure

```
apps/web/src
  app/                       # routes only: layouts, pages, loading, error
    (marketing)/             # home, gifts catalog, legal
    (auth)/                  # login, signup, reset
    (event)/e/[slug]/        # public event pages
    (app)/                   # protected user area
      dashboard/ events/ orders/ account/
    vendor/ admin/
    api/auth/refresh/        # cookie refresh route handler
  features/                  # one folder per domain
    auth/ events/ gifts/ registry/ rsvp/ catalog/ orders/ notifications/ moderation/ vendor/ admin/
      components/ hooks/ api.ts keys.ts schemas.ts types.ts
  components/ui/             # shadcn primitives
  components/shared/         # Money, Avatar, EmptyState, ErrorState, Countdown, ShareMenu
  lib/                       # api-client.ts, format.ts, env.ts, cn.ts, analytics.ts
  stores/                    # zustand stores
  styles/globals.css
  middleware.ts
```

Rules:

- Pages in `app/` stay thin: fetch on the server, render feature components.
- Features MUST NOT import from other features' internals. Import only from the feature's `index.ts`.
- Shared UI goes in `components/shared`. No circular imports (enforced with `eslint-plugin-import`).
- One component per file, PascalCase file names. Hooks start with `use`. Max about 200 lines per component; split beyond that.

## 5. Routing

All routes use the App Router. Access levels: **Public** (anyone), **Guest-OK** (works without account), **Auth** (logged in), **Vendor**, **Admin**.

### 5.1 Public and guest routes

| Route                                 | Access                              | Rendering                              | Purpose                                                  |
| ------------------------------------- | ----------------------------------- | -------------------------------------- | -------------------------------------------------------- |
| `/`                                   | Public                              | Static + ISR (10 min)                  | Landing, featured public events, how it works            |
| `/gifts`                              | Public                              | ISR (5 min), filters via search params | Catalog browse                                           |
| `/gifts/[slug]`                       | Public                              | ISR                                    | Product detail                                           |
| `/e/[slug]`                           | Public (or private after unlock)    | SSR with tag revalidation, OG image    | Event and invite page: story, RSVP, registry, give, wall |
| `/e/[slug]/unlock`                    | Public                              | Client                                 | Enter access code for private events                     |
| `/e/[slug]/give`                      | Guest-OK                            | Client                                 | Give flow: money, registry item, group gift              |
| `/e/[slug]/give/success`              | Guest-OK                            | Client                                 | Receipt after payment (reads `?ref=`)                    |
| `/checkout/[slug]`                    | Guest-OK for browsing, Auth to pay  | Client                                 | Direct gift checkout                                     |
| `/checkout/success`                   | Auth                                | Client                                 | Order confirmation                                       |
| `/track/[token]`                      | Public with token                   | SSR                                    | Order tracking for recipients and guests                 |
| `/login`, `/signup`                   | Public only (redirect if logged in) | Client                                 | Auth                                                     |
| `/forgot-password`, `/reset-password` | Public                              | Client                                 | Password recovery                                        |
| `/verify-email`                       | Public                              | Client                                 | Consumes `?token=`                                       |
| `/auth/google/callback`               | Public                              | Route handler                          | OAuth return                                             |
| `/privacy`, `/terms`, `/help`         | Public                              | Static                                 | Legal and support                                        |
| `not-found`, `error`, `global-error`  | n/a                                 | n/a                                    | Fallbacks                                                |

### 5.2 Authenticated routes (role USER)

| Route                     | Purpose                                               |
| ------------------------- | ----------------------------------------------------- |
| `/dashboard`              | My events, quick stats, recent gifts, notifications   |
| `/events/new`             | Create event wizard (5 steps)                         |
| `/events/[id]`            | Event overview, status, share tools                   |
| `/events/[id]/gifts`      | Gift feed, filters, thank-you tracking                |
| `/events/[id]/registry`   | Manage registry items and group gifts                 |
| `/events/[id]/guests`     | RSVPs, invite list, CSV export                        |
| `/events/[id]/invite`     | Template picker and editor                            |
| `/events/[id]/wall`       | Wall moderation (hide, delete, restore)               |
| `/events/[id]/thank-you`  | Thank-you list with bulk message                      |
| `/events/[id]/settings`   | Edit event, visibility, access code, close or archive |
| `/events/[id]/summary`    | Keepsake preview and publish toggle                   |
| `/orders`, `/orders/[id]` | My sent gifts and tracking, rate, open dispute        |
| `/account`                | Profile                                               |
| `/account/payout`         | Bank account and verification status                  |
| `/account/notifications`  | Channel preferences                                   |
| `/account/security`       | Password, sessions, delete account                    |

### 5.3 Vendor and admin

- Vendor (role VENDOR): `/vendor`, `/vendor/orders`, `/vendor/orders/[id]`, `/vendor/products`.
- Admin (role ADMIN): `/admin`, `/admin/moderation`, `/admin/events`, `/admin/payments`, `/admin/payouts`, `/admin/ledger`, `/admin/orders`, `/admin/vendors`, `/admin/disputes`, `/admin/users`.

### 5.4 Route guards

Guarding happens in three layers. All three are required.

1. **`middleware.ts` (edge)**: reads the httpOnly `givvly_at` access cookie, verifies the JWT signature with `jose`, and checks `exp` and `role`.
   - No valid token and a refresh cookie exists: redirect to `/api/auth/refresh?next=<path>`. That route handler calls the backend refresh endpoint, forwards the new `Set-Cookie` headers, then redirects to `next`.
   - No token and no refresh: redirect to `/login?next=<path>`.
   - Wrong role: redirect to `/dashboard` (or `/` for guests) with a `?error=forbidden` toast.
   - Matcher covers `/dashboard`, `/events/:path*`, `/orders/:path*`, `/account/:path*`, `/vendor/:path*`, `/admin/:path*`, `/checkout/success`, and the auth pages (to bounce logged-in users).
2. **Server layout guard**: `(app)/layout.tsx`, `vendor/layout.tsx`, `admin/layout.tsx` call `getSession()` (server fetch of `/auth/me`). If it fails, `redirect()`. This protects against stale middleware decisions.
3. **Resource guard**: pages under `/events/[id]` fetch the event; a 403 or 404 from the API renders `notFound()`. Never rely on hiding links as security.

Auth cookies are issued by the API on the parent domain (for example `Domain=.givvly.vercel.app`, `HttpOnly`, `Secure`, `SameSite=Lax`) so the Next server can read them. In local development both apps run on `localhost` and share cookies.

### 5.5 Navigation rules

- Use `next/link` for all internal links. Use `router.push` only after mutations.
- Preserve intent: protected redirects carry `?next=`. After login, validate `next` is a relative path starting with `/` and not `//`. Reject anything else (open redirect protection).
- Private events: server-side check; if locked, redirect to `/e/[slug]/unlock`. After a correct code the API sets a short-lived signed cookie `givvly_ev_<slug>`.
- Every route has `loading.tsx` (skeleton) and `error.tsx` (retry button, error id).

## 6. State management

The rule: **server data in TanStack Query, client-only state in Zustand, form state in react-hook-form, URL state in search params.** Do not mix.

### 6.1 TanStack Query

- One `QueryClient` per request on the server (via `HydrationBoundary`) and one singleton in the browser.
- Defaults: `staleTime: 30_000`, `gcTime: 5 * 60_000`, `retry: 2` for network errors and 5xx only (never retry 4xx), `refetchOnWindowFocus: true`.
- Query key factory per feature in `keys.ts`, for example:

```ts
export const eventKeys = {
  all: ["events"] as const,
  mine: () => [...eventKeys.all, "mine"] as const,
  detail: (id: string) => [...eventKeys.all, "detail", id] as const,
  gifts: (id: string, f: GiftFilters) =>
    [...eventKeys.detail(id), "gifts", f] as const,
  public: (slug: string) => [...eventKeys.all, "public", slug] as const,
};
```

- Live feed: the owner gift feed uses `refetchInterval: 15_000` while the tab is visible. The public wall uses 30 seconds. Move to SSE later without changing components.
- Mutations: use `useMutation` with `onSuccess` invalidation of the narrowest key. Use optimistic updates only for hide, delete, mark thanked, and RSVP toggles, with rollback in `onError`.
- Payments: never optimistic. After the popup closes, poll `GET /payments/:ref` every 2 seconds up to 60 seconds until status is SUCCESS or FAILED.

### 6.2 Zustand stores

| Store                 | State                                                                                        | Persistence                                               |
| --------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `useAuthStore`        | `user`, `status` (`loading`, `authed`, `guest`), `setUser`, `clear`                          | Memory only; hydrated from `/auth/me`                     |
| `useGiveDraftStore`   | Guest give draft: `eventSlug`, `type`, `amountKobo`, `name`, `message`, `anonymous`, `email` | `sessionStorage`, cleared on success                      |
| `useEventWizardStore` | Create-event wizard draft and step                                                           | `localStorage` key `givvly.wizard.v1`, cleared on publish |
| `useUiStore`          | Open dialogs, mobile nav, theme                                                              | `localStorage` for theme only                             |
| `useCartStore`        | Direct-gift checkout draft (product, recipient, note, wrap)                                  | `sessionStorage`                                          |

Rules: stores are tiny, typed, with selectors (`useAuthStore(s => s.user)`). Never store tokens in any store or storage; tokens live only in httpOnly cookies. Never store server lists in Zustand.

### 6.3 Other state

- **URL state**: catalog filters, tabs, pagination use `useSearchParams` and are shareable.
- **Form state**: react-hook-form only. Reset on unmount.

## 7. API integration layer (the contract as consumed by the frontend)

Base URL comes from `NEXT_PUBLIC_API_URL` (browser) and `API_INTERNAL_URL` (server). All endpoints are under `/api/v1`. Responses use one envelope:

```ts
type ApiSuccess<T> = {
  data: T;
  meta?: { page: number; pageSize: number; total: number; nextCursor?: string };
};
type ApiError = {
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
    requestId: string;
  };
};
```

### 7.1 Fetch client (`lib/api-client.ts`)

One function, `api<T>(path, opts)`, used by every feature `api.ts`. Responsibilities:

- Sends `credentials: 'include'`, `Content-Type: application/json`, and `X-Request-Id` (uuid).
- On unsafe methods (POST, PUT, PATCH, DELETE) adds `X-CSRF-Token` read from the non-httpOnly `givvly_csrf` cookie.
- Payment-creating calls add `Idempotency-Key` (a uuid generated once per user attempt and kept in the give draft until success).
- Parses the envelope. On a non-2xx response throws `ApiClientError { status, code, message, details, requestId }`.
- On `401` with code `TOKEN_EXPIRED`: calls `POST /auth/refresh` once (single-flight promise shared by concurrent requests), then replays the original request once. If refresh fails, clears `useAuthStore` and redirects to `/login?next=`.
- On the server (RSC), forwards the incoming cookies using `cookies()` from `next/headers`, and uses `cache: 'no-store'` for private data or `next: { revalidate, tags }` for public data.
- Never logs request bodies. Never puts secrets in query strings.
- In development, validates responses with the zod schema from `contracts` and logs mismatches.

### 7.2 Endpoints consumed, by screen

| Screen                      | Calls                                                                                                                                                                                                         |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Signup                      | `POST /auth/register`                                                                                                                                                                                         |
| Login                       | `POST /auth/login`, `GET /auth/google/url`                                                                                                                                                                    |
| Session bootstrap           | `GET /auth/me`                                                                                                                                                                                                |
| Verify email                | `POST /auth/verify-email`                                                                                                                                                                                     |
| Forgot and reset            | `POST /auth/forgot-password`, `POST /auth/reset-password`                                                                                                                                                     |
| Create event wizard         | `POST /uploads/presign`, `POST /events`, `PUT /events/:id/invite`, `POST /events/:id/publish`                                                                                                                 |
| Payout setup                | `GET /banks`, `POST /payout-accounts/resolve`, `POST /payout-accounts`                                                                                                                                        |
| Event page (public)         | `GET /public/events/:slug`, `GET /public/events/:slug/wall`, `POST /public/events/:slug/unlock`                                                                                                               |
| RSVP                        | `POST /public/events/:slug/rsvps`                                                                                                                                                                             |
| Give money                  | `POST /public/events/:slug/gifts/money`, `GET /payments/:reference`                                                                                                                                           |
| Registry buy and group gift | `POST /public/events/:slug/registry/:itemId/reserve`, `POST /public/events/:slug/gifts/item`, `POST /public/events/:slug/gifts/pool`                                                                          |
| Wall post                   | `POST /public/events/:slug/wall`, `POST /uploads/presign`                                                                                                                                                     |
| Report content              | `POST /reports`                                                                                                                                                                                               |
| Owner dashboard             | `GET /events`, `GET /events/:id`, `GET /events/:id/gifts`, `GET /events/:id/stats`                                                                                                                            |
| Owner moderation            | `PATCH /events/:id/wall/:postId`                                                                                                                                                                              |
| Guests                      | `GET /events/:id/rsvps`, `GET /events/:id/rsvps/export`                                                                                                                                                       |
| Registry management         | `GET/POST/PATCH/DELETE /events/:id/registry`                                                                                                                                                                  |
| Thank-you                   | `GET /events/:id/thank-you`, `PATCH /gifts/:id/thanked`, `POST /events/:id/thank-you/bulk`                                                                                                                    |
| Catalog                     | `GET /catalog/products`, `GET /catalog/products/:slug`, `GET /catalog/collections`                                                                                                                            |
| Direct checkout             | `POST /orders`, `POST /orders/:id/pay`                                                                                                                                                                        |
| Orders                      | `GET /orders`, `GET /orders/:id`, `POST /orders/:id/review`, `POST /orders/:id/disputes`, `GET /public/track/:token`                                                                                          |
| Notifications               | `GET /notifications`, `PATCH /notifications/:id/read`, `GET/PUT /me/notification-preferences`                                                                                                                 |
| Vendor                      | `GET /vendor/orders`, `PATCH /vendor/orders/:id/status`, `GET/POST/PATCH /vendor/products`                                                                                                                    |
| Admin                       | `GET /admin/moderation`, `PATCH /admin/moderation/:id`, `GET /admin/payments`, `GET /admin/payouts`, `POST /admin/payouts/:id/retry`, `GET /admin/ledger`, `GET /admin/disputes`, `PATCH /admin/disputes/:id` |

The request and response bodies for every endpoint are defined in the Backend document (Section 6). The frontend MUST import the types from the shared `contracts` package and MUST NOT hand-write duplicates.

### 7.3 Hook pattern

Each feature exposes hooks, never raw fetches in components:

```ts
export function useEventGifts(id: string, filters: GiftFilters) {
  return useQuery({
    queryKey: eventKeys.gifts(id, filters),
    queryFn: () => api<GiftList>(`/events/${id}/gifts?${toQuery(filters)}`),
    refetchInterval: 15_000,
    placeholderData: keepPreviousData,
  });
}
```

Mutations return typed errors; components map `error.code` to field errors or toasts (Section 10).

## 8. Forms and validations

Every form uses react-hook-form with a zod resolver. The same zod schema (from `contracts`) runs on the API, so rules cannot drift. Validate on blur and on submit. Disable the submit button while `isSubmitting` and show a spinner. Never trust client validation for security: the API re-validates everything.

### 8.1 Rules by form

| Form                    | Field              | Rule                                                                                                      |
| ----------------------- | ------------------ | --------------------------------------------------------------------------------------------------------- |
| Signup                  | name               | Required, 2 to 60 chars, trimmed                                                                          |
|                         | email              | Required, valid email, lowercased, max 254                                                                |
|                         | phone              | Optional, Nigerian format `+234XXXXXXXXXX` or `0XXXXXXXXXX`, normalized to E.164                          |
|                         | password           | Required, 10 to 72 chars, at least one letter and one number, not in common-password list; strength meter |
|                         | terms              | Must be checked                                                                                           |
| Login                   | email, password    | Required; generic error on failure (never say which was wrong)                                            |
| Reset password          | token              | Required from URL; password follows signup rule; confirm must match                                       |
| Event wizard step 1     | type               | One of BIRTHDAY, WEDDING, BABY_SHOWER, GRADUATION, OTHER                                                  |
|                         | name               | Required, 3 to 80 chars                                                                                   |
|                         | date               | Required, today or later (Africa/Lagos), at most 3 years ahead                                            |
| Step 2                  | cover image        | Optional; JPG, PNG, WebP; max 5 MB; min 1200x600 recommended                                              |
|                         | story              | Optional, max 1500 chars                                                                                  |
| Step 3                  | visibility         | PUBLIC or PRIVATE                                                                                         |
|                         | access code        | Required if PRIVATE; 6 to 12 alphanumeric; show generated suggestion                                      |
| Step 4                  | registry           | Up to 50 items; each: product reference or custom title (3 to 80), target price 500 to 5,000,000 naira    |
| Step 5                  | review and publish | All previous steps valid; payout status shown (not blocking)                                              |
| Payout setup            | bank               | Required, from bank list                                                                                  |
|                         | account number     | Required, exactly 10 digits                                                                               |
|                         | resolved name      | Read-only from resolve call; user must tick "This is my account"                                          |
| Give money              | amount             | Required, integer naira, min 500, max 1,000,000 per gift                                                  |
|                         | name               | Required unless anonymous, 2 to 60                                                                        |
|                         | email              | Required for receipt, valid email                                                                         |
|                         | message            | Optional, max 500 chars, profanity warning client-side (soft)                                             |
|                         | anonymous          | Boolean; if true hide name on wall                                                                        |
| Group gift contribution | amount             | Min 500; cannot exceed remaining amount unless owner allows overfunding                                   |
| RSVP                    | name               | Required 2 to 60                                                                                          |
|                         | response           | YES, NO or MAYBE                                                                                          |
|                         | plus-one           | Optional name if allowed by event                                                                         |
|                         | email or phone     | At least one required for confirmation                                                                    |
| Wall post               | text               | 1 to 500 chars                                                                                            |
|                         | photo              | JPG, PNG, WebP; max 8 MB; up to 3 photos                                                                  |
| Report                  | reason             | Required, enum; note optional max 300                                                                     |
| Direct checkout         | recipient name     | Required 2 to 60                                                                                          |
|                         | recipient phone    | Required, Nigerian format                                                                                 |
|                         | address            | Required for physical: street, area, city, state; max 200                                                 |
|                         | gift note          | Optional, max 300                                                                                         |
| Dispute                 | type               | DAMAGED, WRONG_ITEM, NOT_DELIVERED, OTHER                                                                 |
|                         | description        | Required, 20 to 1000 chars                                                                                |
|                         | photos             | Optional, up to 5                                                                                         |
| Review                  | rating             | Integer 1 to 5                                                                                            |
|                         | comment            | Optional max 500                                                                                          |
| Vendor status update    | status             | Only the next valid status; tracking note optional max 200                                                |

### 8.2 Example schema

```ts
export const giveMoneySchema = z
  .object({
    amountNaira: z.coerce.number().int().min(500).max(1_000_000),
    name: z.string().trim().min(2).max(60).optional(),
    email: z.string().email().max(254),
    message: z.string().max(500).optional(),
    anonymous: z.boolean().default(false),
  })
  .refine((v) => v.anonymous || !!v.name, {
    path: ["name"],
    message: "Enter your name or give anonymously",
  });
// Convert to kobo only when building the request: amountKobo = amountNaira * 100
```

### 8.3 Validation UX rules

- Inline errors under fields with `aria-describedby`. Error text says how to fix it, not just what is wrong.
- Preserve user input on error. Never clear a form on a failed submit.
- Server `details` map to fields via `setError`. Unknown field errors go to a form-level alert.
- Do NOT block paste on password or code fields. Do NOT use placeholder text as the label.

## 9. Expected flows and success criteria

### F1. Sign up, verify, sign in

1. User submits signup. API returns 201, user in `PENDING_VERIFICATION` or active with unverified email.
2. UI shows "Check your email" with resend (cooldown 60 s).
3. User clicks the email link to `/verify-email?token=`. Page calls verify, shows success, redirects to `/dashboard` or the saved `next`.
4. Login sets cookies; `/auth/me` hydrates `useAuthStore`.

**Success:** user lands on dashboard, `useAuthStore.status === 'authed'`, no tokens in JS-accessible storage, refresh works after the access token expires.

### F2. Create and publish an event

1. `/events/new` step 1 to 5. Draft saves to `useEventWizardStore` on every change.
2. Cover image: request presigned URL, upload directly to storage with progress, then store the returned key.
3. Publish calls `POST /events`, then `POST /events/:id/publish`.
4. If payout is not set, a banner explains money gifts are off, with a button to `/account/payout`.
5. Success screen shows share link, QR code, and share buttons (WhatsApp, copy, X, Facebook).

**Success:** event page loads at `/e/[slug]` while logged out, has correct OG title, image and description, wizard draft is cleared.

### F3. Payout setup

1. Pick bank, type 10-digit account number. On the 10th digit, call resolve automatically.
2. Show the resolved account name. User confirms it is theirs.
3. Save. Status becomes VERIFIED (or PENDING_REVIEW if the name does not match the profile name).

**Success:** event shows "Money gifts on". Failure states: invalid account, bank timeout (retry), name mismatch (explain and allow manual review).

### F4. Guest gives money

1. Guest opens `/e/[slug]` and presses Give. Money option is disabled with an explanation if the owner has no verified payout.
2. Guest fills amount, name, email, message. The summary shows amount, service fee (from API), and total.
3. Submit calls the API, which returns a Paystack `access_code` and `reference`. Open Paystack Inline popup.
4. On popup close or callback, show "Confirming your payment" and poll `GET /payments/:reference`.
5. On SUCCESS: show receipt and thank-you; clear the draft; invalidate the wall and owner feed.

**Success:** payment status SUCCESS, receipt shown with reference, owner dashboard shows the gift within 15 seconds, the guest is offered account creation.

Edge cases: popup closed (keep draft, let them retry with the same idempotency key), pending beyond 60 s (show "We will email you once it is confirmed"), failed (clear error plus retry).

### F5. RSVP

1. Guest completes the RSVP form on the event page. 2. API returns confirmation. 3. UI shows confirmation and a button to give a gift.

**Success:** owner guest list shows the RSVP, duplicate RSVP by the same email updates the existing one.

### F6. Registry purchase with reservation

1. Guest chooses an item. The API reserves it for 10 minutes and returns `reservedUntil`.
2. A countdown shows the hold. Guest pays through checkout.
3. On success the item shows Claimed. If the hold expires, show "Reservation expired" and offer to try again.

**Success:** no two guests can pay for the same item; expired holds free the item.

### F7. Group gift

1. Event page shows progress (`raisedKobo / targetKobo`) and deadline.
2. Guest contributes. Progress updates after payment confirmation.
3. When funded the owner sees "Order placed". If the deadline passes underfunded, the owner chooses to convert to cash or refund (owner UI in `/registry`).

**Success:** progress bar equals the sum of successful contributions; no contribution is lost on refresh.

### F8. Direct gift and tracking

1. Browse catalog, open product, press Send as gift. 2. Enter recipient, address (or phone/email for digital), note. 3. Pay. 4. Success page shows order number. 5. Gifter and recipient receive tracking updates; `/orders/[id]` shows the timeline CONFIRMED, PACKED, SHIPPED, DELIVERED.

**Success:** order appears in `/orders`, timeline updates within 15 seconds of the vendor action, recipient token page works without login.

### F9. Moderation

1. Posts with profanity or photos start as PENDING and are hidden from the public wall.
2. Owner can hide or delete any post on their event at any time. Guests can report posts.
3. Admin moderation queue lists flagged items with approve and remove.

**Success:** pending items never render publicly; hide and delete take effect on the public page within the revalidation window (the API triggers `revalidateTag` through a signed revalidation webhook).

### F10. After the event

1. Owner opens Thank-you: list of gifts and givers with checkboxes. 2. Bulk thank-you message sends. 3. Owner previews and publishes the keepsake page.

**Success:** every gift shows thanked status; keepsake is public only when toggled on.

### F11. Vendor fulfilment

1. Vendor sees new orders. 2. Vendor advances status (only legal transitions are enabled). 3. Customer is notified.

**Success:** illegal transitions are impossible in the UI and rejected by the API.

## 10. Error handling

### 10.1 Principles

- Every query and mutation has an error path. No silent failures. No blank screens.
- Error copy is plain, specific and actionable. Include the request id in a "Copy error id" link on 5xx screens for support.
- Field errors inline; action errors as toast; page-load errors as an `ErrorState` with retry.

### 10.2 Error code mapping

| API code                    | HTTP | UI behavior                                                 |
| --------------------------- | ---- | ----------------------------------------------------------- |
| `VALIDATION_FAILED`         | 422  | Map `details` to fields                                     |
| `UNAUTHENTICATED`           | 401  | Try refresh, else redirect to login with `next`             |
| `FORBIDDEN`                 | 403  | Show "You do not have access" page                          |
| `NOT_FOUND`                 | 404  | `notFound()` page                                           |
| `EMAIL_TAKEN`               | 409  | Field error with link to login                              |
| `INVALID_CREDENTIALS`       | 401  | Generic form alert                                          |
| `ACCOUNT_LOCKED`            | 423  | Alert with retry time                                       |
| `RATE_LIMITED`              | 429  | Toast with wait time from `Retry-After`; disable the button |
| `EVENT_LOCKED`              | 403  | Redirect to unlock page                                     |
| `INVALID_ACCESS_CODE`       | 403  | Field error, count attempts                                 |
| `PAYOUT_NOT_READY`          | 409  | Disable money option, explain                               |
| `ITEM_ALREADY_CLAIMED`      | 409  | Toast and refetch the registry                              |
| `RESERVATION_EXPIRED`       | 409  | Offer to reserve again                                      |
| `POOL_OVERFUNDED`           | 409  | Show remaining amount                                       |
| `PAYMENT_FAILED`            | 402  | Show reason, allow retry with a new idempotency key         |
| `PAYMENT_PENDING`           | 202  | Keep polling, then show email-confirmation message          |
| `DUPLICATE_REQUEST`         | 409  | Treat as success and fetch the original result              |
| `UPLOAD_REJECTED`           | 422  | Show file rule that failed                                  |
| `CONTENT_FLAGGED`           | 202  | Tell the user it will appear after review                   |
| `INVALID_STATUS_TRANSITION` | 409  | Refetch and show current status                             |
| `INTERNAL_ERROR`            | 500  | ErrorState with error id                                    |

### 10.3 Special cases

- **Offline or network error:** show a banner; queries retry with backoff; mutations show "Check your connection" and keep form data.
- **Paystack script failed to load:** show a retry button and fallback "Pay with link" using the hosted authorization URL.
- **Double clicks:** disable buttons while pending and always send idempotency keys on payments.
- **Stale data:** if a mutation returns 409, invalidate affected queries.
- **Boundaries:** `error.tsx` per route group, `global-error.tsx` at root. Report to Sentry with user id (hashed) and request id, never with form values.

## 11. UI and UX design

### 11.1 Principles

1. **Mobile first.** Most guests arrive from a WhatsApp link on a phone, often in an in-app browser. Design at 360 px first.
2. **Warm, celebratory, trustworthy.** Money screens must feel safe: show fees up front, show the payee name, show a receipt.
3. **Fewest steps to give.** A guest should complete a money gift in under 60 seconds from link tap.
4. **No forced signup before value.** Browsing and guest checkout are open.
5. **Show system status.** Every async action shows progress and a result.

### 11.2 Design tokens (Blush and Gold)

| Token                                     | Light                           | Dark                  |
| ----------------------------------------- | ------------------------------- | --------------------- |
| `--primary` (rose)                        | `#B5495B`                       | `#D9788A`             |
| `--accent` (gold)                         | `#D4A959`                       | `#E2BD77`             |
| `--background`                            | `#FAF3EF`                       | `#1D1315`             |
| `--card`                                  | `#FFFFFF`                       | `#2A1C1F`             |
| `--foreground`                            | `#332022`                       | `#F5E9E4`             |
| `--muted-foreground`                      | `#7A6468`                       | `#B9A29D`             |
| `--border`                                | `#ECDCD6`                       | `#43303A`             |
| `--success`, `--warning`, `--destructive` | `#2E7D5B`, `#B7791F`, `#C0392B` | adjusted for contrast |

Typography: Fraunces (headings, 600 to 800) and DM Sans (body, 400 to 700), self-hosted through `next/font`. Scale: 12, 14, 16, 18, 20, 24, 30, 36, 48. Body line-height 1.5. Radius: 8 px controls, 14 px cards. Spacing in a 4 px grid. Minimum tap target 44 px.

Do not hardcode colors; use tokens via Tailwind (`bg-primary`, `text-muted-foreground`). Support light and dark from day one.

### 11.3 Component inventory

- **shadcn primitives:** Button, Input, Textarea, Select, Checkbox, RadioGroup, Switch, Dialog, Sheet, Drawer, Tabs, Table, Badge, Card, Avatar, Progress, Skeleton, Toast (sonner), DropdownMenu, Popover, Tooltip, Form, Calendar, Pagination.
- **Shared:** `Money`, `Countdown`, `EventCover`, `ShareMenu`, `QrCard`, `EmptyState`, `ErrorState`, `StatusBadge`, `StepIndicator`, `FileDropzone`, `ConfirmDialog`, `CopyButton`, `BankSelect`, `PasswordField`.
- **Event:** `EventHero`, `GiveButtonBar`, `GiveDialog`, `RsvpForm`, `RegistryGrid`, `PoolCard`, `WallOfLove`, `WallPostCard`, `OwnerFeed`, `StatsCards`, `ThankYouList`, `InviteTemplatePicker`, `InviteEditor`.
- **Commerce:** `ProductCard`, `ProductGallery`, `FilterBar`, `CheckoutForm`, `OrderTimeline`, `RatingStars`, `DisputeForm`.
- **Admin and vendor:** `DataTable` (server-side pagination, sort, filter), `ModerationCard`, `LedgerTable`, `StatusStepper`.

### 11.4 Key layouts

- **Public event page (mobile):** hero (cover, name, date, countdown), sticky bottom bar with Give and RSVP, then story, registry, group gifts, wall. Desktop: two columns, story and registry left, give panel and wall right.
- **Dashboard:** header with greeting, stats cards (received, gifts, RSVPs), events list, recent activity feed.
- **Event management:** left tab navigation on desktop, horizontal scroll tabs on mobile.
- **Give dialog:** a Drawer on mobile and a Dialog on desktop; three steps (amount, details, pay) in one scrolling flow.

### 11.5 Accessibility and performance

- WCAG 2.2 AA: contrast, focus rings visible, keyboard operable, labels on all inputs, `aria-live` for toasts and payment status, `prefers-reduced-motion` respected.
- Run `axe` in CI on key pages. Test with a screen reader on the give flow.
- Budgets on a mid-range Android on 4G: LCP under 2.5 s on the event page, JS for the event page under 200 KB gzipped, CLS under 0.1. Use `next/image`, lazy-load below the fold, load Paystack only when the Give dialog opens.

### 11.6 Content and microcopy

- Sentence case. Plain verbs: "Send gift", "Publish event", "Save payout details". Keep one name per action across the flow.
- Empty states invite action ("No gifts yet. Share your link to get started.").
- Never expose provider jargon (webhook, ledger) to users.

## 12. Client data model (the frontend's "schema")

Types come from `contracts`; shown here for clarity. Money fields end in `Kobo`.

```ts
type Role = "USER" | "VENDOR" | "ADMIN";
type User = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  emailVerified: boolean;
  avatarUrl?: string;
};

type EventType =
  | "BIRTHDAY"
  | "WEDDING"
  | "BABY_SHOWER"
  | "GRADUATION"
  | "OTHER";
type EventStatus = "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED";
type EventSummary = {
  id: string;
  slug: string;
  name: string;
  type: EventType;
  date: string;
  coverUrl?: string;
  visibility: "PUBLIC" | "PRIVATE";
  status: EventStatus;
  moneyGiftsEnabled: boolean;
  totalReceivedKobo: number;
  giftCount: number;
  rsvpYesCount: number;
};
type PublicEvent = EventSummary & {
  story?: string;
  ownerFirstName: string;
  allowPlusOne: boolean;
  registry: RegistryItem[];
  pools: PoolItem[];
  template?: InviteTemplateData;
};

type GiftType = "MONEY" | "PRODUCT" | "POOL" | "DIGITAL";
type Gift = {
  id: string;
  type: GiftType;
  amountKobo: number;
  giverName: string | null;
  anonymous: boolean;
  message?: string;
  status: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  thanked: boolean;
  createdAt: string;
};

type RegistryItem = {
  id: string;
  title: string;
  productId?: string;
  priceKobo: number;
  imageUrl?: string;
  status: "AVAILABLE" | "RESERVED" | "CLAIMED";
  reservedUntil?: string;
};
type PoolItem = RegistryItem & {
  targetKobo: number;
  raisedKobo: number;
  deadline?: string;
  mode: "PRODUCT" | "CASH";
};

type WallPost = {
  id: string;
  authorName: string;
  text?: string;
  media: { url: string; type: "IMAGE" | "VIDEO" }[];
  status: "PENDING" | "VISIBLE" | "HIDDEN" | "REMOVED";
  createdAt: string;
};

type OrderStatus =
  | "PENDING_PAYMENT"
  | "CONFIRMED"
  | "PACKED"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "DISPUTED";
type Order = {
  id: string;
  number: string;
  items: { name: string; qty: number; unitPriceKobo: number }[];
  totalKobo: number;
  status: OrderStatus;
  timeline: { status: OrderStatus; at: string }[];
  recipientName: string;
};
```

### Browser storage

| Key                | Where          | Content                                  | Cleared              |
| ------------------ | -------------- | ---------------------------------------- | -------------------- |
| `givvly.wizard.v1` | localStorage   | Event wizard draft (no personal secrets) | On publish or logout |
| `givvly.give.v1`   | sessionStorage | Give draft and idempotency key           | On success           |
| `givvly.cart.v1`   | sessionStorage | Direct-gift draft                        | On order success     |
| `givvly.theme`     | localStorage   | `light`, `dark` or `system`              | Never                |

Storage reads MUST be wrapped in try/catch and handle missing or malformed data. Version the keys; on version mismatch discard silently. Never store tokens, passwords, bank account numbers or card data.

## 13. Testing plan

### 13.1 Strategy

Testing pyramid: many fast unit tests, a solid layer of component and integration tests with a mocked API, and a small set of end-to-end tests for the money-critical journeys. A feature is not done until its tests are merged.

| Level             | Tools                                          | What to cover                                                                                                                                                         | Target                                                                      |
| ----------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Unit              | Vitest                                         | `formatNaira`, date helpers, zod schemas (valid and invalid cases), Zustand stores, query key factories, URL sanitizers (`next` param)                                | 90% on `lib/` and `schemas.ts`                                              |
| Component         | Vitest + React Testing Library + MSW           | Every form: validation messages, submit, server error mapping, disabled and loading states; `GiveDialog`, `PoolCard`, `RegistryGrid`, `WallPostCard`, `OrderTimeline` | 80% on feature components                                                   |
| Integration       | RTL + MSW with realistic handlers              | Page-level flows with TanStack Query: dashboard feed polling, optimistic hide and rollback, refresh-token replay, 409 handling                                        | Every query and mutation hook has at least one success and one failure test |
| End-to-end        | Playwright                                     | Journeys below, against a seeded staging backend with Paystack in test mode                                                                                           | All P0 journeys green on every release                                      |
| Accessibility     | axe-core (jest-axe and `@axe-core/playwright`) | Home, event page, give flow, login, dashboard                                                                                                                         | Zero serious or critical violations                                         |
| Performance       | Lighthouse CI                                  | Home, event page, catalog                                                                                                                                             | Performance 90+ mobile; budgets in 11.5                                     |
| Visual (optional) | Playwright screenshots                         | Event page, give dialog, order timeline                                                                                                                               | Review diffs manually                                                       |

### 13.2 End-to-end journeys (P0)

1. Sign up, verify email (read the email from a test inbox like Mailpit), sign in, sign out.
2. Create event with cover image, add payout details, publish, open public URL in a logged-out context, check the OG tags.
3. Guest gives money with the Paystack test card; receipt appears; owner dashboard shows the gift and total; the payout status shows SENT.
4. Failed and abandoned payment: popup closed, retry with the same idempotency key creates only one payment.
5. RSVP as guest; owner sees it and exports CSV.
6. Two browsers try to buy the same registry item; only one succeeds; the other sees the Claimed message.
7. Group gift: two contributions fund the item; the owner sees Order placed.
8. Profane message goes to pending, is hidden, admin approves, it appears.
9. Direct gift: checkout, vendor advances status through the portal, gifter sees each status.
10. Private event: wrong code rejected, correct code unlocks, cookie persists, other browser still locked.
11. Access control: guest hitting `/dashboard` is redirected; USER hitting `/admin` is redirected; user A cannot open user B's `/events/[id]`.

### 13.3 Rules

- Mock the network with MSW only; never mock internal modules to make a test pass.
- Use test data factories (`buildEvent()`, `buildGift()`), not copied JSON.
- Use accessible queries first (`getByRole`, `getByLabelText`).
- No `waitForTimeout` in Playwright; wait on UI conditions or network responses.
- Flaky tests are fixed or quarantined within 48 hours, never ignored.
- Run browsers: Chromium (Android profile), WebKit (iPhone profile), Firefox on nightly. Manually check the WhatsApp in-app browser before each release.

## 14. Security plan

### 14.1 Authentication and session

- Tokens live only in `HttpOnly; Secure; SameSite=Lax` cookies set by the API. JavaScript can never read them. Do NOT put tokens in localStorage, sessionStorage, Zustand, or URLs.
- `middleware.ts` verifies the access JWT signature with `jose` (public key from env) and checks the role. The backend remains the real authority.
- CSRF: because cookies are sent automatically, every unsafe request carries `X-CSRF-Token` (double-submit cookie). The API rejects requests without a matching token.
- Logout calls `POST /auth/logout` (revokes the refresh token server-side), clears stores and query cache (`queryClient.clear()`), and redirects.
- Sensitive actions (change password, change payout account, delete account) require re-entering the password.

### 14.2 Injection and content safety

- Never use `dangerouslySetInnerHTML` with user content. All user text (names, stories, messages) renders as text. If rich text is ever needed, sanitize with DOMPurify and an allowlist.
- Validate and normalize every URL param (`next`, `ref`, `slug`) before use. `next` must be a same-origin relative path.
- Uploads: client checks type, size and dimensions for UX only. The server re-validates and scans. Never render user-uploaded SVG; allow only JPG, PNG, WebP.
- External links from user content use `rel="noopener noreferrer nofollow ugc"`.

### 14.3 Headers and CSP

Set in `next.config.ts` headers (and verify in production):

- `Content-Security-Policy` with per-request nonce for scripts; allow `https://js.paystack.co`, your API origin, image CDN, Sentry ingest, analytics. No `unsafe-eval`. `frame-ancestors 'none'` (and allow Paystack frames in `frame-src`).
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`.
- `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera, microphone, geolocation off).
- `X-Robots-Tag: noindex` on `/dashboard`, `/events`, `/account`, `/orders`, `/admin`, `/vendor`, and any private event page.

### 14.4 Payments

- The browser never sees card data. Paystack Inline handles it. Do not log, store or send card details.
- The amount shown to the user comes from the API response, and the amount actually charged is decided by the API. Never trust a client-side amount for any state change.
- Success is whatever `GET /payments/:reference` says (driven by the verified webhook), not the popup callback alone.
- Send a fresh `Idempotency-Key` per attempt and reuse it on retries of the same attempt.

### 14.5 Privacy and data protection

- Collect the minimum. Show clear consent text for emails and phone numbers used for notifications. Link to privacy policy and terms on signup and give flows.
- Cookie and analytics consent banner; analytics loads only after consent where required.
- Anonymous giving: the UI never shows the giver name to the public, but the owner dashboard may show it according to the product rule defined in the Backend document. Display a clear note to the giver about what the owner sees.
- Account deletion and data export entry points in `/account/security`.
- Mask sensitive data: bank account shows last four digits only after saving.

### 14.6 Supply chain and secrets

- Only `NEXT_PUBLIC_*` variables reach the browser; never put secrets there. Commit `.env.example` only.
- `pnpm audit` and Dependabot weekly; block merges on critical advisories. Pin versions; review new dependencies (size, maintainers, licence).
- Subresource loading only from the CSP allowlist. Load third-party scripts with `next/script` and `strategy` set deliberately.
- Sentry `beforeSend` scrubs emails, phone numbers, tokens and form values.

## 15. Deployment plan

### 15.1 Environments

| Env        | URL                         | API                     | Payments      | Purpose        |
| ---------- | --------------------------- | ----------------------- | ------------- | -------------- |
| Local      | `localhost:3000`            | `localhost:4000`        | Paystack test | Development    |
| Preview    | per pull request            | Staging API             | Paystack test | Review and e2e |
| Staging    | `staging.givvly.vercel.app` | Staging API             | Paystack test | QA and demos   |
| Production | `givvly.vercel.app`         | `api.givvly.vercel.app` | Paystack live | Live users     |

### 15.2 Environment variables (`.env.example`)

| Variable                                      | Scope         | Notes                             |
| --------------------------------------------- | ------------- | --------------------------------- |
| `NEXT_PUBLIC_APP_URL`                         | public        | Canonical URL for links and OG    |
| `NEXT_PUBLIC_API_URL`                         | public        | Browser API base                  |
| `API_INTERNAL_URL`                            | server        | Server-to-server API base         |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`             | public        | Public key only                   |
| `JWT_PUBLIC_KEY`                              | server        | Verify access token in middleware |
| `REVALIDATE_SECRET`                           | server        | Protects `/api/revalidate`        |
| `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN` | public, build | Error tracking and source maps    |
| `NEXT_PUBLIC_POSTHOG_KEY`                     | public        | Analytics                         |
| `NEXT_PUBLIC_IMAGE_CDN`                       | public        | Allowed image host                |

Validate env at boot with a zod schema in `lib/env.ts`; the build fails if a required variable is missing.

### 15.3 Hosting

Recommended: Vercel for the Next.js app (preview URLs, ISR, edge middleware, image optimization). Alternative: Docker image (`output: 'standalone'`) on a VPS or container platform behind a CDN. If self-hosting, configure a shared cache for ISR and set up the image optimizer.

### 15.4 CI/CD (GitHub Actions)

1. On pull request: install with frozen lockfile, lint, type-check, unit and component tests, build, upload coverage.
2. Deploy the preview. Run Playwright against the preview with the staging API.
3. On merge to `main`: deploy to staging automatically, run the P0 e2e suite and Lighthouse CI.
4. Production: manual approval, then promote the same build. Tag the release. Source maps upload to Sentry.
5. Rollback: promote the previous deployment (one click). Database changes are the Backend's concern; the frontend MUST tolerate both the old and new API shape during a rollout (additive changes only).

### 15.5 Caching and revalidation

- Public event pages use tag-based ISR (`event:<slug>`). The API calls `POST /api/revalidate` with `REVALIDATE_SECRET` after gifts, wall changes and event edits.
- Static assets are immutable with hashed file names. HTML for authenticated pages is `no-store`.
- Generate `sitemap.xml` (home, catalog, public events) and `robots.txt` (disallow protected paths).

### 15.6 Go-live checklist

- Production env vars set, live Paystack key swapped, webhook URL configured on the Backend side.
- CSP verified in the browser console with no violations on all key pages.
- Sentry receiving events from production; uptime check on `/` and the event page.
- Legal pages published; consent banner works; error pages tested.
- Smoke test: real small payment, payout lands, refund path tested.

## 16. Master list: do and do not

**Do**

- Use Server Components by default and fetch public data on the server.
- Keep money in kobo and format only at display.
- Put every API call behind a feature hook and every key in a key factory.
- Validate with the shared zod schemas and map API errors to fields.
- Send idempotency keys on all payment requests.
- Handle loading, empty, error and success states for every screen.
- Write tests with the feature, not after.
- Design for 360 px first and test in the WhatsApp in-app browser.

**Do not**

- Do not store tokens, card data or bank details in the browser.
- Do not copy server data into Zustand or `useState` as a second source of truth.
- Do not use floats for money or trust a client amount for state changes.
- Do not call the API directly from components or pages with raw `fetch`.
- Do not use `any`, `// @ts-ignore`, or disable lint rules without a comment and a ticket.
- Do not use `dangerouslySetInnerHTML` with user content.
- Do not force signup before browsing, viewing an event, or giving as a guest.
- Do not build custom versions of components shadcn already provides.
- Do not mark a payment successful from the popup callback alone.
- Do not add dependencies without checking size and necessity.

## 17. Build order and definition of done

### 17.1 Order of work

1. **Setup (week 1):** monorepo, tooling, CI, tokens, shadcn components, layout shell, API client, env validation, Sentry.
2. **Auth (week 1 to 2):** signup, login, verify, reset, Google, middleware and guards, `useAuthStore`, session bootstrap.
3. **Event core (weeks 2 to 3):** wizard, payout setup, event page with OG image, dashboard shell.
4. **Money gifts (weeks 3 to 4):** give dialog, Paystack integration, receipt, polling, owner feed, wall of love, owner moderation, notifications UI.
5. **Phase 2 (weeks 5 to 6):** invite templates and editor, RSVP, guest list, uploads, moderation states, keepsake page.
6. **Phase 3 (weeks 7 to 10):** catalog, registry, reservations, group gifts, direct checkout, orders and tracking, reviews, disputes, vendor portal, admin console.
7. **Phase 4 (later):** digital gifts, video messages, trending, recipient-confirms-address.
8. **Hardening (continuous, final week of each phase):** accessibility pass, performance pass, security review, e2e completeness.

Timings are for one to two frontend developers working against an available backend; adjust to your team.

### 17.2 Definition of done (every ticket)

- Matches the spec in this document, including empty, loading and error states.
- Responsive from 360 px to desktop; light and dark themes verified.
- Keyboard and screen reader checked; axe clean.
- Unit, component and (if a P0 journey) e2e tests added and passing.
- No new lint, type or console errors; bundle size budget respected.
- Reviewed by one other developer; preview deployed and checked by QA or product.

## 18. Open decisions to confirm before build

1. Fee model display: who pays the service fee and how it is shown at checkout (the API returns the numbers; the product decision is needed).
2. Whether anonymous givers are visible to the event owner.
3. Whether guests must provide an email for money gifts (this document assumes yes, for receipts).
4. Hosting choice for the web app (Vercel or self-hosted).
5. Analytics and consent requirements for the Nigerian market.
6. Maximum gift amount per transaction and per event per day.
7. Which invite templates ship first and who designs them.
