import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Image from "next/image";
import { SignInForm } from "@/components/SignInForm";

export const metadata: Metadata = {
  title: "Sign In — Zontak | Get a One-Page App",
  description:
    "Sign in to submit your project brief. Our AI builds your one-page app.",
  robots: { index: false, follow: false },
};

export default async function SignInPage() {
  const session = await auth();
  if (session?.user) redirect("/#your-project");

  return (
    <main className="min-h-screen bg-warm-black text-foreground flex items-center justify-center">
      <div className="fixed inset-0 bg-gradient-to-b from-warm-black via-warm-gray/10 to-warm-black pointer-events-none" />

      <div className="relative z-10 max-w-md mx-auto px-6 text-center">
        {/* Logo */}
        <a
          href="/"
          className="inline-flex items-center gap-3 mb-10 group"
        >
          <Image
            src="/zontak-logo.svg"
            alt="Zontak"
            width={44}
            height={44}
            className="transition-transform group-hover:scale-110"
          />
          <span className="text-xl font-bold tracking-tight">
            <span className="text-orange">ZON</span>
            <span className="text-blue">TAK</span>
          </span>
        </a>

        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 mt-8">
          Sign in to <span className="text-gradient-sun">build</span>
        </h1>
        <p className="text-foreground/50 mb-10 max-w-sm mx-auto">
          Enter your email and password to submit your project brief.
          Our AI-powered workflow will turn it into a real website.
        </p>

        {/* Email/password form */}
        <SignInForm />

        <p className="mt-8 text-xs text-foreground/30">
          No credit card required. Your first project is completely free.
        </p>

        {/* Back to home */}
        <div className="mt-8">
          <a
            href="/"
            className="text-sm text-foreground/50 hover:text-orange transition-colors"
          >
            &larr; Back to getaonepage.app
          </a>
        </div>
      </div>
    </main>
  );
}
