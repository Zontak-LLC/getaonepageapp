/**
 * User storage for email/password authentication.
 * Follows the same KVStore pattern as graph-state.ts.
 *
 * Redis namespace: user:{email} → UserRecord
 */

import type { KVStore } from "./graph-state";

const USER_KV_PREFIX = "user:";

export interface UserRecord {
  email: string;
  name: string;
  passwordHash: string;
  createdAt: string;
}

/** Look up a user by email. Returns null if not found. */
export async function findUser(
  email: string,
  kv: KVStore,
): Promise<UserRecord | null> {
  return kv.get<UserRecord>(`${USER_KV_PREFIX}${email.toLowerCase().trim()}`);
}

/** Create a new user record. Does NOT check for duplicates — caller must check first. */
export async function createUser(
  user: UserRecord,
  kv: KVStore,
): Promise<void> {
  const key = `${USER_KV_PREFIX}${user.email.toLowerCase().trim()}`;
  await kv.set(key, user);
}
