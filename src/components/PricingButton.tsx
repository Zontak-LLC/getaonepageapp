"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";

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

  const baseClass =
    "mt-auto block w-full text-center font-semibold py-3 rounded-full text-sm transition-colors disabled:opacity-60";

  const variantClass =
    variant === "solid"
      ? "bg-orange hover:bg-orange-dark text-warm-black"
      : "bg-orange/10 hover:bg-orange/20 text-orange border border-orange/20";

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`${baseClass} ${variantClass}`}
    >
      {loading ? "Redirecting…" : label}
    </button>
  );
}
