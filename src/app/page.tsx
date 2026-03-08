import Image from "next/image";
import { ChatAgent } from "@/components/chat-agent";
import { PricingButton } from "@/components/PricingButton";
import { PricingSection } from "@/components/PricingSection";
import { Navbar } from "@/components/Navbar";
import { PortfolioSlider } from "@/components/PortfolioSlider";
import { FooterContactForm } from "@/components/FooterContactForm";

/* ─── Icon Components ─── */

function SunRayDecor({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {Array.from({ length: 24 }).map((_, i) => (
        <line
          key={i}
          x1="100"
          y1="100"
          x2={100 + 95 * Math.cos((i * 15 * Math.PI) / 180)}
          y2={100 + 95 * Math.sin((i * 15 * Math.PI) / 180)}
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.15"
        />
      ))}
    </svg>
  );
}

/* ─── Data ─── */

const portfolio = [
  {
    name: "Sunrise Bakery",
    url: "https://sunrisebakeryny.com",
    desc: "Local bakery in New York — warm, inviting design showcasing fresh baked goods.",
  },
  {
    name: "Please Fix It For Me",
    url: "https://pleasefixitforme.com",
    desc: "Handyman services for Miguel — clean, trustworthy layout that drives phone calls.",
  },
  {
    name: "Andrey the Carpenter",
    url: "https://andrey-the-carpenter.pages.dev",
    desc: "30+ years of master craftsmanship in Connecticut — custom woodwork, built-ins, and historic home restoration. Andrey is also our friend.",
  },
  {
    name: "Wowcards.com",
    url: "https://wowcards.vercel.app",
    desc: "Premium greeting cards and invitations — bold, playful design that makes every occasion feel special.",
  },
];

/* ─── Page ─── */

