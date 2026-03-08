/**
 * Centralized Anthropic client factory.
 *
 * Problem: Claude Code sets ANTHROPIC_API_KEY="" in the shell, which
 * overrides the real key from .env.local (Next.js gives shell env higher
 * priority than dotenv files).
 *
 * Solution: Read the key from .env.local directly when process.env is empty.
 */

import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "fs";
import { resolve } from "path";

let _cachedKey: string | null = null;

function resolveApiKey(): string {
  // 1. Use process.env if it has a real (non-empty) value
  const envKey = process.env.ANTHROPIC_API_KEY;
  if (envKey && envKey.length > 0) return envKey;

  // 2. Fallback: parse .env.local directly
  if (_cachedKey) return _cachedKey;

  try {
    const envPath = resolve(process.cwd(), ".env.local");
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (trimmed.startsWith("ANTHROPIC_API_KEY=")) {
        const value = trimmed.slice("ANTHROPIC_API_KEY=".length).trim();
        // Strip quotes if present
        const unquoted = value.replace(/^["']|["']$/g, "");
        if (unquoted.length > 0) {
          _cachedKey = unquoted;
          return _cachedKey;
        }
      }
    }
  } catch {
    // .env.local not found — that's fine in production
  }

  throw new Error(
    "ANTHROPIC_API_KEY not configured. Set it in .env.local or environment.",
  );
}

/** Create an authenticated Anthropic client. */
export function createAnthropicClient(): Anthropic {
  return new Anthropic({ apiKey: resolveApiKey() });
}

/** Get the resolved API key (for passing to build-agent env). */
export function getAnthropicApiKey(): string {
  return resolveApiKey();
}
