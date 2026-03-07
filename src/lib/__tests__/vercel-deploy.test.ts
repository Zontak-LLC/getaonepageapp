/**
 * Vercel Deploy Test Scenarios
 *
 * Tests the deployment function and slug generation.
 * API calls are mocked — these verify request construction and error handling.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { slugifyProjectName, deployToVercel } from "../vercel-deploy";

describe("Vercel Deploy", () => {
  /* ─── Scenario 1: Slug generation — standard cases ─── */

  it("converts business names to valid project slugs", () => {
    expect(slugifyProjectName("Sunrise Bakery")).toBe("sunrise-bakery");
    expect(slugifyProjectName("John's Pizza & Pasta")).toBe(
      "john-s-pizza-pasta",
    );
    expect(slugifyProjectName("  ABC Company  ")).toBe("abc-company");
    expect(slugifyProjectName("123 Main St")).toBe("123-main-st");
  });

  /* ─── Scenario 2: Slug edge cases ─── */

  it("handles edge cases in slug generation", () => {
    // Empty string → fallback
    expect(slugifyProjectName("")).toBe("site");

    // Only special chars → fallback
    expect(slugifyProjectName("!!!@@@###")).toBe("site");

    // Very long name → truncated to 58 chars
    const longName = "a".repeat(100);
    expect(slugifyProjectName(longName).length).toBeLessThanOrEqual(58);

    // Leading/trailing hyphens stripped
    expect(slugifyProjectName("---test---")).toBe("test");

    // Unicode characters
    expect(slugifyProjectName("Café Résumé")).toBe("caf-r-sum");
  });

  /* ─── Scenario 3: Successful deployment ─── */

  it("sends correct request to Vercel API and returns deployment info", async () => {
    const mockResponse = {
      id: "dpl_abc123",
      url: "sunrise-bakery-xyz.vercel.app",
      readyState: "READY",
    };

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const result = await deployToVercel("Sunrise Bakery", "<html></html>", {
      VERCEL_TOKEN: "test-token",
    });

    expect(result.projectName).toBe("sunrise-bakery");
    expect(result.deploymentUrl).toBe(
      "https://sunrise-bakery-xyz.vercel.app",
    );
    expect(result.deploymentId).toBe("dpl_abc123");

    // Verify the request
    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://api.vercel.com/v13/deployments");
    expect(options?.method).toBe("POST");

    const headers = options?.headers as Record<string, string>;
    expect(headers?.Authorization).toBe("Bearer test-token");

    const body = JSON.parse(options?.body as string);
    expect(body.name).toBe("sunrise-bakery");
    expect(body.files).toHaveLength(1);
    expect(body.files[0].file).toBe("index.html");
    expect(body.target).toBe("production");

    fetchSpy.mockRestore();
  });

  /* ─── Scenario 4: Team ID included when set ─── */

  it("includes teamId in request when VERCEL_TEAM_ID is set", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: "dpl_123",
        url: "test.vercel.app",
        readyState: "READY",
      }),
    } as Response);

    await deployToVercel("Test Site", "<html></html>", {
      VERCEL_TOKEN: "test-token",
      VERCEL_TEAM_ID: "team_abc",
    });

    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toContain("teamId=team_abc");

    const body = JSON.parse(options?.body as string);
    expect(body.teamId).toBe("team_abc");

    fetchSpy.mockRestore();
  });

  /* ─── Scenario 5: API error handling ─── */

  it("throws descriptive error on API failure", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: async () => "Forbidden: Invalid token",
    } as Response);

    await expect(
      deployToVercel("Test", "<html></html>", {
        VERCEL_TOKEN: "bad-token",
      }),
    ).rejects.toThrow("Vercel deploy failed (403)");

    fetchSpy.mockRestore();
  });
});
