# getAOnePageApp — Stack & Conventions

> AI-powered one-page website generation platform by Zontak.
> URL: https://getaonepage.app

## Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.1.6 |
| Language | TypeScript (strict) | ^5 |
| React | React 19 | 19.2.3 |
| Styling | Tailwind CSS v4 | via `@tailwindcss/postcss` |
| ORM | Prisma | ^6.19 |
| Database | PostgreSQL | via `POSTGRES_PRISMA_URL` |
| Auth | NextAuth v5 (beta) | Credentials provider, JWT strategy |
| Payments | Stripe | ^20.4 |
| Email | Resend | ^6.9 |
| Deployment (app) | Vercel | Next.js native |
| AI SDK | Anthropic SDK | ^0.78 |
| Deployment (sites) | Vercel API v13 | REST deployment |
| Testing | Vitest | ^4.0 |
| Linting | ESLint 9 | `eslint-config-next` |

## Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Landing page (ChatAgent in contact section)
│   ├── layout.tsx                # Root layout (Geist fonts, SessionProvider)
│   ├── globals.css               # Tailwind v4 styles
│   ├── auth/
│   │   ├── signin/page.tsx       # Sign-in page
│   │   └── signup/page.tsx       # Sign-up page
│   ├── welcome/page.tsx          # Post-signup welcome
│   ├── admin/dashboard/page.tsx  # Admin dashboard
│   └── api/
│       ├── auth/
│       │   ├── signup/route.ts   # POST — user registration
│       │   └── [...nextauth]/route.ts  # NextAuth handlers
│       ├── chat/route.ts               # POST — streaming SSE chat endpoint
│       ├── build/route.ts              # POST — streaming SSE build pipeline
│       ├── checkout/route.ts           # POST — Stripe checkout session
│       ├── webhooks/stripe/route.ts    # POST — Stripe webhook handler
│       └── admin/requests/
│           ├── route.ts                # GET — list intake requests
│           └── [sessionId]/route.ts    # GET — single request detail
├── components/
│   ├── chat-agent/               # Conversational spec agent UI
│   │   ├── ChatAgent.tsx         # Main chat orchestrator
│   │   ├── MessageBubble.tsx     # User/assistant message rendering
│   │   ├── OptionCard.tsx        # Clickable structured choice cards
│   │   ├── SpecPreview.tsx       # Live sidebar showing SiteSpec as it builds
│   │   ├── BuildProgress.tsx     # Build phase status indicators
│   │   ├── ChatInput.tsx         # Text input + send button
│   │   └── index.ts              # Barrel export
│   ├── admin/
│   │   ├── AdminDashboard.tsx
│   │   └── RequestDetailPanel.tsx
│   ├── PricingSection.tsx
│   ├── PricingButton.tsx
│   ├── AuthButton.tsx
│   ├── SignInForm.tsx
│   ├── SignUpForm.tsx
│   └── SessionProvider.tsx       # NextAuth SessionProvider wrapper
├── hooks/
│   ├── useInView.ts              # Intersection observer hook
│   └── useChatAgent.ts           # Chat state, SSE streaming, spec accumulation
├── emails/
│   ├── payment-notification.ts   # Team payment alert email
│   └── payment-welcome.ts        # Client welcome email after payment
└── lib/
    ├── prisma.ts                 # Prisma client singleton
    ├── auth.ts                   # NextAuth config (Credentials + JWT)
    ├── user-store.ts             # User CRUD (Prisma)
    ├── rate-limit.ts             # In-memory rate limiter
    ├── intake-types.ts           # Domain types (BusinessInfo, SiteSpec, etc.)
    ├── chat-types.ts             # Chat messages, SSE events, build progress, credit types
    ├── spec-agent.ts             # System prompt, spec extraction, completeness checker
    ├── build-agent.ts            # Build pipeline: build → validate → deploy → deliver
    ├── vercel-deploy.ts          # Vercel API v13 deployment
    ├── test-agent.ts             # Runtime HTML validator (spec compliance checks)
    ├── model-router.ts           # AI model selection per task (spec_agent, build, build_validate)
    ├── site-builder.ts           # Color presets + resolveColors()
    ├── email-templates.ts        # HTML email builders
    ├── admin-notify.ts           # Admin notification helpers
    ├── graph-state.ts            # Credit persistence (credit functions only)
    └── __tests__/
        ├── spec-agent.test.ts    # Spec extraction + completeness scenarios
        ├── build-agent.test.ts   # Build pipeline scenarios
        ├── vercel-deploy.test.ts # Deployment + slug tests
        └── test-agent.test.ts    # HTML validation scenarios

