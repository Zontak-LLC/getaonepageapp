import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Sign In — Zontak | Get a One-Page App",
  description:
    "Sign in with Google to submit your free project brief. Our AI builds your one-page app.",
  robots: { index: false, follow: false },
};

export default async function SignInPage() {
  const session = await auth();
  if (session?.user) redirect("/#contact");

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

        {/* Demo badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-orange/20 bg-orange/5 text-sm text-orange mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-orange animate-pulse" />
          Free Demo — 1 Project
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
          Sign in to <span className="text-gradient-sun">build</span>
        </h1>
        <p className="text-foreground/50 mb-10 max-w-sm mx-auto">
          Sign in with your Google account to submit your free project brief.
          Our AI-powered workflow will turn it into a real website.
        </p>

        {/* Google sign-in */}
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/#contact" });
          }}
        >
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-full border border-orange/10 bg-warm-gray/30 text-foreground font-medium hover:border-orange/30 hover:bg-warm-gray/50 transition-all"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </button>
        </form>

        <p className="mt-8 text-xs text-foreground/30">
          No credit card required. Your first project is completely free.
        </p>

        {/* Back to home */}
        <div className="mt-8">
          <a
            href="/"
            className="text-sm text-foreground/50 hover:text-orange transition-colors"
          >
            &larr; Back to getaonepageapp.com
          </a>
        </div>
      </div>
    </main>
  );
}
