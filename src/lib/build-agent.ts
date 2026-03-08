/**
 * Build Agent — autonomous site building pipeline.
 *
 * Sequential (no DAG): Build → Validate → Deploy → Deliver
 *
 * Takes an approved SiteSpec + ProjectIntakeData and produces a live site.
 * Reuses the battle-tested build/build_validate prompts from graph-nodes.ts.
 * Uses Anthropic SDK for streaming and type safety.
 *
 * Graceful degradation: any failure falls back to email-only delivery.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { ProjectIntakeData, SiteSpec } from "./intake-types";
import type { BuildProgress, BuildResult } from "./chat-types";
import { resolveColors } from "./site-builder";
import { deployToVercel, slugifyProjectName } from "./vercel-deploy";
import { deployToCloudflare } from "./cloudflare-deploy";
import { getOrCreateCredits, deductCredit, creditsRemaining } from "./graph-state";
import type { HostingPlatform } from "./chat-types";
import { teamEmailHtml, clientEmailHtml } from "./email-templates";
import type { GenerateOutput, ValidateOutput } from "./chat-types";
import { MODEL_IDS } from "./model-router";

/* ─── Constants ─── */

const BUILD_MAX_TOKENS = 8192;
const BUILD_VALIDATE_THRESHOLD = 7;

/* ─── Environment ─── */

export interface BuildEnv {
  ANTHROPIC_API_KEY: string;
  RESEND_API_KEY?: string;
  NOTIFY_EMAIL?: string;
  FROM_EMAIL?: string;
  /* ── Vercel (premium) ── */
  VERCEL_TOKEN?: string;
  VERCEL_TEAM_ID?: string;
  /* ── Cloudflare (default) ── */
  CLOUDFLARE_API_TOKEN?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
  /* ── Supabase (for Vercel-hosted contact forms) ── */
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  /* ── Hosting preference ── */
  hosting: HostingPlatform;
}

/* ─── Build Prompt (from graph-nodes.ts NODE_PROMPTS.build) ─── */

