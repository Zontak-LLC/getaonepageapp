"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/#contact";
  const justRegistered = searchParams.get("registered") === "true";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password.");
      setLoading(false);
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-left">
      {/* Success banner after registration */}
      {justRegistered && (
        <div className="text-sm text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-lg px-4 py-3 text-center">
          Account created! Sign in below.
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3 text-center">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm text-foreground/60 mb-1.5">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-orange/10 bg-warm-gray/30 text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-orange/40 transition-colors"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm text-foreground/60 mb-1.5">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-orange/10 bg-warm-gray/30 text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-orange/40 transition-colors"
          placeholder="Your password"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-full bg-orange hover:bg-orange-dark text-warm-black font-semibold transition-all disabled:opacity-60"
      >
        {loading ? "Signing in\u2026" : "Sign In"}
      </button>

      <p className="text-center text-sm text-foreground/50">
        Don&apos;t have an account?{" "}
        <a
          href="/auth/signup"
          className="text-orange hover:text-orange-light transition-colors"
        >
          Sign up
        </a>
      </p>
    </form>
  );
}
