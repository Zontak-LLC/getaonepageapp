/**
 * Build Agent Test Scenarios
 *
 * Software Factory philosophy: scenario-based, full-journey validation.
 * Each test validates a complete pipeline flow with mocked external deps.
 *
 * Mocked: Anthropic SDK, Vercel deploy, Prisma (credits), Resend (email)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ProjectIntakeData, SiteSpec, StylePreferences } from "../intake-types";
import type { BuildProgress } from "../chat-types";

/* ─── Fixtures ─── */

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

const SAMPLE_INTAKE: ProjectIntakeData = {
  business: {
    businessName: "Sunrise Bakery",
    businessType: "Bakery",
    industry: "Food & Beverage",
    website: "",
  },
  project: {
    description: "A one-page site for our bakery",
    goals: "Get more foot traffic",
    callToAction: "Order Now",
    content: "",
    imageNotes: "",
  },
  style: {
    stylePreset: "warm",
    primaryColor: "",
    secondaryColor: "",
    styleNotes: "",
    inspirationUrls: "",
  },
  contact: {
    name: "John Baker",
    email: "john@sunrisebakery.com",
    phone: "555-0100",
    preferredContact: "email",
    additionalNotes: "",
  },
};

const VALID_BUILD_RESPONSE = JSON.stringify({
  html: `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="Artisan bakery"><title>Sunrise Bakery — Fresh Baked Daily</title><style>body{font-family:sans-serif;}</style></head><body><header><nav></nav></header><main><section id="hero"><h1>Fresh Baked Daily</h1></section><section id="about-us"><h2>About Us</h2></section><section id="menu"><h2>Menu</h2></section><section id="contact"><h2>Contact</h2></section></main><footer></footer></body></html>`,
  buildNotes: "Warm tones with bakery imagery focus",
  edge: "built",
});

const VALID_VALIDATE_RESPONSE = JSON.stringify({
  scores: {
    structuralIntegrity: 8,
    responsiveness: 8,
    accessibility: 7,
    brandAlignment: 9,
  },
  overallScore: 8,
  issues: [],
  edge: "html_passes",
});

const FAILING_VALIDATE_RESPONSE = JSON.stringify({
  scores: {
    structuralIntegrity: 4,
    responsiveness: 3,
    accessibility: 5,
    brandAlignment: 4,
  },
  overallScore: 4,
  issues: ["Missing responsive CSS", "No semantic elements"],
  edge: "html_fails",
});

/* ─── Mocks ─── */

// Mock Anthropic SDK
const mockCreate = vi.fn();
vi.mock("@anthropic-ai/sdk", () => {
  class MockAnthropic {
    messages = { create: mockCreate };
  }
  return { default: MockAnthropic };
});

// Mock Vercel deploy
const mockDeployToVercel = vi.fn();
vi.mock("../vercel-deploy", () => ({
  deployToVercel: (...args: unknown[]) => mockDeployToVercel(...args),
  slugifyProjectName: (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 58),
}));

// Mock credit functions
const mockGetOrCreateCredits = vi.fn();
const mockDeductCredit = vi.fn();
vi.mock("../graph-state", () => ({
  getOrCreateCredits: (...args: unknown[]) => mockGetOrCreateCredits(...args),
  deductCredit: (...args: unknown[]) => mockDeductCredit(...args),
  creditsRemaining: (record: { total: number; used: number }) =>
    Math.max(0, record.total - record.used),
}));

// Mock email templates
vi.mock("../email-templates", () => ({
  teamEmailHtml: () => "<html>team</html>",
  clientEmailHtml: () => "<html>client</html>",
}));

// Mock fetch for Resend emails
const mockFetch = vi.fn();
global.fetch = mockFetch;

/* ─── Import after mocks ─── */

type BuildEnv = import("../build-agent").BuildEnv;
const { runBuildPipeline } = await import("../build-agent");

/* ─── Helpers ─── */

function makeEnv(overrides: Partial<BuildEnv> = {}): BuildEnv {
  return {
    ANTHROPIC_API_KEY: "test-key",
    RESEND_API_KEY: "test-resend",
    NOTIFY_EMAIL: "team@test.com",
    FROM_EMAIL: "noreply@test.com",
    VERCEL_TOKEN: "test-vercel",
    hosting: "cloudflare",
    ...overrides,
  };
}

function makeTextBlock(text: string) {
  return { content: [{ type: "text", text }] };
}