function buildPrompt(
  spec: SiteSpec,
  intake: ProjectIntakeData,
  env: BuildEnv,
): string {
  const { business, project, contact, style } = intake;
  const colors = resolveColors(style);
  const slug = slugifyProjectName(business.businessName);

  const sectionsBlock = spec.sections
    .map(
      (s, i) =>
        `Section ${i + 1}: "${s.sectionName}"
  Purpose: ${s.purpose}
  Content: ${s.suggestedContent}`,
    )
    .join("\n\n");

  /* ── Contact form instructions vary by hosting platform ── */
  const contactFormInstructions = env.hosting === "vercel" && env.SUPABASE_URL && env.SUPABASE_ANON_KEY
    ? `
CONTACT FORM (Supabase):
Include a contact form section with Name, Email, and Message fields.
Add this script tag before </body>:
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script>
  const sb = supabase.createClient('${env.SUPABASE_URL}', '${env.SUPABASE_ANON_KEY}');
  document.querySelector('#contact-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const btn = this.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Sending...';
    try {
      const { error } = await sb.from('submissions').insert({
        project_slug: '${slug}',
        name: this.querySelector('[name="name"]').value,
        email: this.querySelector('[name="email"]').value,
        message: this.querySelector('[name="message"]').value
      });
      if (error) throw error;
      this.reset();
      btn.textContent = 'Sent!';
      setTimeout(() => { btn.disabled = false; btn.textContent = 'Send Message'; }, 3000);
    } catch(err) {
      btn.textContent = 'Send failed — try again';
      btn.disabled = false;
    }
  });
</script>
Give the form id="contact-form". Style it to match the site design.`
    : `
CONTACT FORM (API):
Include a contact form section with Name, Email, and Message fields.
The form must POST to "https://getaonepage.app/api/submissions" using fetch() with JSON body:
{ "projectSlug": "${slug}", "name": "<name>", "email": "<email>", "message": "<message>" }
Set Content-Type to application/json. Show success/error state by updating the button text.
Give the form id="contact-form". Style it to match the site design.
Example JavaScript (inline before </body>):
<script>
  document.querySelector('#contact-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const btn = this.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Sending...';
    try {
      const res = await fetch('https://getaonepage.app/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectSlug: '${slug}',
          name: this.querySelector('[name="name"]').value,
          email: this.querySelector('[name="email"]').value,
          message: this.querySelector('[name="message"]').value
        })
      });
      if (!res.ok) throw new Error('Send failed');
      this.reset();
      btn.textContent = 'Sent!';
      setTimeout(() => { btn.disabled = false; btn.textContent = 'Send Message'; }, 3000);
    } catch(err) {
      btn.textContent = 'Send failed — try again';
      btn.disabled = false;
    }
  });
</script>`;

  return `You are an expert front-end developer building a complete, production-ready single-page website.

BUSINESS CONTEXT:
- Business: ${business.businessName}
- Type: ${business.businessType}
- Industry: ${business.industry || "General"}
- CTA: ${project.callToAction}
- Style: ${style.stylePreset} preset
- Style Notes: ${style.styleNotes || "None"}
${contact.email ? `- Contact Email: ${contact.email}` : ""}
${contact.phone ? `- Phone: ${contact.phone}` : ""}

DESIGN SYSTEM:
- Primary Color: ${colors.primary}
- Secondary Color: ${colors.secondary}
- Background Color: ${colors.background}
- Text Color: ${colors.text}
- Text Light: ${colors.textLight}
- Font: Use system font stack (-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif)

HEADLINE: ${spec.headline}
SUBHEADLINE: ${spec.subheadline}
SEO DESCRIPTION: ${spec.seoDescription}

SECTIONS TO BUILD:
${sectionsBlock}
${contactFormInstructions}

REQUIREMENTS:
1. Output a COMPLETE, VALID HTML file with embedded CSS in a <style> tag. No external dependencies except the Supabase CDN if specified above, no JavaScript frameworks.
2. The page must be FULLY RESPONSIVE (mobile-first, looks great on 375px-1440px).
3. Use semantic HTML5 (header, nav, main, section, footer).
4. Each section from the spec becomes an HTML <section> with an id (kebab-case of sectionName).
5. Include a sticky navigation bar with smooth-scroll anchor links to each section.
6. The hero section should be visually striking with the headline and subheadline.
7. Include a clear, prominent CTA button styled with the primary color.
8. Add a footer with the business name, copyright year 2025, and contact info if provided.
9. Include proper <meta> tags: charset, viewport, description, og:title, og:description.
10. Use CSS custom properties (variables) for the color system.
11. Add subtle CSS animations (fade-in on scroll using @keyframes, no JS required).
12. Include hover effects on interactive elements.
13. Ensure text colors have good contrast against their backgrounds.
14. The <title> should be "${business.businessName} — ${spec.headline}".
15. Use only minimal JavaScript for smooth scrolling, mobile nav toggle, and the contact form handler.
16. The CSS should include a print-friendly @media print block that hides nav and shows content.

Respond with ONLY valid JSON — no markdown, no code fences:
{
  "html": "<!DOCTYPE html>...(the complete HTML file as a single escaped JSON string)...",
  "buildNotes": "string (2-3 sentences about design choices made)",
  "edge": "built"
}

CRITICAL: The "html" field must contain the COMPLETE HTML document as a single escaped JSON string. Every quote inside the HTML must be escaped. The file must render correctly when saved as index.html and opened in a browser.`;
}

/* ─── Build Validate Prompt (from graph-nodes.ts NODE_PROMPTS.build_validate) ─── */

