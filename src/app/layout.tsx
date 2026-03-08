import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { SessionProvider } from "@/components/SessionProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Zontak | AI-First Creative Company — One-Page App Websites",
  description:
    "Zontak builds fast, mobile-first one-page app websites from $50/project. Full service: build, deploy, and maintain. AI-first creative company.",
  keywords: [
    "one page app",
    "website builder",
    "AI website",
    "single page app",
    "affordable website",
    "Zontak",
  ],
  openGraph: {
    title: "Zontak | One-Page App Websites — from $50/project",
    description:
      "Fast, mobile-first one-page app websites. Full service: build, deploy, and maintain.",
    url: "https://getaonepage.app",
    siteName: "Zontak",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=AW-16534875759"
          strategy="afterInteractive"
        />
        <Script id="google-ads" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'AW-16534875759');`}
        </Script>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
