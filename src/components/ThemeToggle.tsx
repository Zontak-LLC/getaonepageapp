"use client";

import { useTheme } from "./ThemeProvider";

/**
 * Sun/Moon toggle for dark ↔ light mode.
 * Uses pure CSS transitions (no Framer Motion dependency).
 */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      className="relative w-8 h-8 flex items-center justify-center rounded-full
        hover:bg-orange/10 transition-colors"
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      <div
        className="relative w-5 h-5 transition-transform duration-400 ease-in-out"
        style={{ transform: isDark ? "rotate(0deg)" : "rotate(180deg)" }}
      >
        {/* Sun icon (visible in dark mode) */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="absolute inset-0 w-5 h-5 text-orange transition-all duration-300"
          style={{
            opacity: isDark ? 1 : 0,
            transform: isDark ? "scale(1)" : "scale(0.5)",
          }}
        >
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>

        {/* Moon icon (visible in light mode) */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="absolute inset-0 w-5 h-5 text-orange-dark transition-all duration-300"
          style={{
            opacity: isDark ? 0 : 1,
            transform: isDark ? "scale(0.5)" : "scale(1)",
          }}
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      </div>
    </button>
  );
}
