"use client";

import { useSession, signIn, signOut } from "next-auth/react";

export function AuthButton() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="w-24 h-9 rounded-full bg-warm-gray/40 animate-pulse" />
    );
  }

  if (session?.user) {
    return (
      <button
        onClick={() => signOut()}
        className="flex items-center gap-2 border border-foreground/20 hover:border-orange/40 text-foreground/70 hover:text-foreground font-medium px-4 py-2 rounded-full text-sm transition-all"
      >
        {session.user.image && (
          <img
            src={session.user.image}
            alt=""
            className="w-5 h-5 rounded-full"
            referrerPolicy="no-referrer"
          />
        )}
        Sign Out
      </button>
    );
  }

  return (
    <button
      onClick={() => signIn("google")}
      className="bg-orange hover:bg-orange-dark text-warm-black font-semibold px-5 py-2 rounded-full text-sm transition-colors"
    >
      Get Started
    </button>
  );
}
