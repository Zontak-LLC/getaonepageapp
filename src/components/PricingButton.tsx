"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";

const TIER_BUTTON_COLORS = {
  starter: { accent: "#CD7F32", accentDark: "#A0622A", tint: "rgba(205,127,50,0.10)", tintHover: "rgba(205,127,50,0.20)", border: "rgba(205,127,50,0.20)" },
  pro: { accent: "#C0C0C0", accentDark: "#A0A0A0", tint: "rgba(192,192,192,0.10)", tintHover: "rgba(192,192,192,0.20)", border: "rgba(192,192,192,0.20)" },
  premium: { accent: "#FFD700", accentDark: "#CCB000", tint: "rgba(255,215,0,0.10)", tintHover: "rgba(255,215,0,0.20)", border: "rgba(255,215,0,0.20)" },
} as const;

interface PricingButtonProps {
  tier: "starter" | "pro" | "premium";
  label?: string;
  variant?: "solid" | "outline";
}

export function PricingButton({
  tier,
  label = "Get Started",
  variant = "outline",
}: PricingButtonProps) {
  const { status } = useSession();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (status !== "authenticated") {
      window.location.href = "/auth/signin";
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });

      const data = (await res.json()) as { url?: string; error?: string };

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("Checkout error:", data.error);
        setLoading(false);
      }
    } catch (err) {
      console.error("Checkout failed:", err);
      setLoading(false);
    }
  }

  const colors = TIER_BUTTON_COLORS[tier];

  const baseClass =
    "mt-auto block w-full text-center font-semibold py-3 rounded-full text-sm transition-colors disabled:opacity-60";

  const inlineStyle =
    variant === "solid"
      ? { backgroundColor: colors.accent, color: "#1A1510" }
      : { backgroundColor: colors.tint, color: colors.accent, border: `1px solid ${colors.border}` };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={baseClass}
      style={inlineStyle}
    >
      {loading ? "Redirecting…" : label}
    </button>
  );
}
