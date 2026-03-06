/**
 * POST /api/checkout
 *
 * Creates a Stripe Checkout Session tied to the authenticated user.
 * The tier (starter/pro/premium) is passed in the request body and
 * stored in session metadata so the webhook can provision the right credits.
 *
 * Required env vars:
 *   STRIPE_SECRET_KEY — Stripe API secret key
 */

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@/lib/auth";

const PRICE_MAP: Record<string, { amount: number; name: string }> = {
  starter: { amount: 2900, name: "Starter — One-Page App" },
  pro: { amount: 4900, name: "Pro — One-Page App" },
  premium: { amount: 7900, name: "Premium — One-Page App" },
};

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-12-18.acacia",
  });
}

export async function POST(request: NextRequest) {
  // Auth check
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json(
      { error: "Sign in required" },
      { status: 401 },
    );
  }

  let tier: string;
  try {
    const body = await request.json() as { tier?: string };
    tier = body.tier?.toLowerCase() ?? "";
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const price = PRICE_MAP[tier];
  if (!price) {
    return NextResponse.json(
      { error: `Invalid tier: ${tier}. Must be starter, pro, or premium.` },
      { status: 400 },
    );
  }

  const stripe = getStripe();

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://getaonepageapp.com";

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: session.user.email,
    metadata: {
      tier,
      userEmail: session.user.email,
    },
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: price.amount,
          product_data: {
            name: price.name,
            description: `Build, deploy, hosting, SSL, and ${3} revisions included.`,
          },
        },
        quantity: 1,
      },
    ],
    success_url: `${baseUrl}/?checkout=success`,
    cancel_url: `${baseUrl}/#pricing`,
  });

  return NextResponse.json({ url: checkoutSession.url });
}