function buildValidatePrompt(
  html: string,
  spec: SiteSpec,
  intake: ProjectIntakeData,
): string {
  const htmlPreview =
    html.length > 12000
      ? html.slice(0, 12000) + "\n... (truncated for review)"
      : html;

  return `You are a QA engineer reviewing a generated HTML+CSS single-page website.

EXPECTED SITE SPEC:
- Headline: ${spec.headline}
- Subheadline: ${spec.subheadline}
- Expected sections: ${spec.sections.map((s) => s.sectionName).join(", ")}
- Style preset: ${intake.style.stylePreset}
- Primary color: ${intake.style.primaryColor || "(from preset)"}

HTML TO REVIEW:
${htmlPreview}

Score each dimension 1–10:
- structuralIntegrity: Valid HTML5, properly nested tags, no unclosed elements, proper DOCTYPE + head + body structure
- responsiveness: Mobile-first CSS, media queries for breakpoints, flexible layouts (no fixed pixel widths for content)
- accessibility: Semantic HTML elements, sufficient color contrast, ARIA labels on navigation
- brandAlignment: Uses the specified colors, headline/subheadline match the spec, all requested sections are present

Overall score = average of all four dimensions.
- overall >= 7 → edge: "html_passes"
- overall < 7  → edge: "html_fails"

Respond with ONLY valid JSON — no markdown, no explanation:
{
  "scores": {
    "structuralIntegrity": number,
    "responsiveness": number,
    "accessibility": number,
    "brandAlignment": number
  },
  "overallScore": number,
  "issues": string[],
  "edge": "html_passes" | "html_fails"
}`;
}

/* ─── Main Pipeline ─── */

export type ProgressCallback = (progress: BuildProgress) => void;

/**
 * Run the full build pipeline: Build → Validate → Deploy → Deliver.
 * Calls `onProgress` with status updates for each phase.
 * Returns the final BuildResult.
 */
