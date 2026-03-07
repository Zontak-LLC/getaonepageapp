/**
 * Vercel deployment via REST API v13.
 *
 * Deploys a single index.html file to Vercel as a static site.
 * Replaces cloudflare-deploy.ts — simpler (no CLI, no temp files,
 * no child process), and the site is already hosted on Vercel.
 *
 * @see https://vercel.com/docs/rest-api/endpoints/deployments#create-a-new-deployment
 */

export interface VercelEnv {
  VERCEL_TOKEN: string;
  VERCEL_TEAM_ID?: string;
}

export interface DeployResult {
  projectName: string;
  deploymentUrl: string;
  deploymentId: string;
}

/* ─── Public API ─── */

/**
 * Deploy a single index.html to Vercel.
 * Returns the production URL and deployment ID.
 */
export async function deployToVercel(
  businessName: string,
  html: string,
  env: VercelEnv,
): Promise<DeployResult> {
  const projectName = slugifyProjectName(businessName);
  const fileContent = Buffer.from(html, "utf-8").toString("base64");

  const headers: Record<string, string> = {
    Authorization: `Bearer ${env.VERCEL_TOKEN}`,
    "Content-Type": "application/json",
  };

  const body: Record<string, unknown> = {
    name: projectName,
    files: [
      {
        file: "index.html",
        data: fileContent,
        encoding: "base64",
      },
    ],
    projectSettings: {
      framework: null,
    },
    target: "production",
  };

  if (env.VERCEL_TEAM_ID) {
    body.teamId = env.VERCEL_TEAM_ID;
  }

  const url = env.VERCEL_TEAM_ID
    ? `https://api.vercel.com/v13/deployments?teamId=${env.VERCEL_TEAM_ID}`
    : "https://api.vercel.com/v13/deployments";

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Vercel deploy failed (${response.status}): ${text.slice(0, 300)}`,
    );
  }

  const data = (await response.json()) as {
    id: string;
    url: string;
    readyState: string;
  };

  return {
    projectName,
    deploymentUrl: `https://${data.url}`,
    deploymentId: data.id,
  };
}

/* ─── Helpers ─── */

/**
 * Slugify a business name into a valid Vercel project name.
 * Rules: lowercase, alphanumeric + hyphens, no leading/trailing hyphens, max 58 chars.
 * Preserved from cloudflare-deploy.ts — same slug logic.
 */
export function slugifyProjectName(businessName: string): string {
  return (
    businessName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 58) || "site"
  );
}
