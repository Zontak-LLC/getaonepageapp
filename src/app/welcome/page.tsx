import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Welcome — Zontak | Get a One-Page App",
  description:
    "Payment confirmed. Submit your project brief and our AI pipeline will build your site.",
  robots: { index: false, follow: false },
};

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/auth/signin");
  }

  const params = await searchParams;
  const sessionId =
    typeof params.session_id === "string" ? params.session_id : undefined;

  // Determine if this is a post-checkout landing (has session_id) or direct visit
  const isPostCheckout = !!sessionId;

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Background */}
      <div className="fixed inset-0 bg-gradient-to-b from-background via-warm-gray/10 to-background pointer-events-none" />
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-orange/5 blur-3xl animate-pulse-glow" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-6 py-20">
        {/* Logo */}
        <div className="text-center mb-10">
          <a
            href="/"
            className="inline-flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <Image
              src="/zontak-logo.svg"
              alt="Zontak"
              width={44}
              height={44}
            />
            <span className="text-xl font-bold tracking-tight">
              <span className="text-orange">ZON</span>
              <span className="text-blue">TAK</span>
            </span>
          </a>
        </div>

        {/* Confirmation Badge */}
        <div className="flex justify-center mb-8">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange/10 border border-orange/20 text-orange text-sm font-medium">
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
            {isPostCheckout ? "Payment Confirmed" : "Welcome"}
            {" — "}
            {session.user.email}
          </span>
        </div>

        {/* Success icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-orange/10 border border-orange/20 flex items-center justify-center">
            <svg
              className="w-10 h-10 text-orange"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>

        {/* Heading */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            {isPostCheckout ? (
              <>
                Your credits are{" "}
                <span className="text-gradient-sun">ready</span>
              </>
            ) : (
              <>
                Welcome to{" "}
                <span className="text-gradient-sun">Zontak</span>
              </>
            )}
          </h1>
          <p className="text-foreground/50 text-lg max-w-lg mx-auto">
            {isPostCheckout
              ? "Thank you for your purchase! Your project credits have been provisioned. Submit your project brief and our AI pipeline will build your site."
              : "Submit your project brief below and our AI-powered pipeline will build and deploy your one-page app."}
          </p>
        </div>

        {/* Steps */}
        <div className="max-w-md mx-auto mb-12">
          <div className="space-y-4">
            {[
              {
                step: "1",
                label: "Submit your project brief",
                desc: "Business info, style preferences, content",
                status: "next" as const,
              },
              {
                step: "2",
                label: "AI pipeline builds your site",
                desc: "Assess, generate, validate, deploy",
                status: "pending" as const,
              },
              {
                step: "3",
                label: "Live on Cloudflare",
                desc: "SSL, custom domain, 3 revisions included",
                status: "pending" as const,
              },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-4">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                    item.status === "next"
                      ? "bg-orange text-warm-black"
                      : "bg-warm-gray border border-orange/10 text-foreground/40"
                  }`}
                >
                  {item.step}
                </div>
                <div>
                  <p
                    className={`text-sm font-medium ${
                      item.status === "next"
                        ? "text-orange"
                        : "text-foreground/50"
                    }`}
                  >
                    {item.label}
                  </p>
                  <p className="text-xs text-foreground/30">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Button */}
        <div className="text-center mb-8">
          <a
            href="/#your-project"
            className="inline-block bg-orange hover:bg-orange-dark text-warm-black font-bold px-10 py-4 rounded-full text-lg transition-all hover:scale-105 shadow-lg shadow-orange/20"
          >
            Submit Your Project Brief &rarr;
          </a>
          <p className="text-foreground/30 text-xs mt-4">
            Fill out the project intake form on our homepage to get started.
          </p>
        </div>

        {/* Pipeline reference */}
        <div className="max-w-sm mx-auto p-4 rounded-2xl border border-orange/10 bg-warm-gray/20 text-center">
          <p className="font-mono text-xs text-orange/50">
            BRIEF &rarr; ASSESS &rarr; GENERATE &rarr; VALIDATE &rarr; BUILD
            &rarr; DEPLOY
          </p>
          <p className="text-sm text-foreground/40 mt-2">
            Your project will flow through our 8-node AI pipeline.
          </p>
        </div>

        {/* Back to home */}
        <div className="text-center mt-12">
          <a
            href="/"
            className="text-sm text-foreground/40 hover:text-orange transition-colors"
          >
            &larr; Back to getaonepageapp.com
          </a>
        </div>
      </div>
    </main>
  );
}