function collectProgress(phases: BuildProgress[]): (progress: BuildProgress) => void {
  return (progress: BuildProgress) => phases.push(progress);
}

/* ─── Tests ─── */

describe("Build Agent Pipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: credit operations succeed
    mockGetOrCreateCredits.mockResolvedValue({
      email: "john@sunrisebakery.com",
      total: 3,
      used: 0,
      plan: "standard",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    mockDeductCredit.mockResolvedValue({
      email: "john@sunrisebakery.com",
      total: 3,
      used: 1,
      plan: "standard",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Default: fetch (Resend) succeeds
    mockFetch.mockResolvedValue({ ok: true, text: async () => '{"id":"msg_1"}' });
  });

  /* ─── Scenario 1: Happy path ─── */

  it("build → validate → deploy → deliver succeeds end-to-end", async () => {
    mockCreate
      .mockResolvedValueOnce(makeTextBlock(VALID_BUILD_RESPONSE))    // build
      .mockResolvedValueOnce(makeTextBlock(VALID_VALIDATE_RESPONSE)); // validate

    mockDeployToVercel.mockResolvedValue({
      deploymentUrl: "https://sunrise-bakery.vercel.app",
      deploymentId: "dpl_abc123",
    });

    const phases: BuildProgress[] = [];
    const result = await runBuildPipeline(
      SAMPLE_SPEC, SAMPLE_INTAKE, makeEnv(), 0, collectProgress(phases),
    );

    // Build succeeded
    expect(result.html).toContain("<!DOCTYPE html>");
    expect(result.siteUrl).toBe("https://sunrise-bakery.vercel.app");
    expect(result.validationScore).toBeGreaterThanOrEqual(7);

    // All phases fire in order
    const phaseNames = phases.map((p) => p.phase);
    expect(phaseNames).toContain("building");
    expect(phaseNames).toContain("validating");
    expect(phaseNames).toContain("deploying");
    expect(phaseNames).toContain("delivering");
    expect(phaseNames).toContain("complete");

    // Emails sent
    expect(result.teamEmailSent).toBe(true);
    expect(result.clientEmailSent).toBe(true);
  });

  /* ─── Scenario 2: Build fails (Claude API error) ─── */

  it("falls back to email-only when build API call fails", async () => {
    mockCreate.mockRejectedValueOnce(new Error("Anthropic API rate limited"));

    const phases: BuildProgress[] = [];
    const result = await runBuildPipeline(
      SAMPLE_SPEC, SAMPLE_INTAKE, makeEnv(), 0, collectProgress(phases),
    );

    // Email-only fallback
    expect(result.html).toBe("");
    expect(result.siteUrl).toBeUndefined();
    expect(result.buildNotes).toContain("Email-only");

    // Deploy was never attempted
    expect(mockDeployToVercel).not.toHaveBeenCalled();
  });

  /* ─── Scenario 3: Validation fails (score < 7) ─── */

  it("falls back to email-only when validation score is below threshold", async () => {
    mockCreate
      .mockResolvedValueOnce(makeTextBlock(VALID_BUILD_RESPONSE))       // build succeeds
      .mockResolvedValueOnce(makeTextBlock(FAILING_VALIDATE_RESPONSE)); // validate fails

    const phases: BuildProgress[] = [];
    const result = await runBuildPipeline(
      SAMPLE_SPEC, SAMPLE_INTAKE, makeEnv(), 0, collectProgress(phases),
    );

    // Email-only fallback — no deploy
    expect(result.html).toBe("");
    expect(result.siteUrl).toBeUndefined();
    expect(mockDeployToVercel).not.toHaveBeenCalled();
  });

  /* ─── Scenario 4: Vercel deploy fails ─── */

  it("sends email-only when Vercel deploy throws", async () => {
    mockCreate
      .mockResolvedValueOnce(makeTextBlock(VALID_BUILD_RESPONSE))
      .mockResolvedValueOnce(makeTextBlock(VALID_VALIDATE_RESPONSE));

    mockDeployToVercel.mockRejectedValue(new Error("Vercel API 500"));

    const phases: BuildProgress[] = [];
    const result = await runBuildPipeline(
      SAMPLE_SPEC, SAMPLE_INTAKE, makeEnv(), 0, collectProgress(phases),
    );

    // Build succeeded but no site URL (deploy failed)
    expect(result.html).toContain("<!DOCTYPE html>");
    expect(result.siteUrl).toBeUndefined();
    // Emails still sent
    expect(result.teamEmailSent).toBe(true);
  });

  /* ─── Scenario 5: No VERCEL_TOKEN ─── */

  it("skips deploy when VERCEL_TOKEN is not configured", async () => {
    mockCreate
      .mockResolvedValueOnce(makeTextBlock(VALID_BUILD_RESPONSE))
      .mockResolvedValueOnce(makeTextBlock(VALID_VALIDATE_RESPONSE));

    const phases: BuildProgress[] = [];
    const result = await runBuildPipeline(
      SAMPLE_SPEC,
      SAMPLE_INTAKE,
      makeEnv({ VERCEL_TOKEN: undefined }),
      0,
      collectProgress(phases),
    );

    // Build succeeded, deploy skipped
    expect(result.html).toContain("<!DOCTYPE html>");
    expect(result.siteUrl).toBeUndefined();
    expect(mockDeployToVercel).not.toHaveBeenCalled();

    // No "deploying" phase
    const phaseNames = phases.map((p) => p.phase);
    expect(phaseNames).not.toContain("deploying");
  });

  /* ─── Scenario 6: Custom colors in build prompt ─── */

  it("passes custom color values through to the build call", async () => {
    const customIntake = {
      ...SAMPLE_INTAKE,
      style: {
        ...SAMPLE_INTAKE.style,
        stylePreset: "custom",
        primaryColor: "#FF0000",
        secondaryColor: "#00FF00",
      } as StylePreferences,
    };

    mockCreate
      .mockResolvedValueOnce(makeTextBlock(VALID_BUILD_RESPONSE))
      .mockResolvedValueOnce(makeTextBlock(VALID_VALIDATE_RESPONSE));

    mockDeployToVercel.mockResolvedValue({
      deploymentUrl: "https://sunrise-bakery.vercel.app",
      deploymentId: "dpl_abc123",
    });

    const phases: BuildProgress[] = [];
    await runBuildPipeline(
      SAMPLE_SPEC, customIntake, makeEnv(), 0, collectProgress(phases),
    );

    // Verify the build prompt was called with the custom colors
    const buildCall = mockCreate.mock.calls[0];
    const promptText = buildCall[0].messages[0].content;
    expect(promptText).toContain("#FF0000");
  });

  /* ─── Scenario 7: Model routing ─── */

  it("uses Sonnet for build and Haiku for validation", async () => {
    mockCreate
      .mockResolvedValueOnce(makeTextBlock(VALID_BUILD_RESPONSE))
      .mockResolvedValueOnce(makeTextBlock(VALID_VALIDATE_RESPONSE));

    mockDeployToVercel.mockResolvedValue({
      deploymentUrl: "https://sunrise-bakery.vercel.app",
      deploymentId: "dpl_abc123",
    });

    const phases: BuildProgress[] = [];
    await runBuildPipeline(
      SAMPLE_SPEC, SAMPLE_INTAKE, makeEnv(), 0, collectProgress(phases),
    );

    // Build call uses Sonnet
    const buildModel = mockCreate.mock.calls[0][0].model;
    expect(buildModel).toContain("sonnet");

    // Validate call uses Haiku
    const validateModel = mockCreate.mock.calls[1][0].model;
    expect(validateModel).toContain("haiku");
  });

  /* ─── Scenario 8: Progress events fire in order ─── */

  it("emits progress events in sequential order", async () => {
    mockCreate
      .mockResolvedValueOnce(makeTextBlock(VALID_BUILD_RESPONSE))
      .mockResolvedValueOnce(makeTextBlock(VALID_VALIDATE_RESPONSE));

    mockDeployToVercel.mockResolvedValue({
      deploymentUrl: "https://sunrise-bakery.vercel.app",
      deploymentId: "dpl_abc123",
    });

    const phases: BuildProgress[] = [];
    await runBuildPipeline(
      SAMPLE_SPEC, SAMPLE_INTAKE, makeEnv(), 0, collectProgress(phases),
    );

    // Extract unique phase transitions in order
    const phaseOrder = phases.reduce<string[]>((acc, p) => {
      if (acc[acc.length - 1] !== p.phase) acc.push(p.phase);
      return acc;
    }, []);

    expect(phaseOrder).toEqual([
      "building",
      "validating",
      "deploying",
      "delivering",
      "complete",
    ]);

    // Complete phase should have siteUrl
    const completionEvent = phases.find((p) => p.phase === "complete");
    expect(completionEvent?.siteUrl).toBe("https://sunrise-bakery.vercel.app");
  });
});
