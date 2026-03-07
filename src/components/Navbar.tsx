"use client";

import { useState } from "react";
import Image from "next/image";
import { AuthButton } from "./AuthButton";
import { ThemeToggle } from "./ThemeToggle";

const NAV_LINKS = [
  { href: "#services", label: "Services" },
  { href: "#portfolio", label: "Portfolio" },
  { href: "#pricing", label: "Pricing" },
  { href: "#pay", label: "Pay" },
  { href: "#contact", label: "Contact" },
];

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-warm-black/80 backdrop-blur-md border-b border-orange/10">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Brand */}
        <a href="/" className="flex items-center gap-3">
          <Image
            src="/zontak-logo.svg"
            alt="Zontak Logo"
            width={44}
            height={44}
            priority
          />
          <span className="text-xl font-bold tracking-tight">
            <span className="text-orange">ZON</span>
            <span className="text-blue">TAK</span>
          </span>
        </a>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-8 text-base font-medium text-foreground/70">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="hover:text-orange transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Right side: theme toggle + auth + hamburger */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <div className="hidden md:block">
            <AuthButton />
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden w-8 h-8 flex flex-col items-center justify-center gap-1.5"
            aria-label="Toggle menu"
          >
            <span
              className={`block w-5 h-0.5 bg-foreground transition-all duration-300 ${
                menuOpen ? "translate-y-[4px] rotate-45" : ""
              }`}
            />
            <span
              className={`block w-5 h-0.5 bg-foreground transition-all duration-300 ${
                menuOpen ? "-translate-y-[4px] -rotate-45" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* Mobile menu overlay */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out border-t border-orange/10 ${
          menuOpen ? "max-h-80 opacity-100" : "max-h-0 opacity-0 border-t-0"
        }`}
      >
        <div className="px-6 py-4 bg-warm-black/95 backdrop-blur-md flex flex-col gap-4">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="text-foreground/70 hover:text-orange transition-colors text-base font-medium py-1"
            >
              {link.label}
            </a>
          ))}
          <div className="pt-2 border-t border-orange/10">
            <AuthButton />
          </div>
        </div>
      </div>
    </nav>
  );
}
