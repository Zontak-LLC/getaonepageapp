/**
 * Test Agent — runtime validation of generated HTML against the SiteSpec.
 *
 * Following Software Factory test philosophy: scenario-based, full-journey
 * validation. This is NOT a unit test runner — it's a runtime validation
 * agent that verifies the generated HTML meets the approved spec.
 *
 * Checks:
 *   1. Spec Compliance — all sections from SiteSpec present
 *   2. Content Accuracy — headline, subheadline, CTA match
 *   3. Style Compliance — colors from resolved palette present
 *   4. Structural Integrity — valid HTML, responsive meta tags
 *   5. Link Integrity — anchor hrefs point to valid section IDs
 */

import type { SiteSpec } from "./intake-types";
import type { StylePreferences } from "./intake-types";
import { resolveColors } from "./site-builder";

/* ─── Test Result Types ─── */

export type TestStatus = "pass" | "fail" | "warn";

export interface TestCheck {
  name: string;
  status: TestStatus;
  detail: string;
}

export interface TestResult {
  passed: boolean;
  score: number; // 0-10
  checks: TestCheck[];
  summary: string;
}

/* ─── Main Validator ─── */

/**
 * Validate generated HTML against the approved SiteSpec.
 * Returns a TestResult with individual check results and overall score.
 *
 * This runs as part of the build pipeline between build and deploy.
 * If it fails (score < 7), the build falls back to email-only delivery.
 */
export function validateBuild(
  html: string,
  spec: SiteSpec,
  style: StylePreferences,
): TestResult {
  const checks: TestCheck[] = [];

  // 1. Structural Integrity
  checks.push(...checkStructure(html));

  // 2. Spec Compliance — all sections present
  checks.push(...checkSections(html, spec));

  // 3. Content Accuracy — headline, subheadline
  checks.push(...checkContent(html, spec));

  // 4. Style Compliance — colors present
  checks.push(...checkStyle(html, style));

  // 5. Link Integrity — anchor hrefs resolve
  checks.push(...checkLinks(html));

  // Compute score
  const passCount = checks.filter((c) => c.status === "pass").length;
  const warnCount = checks.filter((c) => c.status === "warn").length;
  const totalChecks = checks.length;
  const score = totalChecks > 0
    ? ((passCount + warnCount * 0.5) / totalChecks) * 10
    : 0;

  const failCount = checks.filter((c) => c.status === "fail").length;
  const passed = score >= 7 && failCount <= 2;

  return {
    passed,
    score: Math.round(score * 10) / 10,
    checks,
    summary: `${passCount}/${totalChecks} passed, ${warnCount} warnings, ${failCount} failures (score: ${score.toFixed(1)}/10)`,
  };
}

/* ─── Check: Structure ─── */

