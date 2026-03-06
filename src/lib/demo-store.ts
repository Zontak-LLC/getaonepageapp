/**
 * Demo mode: track 1-free-submission-per-user via HMAC-signed cookie.
 *
 * The cookie is httpOnly + secure + signed with AUTH_SECRET.
 * It can't be tampered with (HMAC verification), but a user CAN
 * clear cookies to bypass the limit. For a free demo tier this is
 * an acceptable trade-off — we also deduplicate server-side by
 * email in Vercel logs and the KV credits check.
 */

import crypto from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "zk_demo";
const SECRET = () => process.env.AUTH_SECRET ?? "demo-fallback-secret";

function hmac(data: string): string {
  return crypto
    .createHmac("sha256", SECRET())
    .update(data)
    .digest("hex");
}

/** Returns true if this email has already used their free demo submission. */
export async function hasDemoBeenUsed(email: string): Promise<boolean> {
  const jar = await cookies();
  const stored = jar.get(COOKIE_NAME)?.value;
  if (!stored) return false;

  // Cookie format: email_hash:hmac_signature
  const [storedHash, storedSig] = stored.split(":");
  if (!storedHash || !storedSig) return false;

  const emailHash = crypto
    .createHash("sha256")
    .update(email.toLowerCase().trim())
    .digest("hex");

  // Verify the cookie wasn't tampered with
  const expectedSig = hmac(emailHash);
  if (!crypto.timingSafeEqual(Buffer.from(storedSig), Buffer.from(expectedSig))) {
    return false;
  }

  return storedHash === emailHash;
}

/** Mark this email as having used their one free demo submission. */
export async function markDemoUsed(email: string): Promise<void> {
  const jar = await cookies();
  const emailHash = crypto
    .createHash("sha256")
    .update(email.toLowerCase().trim())
    .digest("hex");
  const sig = hmac(emailHash);

  jar.set(COOKIE_NAME, `${emailHash}:${sig}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: "/",
  });
}
