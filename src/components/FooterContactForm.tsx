"use client";

import { useState } from "react";

type FormState = "idle" | "sending" | "sent" | "error";

export function FooterContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    setErrorMsg("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Send failed" }));
        throw new Error(data.error ?? `Error ${res.status}`);
      }

      setState("sent");
      setName("");
      setEmail("");
      setMessage("");
    } catch (err) {
      setState("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  if (state === "sent") {
    return (
      <div className="text-center py-8">
        <div className="text-3xl mb-3">✉️</div>
        <p className="text-foreground/80 font-semibold text-lg">Message sent!</p>
        <p className="text-foreground/40 text-base mt-1">
          We&apos;ll get back to you shortly.
        </p>
        <button
          onClick={() => setState("idle")}
          className="mt-4 text-orange hover:text-orange-light text-sm transition-colors"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={120}
          className="w-full bg-warm-black/60 border border-foreground/10 rounded-xl px-4 py-3 text-base text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-orange/40 transition-colors"
        />
        <input
          type="email"
          placeholder="Your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full bg-warm-black/60 border border-foreground/10 rounded-xl px-4 py-3 text-base text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-orange/40 transition-colors"
        />
      </div>

      <textarea
        placeholder="How can we help? Questions, domain setup, revisions..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        required
        minLength={10}
        maxLength={2000}
        rows={4}
        className="w-full bg-warm-black/60 border border-foreground/10 rounded-xl px-4 py-3 text-base text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-orange/40 transition-colors resize-none"
      />

      {state === "error" && (
        <p className="text-red-400 text-sm">{errorMsg}</p>
      )}

      <button
        type="submit"
        disabled={state === "sending"}
        className="btn-3d bg-orange hover:bg-orange-dark text-warm-black font-bold px-8 py-3 rounded-full text-base disabled:opacity-60 transition-colors"
      >
        {state === "sending" ? "Sending…" : "Send Message"}
      </button>
    </form>
  );
}