export default function Home() {
  return (
    <div className="relative overflow-hidden">
      {/* ─── Navigation ─── */}
      <Navbar />

      {/* ─── Hero ─── */}
      <section className="relative min-h-screen flex items-center justify-center pt-20">
        {/* Background sun rays */}
        <div className="absolute inset-0 overflow-hidden">
          <SunRayDecor className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[1200px] text-orange animate-rotate-slow" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-orange/5 blur-3xl animate-pulse-glow" />
          <div className="absolute top-1/4 right-1/4 w-64 h-64 rounded-full bg-blue/5 blur-3xl animate-pulse-glow" style={{ animationDelay: "2s" }} />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <div className="animate-float mb-8">
            <Image
              src="/zontak-logo.svg"
              alt="Zontak"
              width={180}
              height={180}
              priority
              className="mx-auto"
            />
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            <span className="text-gradient-sun">One-Page App</span>
            <br />
            <span className="text-foreground">Websites</span>
          </h1>

          <p className="text-2xl md:text-3xl text-foreground/60 mb-4 font-light">
            Full service: <span className="text-orange">create</span> &middot;{" "}
            <span className="text-blue">deploy</span> &middot;{" "}
            <span className="text-gold">maintain</span>
          </p>

          <div className="mt-10 mb-12">
            <div className="inline-flex items-baseline gap-1 bg-warm-gray/60 border border-orange/20 rounded-2xl px-8 py-4">
              <span className="text-lg text-foreground/50 mr-1">from</span>
              <span className="text-5xl md:text-6xl font-bold text-gradient-sun">$50</span>
              <span className="text-xl text-foreground/50">/project</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#your-project"
              className="btn-3d bg-orange hover:bg-orange-dark text-warm-black font-bold px-10 py-5 rounded-full text-lg transition-all"
            >
              Start Your Project
            </a>
            <a
              href="#portfolio"
              className="border border-foreground/20 hover:border-orange/50 text-foreground font-medium px-10 py-5 rounded-full text-lg transition-all hover:scale-105"
            >
              View Our Work
            </a>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-foreground/30">
          <div className="w-px h-8 bg-gradient-to-b from-foreground/30 to-transparent" />
        </div>
      </section>

      {/* ─── Divider ─── */}
      <div className="divider-sun" />

      {/* ─── Services ─── */}
      <section id="services" className="relative py-32 px-6">
        <div className="absolute inset-0 bg-gradient-to-b from-warm-black via-background to-warm-black opacity-50" />
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <p className="text-orange uppercase tracking-[0.3em] text-base font-medium mb-4">What We Do</p>
          <h2 className="text-4xl md:text-5xl font-bold mb-8">
            <span className="text-foreground">AI-First </span>
            <span className="text-gradient-blue">Creative Company</span>
          </h2>
          <p className="text-xl text-foreground/60 max-w-2xl mx-auto mb-16 leading-relaxed">
            We build beautiful, fast single-page applications for small businesses.
            You describe your project — our AI-powered workflow delivers a
            production-ready site deployed on Cloudflare. No templates. No bloat.
            Just your business, online.
          </p>

          {/* Process steps */}
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Chat", text: "Talk with our agent about your business. It asks the right questions and builds your spec." },
              { step: "02", title: "Build", text: "Approve the spec and our AI builds your one-page site in seconds." },
              { step: "03", title: "Launch", text: "Deployed to Vercel with your custom domain, SSL, and hosting." },
            ].map((item) => (
              <div key={item.step} className="group relative p-8 rounded-2xl border border-orange/10 bg-warm-gray/30 hover:border-orange/30 transition-all">
                <div className="text-5xl font-bold text-orange/10 group-hover:text-orange/20 transition-colors mb-4">{item.step}</div>
                <h3 className="text-2xl font-bold text-foreground mb-2">{item.title}</h3>
                <p className="text-foreground/50 text-base leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Divider ─── */}
      <div className="divider-sun" />

      {/* ─── Portfolio ─── */}
      <section id="portfolio" className="relative py-32 px-6">
        <div className="absolute inset-0 overflow-hidden">
          <SunRayDecor className="absolute bottom-0 left-0 w-[800px] h-[800px] text-orange opacity-30" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-orange uppercase tracking-[0.3em] text-base font-medium mb-4">Our Work</p>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Sites We&apos;ve <span className="text-gradient-sun">Built</span>
            </h2>
            <p className="text-foreground/50 text-xl">When we build a site for you, we become friends.</p>
          </div>

          <PortfolioSlider items={portfolio} />
        </div>
      </section>

      {/* ─── Divider ─── */}
      <div className="divider-sun" />

      {/* ─── Pricing ─── */}
      <PricingSection />

      {/* ─── Divider ─── */}
      <div className="divider-sun" />

      {/* ─── Payment ─── */}
      <section id="pay" className="relative py-32 px-6">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-orange/5 blur-3xl" />
        </div>

        <div className="relative z-10 max-w-xl mx-auto text-center">
          <p className="text-orange uppercase tracking-[0.3em] text-base font-medium mb-4">Payment</p>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Pay for Your <span className="text-gradient-sun">Site</span>
          </h2>
          <p className="text-foreground/50 text-xl mb-12">
            One payment per project. Build, deploy, hosting, and SSL included.
          </p>

          {/* Stripe CTA */}
          <div className="inline-block min-w-[320px] text-lg [&_button]:py-4 [&_button]:text-lg [&_button]:px-10">
            <PricingButton tier="starter" label="Get Started — from $50" variant="solid" />
          </div>

          {/* Stripe trust badge */}
          <div className="mt-6 flex items-center justify-center gap-2 text-foreground/25 text-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Secured by Stripe &middot; All major cards accepted
          </div>
        </div>
      </section>

      {/* ─── Divider ─── */}
      <div className="divider-sun" />

      {/* ─── Contact / Chat Agent ─── */}
      <section id="your-project" className="relative py-32 px-6">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-orange/5 blur-3xl" />
        </div>
        <div className="relative z-10 max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-orange uppercase tracking-[0.3em] text-base font-medium mb-4">Start Building</p>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Tell Us About Your <span className="text-gradient-sun">Project</span>
            </h2>
            <p className="text-foreground/50 text-xl max-w-xl mx-auto">
              Chat with our agent to define your site. Once you approve the spec, we&apos;ll build and deploy it automatically.
            </p>
          </div>
          <ChatAgent />
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-orange/10 pt-16 pb-8 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 mb-12">
            {/* Left: Contact form */}
            <div>
              <h3 className="text-2xl font-bold mb-2">
                Get in <span className="text-gradient-sun">Touch</span>
              </h3>
              <p className="text-foreground/50 text-base mb-6">
                Questions about your project, revisions, or anything else? We&apos;re here to help.
              </p>
              <FooterContactForm />
            </div>

            {/* Right: Info + domain note */}
            <div className="flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <Image
                    src="/zontak-logo.svg"
                    alt="Zontak"
                    width={36}
                    height={36}
                  />
                  <span className="text-xl font-bold">
                    <span className="text-orange">ZON</span>
                    <span className="text-blue">TAK</span>
                  </span>
                </div>
                <p className="text-foreground/40 text-base leading-relaxed mb-6">
                  AI-first creative company. We build beautiful, fast single-page applications for small businesses — from spec to live site in minutes.
                </p>

                {/* Domain CTA */}
                <div className="rounded-xl border border-blue/20 bg-blue/5 p-5 mb-6">
                  <p className="text-blue font-semibold text-base mb-1">
                    🌐 Want a custom domain?
                  </p>
                  <p className="text-foreground/50 text-sm leading-relaxed">
                    Your site launches on a free <code className="text-foreground/60 bg-warm-gray/40 px-1.5 py-0.5 rounded text-xs">.vercel.app</code> URL.
                    Want to connect your own domain like <code className="text-foreground/60 bg-warm-gray/40 px-1.5 py-0.5 rounded text-xs">yourbusiness.com</code>?
                    Just reach out — we&apos;ll set it up for you at no extra charge.
                  </p>
                </div>
              </div>

              <div className="text-foreground/20 text-sm">
                <a href="mailto:getaonepageapp@gmail.com" className="hover:text-orange transition-colors">
                  getaonepageapp@gmail.com
                </a>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-orange/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-foreground/25 text-sm">
              &copy; {new Date().getFullYear()} Zontak LLC. All rights reserved.
            </p>
            <div className="flex gap-6 text-foreground/25 text-sm">
              <a href="#services" className="hover:text-foreground/50 transition-colors">Services</a>
              <a href="#pricing" className="hover:text-foreground/50 transition-colors">Pricing</a>
              <a href="#portfolio" className="hover:text-foreground/50 transition-colors">Portfolio</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