prisma/
├── schema.prisma                 # DB schema (User, CreditRecord, ExecutionSession, ConversationSession)
├── seed.ts                       # Seed script
└── migrations/
```

## Database Schema (Prisma)

Four models:

- **User** — `id`, `email` (unique), `name`, `passwordHash`, `role` ("user" | "admin")
- **CreditRecord** — `id`, `email` (unique), `total`, `used`, `plan`
- **ExecutionSession** — `id`, `sessionId` (unique), `userEmail`, `data` (JSON), `expiresAt` (legacy)
- **ConversationSession** — `id`, `sessionId` (unique), `userEmail`, `messages` (JSON), `partialSpec` (JSON), `partialIntake` (JSON), `specStatus`, `buildResult` (JSON), `expiresAt`

All tables use `@@map()` for snake_case table names. PostgreSQL with connection pooling (`POSTGRES_PRISMA_URL`) and direct URL (`POSTGRES_URL_NON_POOLING`).

## Conversational Agent

Two-phase architecture replacing the old 4-step form + 8-node DAG pipeline:

### Phase 1: Spec Agent (chat)
- User chats with AI to define their site
- Extracts structured SiteSpec + ProjectIntakeData via comment markers
- SSE streaming for real-time response delivery
- Session persistence via ConversationSession model

### Phase 2: Build Agent (autonomous)
- Build HTML+CSS via Sonnet → Validate via Haiku → Deploy to Vercel → Email delivery
- Graceful degradation: any failure falls back to email-only
- Progress streamed as SSE events

## Auth

- NextAuth v5 beta with **Credentials provider** (email + password)
- JWT session strategy (no database sessions)
- Passwords hashed with `bcryptjs`
- Custom pages: `/auth/signin`, `/auth/signup`
- Session exposes `user.role` for admin gating
- `SessionProvider` wraps the app at root layout level

## Middleware

- Security headers: `nosniff`, `DENY` framing, HSTS, permissions policy
- Blocks suspicious user agents (bots, scrapers) except on `/api/webhooks`
- Rejects payloads > 50KB on non-webhook routes
- Matcher excludes static assets

## Styling

- Tailwind CSS v4 via PostCSS plugin
- Geist Sans + Geist Mono fonts (via `next/font/google`)
- CSS variables: `--font-geist-sans`, `--font-geist-mono`
- No component library — all custom components

## Payments (Stripe)

- Checkout sessions created via `/api/checkout`
- Webhook handler at `/api/webhooks/stripe` for payment confirmation
- Three tiers: Starter ($29), Pro ($49), Premium ($79)
- Credits: 3 revision credits per project purchase

## Email (Resend)

- Transactional emails via Resend API
- Team notification + client confirmation emails
- Parallel send via `Promise.allSettled`
- Templates in `src/emails/` and `src/lib/email-templates.ts`

## Testing

- **Vitest 4.x** with Node environment
- Tests in `src/lib/__tests__/` following pattern `*.test.ts`
- Path alias `@/` → `./src/` configured in vitest.config.ts
- Scenario-based tests (full user journeys, not isolated units)
- Mock `fetch` for Claude API, `vi.mock()` for external modules

## Scripts

```bash
npm run dev          # Next.js dev server
npm run build        # Production build
npm run test         # Vitest watch mode
npm run test:run     # Vitest single run
npm run db:seed      # Seed database (npx tsx prisma/seed.ts)
npm run db:migrate   # Run Prisma migrations
```

## Conventions

- Path alias: `@/*` → `./src/*`
- API routes use Next.js App Router `route.ts` handlers
- All API routes return JSON
- Snake_case for database columns (via Prisma `@map`)
- camelCase for TypeScript interfaces and variables
- Components are `.tsx`, utilities are `.ts`
- No external UI component library — custom Tailwind components
- Fonts loaded via `next/font/google` (no CDN)
