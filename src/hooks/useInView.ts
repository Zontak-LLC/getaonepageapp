"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Lightweight IntersectionObserver hook replacing framer-motion's whileInView.
 * Returns a ref to attach and a boolean for visibility.
 *
 * @param options.once  If true, stays true after first intersection (default: true)
 * @param options.margin  rootMargin string (default: "-60px")
 */
export function useInView({
  once = true,
  margin = "-60px",
}: { once?: boolean; margin?: string } = {}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          if (once) observer.unobserve(el);
        } else if (!once) {
          setIsInView(false);
        }
      },
      { rootMargin: margin },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [once, margin]);

  return { ref, isInView };
}