function checkStructure(html: string): TestCheck[] {
  const checks: TestCheck[] = [];

  // DOCTYPE
  checks.push({
    name: "DOCTYPE present",
    status: /<!DOCTYPE\s+html>/i.test(html) ? "pass" : "fail",
    detail: "HTML must start with <!DOCTYPE html>",
  });

  // Viewport meta
  checks.push({
    name: "Viewport meta tag",
    status: /meta\s+[^>]*name=["']viewport["']/i.test(html) ? "pass" : "fail",
    detail: "Required for responsive design",
  });

  // Description meta
  checks.push({
    name: "Description meta tag",
    status: /meta\s+[^>]*name=["']description["']/i.test(html) ? "pass" : "warn",
    detail: "Important for SEO",
  });

  // Semantic HTML elements
  const semanticTags = ["<header", "<nav", "<main", "<footer"];
  const foundTags = semanticTags.filter((tag) => html.includes(tag));
  checks.push({
    name: "Semantic HTML elements",
    status: foundTags.length >= 3 ? "pass" : foundTags.length >= 2 ? "warn" : "fail",
    detail: `Found ${foundTags.length}/4 semantic elements (${foundTags.join(", ")})`,
  });

  // Has <style> tag (embedded CSS)
  checks.push({
    name: "Embedded CSS",
    status: /<style[\s>]/i.test(html) ? "pass" : "fail",
    detail: "CSS must be embedded in <style> tag",
  });

  // Has <title>
  checks.push({
    name: "Title tag",
    status: /<title>[^<]+<\/title>/i.test(html) ? "pass" : "warn",
    detail: "Page title should be set",
  });

  return checks;
}

/* ─── Check: Sections ─── */

function checkSections(html: string, spec: SiteSpec): TestCheck[] {
  const checks: TestCheck[] = [];
  const htmlLower = html.toLowerCase();

  for (const section of spec.sections) {
    const kebabId = section.sectionName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    // Check by id attribute or by section name in content
    const hasId = htmlLower.includes(`id="${kebabId}"`);
    const hasContent = htmlLower.includes(section.sectionName.toLowerCase());

    checks.push({
      name: `Section: ${section.sectionName}`,
      status: hasId ? "pass" : hasContent ? "warn" : "fail",
      detail: hasId
        ? `Found section with id="${kebabId}"`
        : hasContent
          ? "Section name found in content but missing id attribute"
          : "Section not found in HTML",
    });
  }

  return checks;
}

/* ─── Check: Content ─── */

function checkContent(html: string, spec: SiteSpec): TestCheck[] {
  const checks: TestCheck[] = [];

  // Headline present (allow partial match — first 3 words)
  const headlineWords = spec.headline.split(/\s+/).slice(0, 3).join(" ");
  checks.push({
    name: "Headline present",
    status: html.includes(spec.headline)
      ? "pass"
      : html.toLowerCase().includes(headlineWords.toLowerCase())
        ? "warn"
        : "fail",
    detail: `Looking for: "${spec.headline}"`,
  });

  // Subheadline present
  const subWords = spec.subheadline.split(/\s+/).slice(0, 4).join(" ");
  checks.push({
    name: "Subheadline present",
    status: html.includes(spec.subheadline)
      ? "pass"
      : html.toLowerCase().includes(subWords.toLowerCase())
        ? "warn"
        : "fail",
    detail: `Looking for: "${spec.subheadline.slice(0, 60)}..."`,
  });

  return checks;
}

/* ─── Check: Style ─── */

function checkStyle(html: string, style: StylePreferences): TestCheck[] {
  const checks: TestCheck[] = [];
  const colors = resolveColors(style);
  const htmlLower = html.toLowerCase();

  // Primary color present
  checks.push({
    name: "Primary color used",
    status: htmlLower.includes(colors.primary.toLowerCase()) ? "pass" : "warn",
    detail: `Looking for: ${colors.primary}`,
  });

  // Background color present
  checks.push({
    name: "Background color used",
    status: htmlLower.includes(colors.background.toLowerCase()) ? "pass" : "warn",
    detail: `Looking for: ${colors.background}`,
  });

  // CSS custom properties used
  checks.push({
    name: "CSS custom properties",
    status: /--[\w-]+\s*:/i.test(html) ? "pass" : "warn",
    detail: "Expected CSS variables for the color system",
  });

  return checks;
}

/* ─── Check: Links ─── */

function checkLinks(html: string): TestCheck[] {
  const checks: TestCheck[] = [];

  // Extract all anchor hrefs
  const hrefMatches = html.matchAll(/href=["']#([\w-]+)["']/gi);
  const anchors = [...hrefMatches].map((m) => m[1]);

  if (anchors.length === 0) {
    checks.push({
      name: "Navigation links",
      status: "warn",
      detail: "No anchor links found — expected smooth-scroll nav links",
    });
    return checks;
  }

  // Check that each anchor target exists as an id
  const htmlLower = html.toLowerCase();
  let validCount = 0;
  for (const anchor of anchors) {
    if (htmlLower.includes(`id="${anchor.toLowerCase()}"`)) {
      validCount++;
    }
  }

  checks.push({
    name: "Anchor link targets",
    status: validCount === anchors.length
      ? "pass"
      : validCount >= anchors.length * 0.7
        ? "warn"
        : "fail",
    detail: `${validCount}/${anchors.length} anchor links have matching id targets`,
  });

  return checks;
}
