/**
 * POST /api/webhooks/stripe
 *
 * Handles Stripe webhook events for payment confirmations.
 * On checkout.session.completed:
 *   1. Verify signature
 *   2. Extract customer email + tier from metadata
 *   3. Provision credits in KV (Upstash Redis)
 *   4. Send welcome email + team notification via Resend
 *   5. Always return 200 (prevent Stripe retry storms)
 *
 * Required env vars:
 *   STRIPE_SECRET_KEY      — Stripe API secret key
 *   STRIPE_WEBHOOK_SECRET  — Webhook signing secret
 *
 * Optional env vars:
 *   RESEND_API_KEY         — Resend email API key
 *   NOTIFY_EMAIL           — Team notification address
 *   FROM_EMAIL             — Verified sender address
 */

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { CREDITS_INCLUDED } from "@/lib/graph-types";
import type { CreditRecord } from "@/lib/graph-types";
import { loadCredits, saveCredits } from "@/lib/graph-state";
import type { KVStore } from "@/lib/graph-state";
import { buildPaymentWelcomeEmail } from "@/emails/payment-welcome";
import { buildPaymentNotificationEmail } from "@/emails/payment-notification";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-02-25.clover",
  });
}

/** Map Stripe price metadata tier to CreditRecord plan */
function tierToPlan(tier: string | undefined): CreditRecord["plan"] {
  switch (tier?.toLowerCase()) {
    case "starter":
      return "starter";
    case "pro":
      return "pro";
    case "premium":
      return "premium";
    default:
      return "standard";
  }
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  const stripe = getStripe();

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Stripe webhook signature verification failed:", message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  console.log(`[stripe-webhook] ${event.type} | ${event.id}`);

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutCompleted(session);
    } else {
      console.log(`[stripe-webhook] Unhandled event: ${event.type}`);
    }
  } catch (err) {
    // Always return 200 to prevent Stripe retry storms
    console.error(`[stripe-webhook] Handler error for ${event.type}:`, err);
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const customerEmail =
    session.customer_details?.email ?? session.customer_email ?? "";
  const customerName = session.customer_details?.name ?? "";
  const tier = session.metadata?.tier;
  const plan = tierToPlan(tier);
  const amountTotal = session.amount_total ?? 0;
  const amount = `$${(amountTotal / 100).toFixed(2)}`;

  console.log(
    `[stripe-webhook] Checkout: ${customerEmail} | ${plan} | ${amount} | session: ${session.id}`,
  );

  if (!customerEmail) {
    console.error("[stripe-webhook] No customer email — cannot provision credits");
    return;
  }

  // ── Provision credits in KV ──────────────────────────────────────────────
  const kvConfigured = !!(
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  );

  if (kvConfigured) {
    const { Redis } = await import("@upstash/redis");
    const kv: KVStore = Redis.fromEnv();

    const existing = await loadCredits(customerEmail, kv);
    const now = new Date().toISOString();

    if (existing) {
      // Add credits to existing record
      const updated: CreditRecord = {
        ...existing,
        total: existing.total + CREDITS_INCLUDED,
        plan,
        updatedAt: now,
      };
      await saveCredits(updated, kv);
      console.log(
        `[stripe-webhook] Added ${CREDITS_INCLUDED} credits to ${customerEmail} (total: ${updated.total})`,
      );
    } else {
      // Create new record
      const record: CreditRecord = {
        email: customerEmail,
        total: CREDITS_INCLUDED,
        used: 0,
        plan,
        createdAt: now,
        updatedAt: now,
      };
      await saveCredits(record, kv);
      console.log(
        `[stripe-webhook] Created credit record for ${customerEmail} (${CREDITS_INCLUDED} credits)`,
      );
    }
  } else {
    console.warn("[stripe-webhook] KV not configured — credits not provisioned");
  }

  // ── Send emails via Resend ───────────────────────────────────────────────
  if (process.env.RESEND_API_KEY) {
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      const fromEmail = process.env.FROM_EMAIL ?? "Zontak <noreply@getaonepageapp.com>";

      // Welcome email to customer (rich HTML template)
      await resend.emails.send({
        from: fromEmail,
        to: [customerEmail],
        subject: `Welcome to Zontak — your ${plan} credits are ready`,
        html: buildPaymentWelcomeEmail({
          name: customerName,
          email: customerEmail,
          tier: plan,
          amount,
          sessionId: session.id,
        }),
        replyTo: process.env.NOTIFY_EMAIL,
      });

      // Team notification (rich HTML template)
      if (process.env.NOTIFY_EMAIL) {
        await resend.emails.send({
          from: fromEmail,
          to: [process.env.NOTIFY_EMAIL],
          subject: `New Payment: ${customerName || customerEmail} (${plan} ${amount})`,
          html: buildPaymentNotificationEmail({
            name: customerName,
            email: customerEmail,
            tier: plan,
            amount,
            sessionId: session.id,
            timestamp: new Date().toISOString(),
          }),
          replyTo: customerEmail,
        });
      }

      console.log(`[stripe-webhook] Emails sent for ${customerEmail}`);
    } catch (err) {
      console.error("[stripe-webhook] Email send failed:", err);
    }
  }
}
