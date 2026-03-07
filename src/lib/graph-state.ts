/**
 * Credit management for the build pipeline.
 *
 * Uses Prisma credit_records table to track per-user credit allocation
 * and usage. Credits are deducted on revisions (iteration > 0).
 */

import { prisma } from "@/lib/prisma";
import type { CreditRecord } from "./chat-types";
import { CREDITS_INCLUDED } from "./chat-types";

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
