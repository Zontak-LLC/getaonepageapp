import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware: security headers + basic abuse prevention.
 *
 * Rate limiting is handled in-memory per-instance (see lib/rate-limit.ts)
 * for API routes. This middleware adds security headers and blocks
 * obviously suspicious requests at the edge.
 */

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const { pathname } = request.nextUrl;

  // ── Security headers ──
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  );
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );

  // ── Block suspicious user agents ──
  const ua = request.headers.get("user-agent") ?? "";
  const suspiciousPatterns =
    /curl|wget|python-requests|scrapy|bot(?!.*google)|spider|crawler/i;
  if (
    suspiciousPatterns.test(ua) &&
    !pathname.startsWith("/api/webhooks")
  ) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // ── Block overly large request bodies on non-webhook paths ──
  const contentLength = request.headers.get("content-length");
  if (
    contentLength &&
    parseInt(contentLength) > 50_000 &&
    !pathname.startsWith("/api/webhooks")
  ) {
    return new NextResponse("Payload too large", { status: 413 });
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.svg|zontak-logo\\.svg|robots\\.txt|sitemap\\.xml).*)",
  ],
};
