"use client";

import { useState } from "react";
import { useInView } from "@/hooks/useInView";
import { PricingButton } from "@/components/PricingButton";

/* ─── Complexity levels ─────────────────────────────────────────────── */

const COMPLEXITY_LEVELS = [
  {
    label: "Basic",
    description: "Simple one-page site for a local business or personal brand.",
    sections: "3–4",
    tokenCost: "$2 – $4",
    youPay: "$29",
    time: "~5 min",
    model: "HAIKU",
    modelColor: "text-emerald-400",
    tier: "starter" as const,
    tierLabel: "Starter",
    cardId: "tier-starter",
  },
  {
    label: "Standard",
    description: "Custom styling, more sections, and SEO-optimized copy.",
    sections: "5–7",
    tokenCost: "$5 – $10",
    youPay: "$49",
    time: "~12 min",
    model: "SONNET",
    modelColor: "text-blue",
    tier: "pro" as const,
    tierLabel: "Pro",
    cardId: "tier-pro",
  },
  {
    label: "Rich",
    description: "Complex site with extensive content, custom palette, and priority build.",
    sections: "8–12",
    tokenCost: "$10 – $18",
    youPay: "$79",
    time: "~20 min",
    model: "SONNET",
    modelColor: "text-blue",
    tier: "premium" as const,
    tierLabel: "Premium",
    cardId: "tier-premium",
  },
  {
    label: "Custom",
    description: "Enterprise-level complexity — contact us for a custom quote.",
    sections: "12+",
    tokenCost: "$18 – $30+",
    youPay: "Contact Us",
    time: "~30 min",
    model: "OPUS",
    modelColor: "text-purple-400",
    tier: null,
    tierLabel: "Custom",
    cardId: null,
  },
] as const;

/* ─── Tier card data ─────────────────────────────────────────────── */

type TierCard = {
  id: string;
  name: string;
  price: string;
  tagline: string;
  features: string[];
  tier: "starter" | "pro" | "premium";
  highlight: boolean;
  variant: "outline" | "solid";
};

const TIER_CARDS: TierCard[] = [
  {
    id: "tier-starter",
    name: "Starter",
    price: "$29",
    tagline: "Simple one-page site for a local business or personal brand.",
    features: [
      "Single-page responsive site",
      "Cloudflare edge hosting",
      "SSL certificate",
      "3 revisions included",
    ],
    tier: "starter",
    highlight: false,
    variant: "outline",
  },
  {
    id: "tier-pro",
    name: "Pro",
    price: "$49",
    tagline: "Custom styling, more sections, and SEO-optimized copy.",
    features: [
      "Everything in Starter",
      "Custom domain setup",
      "SEO optimization",
      "Contact form integration",
      "3 revisions included",
    ],
    tier: "pro",
    highlight: true,
    variant: "solid",
  },
  {
    id: "tier-premium",
    name: "Premium",
    price: "$79",
    tagline: "Complex site with extensive content, custom palette, and priority build.",
    features: [
      "Everything in Pro",
      "Extensive multi-section layout",
      "Custom color palette",
      "Priority AI pipeline",
      "3 revisions included",
    ],
    tier: "premium",
    highlight: false,
    variant: "outline",
  },
];

/* ─── Check Icon ─────────────────────────────────────────────── */