export async function runBuildPipeline(
  spec: SiteSpec,
  intake: ProjectIntakeData,
  env: BuildEnv,
  iterationCount: number,
  onProgress: ProgressCallback,
): Promise<BuildResult> {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  // ── Phase 1: Build ────────────────────────────────────────────────────
  onProgress({ phase: "building", message: "Generating your website..." });

  let html: string;
  let buildNotes: string;

  try {
    const prompt = buildPrompt(spec, intake, env);
    const response = await client.messages.create({
      model: MODEL_IDS.sonnet,
      max_tokens: BUILD_MAX_TOKENS,
      messages: [{ role: "user", content: prompt }],
    });

    const rawText = response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = JSON.parse(stripCodeFences(rawText)) as {
      html: string;
      buildNotes: string;
    };

    if (!parsed.html || (!parsed.html.includes("<!DOCTYPE") && !parsed.html.includes("<html"))) {
      throw new Error("Build output missing valid HTML document");
    }

    html = parsed.html;
    buildNotes = parsed.buildNotes || "";
  } catch (err) {
    console.error("Build failed:", err);
    onProgress({
      phase: "failed",
      message: `Build failed: ${err instanceof Error ? err.message : String(err)}`,
    });
    return emailOnlyFallback(spec, intake, env, iterationCount, onProgress);
  }

  // ── Phase 2: Validate ─────────────────────────────────────────────────
  onProgress({ phase: "validating", message: "Validating quality..." });

  let validationScore = 0;

  try {
    const valPrompt = buildValidatePrompt(html, spec, intake);
    const valResponse = await client.messages.create({
      model: MODEL_IDS.haiku,
      max_tokens: 2048,
      messages: [{ role: "user", content: valPrompt }],
    });

    const valRaw = valResponse.content[0].type === "text" ? valResponse.content[0].text : "";
    const valParsed = JSON.parse(stripCodeFences(valRaw)) as {
      scores: { structuralIntegrity: number; responsiveness: number; accessibility: number; brandAlignment: number };
      overallScore: number;
      issues: string[];
    };

    // Recompute defensively
    const { structuralIntegrity, responsiveness, accessibility, brandAlignment } = valParsed.scores;
    validationScore = (structuralIntegrity + responsiveness + accessibility + brandAlignment) / 4;

    onProgress({
      phase: "validating",
      message: `Validation score: ${validationScore.toFixed(1)}/10`,
      validationScore,
    });

    if (validationScore < BUILD_VALIDATE_THRESHOLD) {
      console.warn(`Validation score ${validationScore.toFixed(1)} below threshold — email-only fallback`);
      return emailOnlyFallback(spec, intake, env, iterationCount, onProgress);
    }
  } catch (err) {
    console.error("Validation failed:", err);
    // Non-blocking — deploy anyway if build succeeded
    validationScore = 0;
  }

  // ── Phase 3: Deploy ───────────────────────────────────────────────────
  let siteUrl: string | undefined;
  const platform = env.hosting === "vercel" ? "Vercel" : "Cloudflare Pages";

  if (env.hosting === "vercel" && env.VERCEL_TOKEN) {
    onProgress({ phase: "deploying", message: `Deploying to ${platform}...` });

    try {
      const result = await deployToVercel(
        intake.business.businessName,
        html,
        {
          VERCEL_TOKEN: env.VERCEL_TOKEN,
          VERCEL_TEAM_ID: env.VERCEL_TEAM_ID,
        },
      );
      siteUrl = result.deploymentUrl;

      onProgress({
        phase: "deploying",
        message: `Deployed: ${siteUrl}`,
        siteUrl,
      });
    } catch (err) {
      console.error("Vercel deploy failed:", err);
      // Fall through to deliver — email-only
    }
  } else if (env.CLOUDFLARE_API_TOKEN && env.CLOUDFLARE_ACCOUNT_ID) {
    onProgress({ phase: "deploying", message: `Deploying to ${platform}...` });

    try {
      const result = await deployToCloudflare(
        intake.business.businessName,
        html,
        {
          CLOUDFLARE_API_TOKEN: env.CLOUDFLARE_API_TOKEN,
          CLOUDFLARE_ACCOUNT_ID: env.CLOUDFLARE_ACCOUNT_ID,
        },
      );
      siteUrl = result.deploymentUrl;

      onProgress({
        phase: "deploying",
        message: `Deployed: ${siteUrl}`,
        siteUrl,
      });
    } catch (err) {
      console.error("Cloudflare deploy failed:", err);
      // Fall through to deliver — email-only
    }
  } else {
    console.warn("No deployment credentials configured — skipping deployment");
  }

  // ── Phase 4: Deliver ──────────────────────────────────────────────────
  onProgress({ phase: "delivering", message: "Sending notifications..." });

  const deliverResult = await deliverEmails(
    spec,
    intake,
    env,
    iterationCount,
    siteUrl,
  );

  const result: BuildResult = {
    html,
    buildNotes,
    validationScore,
    siteUrl,
    creditsRemaining: deliverResult.creditsRemaining,
    teamEmailSent: deliverResult.teamEmailSent,
    clientEmailSent: deliverResult.clientEmailSent,
  };

  onProgress({
    phase: "complete",
    message: siteUrl
      ? `Your site is live at ${siteUrl}`
      : "Your brief has been sent to the team!",
    siteUrl,
    creditsRemaining: deliverResult.creditsRemaining,
  });

  return result;
}

/* ─── Email-Only Fallback ─── */

async function emailOnlyFallback(
  spec: SiteSpec,
  intake: ProjectIntakeData,
  env: BuildEnv,
  iterationCount: number,
  onProgress: ProgressCallback,
): Promise<BuildResult> {
  onProgress({ phase: "delivering", message: "Sending your brief to the team..." });

  const deliverResult = await deliverEmails(spec, intake, env, iterationCount);

  onProgress({
    phase: "complete",
    message: "Your brief has been sent to the team — they'll build your site manually!",
    creditsRemaining: deliverResult.creditsRemaining,
  });

  return {
    html: "",
    buildNotes: "Email-only delivery (build or validation failed)",
    validationScore: 0,
    creditsRemaining: deliverResult.creditsRemaining,
    teamEmailSent: deliverResult.teamEmailSent,
    clientEmailSent: deliverResult.clientEmailSent,
  };
}

