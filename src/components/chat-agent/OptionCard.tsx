"use client";

import type { OptionCard as OptionCardType } from "@/lib/chat-types";

interface OptionCardProps {
  card: OptionCardType;
  onSelect: (value: string) => void;
  disabled?: boolean;
}

export function OptionCard({ card, onSelect, disabled }: OptionCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(card.value)}
      disabled={disabled}
      className="w-full text-left p-4 rounded-xl border border-warm-gray bg-warm-black hover:border-orange/40 hover:bg-orange/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <p className="font-medium text-foreground text-sm">{card.label}</p>
      <p className="text-xs text-foreground/50 mt-1">{card.description}</p>
    </button>
  );
}

interface OptionCardGroupProps {
  cards: OptionCardType[];
  onSelect: (value: string) => void;
  disabled?: boolean;
}

export function OptionCardGroup({
  cards,
  onSelect,
  disabled,
}: OptionCardGroupProps) {
  return (
    <div className="grid grid-cols-2 gap-3 my-4 max-w-[80%]">
      {cards.map((card) => (
        <OptionCard
          key={card.id}
          card={card}
          onSelect={onSelect}
          disabled={disabled}
        />
      ))}
    </div>
  );
}