function CheckIcon() {
  return (
    <svg
      className="w-4 h-4 text-orange mt-0.5 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

/* ─── Complexity Calculator ─────────────────────────────────────── */

function ComplexityCalculator() {
  const [level, setLevel] = useState(1);
  const current = COMPLEXITY_LEVELS[level];
  const { ref, isInView } = useInView();

  function handleSelectTier() {
    if (current.cardId) {
      document
        .getElementById(current.cardId)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      // Custom tier → scroll to contact form
      document
        .getElementById("contact")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <div
      ref={ref}
      className={`max-w-2xl mx-auto mb-16 p-6 sm:p-8 rounded-2xl border border-orange/20 bg-warm-gray/30 transition-opacity ${
        isInView ? "animate-fade-in-up" : "opacity-0"
      }`}
    >
      <h3 className="text-xl font-semibold text-center mb-2">
        Estimate your{" "}
        <span className="text-gradient-sun">project cost</span>
      </h3>
      <p className="text-base text-foreground/50 text-center mb-8">
        Drag the slider to match your site complexity
      </p>

      {/* Slider */}
      <div className="mb-8">
        <input
          type="range"
          min="0"
          max="3"
          step="1"
          value={level}
          onChange={(e) => setLevel(Number(e.target.value))}
          className="w-full slider-orange cursor-pointer"
        />
        <div className="flex justify-between mt-2">
          {COMPLEXITY_LEVELS.map((l, i) => (
            <button
              key={l.label}
              onClick={() => setLevel(i)}
              className={`text-xs font-mono transition-colors ${
                i === level ? "text-orange" : "text-foreground/30"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Result grid */}
      <div className="flex flex-wrap justify-center gap-3 mb-6">
        <div className="text-center p-3 rounded-lg bg-background/50 w-[calc(50%-6px)] sm:w-[calc(20%-10px)]">
          <div className="text-lg font-bold text-gradient-sun font-mono">
            {current.youPay}
          </div>
          <div className="text-xs text-foreground/40 mt-0.5">you pay</div>
        </div>
        <div className="text-center p-3 rounded-lg bg-background/50 w-[calc(50%-6px)] sm:w-[calc(20%-10px)]">
          <div className="text-lg font-bold font-mono text-emerald-400/80">
            {current.tokenCost}
          </div>
          <div className="text-xs text-foreground/40 mt-0.5">token cost</div>
        </div>
        <div className="text-center p-3 rounded-lg bg-background/50 w-[calc(50%-6px)] sm:w-[calc(20%-10px)]">
          <div className="text-lg font-bold text-gradient-sun font-mono">
            {current.time}
          </div>
          <div className="text-xs text-foreground/40 mt-0.5">delivery</div>
        </div>
        <div className="text-center p-3 rounded-lg bg-background/50 w-[calc(50%-6px)] sm:w-[calc(20%-10px)]">
          <div className="text-lg font-bold text-gradient-sun font-mono">
            {current.sections}
          </div>
          <div className="text-xs text-foreground/40 mt-0.5">sections</div>
        </div>
        <div className="text-center p-3 rounded-lg bg-background/50 w-[calc(50%-6px)] sm:w-[calc(20%-10px)]">
          <div className={`text-lg font-bold font-mono ${current.modelColor}`}>
            {current.model}
          </div>
          <div className="text-xs text-foreground/40 mt-0.5">AI model</div>
        </div>
      </div>

      {/* Description + CTA */}
      <p className="text-base text-foreground/50 text-center mb-4">
        {current.description}
      </p>

      <div className="text-center">
        <button
          onClick={handleSelectTier}
          className="inline-block text-base font-semibold text-orange hover:text-orange-light transition-colors"
        >
          {current.cardId
            ? `Select ${current.tierLabel} Tier \u2192`
            : "Contact Us \u2192"}
        </button>
      </div>

      <p className="text-xs text-foreground/25 text-center mt-4 font-mono">
        pricing = token cost &times; markup &mdash; fully transparent
      </p>
    </div>
  );
}

/* ─── Tier Card ─────────────────────────────────────────────── */

function TierCardComponent({
  card,
  index,
}: {
  card: TierCard;
  index: number;
}) {
  const { ref, isInView } = useInView();
  const delay = index * 100;

  return (
    <div
      ref={ref}
      id={card.id}
      className={`relative p-8 rounded-3xl border text-left transition-all flex flex-col ${
        isInView ? "animate-fade-in-up" : "opacity-0"
      } ${
        card.highlight
          ? "border-2 border-orange/40 bg-warm-gray/40 hover:border-orange/60"
          : "border border-orange/10 bg-warm-gray/40 hover:border-orange/30"
      }`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {card.highlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange text-warm-black text-sm font-bold px-3 py-1 rounded-full">
          Most Popular
        </div>
      )}

      <p className="text-orange text-sm font-bold uppercase tracking-widest mb-3">
        {card.name}
      </p>
      <div className="flex items-baseline gap-1 mb-4">
        <span className="text-4xl font-bold text-foreground">{card.price}</span>
      </div>
      <p className="text-foreground/50 text-base mb-6">{card.tagline}</p>

      <ul className="space-y-3 mb-8">
        {card.features.map((feature) => (
          <li key={feature} className="flex items-start gap-3">
            <CheckIcon />
            <span className="text-foreground/60 text-base">{feature}</span>
          </li>
        ))}
      </ul>

      <PricingButton tier={card.tier} variant={card.variant} />
    </div>
  );
}

/* ─── Main PricingSection ─────────────────────────────────────── */

export function PricingSection() {
  const { ref: headerRef, isInView: headerVisible } = useInView();

  return (
    <section id="pricing" className="relative py-32 px-6">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-warm-gray/20 to-background" />

      <div className="relative z-10 max-w-5xl mx-auto">
        {/* Header */}
        <div
          ref={headerRef}
          className={`text-center mb-16 transition-opacity ${
            headerVisible ? "animate-fade-in-up" : "opacity-0"
          }`}
        >
          <div className="inline-block rounded-full bg-orange/10 border border-orange/20 px-4 py-1 text-orange text-base font-medium mb-8">
            Per-Project Pricing
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Tokens, not{" "}
            <span className="text-gradient-sun">timesheets</span>
          </h2>
          <p className="text-foreground/60 text-xl mb-2">
            Transparent markup on AI token costs. You see what we spend, you pay
            a fair multiple.
          </p>
          <p className="text-foreground/40 text-base">
            Every plan includes build, deploy, hosting, SSL, and 3 free
            revisions.
          </p>
        </div>

        {/* Complexity calculator */}
        <ComplexityCalculator />

        {/* Tier cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {TIER_CARDS.map((card, i) => (
            <TierCardComponent key={card.id} card={card} index={i} />
          ))}
        </div>

        <p className="text-foreground/30 text-sm mt-8 text-center">
          Hosting on Cloudflare is free. No recurring fees unless you need
          ongoing updates.
        </p>
      </div>
    </section>
  );
}
