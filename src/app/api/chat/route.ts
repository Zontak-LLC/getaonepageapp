/**
 * POST /api/chat — Streaming SSE chat endpoint.
 *
 * Guard chain: auth → rate limit (30/hr) → load/create session
 *
 * Streams the spec agent's response as SSE events:
 *   message_delta  — text chunk
 *   message_done   — complete message
 *   spec_update    — extracted spec fields
 *   intake_update  — extracted intake fields
 *   options        — structured option cards
 *   spec_complete  — spec ready for approval
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createAnthropicClient } from "@/lib/anthropic";
import { rateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type {
  ChatMessage,
  ChatRequest,
  ConversationState,
  SSEEvent,
} from "@/lib/chat-types";
import {
  buildSystemPrompt,
  parseAgentResponse,
  mergeSpec,
  mergeIntake,
} from "@/lib/spec-agent";
import { MODEL_IDS } from "@/lib/model-router";

/* ─── SSE Helpers ─── */

function sseEvent(event: SSEEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/* ─── POST Handler ─── */

export async function POST(request: Request) {
  try {
  // ── Auth (optional — anonymous chat allowed for gathering phase) ──
  const session = await auth();
  const userEmail = session?.user?.email ?? "anonymous";

  // ── Parse request ──
  let body: ChatRequest;
  try {
    body = (await request.json()) as ChatRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.sessionId || !body.message?.trim()) {
    return NextResponse.json(
      { error: "sessionId and message are required" },
      { status: 400 },
    );
  }

  // ── Rate limit (30 messages/hour, keyed by email or sessionId) ──
  const rateLimitKey = userEmail !== "anonymous" ? userEmail : body.sessionId;
  const rl = rateLimit(`chat:${rateLimitKey}`, 30, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Try again in ${rl.resetInSeconds}s.` },
      { status: 429 },
    );
  }

  // ── Load or create conversation session ──
  let state: ConversationState;

  const existing = await prisma.conversationSession.findUnique({
    where: { sessionId: body.sessionId },
  });

  if (existing && existing.expiresAt > new Date()) {
    state = {
      sessionId: existing.sessionId,
      userEmail: existing.userEmail,
      messages: existing.messages as unknown as ChatMessage[],
      partialSpec: (existing.partialSpec as Record<string, unknown>) ?? {},
      partialIntake: (existing.partialIntake as Record<string, unknown>) ?? {},
      specStatus: existing.specStatus as ConversationState["specStatus"],
    };
  } else {
    state = {
      sessionId: body.sessionId,
      userEmail,
      messages: [],
      partialSpec: {},
      partialIntake: {},
      specStatus: "gathering",
    };
  }

  // ── Add user message ──
  const userMessage: ChatMessage = {
    id: `msg_${Date.now()}_user`,
    role: "user",
    content: body.selectedOption
      ? `${body.message} [Selected: ${body.selectedOption}]`
      : body.message,
    timestamp: new Date().toISOString(),
  };
  state.messages.push(userMessage);

  // ── Build Anthropic messages array ──
  const systemPrompt = buildSystemPrompt(state.partialSpec, state.partialIntake);
  const anthropicMessages = state.messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  // ── Stream response ──
  const client = createAnthropicClient();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        let fullText = "";

        const anthropicStream = client.messages.stream({
          model: MODEL_IDS.sonnet,
          max_tokens: 2048,
          system: systemPrompt,
          messages: anthropicMessages,
        });

        // Stream text deltas
        anthropicStream.on("text", (text) => {
          fullText += text;
          controller.enqueue(
            encoder.encode(sseEvent({ type: "message_delta", data: { text } })),
          );
        });

        // Wait for completion
        await anthropicStream.finalMessage();

        // Parse the complete response for structured data
        const parsed = parseAgentResponse(fullText);

        // Send spec updates
        if (parsed.specUpdates.length > 0) {
          state.partialSpec = mergeSpec(state.partialSpec, parsed.specUpdates);
          controller.enqueue(
            encoder.encode(
              sseEvent({ type: "spec_update", data: state.partialSpec }),
            ),
          );
        }

        // Send intake updates
        if (parsed.intakeUpdates.length > 0) {
          state.partialIntake = mergeIntake(
            state.partialIntake,
            parsed.intakeUpdates,
          );
          controller.enqueue(
            encoder.encode(
              sseEvent({ type: "intake_update", data: state.partialIntake }),
            ),
          );
        }

        // Send options
        if (parsed.options.length > 0) {
          controller.enqueue(
            encoder.encode(
              sseEvent({ type: "options", data: { cards: parsed.options } }),
            ),
          );
        }

        // Send spec complete
        if (parsed.specComplete) {
          state.specStatus = "reviewing";
          controller.enqueue(
            encoder.encode(sseEvent({ type: "spec_complete", data: {} })),
          );
        }

        // Add assistant message to history (with clean display text)
        const assistantMessage: ChatMessage = {
          id: `msg_${Date.now()}_assistant`,
          role: "assistant",
          content: parsed.displayText,
          timestamp: new Date().toISOString(),
          options: parsed.options.length > 0 ? parsed.options : undefined,
        };
        state.messages.push(assistantMessage);

        // Send complete message
        controller.enqueue(
          encoder.encode(
            sseEvent({
              type: "message_done",
              data: {
                message: assistantMessage,
                specStatus: state.specStatus,
              },
            }),
          ),
        );

        // ── Persist session ──
        const TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
        const expiresAt = new Date(Date.now() + TTL_SECONDS * 1000);

        await prisma.conversationSession.upsert({
          where: { sessionId: state.sessionId },
          update: {
            messages: JSON.parse(
              JSON.stringify(state.messages),
            ) as Prisma.InputJsonValue,
            partialSpec: state.partialSpec as Prisma.InputJsonValue,
            partialIntake: state.partialIntake as Prisma.InputJsonValue,
            specStatus: state.specStatus,
            expiresAt,
          },
          create: {
            sessionId: state.sessionId,
            userEmail: state.userEmail,
            messages: JSON.parse(
              JSON.stringify(state.messages),
            ) as Prisma.InputJsonValue,
            partialSpec: state.partialSpec as Prisma.InputJsonValue,
            partialIntake: state.partialIntake as Prisma.InputJsonValue,
            specStatus: state.specStatus,
            expiresAt,
          },
        });

        controller.close();
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Unknown error";
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

  } catch (err) {
    // Top-level catch — surface unhandled errors as JSON
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[/api/chat] Unhandled error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
