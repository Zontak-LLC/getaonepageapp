import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Central contact-form submissions endpoint.
 *
 * Generated sites (on *.pages.dev or *.vercel.app) POST form data here.
 * Stores in our PostgreSQL `submissions` table for a unified admin view.
 *
 * CORS is required because generated sites are on different origins.
 */

const HOUR_MS = 60 * 60 * 1000;

/* ─── CORS ─── */

const ALLOWED_ORIGINS = [
  /\.pages\.dev$/,
  /\.vercel\.app$/,
  /getaonepage\.app$/,
  /localhost/,
];

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed =
    origin && ALLOWED_ORIGINS.some((re) => re.test(origin))
      ? origin
      : "https://getaonepage.app";

  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

/* ─── OPTIONS (preflight) ─── */

export async function OPTIONS(req: Request) {
  const origin = req.headers.get("origin");
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

/* ─── POST ─── */

export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);

  /* ── Rate limit by IP (10 submissions / hour) ── */
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = rateLimit(`submission:${ip}`, 10, HOUR_MS);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many submissions. Please try again later." },
      { status: 429, headers },
    );
  }

  /* ── Validate body ── */
  let body: {
    projectSlug?: string;
    name?: string;
    email?: string;
    message?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request." },
      { status: 400, headers },
    );
  }

  const projectSlug = body.projectSlug?.trim() ?? "";
  const name = body.name?.trim() ?? "";
  const email = body.email?.trim() ?? "";
  const message = body.message?.trim() ?? "";

  if (!projectSlug || projectSlug.length > 100) {
    return NextResponse.json(
      { error: "Project slug is required (max 100 chars)." },
      { status: 400, headers },
    );
  }
  if (!name || name.length > 120) {
    return NextResponse.json(
      { error: "Name is required (max 120 chars)." },
      { status: 400, headers },
    );
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "Valid email is required." },
      { status: 400, headers },
    );
  }
  if (!message || message.length < 10 || message.length > 2000) {
    return NextResponse.json(
      { error: "Message must be 10–2000 characters." },
      { status: 400, headers },
    );
  }

  /* ── Store submission ── */
  try {
    await prisma.submission.create({
      data: { projectSlug, name, email, message },
    });
  } catch (err) {
    console.error("Submission store failed:", err);
    return NextResponse.json(
      { error: "Failed to save submission." },
      { status: 500, headers },
    );
  }

  return NextResponse.json({ ok: true }, { headers });
}
