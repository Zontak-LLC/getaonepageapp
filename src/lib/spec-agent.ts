/**
 * Spec Agent — conversational requirement gathering.
 *
 * Replaces the assess → generate → validate loop with a guided chat.
 * The agent asks follow-up questions, resolves ambiguity, and gets user
 * buy-in before spending tokens on building.
 *
 * Structured data is extracted from the LLM response via comment markers:
 *   <!--SPEC_UPDATE:{"headline":"..."}-->
 *   <!--INTAKE_UPDATE:{"business":{"businessName":"..."}}-->
 *   <!--OPTIONS:{"cards":[...]}-->
 *   <!--SPEC_COMPLETE-->
 *
 * The markers are stripped from the displayed message text.
 */

import type {
  SiteSpec,
  OptionCard,
} from "./chat-types";
import type { ProjectIntakeData } from "./intake-types";

/* ─── System Prompt ─── */

export function buildSystemPrompt(
  partialSpec: Partial<SiteSpec>,
  partialIntake: Partial<ProjectIntakeData>,
): string {
  const specContext = Object.keys(partialSpec).length > 0
    ? `\nCurrent site spec (gathered so far):\n${JSON.stringify(partialSpec, null, 2)}\n`
    : "";

  const intakeContext = Object.keys(partialIntake).length > 0
    ? `\nCurrent intake data (gathered so far):\n${JSON.stringify(partialIntake, null, 2)}\n`
    : "";

  return `You are a professional web strategist at Zontak, helping a client define their one-page website.

Your goal is to gather enough information through natural conversation to build a complete SiteSpec and ProjectIntakeData. Guide the client through these areas:

1. **Business basics** — business name, type, industry, existing website
2. **Project goals** — what the site should accomplish, target audience
3. **Call to action** — what visitors should do (book a call, sign up, buy, etc.)
4. **Content** — key messaging, services/products, unique value proposition
5. **Style** — visual preferences (warm, cool, bold, earth, minimal, or custom colors)
6. **Contact info** — name, email, phone, preferred contact method
7. **Site structure** — 4-7 sections that flow: hook → trust → offer → proof → action

Be conversational, warm, and professional. Ask 1-2 questions at a time, never dump a long checklist. When the client gives a vague answer, ask a follow-up to get specifics. When you have enough for a field, infer reasonable defaults and confirm.

When you gather useful information, embed structured data updates in your response using these EXACT comment markers (the client won't see them):

To update the site specification:
<!--SPEC_UPDATE:{"field":"value","sections":[...]}-->

To update intake data:
<!--INTAKE_UPDATE:{"business":{"businessName":"..."},"project":{"description":"..."}}-->

To present structured choices (use sparingly, 2-4 options):
<!--OPTIONS:{"cards":[{"id":"opt1","label":"Warm","description":"Orange & cream, inviting feel","value":"warm"},{"id":"opt2","label":"Cool","description":"Blue & white, professional","value":"cool"}]}-->

When you have ALL the information needed (business, project, style, contact, and at least 4 site sections), summarize the complete spec and mark it ready:
<!--SPEC_COMPLETE-->

IMPORTANT RULES:
- Start with a warm greeting and ask about their business
- One topic at a time — don't overwhelm
- Use option cards for style presets and section suggestions
- Infer reasonable defaults but confirm them
- When presenting the final spec, list every section with its purpose
- The comment markers must be on their own line, exactly formatted
- Do NOT use markdown code blocks around the markers
${specContext}${intakeContext}`;
}

/* ─── Comment Marker Parsing ─── */

const SPEC_UPDATE_RE = /<!--SPEC_UPDATE:(.*?)-->/g;
const INTAKE_UPDATE_RE = /<!--INTAKE_UPDATE:(.*?)-->/g;
const OPTIONS_RE = /<!--OPTIONS:(.*?)-->/g;
const SPEC_COMPLETE_RE = /<!--SPEC_COMPLETE-->/g;
const ALL_MARKERS_RE = /<!--(?:SPEC_UPDATE|INTAKE_UPDATE|OPTIONS|SPEC_COMPLETE)(?::.*?)?-->/g;

