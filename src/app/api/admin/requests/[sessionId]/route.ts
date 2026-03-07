/**
 * GET /api/admin/requests/[sessionId]
 *
 * Returns full execution state for a single session.
 * Admin-only.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
/** Legacy type for reading old ExecutionSession JSON data */
interface ExecutionState {
  status?: string;
  currentNode?: string;
  context?: {
    intakeData?: {
      contact?: { email?: string };
      [key: string]: unknown;
    };
    plainText?: string;
    assessment?: Record<string, unknown>;
    enhancement?: Record<string, unknown>;
    validation?: Record<string, unknown>;
    sanityCheck?: Record<string, unknown>;
    build?: { buildNotes?: string };
    buildValidation?: Record<string, unknown>;
    deployment?: Record<string, unknown>;
    delivery?: Record<string, unknown>;
  };
  history?: unknown[];
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const session = await auth();
  if (!session?.user?.email || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { sessionId } = await params;

  const row = await prisma.executionSession.findUnique({
    where: { sessionId },
  });

  if (!row) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const state = row.data as unknown as ExecutionState;

  return NextResponse.json({
    sessionId: row.sessionId,
    userEmail: row.userEmail || state?.context?.intakeData?.contact?.email || "unknown",
    status: state?.status ?? "unknown",
    currentNode: state?.currentNode ?? "unknown",
    intakeData: state?.context?.intakeData,
    plainText: state?.context?.plainText,
    assessment: state?.context?.assessment,
    enhancement: state?.context?.enhancement,
    validation: state?.context?.validation,
    sanityCheck: state?.context?.sanityCheck,
    build: state?.context?.build ? { buildNotes: state.context.build.buildNotes } : null,
    buildValidation: state?.context?.buildValidation,
    deployment: state?.context?.deployment,
    delivery: state?.context?.delivery,
    history: state?.history ?? [],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}
