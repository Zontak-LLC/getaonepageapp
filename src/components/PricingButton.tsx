"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";

const TIER_BUTTON_COLORS = {
  starter: {
    bg: "linear-gradient(180deg, #D4923F 0%, #CD7F32 40%, #A0622A 100%)",
    shadow: "#7A4A1E",
    text: "#1A1510",
    hoverBg: "linear-gradient(180deg, #DDA050 0%, #D4923F 40%, #AD6B2E 100%)",
  },
  pro: {
    bg: "linear-gradient(180deg, #D4D4D4 0%, #C0C0C0 40%, #A0A0A0 100%)",
    shadow: "#6E6E6E",
    text: "#1A1510",
    hoverBg: "linear-gradient(180deg, #E0E0E0 0%, #D0D0D0 40%, #B0B0B0 100%)",
  },
  premium: {
    bg: "linear-gradient(180deg, #FFE566 0%, #FFD700 40%, #CCB000 100%)",
    shadow: "#8C7800",
    text: "#1A1510",
    hoverBg: "linear-gradient(180deg, #FFED80 0%, #FFE033 40%, #D4B800 100%)",
  },
} as const;

import type { HostingPlatform } from "@/lib/chat-types";

interface PricingButtonProps {
  tier: "starter" | "pro" | "premium";
  hosting?: HostingPlatform;
  label?: string;
  variant?: "solid" | "outline";
}

export function PricingButton({
  tier,
  hosting = "cloudflare",
  label = "Get Started",
}: PricingButtonProps) {
  const { status } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pressed, setPressed] = useState(false);
  const [hovered, setHovered] = useState(false);

  async function handleClick() {
    if (status !== "authenticated") {
      window.location.href = "/auth/signin";
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, hosting }),
      });

      let data: { url?: string; error?: string };
      try {
        data = await res.json();
      } catch {
        throw new Error(`Server error (${res.status})`);
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error ?? "Checkout failed");
        setLoading(false);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Checkout failed";
      console.error("Checkout failed:", msg);
      setError(msg);
      setLoading(false);
    }
  }

  const colors = TIER_BUTTON_COLORS[tier];

  return (
    <button
      onClick={handleClick}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setPressed(false); setHovered(false); }}
      disabled={loading}
      className="mt-auto block w-full text-center font-bold py-4 rounded-full text-base disabled:opacity-60 select-none"
      style={{
        background: pressed ? colors.bg : hovered ? colors.hoverBg : colors.bg,
        color: colors.text,
        boxShadow: pressed
          ? `0 1px 0 ${colors.shadow}, 0 0 12px 2px ${colors.shadow}40`
          : hovered
            ? `0 4px 0 ${colors.shadow}, 0 0 20px 6px ${colors.shadow}50, 0 6px 14px rgba(0,0,0,0.25)`
            : `0 4px 0 ${colors.shadow}, 0 6px 12px rgba(0,0,0,0.25)`,
        transform: pressed ? "translateY(3px)" : hovered ? "translateY(-1px)" : "translateY(0)",
        transition: "transform 0.12s ease, box-shadow 0.3s ease, background 0.3s ease",
        letterSpacing: "0.02em",
      }}
    >
      {loading ? "Redirecting…" : label}
      {error && (
        <span className="block text-xs text-red-400 mt-1 font-normal">{error}</span>
      )}
    </button>
  );
}
