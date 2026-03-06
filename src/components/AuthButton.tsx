"use client";

import { useSession, signOut } from "next-auth/react";

export function AuthButton() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="w-24 h-9 rounded-full bg-warm-gray/40 animate-pulse" />
    );
  }

  if (session?.user) {
    const initial = (session.user.name?.[0] ?? session.user.email?.[0] ?? "?").toUpperCase();
    return (
      <button
        onClick={() => signOut()}
        className="flex items-center gap-2 border border-foreground/20 hover:border-orange/40 text-foreground/70 hover:text-foreground font-medium px-4 py-2 rounded-full text-sm transition-all"
      >
        <span className="w-5 h-5 rounded-full bg-orange/20 text-orange text-[10px] font-bold flex items-center justify-center">
          {initial}
        </span>
        Sign Out
      </button>
    );
  }

  return (
    <a
      href="/auth/signin"
      className="bg-orange hover:bg-orange-dark text-warm-black font-semibold px-5 py-2 rounded-full text-sm transition-colors"
    >
      Get Started
    </a>
  );
}
