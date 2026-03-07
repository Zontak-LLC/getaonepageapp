/**
 * Types for the conversational agent system.
 *
 * Two phases:
 *   Phase 1 — Spec Agent (chat): guided conversation → approved SiteSpec
 *   Phase 2 — Build Agent (autonomous): SiteSpec → HTML → validate → deploy → email
 *
 * SSE events stream both chat messages and build progress to the client.
 */

import type { ProjectIntakeData, SiteSpec } from "./intake-types";

export type { ProjectIntakeData, SiteSpec };

/* ─── Chat Messages ─── */

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: string;
  /** Structured option cards attached to this message */
  options?: OptionCard[];
}

export interface OptionCard {
  id: string;
  label: string;
  description: string;
  /** Value sent back when user selects this option */
  value: string;
}

/* ─── SSE Event Types ─── */

export type SSEEventType =
  | "message_delta"    // streaming text chunk from assistant
  | "message_done"     // complete assistant message
  | "spec_update"      // extracted spec fields (partial)
  | "intake_update"    // extracted intake fields (partial)
  | "options"          // structured option cards to display
  | "spec_complete"    // spec is ready for user approval
  | "phase"            // build phase status change
  | "validate_result"  // build validation scores
  | "deploy_result"    // deployment URL
  | "complete"         // build finished successfully
  | "error";           // error occurred

export interface SSEEvent {
  type: SSEEventType;
  data: unknown;
}

/* ─── Spec Agent State ─── */

export type SpecStatus = "gathering" | "reviewing" | "approved";

export interface ConversationState {
  sessionId: string;
  userEmail: string;
  messages: ChatMessage[];
  partialSpec: Partial<SiteSpec>;
  partialIntake: Partial<ProjectIntakeData>;
  specStatus: SpecStatus;
}

/* ─── Build Progress ─── */

export type BuildPhase =
  | "building"
  | "validating"
  | "deploying"
  | "delivering"
  | "complete"
  | "failed";

export interface BuildProgress {
  phase: BuildPhase;
  message: string;
  /** Present after validation */
  validationScore?: number;
  /** Present after deployment */
  siteUrl?: string;
  /** Present on completion */
  creditsRemaining?: number;
}

/* ─── Build Result (stored in DB) ─── */

export interface BuildResult {
  html: string;
  buildNotes: string;
  validationScore: number;
  siteUrl?: string;
  creditsRemaining: number;
  teamEmailSent: boolean;
  clientEmailSent: boolean;
}

/* ─── API Request/Response ─── */

export interface ChatRequest {
  sessionId: string;
  message: string;
  selectedOption?: string;
}

export interface BuildRequest {
  sessionId: string;
  spec: SiteSpec;
  intake: ProjectIntakeData;
}

/* ─── Session Persistence ─── */

export const CONVERSATION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

/* ─── Credit System (migrated from graph-types.ts) ─── */

export interface CreditRecord {
  email: string;
  total: number;    // credits allocated
  used: number;     // credits consumed
  plan: "standard" | "starter" | "pro" | "premium";
  createdAt: string;
  updatedAt: string;
}

export const CREDITS_INCLUDED = 3;  // 3 revision credits included with every project

/* ─── Pipeline Types (migrated from graph-types.ts) ─── */

/** Polished brief + site spec — used by email templates */
export interface GenerateOutput {
  refinedBrief: string;
  siteSpec: SiteSpec;
  edge: "generated";
}

/** Validation scoring — used by email templates */
export interface ValidateOutput {
  scores: {
    clarity: number;
    completeness: number;
    ctaStrength: number;
    sectionFlow: number;
  };
  overallScore: number;
  critique: string;
  suggestions: string[];
  edge: "passes" | "needs_revision";
}
