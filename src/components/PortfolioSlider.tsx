"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/* ─── Types ─── */

type PortfolioItem = {
  name: string;
  url: string;
  desc: string;
};

/* ─── Component ─── */

export function PortfolioSlider({ items }: { items: PortfolioItem[] }) {
  const [current, setCurrent] = useState(0);
  const [perView, setPerView] = useState(3);
  const [paused, setPaused] = useState(false);
  const touchRef = useRef(0);

  // Responsive items-per-view
  useEffect(() => {
    function update() {
      if (window.innerWidth < 640) setPerView(1);
      else if (window.innerWidth < 1024) setPerView(2);
      else setPerView(3);
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const maxIndex = Math.max(0, items.length - perView);

  // Clamp current when perView changes
  useEffect(() => {
    setCurrent((c) => Math.min(c, maxIndex));
  }, [maxIndex]);

  const next = useCallback(() => setCurrent((c) => Math.min(c + 1, maxIndex)), [maxIndex]);
  const prev = useCallback(() => setCurrent((c) => Math.max(c - 1, 0)), []);

  // Auto-advance
  useEffect(() => {
    if (paused || maxIndex === 0) return;
    const id = setInterval(() => {
      setCurrent((c) => (c >= maxIndex ? 0 : c + 1));
    }, 5000);
    return () => clearInterval(id);
  }, [paused, maxIndex]);

  // Touch/swipe
  const onTouchStart = (e: React.TouchEvent) => {
    touchRef.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const delta = touchRef.current - e.changedTouches[0].clientX;
    if (Math.abs(delta) > 50) {
      if (delta > 0) next();
      else prev();
    }
  };

  // Each card takes up 1/perView of the container width, with gap accounted for
  const gapPx = 32; // gap-8 = 2rem = 32px
  const cardWidthPercent = 100 / perView;

  return (
    <div
      className="relative px-12"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Slider viewport */}
      <div className="overflow-hidden rounded-2xl" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{
            transform: `translateX(calc(-${current * cardWidthPercent}% - ${current * gapPx}px + ${current * (gapPx / perView)}px))`,
            gap: `${gapPx}px`,
          }}
        >
          {items.map((p) => (
            <a
              key={p.name}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block p-8 rounded-2xl border border-orange/10 bg-warm-gray/20 hover:border-orange/40 hover:bg-warm-gray/40 transition-all flex-shrink-0"
              style={{ width: `calc(${cardWidthPercent}% - ${gapPx - gapPx / perView}px)` }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-3 h-3 rounded-full bg-orange group-hover:animate-pulse" />
                <h3 className="text-xl font-bold text-foreground group-hover:text-orange transition-colors">
                  {p.name}
                </h3>
              </div>
              <p className="text-foreground/50 text-base leading-relaxed mb-4">{p.desc}</p>
              <span className="text-blue text-base font-mono group-hover:underline">
                {p.url.replace("https://", "")} &rarr;
              </span>
            </a>
          ))}
        </div>
      </div>

      {/* Navigation arrows */}
      {maxIndex > 0 && (
        <>
          <button
            onClick={prev}
            disabled={current === 0}
            aria-label="Previous"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-warm-gray/80 border border-orange/20 text-foreground/60 hover:text-orange hover:border-orange/50 transition-all disabled:opacity-0 disabled:pointer-events-none flex items-center justify-center backdrop-blur-sm"
          >
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M10 4L6 8l4 4" />
            </svg>
          </button>
          <button
            onClick={next}
            disabled={current >= maxIndex}
            aria-label="Next"
            className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-warm-gray/80 border border-orange/20 text-foreground/60 hover:text-orange hover:border-orange/50 transition-all disabled:opacity-0 disabled:pointer-events-none flex items-center justify-center backdrop-blur-sm"
          >
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 4l4 4-4 4" />
            </svg>
          </button>
        </>
      )}

      {/* Dot indicators */}
      {maxIndex > 0 && (
        <div className="flex justify-center gap-2 mt-8">
          {Array.from({ length: maxIndex + 1 }, (_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`w-2 h-2 rounded-full transition-all ${
                i === current
                  ? "bg-orange w-6"
                  : "bg-foreground/20 hover:bg-foreground/40"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
