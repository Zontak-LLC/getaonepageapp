/**
 * POST /api/submit-intake
 *
 * Entry point for the Attractor execution graph.
 *
 * Guard chain (executed before the expensive AI pipeline):
 *   1. Auth check — must be signed in via Google OAuth
 *   2. Parse body
 *   3. Honeypot check — silent fake-200 if bot fills hidden field
 *   4. Rate limit — 5 requests per hour per email
 *   5. Demo/credit check — first submission free, then requires payment
 *   6. Override email — use session email (prevents spoofing)
 *
 * Then runs the full graph:
 *   assess → generate → validate (→ generate retry) → deliver
 */

import { NextRequest, NextResponse } from "next/server";
import type { ProjectIntakeData } from "@/lib/intake-types";
import type { SessionContext } from "@/lib/graph-types";
import { createSession, saveSession, getOrCreateCredits, deductCredit } from "@/lib/graph-state";
import { executeGraph, type GraphEnv } from "@/lib/graph-executor";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { hasDemoBeenUsed, markDemoUsed } from "@/lib/demo-store";

// Vercel serverless function max duration (Pro plan allows up to 60s)
export const maxDuration = 60;

export async function POST(request: NextRequest): Promise<NextResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  // ── 1. Auth check ──────────────────────────────────────────────────────────
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json(
      { error: "Sign in required", code: "AUTH_REQUIRED" },
      { status: 401 },
    );
  }
  const email = session.user.email;

  // ── 2. Parse body ──────────────────────────────────────────────────────────
  let intakeData: ProjectIntakeData;
  let plainText: string;
  let iterationCount = 0;
  let honeypot: unknown;

  try {
    const body = await request.json() as {
      data?: unknown;
      plainText?: unknown;
      iterationCount?: unknown;
      honeypot?: unknown;
    };

    if (!body.data || typeof body.plainText !== "string" || !body.plainText.trim()) {
      return NextResponse.json(
        { error: "Missing required fields: data, plainText" },
        { status: 400 },
      );
    }

    intakeData = body.data as ProjectIntakeData;
    plainText = body.plainText.trim();
    iterationCount = typeof body.iterationCount === "number" ? body.iterationCount : 0;
    honeypot = body.honeypot;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // ── 3. Honeypot check ──────────────────────────────────────────────────────
  if (honeypot) {
    // Bot filled the hidden field — return fake success, skip pipeline
    return NextResponse.json({
      sessionId: crypto.randomUUID(),
      status: "completed",
      enhancement: null,
      history: [],
    });
  }

  // ── 4. Rate limit (5 per hour per email) ───────────────────────────────────
  const rl = rateLimit(`submit:${email}`, 5, 3600000);
  if (!rl.allowed) {
    return NextResponse.json(
      {
        error: "Too many requests. Please try again later.",
        code: "RATE_LIMITED",
        resetInSeconds: rl.resetInSeconds,
      },
      { status: 429 },
    );
  }

  // ── 5. Demo / credit check ─────────────────────────────────────────────────
  // Build KV client early (needed for credit checks)
  const kvConfigured = !!(
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  );

  let kvClient: GraphEnv["INTAKE_KV"] = undefined;
  if (kvConfigured) {
    const { Redis } = await import("@upstash/redis");
    kvClient = Redis.fromEnv();
  }

  const demoUsed = await hasDemoBeenUsed(email);

  if (!demoUsed) {
    // First submission is free — will mark demo used after success
  } else if (kvClient) {
    // Check paid credits
    const credits = await getOrCreateCredits(email, kvClient);
    if (credits.remaining <= 0) {
      return NextResponse.json(
        {
          error: "No credits remaining. Purchase a plan to continue.",
          code: "NO_CREDITS",
          creditsRemaining: 0,
        },
        { status: 402 },
      );
    }
  } else {
    // No KV configured and demo already used — can't verify credits
    return NextResponse.json(
      {
        error: "No credits remaining. Purchase a plan to continue.",
        code: "NO_CREDITS",
        creditsRemaining: 0,
      },
      { status: 402 },
    );
  }

  // ── 6. Override contact email with auth email (prevents spoofing) ──────────
  intakeData.contact.email = email;

  // ── Create session + initial context ───────────────────────────────────────
  const sessionId = crypto.randomUUID();

  const sessionContext: SessionContext = {
    intakeData,
    plainText,
    generateAttempts: 0,
    iterationCount,
  };

  const state = createSession(sessionId, sessionContext);

  const env: GraphEnv = {
    ANTHROPIC_API_KEY: apiKey,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    NOTIFY_EMAIL: process.env.NOTIFY_EMAIL,
    FROM_EMAIL: process.env.FROM_EMAIL,
    INTAKE_KV: kvClient,
    CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN,
    CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID,
  };

  // Persist initial state
  if (env.INTAKE_KV) {
    await saveSession(state, env.INTAKE_KV);
  }

  // ── Execute the graph ─────────────────────────────────────────────────────
  try {
    const result = await executeGraph(state, env);

    // Post-success bookkeeping
    if (!demoUsed) {
      await markDemoUsed(email);
    } else if (kvClient) {
      await deductCredit(email, kvClient);
    }

    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("Graph execution failed:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Graph execution failed",
        sessionId,
        status: "failed",
        history: state.history,
      },
      { status: 502 },
    );
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ error: "Method not allowed. Use POST." }, { status: 405 });
}