export interface ParsedResponse {
  /** Clean message text with markers stripped */
  displayText: string;
  /** Partial spec fields to merge */
  specUpdates: Partial<SiteSpec>[];
  /** Partial intake fields to merge */
  intakeUpdates: Partial<ProjectIntakeData>[];
  /** Option cards to display */
  options: OptionCard[];
  /** Whether the agent considers the spec complete */
  specComplete: boolean;
}

export function parseAgentResponse(raw: string): ParsedResponse {
  const specUpdates: Partial<SiteSpec>[] = [];
  const intakeUpdates: Partial<ProjectIntakeData>[] = [];
  let options: OptionCard[] = [];
  let specComplete = false;

  // Extract spec updates
  for (const match of raw.matchAll(SPEC_UPDATE_RE)) {
    try {
      specUpdates.push(JSON.parse(match[1]) as Partial<SiteSpec>);
    } catch {
      // Malformed JSON — skip
    }
  }

  // Extract intake updates
  for (const match of raw.matchAll(INTAKE_UPDATE_RE)) {
    try {
      intakeUpdates.push(JSON.parse(match[1]) as Partial<ProjectIntakeData>);
    } catch {
      // Malformed JSON — skip
    }
  }

  // Extract options
  for (const match of raw.matchAll(OPTIONS_RE)) {
    try {
      const parsed = JSON.parse(match[1]) as { cards: OptionCard[] };
      options = parsed.cards;
    } catch {
      // Malformed JSON — skip
    }
  }

  // Check for spec complete
  if (SPEC_COMPLETE_RE.test(raw)) {
    specComplete = true;
  }

  // Strip all markers from displayed text
  const displayText = raw
    .replace(ALL_MARKERS_RE, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { displayText, specUpdates, intakeUpdates, options, specComplete };
}

/* ─── Spec Merging ─── */

/**
 * Deep-merge partial spec updates into the accumulated spec.
 * Arrays (like sections) are replaced, not appended.
 */
export function mergeSpec(
  current: Partial<SiteSpec>,
  updates: Partial<SiteSpec>[],
): Partial<SiteSpec> {
  let result = { ...current };
  for (const update of updates) {
    result = { ...result, ...update };
  }
  return result;
}

/**
 * Deep-merge partial intake updates into the accumulated intake.
 * Nested objects (business, project, style, contact) are merged individually.
 */
export function mergeIntake(
  current: Partial<ProjectIntakeData>,
  updates: Partial<ProjectIntakeData>[],
): Partial<ProjectIntakeData> {
  let result = { ...current };
  for (const update of updates) {
    if (update.business) {
      result.business = { ...result.business, ...update.business } as ProjectIntakeData["business"];
    }
    if (update.project) {
      result.project = { ...result.project, ...update.project } as ProjectIntakeData["project"];
    }
    if (update.style) {
      result.style = { ...result.style, ...update.style } as ProjectIntakeData["style"];
    }
    if (update.contact) {
      result.contact = { ...result.contact, ...update.contact } as ProjectIntakeData["contact"];
    }
  }
  return result;
}

/* ─── Completeness Check ─── */

export interface CompletenessResult {
  complete: boolean;
  missing: string[];
}

/**
 * Check whether the accumulated spec + intake have enough data to build.
 * Returns which fields are still missing.
 */
export function checkCompleteness(
  spec: Partial<SiteSpec>,
  intake: Partial<ProjectIntakeData>,
): CompletenessResult {
  const missing: string[] = [];

  // Spec fields
  if (!spec.headline?.trim()) missing.push("headline");
  if (!spec.subheadline?.trim()) missing.push("subheadline");
  if (!spec.sections || spec.sections.length < 4) missing.push("site sections (need at least 4)");

  // Business info
  if (!intake.business?.businessName?.trim()) missing.push("business name");
  if (!intake.business?.businessType?.trim()) missing.push("business type");

  // Project
  if (!intake.project?.callToAction?.trim()) missing.push("call to action");

  // Style
  if (!intake.style?.stylePreset?.trim()) missing.push("style preset");

  // Contact
  if (!intake.contact?.email?.trim()) missing.push("contact email");
  if (!intake.contact?.name?.trim()) missing.push("contact name");

  return {
    complete: missing.length === 0,
    missing,
  };
}
