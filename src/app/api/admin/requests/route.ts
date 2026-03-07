/**
 * Admin API: Manage project intake requests (execution sessions).
 *
 * GET  /api/admin/requests  — List all sessions with pagination + filters
 * PATCH /api/admin/requests — Update a session (e.g. mark reviewed)
 *
 * Both require admin role.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ExecutionState } from "@/lib/graph-types";
import type { Prisma } from "@prisma/client";

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email || session.user.role !== "admin") {
    return forbidden();
  }

  const url = request.nextUrl;
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "20")));
  const statusFilter = url.searchParams.get("status"); // running | completed | failed
  const emailFilter = url.searchParams.get("email");
  const skip = (page - 1) * limit;

  // Build where clause
  const where: Prisma.ExecutionSessionWhereInput = {};
  if (emailFilter) {
    where.userEmail = { contains: emailFilter.toLowerCase(), mode: "insensitive" };
  }

  // For status filtering, we need to filter on JSON data field
  // Prisma doesn't support deep JSON filtering well, so we filter in-memory for status
  const [rows, total] = await Promise.all([
    prisma.executionSession.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: statusFilter ? 0 : skip,
      take: statusFilter ? 500 : limit, // fetch more if we need to filter status in-memory
    }),
    prisma.executionSession.count({ where }),
  ]);

  // Map rows to a lean admin-friendly format
  let items = rows.map((row) => {
    const state = row.data as unknown as ExecutionState;
    const intake = state?.context?.intakeData;

    return {
      id: row.id,
      sessionId: row.sessionId,
      userEmail: row.userEmail || state?.context?.intakeData?.contact?.email || "unknown",
      businessName: intake?.business?.businessName ?? "—",
      industry: intake?.business?.industry ?? "—",
      status: state?.status ?? "unknown",
      currentNode: state?.currentNode ?? "unknown",
      siteUrl: state?.context?.deployment?.deploymentUrl,
      qualityScore: state?.context?.assessment?.qualityScore,
      validationScore: state?.context?.validation?.overallScore,
      nodeCount: state?.history?.length ?? 0,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  });

  // Apply status filter in-memory if needed
  if (statusFilter) {
    items = items.filter((item) => item.status === statusFilter);
    const filteredTotal = items.length;
    items = items.slice(skip, skip + limit);

    return NextResponse.json({
      items,
      page,
      limit,
      total: filteredTotal,
      totalPages: Math.ceil(filteredTotal / limit),
    });
  }

  return NextResponse.json({
    items,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email || session.user.role !== "admin") {
    return forbidden();
  }

  let sessionId: string;
  let action: string;

  try {
    const body = await request.json();
    sessionId = body.sessionId;
    action = body.action; // "archive" | "rerun" (future)
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!sessionId || !action) {
    return NextResponse.json({ error: "sessionId and action are required" }, { status: 400 });
  }

  const row = await prisma.executionSession.findUnique({
    where: { sessionId },
  });

  if (!row) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (action === "archive") {
    // Mark session as expired (archived) by setting expiresAt to the past
    await prisma.executionSession.update({
      where: { sessionId },
      data: { expiresAt: new Date(0) },
    });

    return NextResponse.json({ ok: true, action: "archived" });
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
}
