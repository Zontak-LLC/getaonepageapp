/**
 * User storage for email/password authentication.
 * Uses Prisma with Supabase Postgres — matches zontak-ai pattern.
 */

import { prisma } from "@/lib/prisma";

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: string;
  createdAt: Date;
}

/** Look up a user by email. Returns null if not found. */
export async function findUser(
  email: string,
): Promise<UserRecord | null> {
  return prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });
}

/** Create a new user record. Does NOT check for duplicates — caller must check first. */
export async function createUser(
  data: { email: string; name: string; passwordHash: string; role?: string },
): Promise<UserRecord> {
  return prisma.user.create({
    data: {
      email: data.email.toLowerCase().trim(),
      name: data.name,
      passwordHash: data.passwordHash,
      role: data.role ?? "user",
    },
  });
}

/** Check if a user has admin role. */
export async function isAdmin(email: string): Promise<boolean> {
  const user = await findUser(email);
  return user?.role === "admin";
}
