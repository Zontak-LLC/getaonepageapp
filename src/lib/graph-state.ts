/**
 * Postgres state management for the Attractor execution model.
 *
 * Three tables (via Prisma):
 *   execution_sessions  →  ExecutionState  (with expiresAt for TTL)
 *   credit_records      →  CreditRecord    (permanent)
 *   users               →  UserRecord      (handled by user-store.ts)
 *
 * Uses Prisma client singleton from @/lib/prisma — no more KVStore interface.
 */

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type {
  ExecutionState,
  CreditRecord,
  NodeId,
  SessionContext,
} from "./graph-types";
import {
  CREDITS_INCLUDED,
  SESSION_TTL_SECONDS,
} from "./graph-types";

/* ─── Session CRUD ─── */

export async function loadSession(
  sessionId: string,
): Promise<ExecutionState | null> {
  const row = await prisma.executionSession.findUnique({
    where: { sessionId },
  });

  if (!row) return null;

  // Check TTL — treat expired sessions as not found
  if (row.expiresAt < new Date()) return null;

  return row.data as unknown as ExecutionState;
}

export async function saveSession(
  state: ExecutionState,
): Promise<void> {
  const updated: ExecutionState = {
    ...state,
    updatedAt: new Date().toISOString(),
  };

  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);

  // Extract user email from intake data for indexing
  const userEmail = state.context?.intakeData?.contact?.email ?? "";

  await prisma.executionSession.upsert({
    where: { sessionId: state.sessionId },
    update: {
      data: JSON.parse(JSON.stringify(updated)) as Prisma.InputJsonValue,
      userEmail,
      expiresAt,
    },
    create: {
      sessionId: state.sessionId,
      data: JSON.parse(JSON.stringify(updated)) as Prisma.InputJsonValue,
      userEmail,
      expiresAt,
    },
  });
}

export function createSession(
  sessionId: string,
  context: SessionContext,
): ExecutionState {
  const now = new Date().toISOString();
  return {
    sessionId,
    currentNode: "assess" as NodeId,
    context,
    history: [],
    status: "running",
    createdAt: now,
    updatedAt: now,
  };
}

/* ─── Credit CRUD ─── */

export async function loadCredits(
  email: string,
): Promise<CreditRecord | null> {
  const row = await prisma.creditRecord.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (!row) return null;

  return {
    email: row.email,
    total: row.total,
    used: row.used,
    plan: row.plan as CreditRecord["plan"],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function saveCredits(
  record: CreditRecord,
): Promise<void> {
  const email = record.email.toLowerCase().trim();

  await prisma.creditRecord.upsert({
    where: { email },
    update: {
      total: record.total,
      used: record.used,
      plan: record.plan,
    },
    create: {
      email,
      total: record.total,
      used: record.used,
      plan: record.plan,
    },
  });
}

/**
 * Get the credit record for a client, creating it with the default
 * allocation if it doesn't exist yet.
 */
export async function getOrCreateCredits(
  email: string,
): Promise<CreditRecord> {
  const normalizedEmail = email.toLowerCase().trim();

  const row = await prisma.creditRecord.upsert({
    where: { email: normalizedEmail },
    update: {}, // no-op if exists
    create: {
      email: normalizedEmail,
      total: CREDITS_INCLUDED,
      used: 0,
      plan: "standard",
    },
  });

  return {
    email: row.email,
    total: row.total,
    used: row.used,
    plan: row.plan as CreditRecord["plan"],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Deduct one credit from the record.
 * Returns the updated record with the new `used` count.
 * Throws if the record has no remaining credits.
 */
export async function deductCredit(
  email: string,
): Promise<CreditRecord> {
  const record = await getOrCreateCredits(email);
  const remaining = record.total - record.used;
  if (remaining <= 0) {
    throw new Error("No credits remaining");
  }

  const row = await prisma.creditRecord.update({
    where: { email: email.toLowerCase().trim() },
    data: { used: { increment: 1 } },
  });

  return {
    email: row.email,
    total: row.total,
    used: row.used,
    plan: row.plan as CreditRecord["plan"],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function creditsRemaining(record: CreditRecord): number {
  return Math.max(0, record.total - record.used);
}