/* ─── Deliver (emails + credits) ─── */

async function deliverEmails(
  spec: SiteSpec,
  intake: ProjectIntakeData,
  env: BuildEnv,
  iterationCount: number,
  siteUrl?: string,
): Promise<{ teamEmailSent: boolean; clientEmailSent: boolean; creditsRemaining: number }> {
  const email = intake.contact.email;

  // ── Credits ──
  let remaining = 3;
  if (email) {
    try {
      if (iterationCount > 0) {
        const record = await deductCredit(email);
        remaining = creditsRemaining(record);
      } else {
        const record = await getOrCreateCredits(email);
        remaining = creditsRemaining(record);
      }
    } catch {
      console.warn(`Credit operation failed for ${email} — delivering anyway`);
      try {
        const record = await getOrCreateCredits(email);
        remaining = creditsRemaining(record);
      } catch {
        // Last resort
      }
    }
  }

  // ── Emails ──
  let teamEmailSent = false;
  let clientEmailSent = false;

  const canEmail = !!(env.RESEND_API_KEY && env.NOTIFY_EMAIL && env.FROM_EMAIL);
  if (!canEmail) {
    console.warn("Email env vars not configured — skipping notifications");
    return { teamEmailSent, clientEmailSent, creditsRemaining: remaining };
  }

  // Build email-compatible enhancement object
  const enhancement: GenerateOutput = {
    refinedBrief: `${spec.headline}\n\n${spec.subheadline}\n\n${spec.sections.map(s => `${s.sectionName}: ${s.suggestedContent}`).join("\n")}`,
    siteSpec: spec,
    edge: "generated",
  };

  const validation: ValidateOutput | undefined = undefined;

  const headers = {
    Authorization: `Bearer ${env.RESEND_API_KEY}`,
    "Content-Type": "application/json",
  };

  const teamSubject = siteUrl
    ? `\u{1F680} Auto-Built: ${intake.business.businessName}${iterationCount > 0 ? ` (Rev #${iterationCount})` : ""}`
    : `\u{1F525} New Lead: ${intake.business.businessName}${iterationCount > 0 ? ` (Rev #${iterationCount})` : ""}`;

  const clientSubject = siteUrl
    ? `Your site for ${intake.business.businessName} is live!`
    : `Your Zontak brief for ${intake.business.businessName} is ready \u2713`;

  const [teamResult, clientResult] = await Promise.allSettled([
    fetch("https://api.resend.com/emails", {
      method: "POST",
      headers,
      body: JSON.stringify({
        from: env.FROM_EMAIL,
        to: env.NOTIFY_EMAIL,
        subject: teamSubject,
        html: teamEmailHtml(intake, enhancement, validation, iterationCount, siteUrl),
      }),
    }).then(async (r) => {
      if (!r.ok) throw new Error(await r.text());
    }),

    email
      ? fetch("https://api.resend.com/emails", {
          method: "POST",
          headers,
          body: JSON.stringify({
            from: env.FROM_EMAIL,
            to: email,
            subject: clientSubject,
            html: clientEmailHtml(intake, enhancement, remaining, siteUrl),
          }),
        }).then(async (r) => {
          if (!r.ok) throw new Error(await r.text());
        })
      : Promise.resolve(),
  ]);

  teamEmailSent = teamResult.status === "fulfilled";
  clientEmailSent = clientResult.status === "fulfilled";

  if (!teamEmailSent) {
    console.error("Team email failed:", (teamResult as PromiseRejectedResult).reason);
  }
  if (!clientEmailSent && email) {
    console.error("Client email failed:", (clientResult as PromiseRejectedResult).reason);
  }

  return { teamEmailSent, clientEmailSent, creditsRemaining: remaining };
}

/* ─── Helpers ─── */

function stripCodeFences(raw: string): string {
  return raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();
}
