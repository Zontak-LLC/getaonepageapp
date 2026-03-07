/**
 * Test Agent Scenarios
 *
 * Validates the runtime HTML validator that checks generated builds
 * against the approved SiteSpec.
 */

import { describe, it, expect } from "vitest";
import { validateBuild } from "../test-agent";
import type { SiteSpec, StylePreferences } from "../intake-types";

const SAMPLE_SPEC: SiteSpec = {
  headline: "Fresh Baked Daily",
  subheadline: "Brooklyn's favorite artisan bakery since 2019",
  seoDescription: "Artisan bakery in Brooklyn offering fresh bread and pastries",
  sections: [
    { sectionName: "Hero", purpose: "Hook visitors", suggestedContent: "Welcome" },
    { sectionName: "About Us", purpose: "Build trust", suggestedContent: "Our story" },
    { sectionName: "Menu", purpose: "Show products", suggestedContent: "Our items" },
    { sectionName: "Contact", purpose: "Drive action", suggestedContent: "Visit us" },
  ],
};

const SAMPLE_STYLE: StylePreferences = {
  stylePreset: "warm",
  primaryColor: "",
  secondaryColor: "",
  styleNotes: "",
  inspirationUrls: "",
};

/* ─── Well-formed HTML that should pass ─── */

const GOOD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Artisan bakery in Brooklyn">
  <title>Sunrise Bakery — Fresh Baked Daily</title>
  <style>
    :root {
      --primary: #F07D2E;
      --secondary: #FFB347;
      --background: #FFF8EE;
      --text: #2D1B0E;
      --text-light: #6B5744;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, sans-serif; background: var(--background); color: var(--text); }
    nav { position: sticky; top: 0; background: var(--background); }
    nav a { text-decoration: none; color: var(--text); }
    @media (max-width: 768px) { .grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <header>
    <nav>
      <a href="#hero">Home</a>
      <a href="#about-us">About</a>
      <a href="#menu">Menu</a>
      <a href="#contact">Contact</a>
    </nav>
  </header>
  <main>
    <section id="hero">
      <h1>Fresh Baked Daily</h1>
      <p>Brooklyn's favorite artisan bakery since 2019</p>
      <a href="#contact" class="cta">Order Now</a>
    </section>
    <section id="about-us">
      <h2>About Us</h2>
      <p>Our story of baking excellence.</p>
    </section>
    <section id="menu">
      <h2>Menu</h2>
      <p>Our delicious items.</p>
    </section>
    <section id="contact">
      <h2>Contact</h2>
      <p>Visit us at our Brooklyn location.</p>
    </section>
  </main>
  <footer>
    <p>&copy; 2025 Sunrise Bakery</p>
  </footer>
</body>
</html>`;

describe("Test Agent", () => {
  /* ─── Scenario 1: Well-formed HTML passes validation ─── */

  it("passes a well-formed HTML page that matches the spec", () => {
    const result = validateBuild(GOOD_HTML, SAMPLE_SPEC, SAMPLE_STYLE);

    expect(result.passed).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(7);

    // All structural checks should pass
    const structuralChecks = result.checks.filter(
      (c) =>
        c.name === "DOCTYPE present" ||
        c.name === "Viewport meta tag" ||
        c.name === "Embedded CSS",
    );
    expect(structuralChecks.every((c) => c.status === "pass")).toBe(true);

    // Headline should be found
    const headlineCheck = result.checks.find(
      (c) => c.name === "Headline present",
    );
    expect(headlineCheck?.status).toBe("pass");
  });

  /* ─── Scenario 2: Missing sections detected ─── */

  it("detects missing spec sections in the HTML", () => {
    const htmlMissingSections = `<!DOCTYPE html>
<html><head><meta name="viewport" content="width=device-width"><style>body{}</style></head>
<body><header><nav></nav></header><main>
<section id="hero"><h1>Fresh Baked Daily</h1><p>Brooklyn's favorite artisan bakery since 2019</p></section>
</main><footer></footer></body></html>`;

    const result = validateBuild(
      htmlMissingSections,
      SAMPLE_SPEC,
      SAMPLE_STYLE,
    );

    // Should have failures for missing sections
    const sectionChecks = result.checks.filter((c) =>
      c.name.startsWith("Section:"),
    );
    const failedSections = sectionChecks.filter(
      (c) => c.status === "fail",
    );
    expect(failedSections.length).toBeGreaterThan(0);
  });

  /* ─── Scenario 3: Missing DOCTYPE and meta tags ─── */

  it("fails structural checks when DOCTYPE and meta tags are missing", () => {
    const badHtml = `<html><body><p>Hello</p></body></html>`;

    const result = validateBuild(badHtml, SAMPLE_SPEC, SAMPLE_STYLE);

    const doctypeCheck = result.checks.find(
      (c) => c.name === "DOCTYPE present",
    );
    expect(doctypeCheck?.status).toBe("fail");

    const viewportCheck = result.checks.find(
      (c) => c.name === "Viewport meta tag",
    );
    expect(viewportCheck?.status).toBe("fail");

    const cssCheck = result.checks.find(
      (c) => c.name === "Embedded CSS",
    );
    expect(cssCheck?.status).toBe("fail");
  });

  /* ─── Scenario 4: Color presence check ─── */

  it("checks for primary color in the HTML", () => {
    const result = validateBuild(GOOD_HTML, SAMPLE_SPEC, SAMPLE_STYLE);

    const colorCheck = result.checks.find(
      (c) => c.name === "Primary color used",
    );
    // warm preset primary is #F07D2E, which is in the good HTML
    expect(colorCheck?.status).toBe("pass");
  });

  /* ─── Scenario 5: Anchor link integrity ─── */

  it("validates anchor links point to existing section IDs", () => {
    const result = validateBuild(GOOD_HTML, SAMPLE_SPEC, SAMPLE_STYLE);

    const linkCheck = result.checks.find(
      (c) => c.name === "Anchor link targets",
    );
    expect(linkCheck?.status).toBe("pass");
    expect(linkCheck?.detail).toContain("5/5"); // all 5 anchor links (4 nav + 1 CTA) valid
  });

  /* ─── Scenario 6: Score reflects check results ─── */

  it("produces a score between 0-10 proportional to pass rate", () => {
    const goodResult = validateBuild(GOOD_HTML, SAMPLE_SPEC, SAMPLE_STYLE);
    expect(goodResult.score).toBeGreaterThanOrEqual(0);
    expect(goodResult.score).toBeLessThanOrEqual(10);

    const badResult = validateBuild(
      "<html><body></body></html>",
      SAMPLE_SPEC,
      SAMPLE_STYLE,
    );
    expect(badResult.score).toBeLessThan(goodResult.score);
  });

  /* ─── Scenario 7: Summary string format ─── */

  it("produces a readable summary string", () => {
    const result = validateBuild(GOOD_HTML, SAMPLE_SPEC, SAMPLE_STYLE);
    expect(result.summary).toMatch(/\d+\/\d+ passed/);
    expect(result.summary).toContain("score:");
  });
});
