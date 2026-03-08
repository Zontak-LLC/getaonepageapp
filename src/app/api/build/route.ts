/**
 * POST /api/build — Streaming SSE build pipeline.
 *
 * Guard chain: auth → rate limit (5/hr) → credit check → email override
 *
 * Streams build progress as SSE events:
 *   phase           — build phase status
 *   validate_result — quality scores
 *   deploy_result   — live URL
 *   complete        — final result
 *   error           — with fallback to email-only
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAnthropicApiKey } from "@/lib/anthropic";
import { rateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { BuildRequest, BuildProgress, SSEEvent } from "@/lib/chat-types";
import { runBuildPipeline, type BuildEnv } from "@/lib/build-agent";

/* ─── SSE Helpers ─── */

function sseEvent(event: SSEEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/* ─── POST Handler ─── */

export async function POST(request: Request) {
  // ── Auth check ──
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }
  const userEmail = session.user.email;

  // ── Rate limit (5 builds/hour) ──
  const rl = rateLimit(`build:${userEmail}`, 5, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Build rate limit exceeded. Try again in ${rl.resetInSeconds}s.` },
      { status: 429 },
    );
  }

  // ── Parse request ──
  let body: BuildRequest;
  try {
    body = (await request.json()) as BuildRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.sessionId || !body.spec || !body.intake) {
    return NextResponse.json(
      { error: "sessionId, spec, and intake are required" },
      { status: 400 },
    );
  }

  // ── Validate spec completeness ──
  if (!body.spec.headline || !body.spec.sections?.length) {
    return NextResponse.json(
      { error: "Spec must include headline and sections" },
      { status: 400 },
    );
  }

  // ── Build env ──
  const env: BuildEnv = {
    ANTHROPIC_API_KEY: getAnthropicApiKey(),
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    NOTIFY_EMAIL: process.env.NOTIFY_EMAIL,
    FROM_EMAIL: process.env.FROM_EMAIL,
    VERCEL_TOKEN: process.env.VERCEL_TOKEN,
    VERCEL_TEAM_ID: process.env.VERCEL_TEAM_ID,
  };

  // ── Override contact email with auth email ──
  body.intake.contact = {
    ...body.intake.contact,
    email: userEmail,
  };

  // ── Determine iteration count ──
  const existingSession = await prisma.conversationSession.findUnique({
    where: { sessionId: body.sessionId },
  });
  const iterationCount = existingSession?.buildResult ? 1 : 0;

  // ── Stream build progress ──
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const onProgress = (progress: BuildProgress) => {
        controller.enqueue(
          encoder.encode(
            sseEvent({ type: "phase", data: progress }),
          ),
        );
      };

      try {
        const result = await runBuildPipeline(
          body.spec,
          body.intake,
          env,
          iterationCount,
          onProgress,
        );

        // Send final complete event
        controller.enqueue(
          encoder.encode(
            sseEvent({
              type: "complete",
              data: {
                siteUrl: result.siteUrl,
                creditsRemaining: result.creditsRemaining,
                validationScore: result.validationScore,
                teamEmailSent: result.teamEmailSent,
                clientEmailSent: result.clientEmailSent,
              },
            }),
          ),
        );

        // Persist build result to session
        if (existingSession) {
          await prisma.conversationSession.update({
            where: { sessionId: body.sessionId },
            data: {
              buildResult: {
                siteUrl: result.siteUrl,
                validationScore: result.validationScore,
                creditsRemaining: result.creditsRemaining,
                completedAt: new Date().toISOString(),
              } as Prisma.InputJsonValue,
              specStatus: "approved",
            },
          });
        }

        controller.close();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Build pipeline error";
        controller.enqueue(
          encoder.encode(
            sseEvent({ type: "error", data: { message: errorMsg } }),
          ),
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
