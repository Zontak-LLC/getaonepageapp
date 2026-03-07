/**
 * Spec Agent Test Scenarios
 *
 * Software Factory philosophy: scenario-based, full-journey validation.
 * Each test validates a complete parsing flow, not an isolated function.
 */

import { describe, it, expect } from "vitest";
import {
  parseAgentResponse,
  mergeSpec,
  mergeIntake,
  checkCompleteness,
} from "../spec-agent";
import type { SiteSpec } from "../intake-types";
import type { ProjectIntakeData } from "../intake-types";

describe("Spec Agent", () => {
  /* ─── Scenario 1: Parse SPEC_UPDATE from response ─── */

  it("extracts spec fields from comment markers and strips them from display text", () => {
    const raw = `Great! So your business is a bakery in Brooklyn. Let me capture that.

<!--SPEC_UPDATE:{"headline":"Fresh Baked Daily","subheadline":"Brooklyn's favorite artisan bakery since 2019"}-->

What kind of call-to-action would work best for your customers?`;

    const result = parseAgentResponse(raw);

    expect(result.specUpdates).toHaveLength(1);
    expect(result.specUpdates[0].headline).toBe("Fresh Baked Daily");
    expect(result.specUpdates[0].subheadline).toBe(
      "Brooklyn's favorite artisan bakery since 2019",
    );
    // Display text should NOT contain the marker
    expect(result.displayText).not.toContain("SPEC_UPDATE");
    expect(result.displayText).not.toContain("<!--");
    expect(result.displayText).toContain("Great!");
    expect(result.displayText).toContain("call-to-action");
  });

  /* ─── Scenario 2: Parse INTAKE_UPDATE from response ─── */

  it("extracts intake fields from comment markers", () => {
    const raw = `I've noted your business details.

<!--INTAKE_UPDATE:{"business":{"businessName":"Sunrise Bakery","businessType":"Bakery","industry":"Food & Beverage"}}-->

Now let's talk about your project goals.`;

    const result = parseAgentResponse(raw);

    expect(result.intakeUpdates).toHaveLength(1);
    expect(result.intakeUpdates[0].business?.businessName).toBe(
      "Sunrise Bakery",
    );
    expect(result.intakeUpdates[0].business?.industry).toBe("Food & Beverage");
    expect(result.displayText).not.toContain("INTAKE_UPDATE");
  });

  /* ─── Scenario 3: Parse OPTIONS from response ─── */

  it("extracts option cards and strips marker from display", () => {
    const raw = `Which style preset do you prefer?

<!--OPTIONS:{"cards":[{"id":"warm","label":"Warm","description":"Orange & cream, inviting","value":"warm"},{"id":"cool","label":"Cool","description":"Blue & white, professional","value":"cool"}]}-->

Pick one that matches your brand vibe.`;

    const result = parseAgentResponse(raw);

    expect(result.options).toHaveLength(2);
    expect(result.options[0].label).toBe("Warm");
    expect(result.options[0].value).toBe("warm");
    expect(result.options[1].label).toBe("Cool");
    expect(result.displayText).not.toContain("OPTIONS");
    expect(result.displayText).toContain("style preset");
  });

  /* ─── Scenario 4: Completeness check — all fields present ─── */

  it("reports complete when all required fields are present", () => {
    const spec: Partial<SiteSpec> = {
      headline: "Fresh Baked Daily",
      subheadline: "Brooklyn's favorite bakery",
      seoDescription: "Artisan bakery in Brooklyn",
      sections: [
        {
          sectionName: "Hero",
          purpose: "Hook visitors",
          suggestedContent: "Main headline",
        },
        {
          sectionName: "About",
          purpose: "Build trust",
          suggestedContent: "Our story",
        },
        {
          sectionName: "Menu",
          purpose: "Show products",
          suggestedContent: "Popular items",
        },
        {
          sectionName: "Contact",
          purpose: "Drive action",
          suggestedContent: "Visit us",
        },
      ],
    };

    const intake: Partial<ProjectIntakeData> = {
      business: {
        businessName: "Sunrise Bakery",
        businessType: "Bakery",
        industry: "Food",
        website: "",
      },
      project: {
        description: "A bakery website",
        goals: "Get more customers",
        callToAction: "Order Online",
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
        email: "john@sunrise.com",
        phone: "",
        preferredContact: "email",
        additionalNotes: "",
      },
    };

    const result = checkCompleteness(spec, intake);
    expect(result.complete).toBe(true);
    expect(result.missing).toHaveLength(0);
  });

  /* ─── Scenario 5: Completeness check — missing sections ─── */

  it("reports incomplete with specific missing fields", () => {
    const spec: Partial<SiteSpec> = {
      headline: "Fresh Baked Daily",
      // Missing subheadline
      sections: [
        {
          sectionName: "Hero",
          purpose: "Hook",
          suggestedContent: "Content",
        },
        // Only 1 section — need at least 4
      ],
    };

    const intake: Partial<ProjectIntakeData> = {
      business: {
        businessName: "Sunrise Bakery",
        businessType: "Bakery",
        industry: "",
        website: "",
      },
      // Missing project.callToAction, style, contact
    };

    const result = checkCompleteness(spec, intake);
    expect(result.complete).toBe(false);
    expect(result.missing).toContain("subheadline");
    expect(result.missing).toContain("site sections (need at least 4)");
    expect(result.missing).toContain("call to action");
    expect(result.missing).toContain("style preset");
    expect(result.missing).toContain("contact email");
    expect(result.missing).toContain("contact name");
  });

  /* ─── Scenario 6: Multiple incremental updates merge correctly ─── */

  it("accumulates spec fields across multiple merges", () => {
    let spec: Partial<SiteSpec> = {};

    // First update: headline
    spec = mergeSpec(spec, [{ headline: "Welcome to Sunrise" }]);
    expect(spec.headline).toBe("Welcome to Sunrise");

    // Second update: subheadline + override headline
    spec = mergeSpec(spec, [
      {
        headline: "Fresh Baked Daily",
        subheadline: "Brooklyn's favorite bakery",
      },
    ]);
    expect(spec.headline).toBe("Fresh Baked Daily");
    expect(spec.subheadline).toBe("Brooklyn's favorite bakery");

    // Third update: sections
    spec = mergeSpec(spec, [
      {
        sections: [
          {
            sectionName: "Hero",
            purpose: "Hook",
            suggestedContent: "Welcome",
          },
        ],
      },
    ]);
    expect(spec.sections).toHaveLength(1);
    expect(spec.headline).toBe("Fresh Baked Daily"); // preserved
  });

  it("accumulates intake fields across multiple merges", () => {
    let intake: Partial<ProjectIntakeData> = {};

    // First: business name
    intake = mergeIntake(intake, [
      { business: { businessName: "Sunrise" } as ProjectIntakeData["business"] },
    ]);
    expect(intake.business?.businessName).toBe("Sunrise");

    // Second: business type + contact
    intake = mergeIntake(intake, [
      {
        business: { businessType: "Bakery" } as ProjectIntakeData["business"],
        contact: {
          name: "John",
          email: "john@test.com",
        } as ProjectIntakeData["contact"],
      },
    ]);
    // Business name should be preserved
    expect(intake.business?.businessName).toBe("Sunrise");
    expect(intake.business?.businessType).toBe("Bakery");
    expect(intake.contact?.name).toBe("John");
  });

  /* ─── Edge Case: Malformed markers are skipped ─── */

  it("handles malformed JSON in markers gracefully", () => {
    const raw = `Here is some text.

<!--SPEC_UPDATE:not valid json-->
<!--INTAKE_UPDATE:{"business":{"businessName":"Good"}}-->

More text.`;

    const result = parseAgentResponse(raw);
    // Malformed spec update should be skipped
    expect(result.specUpdates).toHaveLength(0);
    // Valid intake update should be parsed
    expect(result.intakeUpdates).toHaveLength(1);
    expect(result.intakeUpdates[0].business?.businessName).toBe("Good");
  });

  /* ─── Edge Case: SPEC_COMPLETE detection ─── */

  it("detects SPEC_COMPLETE marker", () => {
    const raw = `Here is your final spec summary.

<!--SPEC_COMPLETE-->

Let me know if you'd like to change anything!`;

    const result = parseAgentResponse(raw);
    expect(result.specComplete).toBe(true);
    expect(result.displayText).not.toContain("SPEC_COMPLETE");
  });
});
