# getAOnePageApp — Technical Specification

> AI-powered one-page website generation platform. User chats with an AI agent to define their site, then the build pipeline generates, validates, and deploys a live `.vercel.app` site automatically.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Phase 1: Spec Agent (Chat)](#phase-1-spec-agent-chat)
3. [Phase 2: Build Agent (Autonomous)](#phase-2-build-agent-autonomous)
4. [Model Routing](#model-routing)
5. [Vercel Deployment](#vercel-deployment)
6. [Email Delivery](#email-delivery)
7. [Credit System](#credit-system)
8. [State Persistence](#state-persistence)
9. [API Routes](#api-routes)
10. [Design System](#design-system)
11. [Graceful Degradation](#graceful-degradation)
12. [Environment Variables](#environment-variables)
13. [File Map](#file-map)
14. [Testing](#testing)
15. [Timing Budget](#timing-budget)

---

## System Overview

getAOnePageApp uses a two-phase conversational agent architecture:

### Phase 1: Spec Agent (chat)
User chats with an AI agent to define their site. The agent:
1. Asks guided questions about the business and design preferences
2. Extracts structured SiteSpec + ProjectIntakeData via comment markers
3. Streams responses as SSE events for real-time feedback
4. Checks completeness and offers a summary for approval

### Phase 2: Build Agent (autonomous)
Once the spec is approved, the build pipeline:
1. **Builds** a complete single-file HTML+CSS page via Claude Sonnet
2. **Validates** the HTML for quality via Claude Haiku (score >= 7 required)
3. **Deploys** to Vercel via REST API
4. **Delivers** email notifications to team and client

If any step fails, the pipeline falls back to email-only delivery. The customer lead is never lost.

### Execution Properties

| Property | Implementation |
|---|---|
| **Conversational** | Multi-turn chat gathers complete requirements before building |
| **Observable** | Build progress streamed as SSE events |
| **Persistent** | Chat sessions saved to ConversationSession model |
| **Resilient** | Every build step has email-only fallback |

---

## Phase 1: Spec Agent (Chat)

### System Prompt

The spec agent guides conversation to extract:
- **SiteSpec**: headline, subheadline, seoDescription, sections[]
- **ProjectIntakeData**: business info, project details, style preferences, contact info

### Comment Markers

The agent embeds structured data in its response via HTML comments:
- `<!--SPEC_UPDATE:{"headline":"..."}-->` — partial SiteSpec fields
- `<!--INTAKE_UPDATE:{"business":{"businessName":"..."}}-->` — partial intake fields
- `<!--OPTIONS:{"cards":[...]}-->` — structured option cards for user selection
- `<!--SPEC_COMPLETE-->` — triggers the approval UI

Markers are parsed server-side and sent as separate SSE events. They are stripped from the displayed message text.

### Completeness Check

Required fields before spec_complete:
- SiteSpec: headline, subheadline, at least 3 sections
- Intake: business name, contact email

---

## Phase 2: Build Agent (Autonomous)

Sequential pipeline (no DAG):

### build (LLM — Sonnet)

Generates a complete single-file HTML+CSS page with:
- `<!DOCTYPE html>` with embedded `<style>` tag (no external dependencies)
- Responsive mobile-first design with CSS custom properties
- Semantic HTML5 (`header`, `nav`, `main`, `section`, `footer`)
- Sticky navigation with smooth-scroll anchors
- Color palette from style preferences via `resolveColors()`
- All sections from SiteSpec rendered as `<section>` elements

**Token limit:** 8,192 (`BUILD_MAX_TOKENS`)

### build_validate (LLM — Haiku)

QA review scoring four dimensions (each 1–10):

| Dimension | What it measures |
|---|---|
| `structuralIntegrity` | Valid HTML, no broken tags, proper nesting |
| `responsiveness` | Mobile-friendly CSS, media queries |
| `accessibility` | Semantic HTML, ARIA where needed, contrast |
| `brandAlignment` | Colors match spec, all sections present |

**Routing:** `overallScore >= 7` → deploy, otherwise → email-only delivery.

### test-agent (Runtime Validator)

Additional spec compliance checks (not LLM-based):
- DOCTYPE and viewport meta tag present
- Embedded CSS with color variables
- All SiteSpec sections have matching `<section>` elements
- Headline text matches spec
- Anchor links point to valid section IDs
- Primary color from palette used in CSS

Produces a score 0-10 based on check pass rate.

### deploy (Vercel API v13)

REST deployment to Vercel:
1. Slugify business name → project name
2. POST to `https://api.vercel.com/v13/deployments` with base64-encoded `index.html`
3. Returns deployment URL

### deliver (Email)

Terminal step:
- Credit management (first submission free, revisions cost 1 credit)
- Team email with business details, spec, validation scores
- Client email with live site link or checkout CTA
- Credits remaining count

---

## Model Routing

Per-node model assignments using the ZONTAK.AI Classifier:

| Node | Model | Avg Score | Rationale |
|---|---|---|---|
| spec_agent | `claude-sonnet-4-20250514` | 3.6 | Multi-turn conversation, must infer missing info and guide |
| build | `claude-sonnet-4-20250514` | 4.2 | Highest-stakes node, ships to production |
| build_validate | `claude-haiku-4-5-20251001` | 2.8 | Concrete HTML review, explicit rubric, fallback mitigates risk |

---

## Vercel Deployment

### Deployment Flow

```
slugifyProjectName("Sunrise Bakery") → "sunrise-bakery"
                    ↓
POST https://api.vercel.com/v13/deployments
  {
    name: "sunrise-bakery",
    files: [{ file: "index.html", data: base64(html), encoding: "base64" }],
    projectSettings: { framework: null },
    target: "production"
  }
                    ↓
Return: { url: "sunrise-bakery.vercel.app", id: "dpl_xxx" }
```

### Slug Rules

- Lowercase
- Non-alphanumeric runs replaced with single hyphen
- Leading/trailing hyphens trimmed
- Max 58 characters
- Fallback to `"site"` if empty after processing

---

## Email Delivery

Emails sent via [Resend](https://resend.com) API. Both emails fire in parallel via `Promise.allSettled` — a failure in one doesn't block the other.

### Team Email

Dark-themed HTML with:
- Business details (name, type, industry, website)
- Project description and goals
- Contact information
- Validation scores (color-coded chips: green >= 7, yellow >= 5, red < 5)
- Refined brief
- Proposed site spec with section breakdown
- **Auto-Build badge** with live site link (when deployed)

### Client Email

Professional confirmation with:
- Personalized greeting
- **Live site link** with "View Your Live Site" CTA button (when deployed)
- Stripe checkout CTA (per-project pricing from $29)
- Refined brief and proposed spec
- Remaining revision credits

---

## Pricing Model

Per-project pricing based on a **3x–5x markup on token cost**:

| Tier | Token Cost | Price | Use Case |
|---|---|---|---|
| **Starter** | ~$4–5 | **$29** | Simple one-page site, local business or personal brand |
| **Pro** | ~$8–10 | **$49** | Custom styling, more sections, SEO-optimized copy |
| **Premium** | ~$12–15 | **$79** | Complex multi-section site, custom palette, priority build |

All tiers include: build, deploy, Cloudflare hosting, SSL, and 3 revision credits.

## Credit System

| Event | Credits |
|---|---|
| Project purchase | 3 revision credits (included with every $29/$49/$79 project) |
| First submission | Free (iterationCount = 0) |
| Each revision | 1 credit deducted |
| Exhausted | Warning logged, delivery proceeds (enforcement in V2) |

Credits stored permanently in KV at key `credits:{email}`.

---

## State Persistence

All state persisted to Vercel KV (Upstash Redis) after every node transition.

### KV Schema

| Key Pattern | Value | TTL |
|---|---|---|
| `session:{uuid}` | `ExecutionState` (full graph state + history) | 30 days |
| `credits:{email}` | `CreditRecord` (total, used, plan) | Permanent |

### ExecutionState Shape

```typescript
{
  sessionId: string;
  currentNode: NodeId;
  context: SessionContext;    // accumulated outputs from all nodes
  history: NodeTransition[];  // audit trail
  status: "running" | "completed" | "failed";
  createdAt: string;
  updatedAt: string;
  error?: string;
}
```

---

## API Routes

### POST `/api/chat` — Streaming SSE (30s max)

Conversational spec gathering endpoint.

**Request:** `{ "sessionId": "...", "message": "...", "selectedOption?": "..." }`

**Guard chain:** auth → rate limit (30/hr) → load/create session

**SSE events:**
- `message_delta` — streaming text chunk
- `message_done` — complete message with clean display text
- `spec_update` — extracted SiteSpec fields
- `intake_update` — extracted ProjectIntakeData fields
- `options` — structured option cards
- `spec_complete` — spec ready for approval
- `error` — error with message

### POST `/api/build` — Streaming SSE (60s max)

Autonomous build pipeline endpoint.

**Request:** `{ "sessionId": "...", "spec": {...}, "intake": {...} }`

**Guard chain:** auth → rate limit (5/hr) → credit check

**SSE events:**
- `phase` — build/validate/deploy/deliver status
- `validate_result` — quality scores
- `deploy_result` — live URL
- `complete` — final result with siteUrl + creditsRemaining
- `error` — with fallback to email-only

---

## Design System

### Color Presets

| Preset | Primary | Secondary | Background |
|---|---|---|---|
| `warm` | `#F07D2E` | `#FFB347` | `#FFF8EE` |
| `cool` | `#3DA7DB` | `#5EC4F0` | `#F5F5F5` |
| `bold` | `#E53E3E` | `#1A1A2E` | `#FFFFFF` |
| `earth` | `#6B8E23` | `#8B7355` | `#FFF8DC` |
| `minimal` | `#333333` | `#666666` | `#FFFFFF` |

Custom hex values override presets when provided. Text color auto-derived from background luminance.

### Generated HTML Standards

- Single-file `index.html` with embedded `<style>` tag
- No external dependencies (CDNs, fonts, scripts)
- CSS custom properties for color system
- System font stack
- Mobile-first responsive design
- Semantic HTML5 structure
- Sticky navigation with smooth-scroll anchors
- `<meta>` tags: charset, viewport, og:title, og:description

---

## Graceful Degradation

The pipeline's core invariant: **never lose the lead**. Every auto-build node has a fallback path to email-only delivery.

| Failure Point | Fallback Behavior |
|---|---|
| assess fails | Pipeline aborts (502 error) |
| generate fails | Pipeline aborts (502 error) |
| validate fails | Pipeline aborts (502 error) |
| sanity_check: criteria not met | `skip_build` → email-only delivery |
| build: Claude API error | `build_failed` → email-only delivery |
| build_validate: score < 7 | `html_fails` → email-only delivery |
| build_validate: Claude error | `html_fails` → email-only delivery |
| deploy: Wrangler error | `deploy_failed` → email-only delivery |
| deploy: CF env vars missing | `deploy_failed` → email-only delivery |
| email send fails | Logged, delivery continues (partial success) |
| KV unavailable | Session not persisted, pipeline still completes |

---

## Environment Variables

### Required

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Anthropic API authentication |

### Optional — Email Notifications

| Variable | Purpose |
|---|---|
| `RESEND_API_KEY` | Resend email service |
| `NOTIFY_EMAIL` | Team notification recipient |
| `FROM_EMAIL` | Verified sender address |

### Optional — Auto-Build + Deploy

| Variable | Purpose |
|---|---|
| `VERCEL_TOKEN` | Vercel API token for site deployment |
| `VERCEL_TEAM_ID` | Optional Vercel team ID |

---

## File Map

```
src/
├── app/
│   └── api/
│       ├── chat/route.ts         # POST — streaming SSE chat endpoint
│       └── build/route.ts        # POST — streaming SSE build pipeline
├── lib/
│   ├── chat-types.ts             # Chat messages, SSE events, build progress, credit types
│   ├── spec-agent.ts             # System prompt, spec/intake extraction, completeness checker
│   ├── build-agent.ts            # Build pipeline: build → validate → deploy → deliver
│   ├── test-agent.ts             # Runtime HTML validator (spec compliance checks)
│   ├── vercel-deploy.ts          # Vercel API v13 deployment
│   ├── graph-state.ts            # Credit persistence (credit functions only)
│   ├── model-router.ts           # Per-node model classification + routing
│   ├── site-builder.ts           # Color preset map + resolveColors()
│   ├── email-templates.ts        # Team + client HTML email generation
│   ├── intake-types.ts           # Shared domain types (BusinessInfo, SiteSpec, etc.)
│   └── __tests__/
│       ├── spec-agent.test.ts    # 6 spec extraction + completeness scenarios
│       ├── build-agent.test.ts   # 8 build pipeline scenarios
│       ├── vercel-deploy.test.ts # 4 deployment + slug scenarios
│       └── test-agent.test.ts    # 7 HTML validation scenarios
├── vitest.config.ts              # Test runner configuration
└── package.json
```

---

## Testing

Tests follow **Software Factory** principles: full user-journey scenarios, not isolated unit tests.

### Test Infrastructure

- **Runner:** Vitest 4.x with Node environment
- **Mocking:** `vi.fn()` for fetch (Claude API), `vi.mock()` for `cloudflare-deploy` module
- **Approach:** Each scenario sets up mock responses for the exact sequence of Claude calls, then asserts the full pipeline outcome

### Scenarios

| # | Scenario | Expected Outcome |
|---|---|---|
| 1 | Happy path (all nodes pass) | Site deployed, siteUrl in result, both emails sent |
| 2 | Sanity check fails (low validation score) | `skip_build`, email-only delivery |
| 3 | Build fails (Claude API error) | `build_failed`, graceful degradation to email-only |
| 4 | HTML validation fails (score < 7) | `html_fails`, email-only delivery |
| 5 | Deploy fails (Cloudflare error) | `deploy_failed`, email-only delivery |
| 6 | CF env vars missing | Skip deploy, email-only delivery |
| 7 | Custom colors (hex values) | Custom palette flows through build prompt |
| 8 | Generate retry + build | First validate < 7, retry succeeds, full pipeline |
| 9 | Slug generation edge cases | Special chars, empty string, long names |
| 10 | Model routing verification | Each node sends correct model ID to Claude API |

---

## Timing Budget

| Node | Estimated | Cumulative |
|---|---|---|
| assess (Haiku) | 3–5s | 3–5s |
| generate (Sonnet) | 5–8s | 8–13s |
| validate (Haiku) | 3–5s | 11–18s |
| sanity_check | ~1ms | 11–18s |
| build (Sonnet, 8K tokens) | 20–35s | 31–53s |
| build_validate (Haiku) | 3–5s | 34–58s |
| deploy (Wrangler) | 2–5s | 36–63s |
| deliver (emails) | 1–3s | **37–66s** |

Target: under 60s on Vercel Pro. Observed in production: **~55–90s** depending on build complexity. With one generate retry (~8–15s extra), worst case can exceed timeout — `MAX_GENERATE_ATTEMPTS` may need reduction to 1 when auto-build is enabled.

### Optimization Levers

1. Reduce `BUILD_MAX_TOKENS` (currently 8,192) — shorter HTML = faster generation
2. Reduce `MAX_GENERATE_ATTEMPTS` to 1 — skip retry loop
3. Use streaming for build node (not yet implemented)
4. Pre-warm Wrangler via `npx wrangler --version` at cold start

---

*Generated 2026-03-01. Pipeline version: 8-node with auto-build.*
