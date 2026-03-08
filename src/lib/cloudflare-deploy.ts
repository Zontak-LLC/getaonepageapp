/**
 * Cloudflare Pages deployment via Direct Upload REST API.
 *
 * Deploys a single index.html file to Cloudflare Pages as a static site.
 * Uses the undocumented but stable Direct Upload flow (same as Wrangler):
 *   1. Create project (idempotent — 409 means it already exists)
 *   2. Get upload token (JWT, valid ~5 min)
 *   3. Upload file content (base64-encoded, keyed by content hash)
 *   4. Register uploaded hashes
 *   5. Create deployment with path→hash manifest
 *
 * @see https://developers.cloudflare.com/pages/configuration/api/
 */

import { createHash } from "crypto";
import { slugifyProjectName } from "./vercel-deploy";

/* ─── Types ─── */

export interface CloudflareEnv {
  CLOUDFLARE_API_TOKEN: string;
  CLOUDFLARE_ACCOUNT_ID: string;
}

export interface DeployResult {
  projectName: string;
  deploymentUrl: string;
  deploymentId: string;
}

const CF_API = "https://api.cloudflare.com/client/v4";

/* ─── Public API ─── */

/**
 * Deploy a single index.html to Cloudflare Pages.
 * Returns the production URL (slug.pages.dev) and deployment ID.
 */
export async function deployToCloudflare(
  businessName: string,
  html: string,
  env: CloudflareEnv,
): Promise<DeployResult> {
  const projectName = slugifyProjectName(businessName);

  // Step 1 — Ensure project exists (409 = already exists, that's fine)
  await ensureProject(projectName, env);

  // Step 2 — Get upload token (JWT)
  const uploadToken = await getUploadToken(projectName, env);

  // Step 3 — Hash and upload the file
  const contentBuffer = Buffer.from(html, "utf-8");
  const hash = md5Hex(contentBuffer);

  await uploadAssets(uploadToken, [
    {
      key: hash,
      value: contentBuffer.toString("base64"),
      metadata: { contentType: "text/html" },
      base64: true,
    },
  ]);

  // Step 4 — Register hashes
  await upsertHashes(uploadToken, [hash]);

  // Step 5 — Create deployment with manifest
  const manifest: Record<string, string> = {
    "/index.html": hash,
  };

  const deployment = await createDeployment(projectName, manifest, env);

  return {
    projectName,
    deploymentUrl: deployment.url.startsWith("https://")
      ? deployment.url
      : `https://${deployment.url}`,
    deploymentId: deployment.id,
  };
}

/* ─── API Helpers ─── */

/**
 * Create a Pages project. Idempotent — 409 means it already exists.
 */
async function ensureProject(
  projectName: string,
  env: CloudflareEnv,
): Promise<void> {
  const res = await fetch(
    `${CF_API}/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/pages/projects`,
    {
      method: "POST",
      headers: authHeaders(env.CLOUDFLARE_API_TOKEN),
      body: JSON.stringify({
        name: projectName,
        production_branch: "main",
      }),
    },
  );

  // 409 = project already exists — that's expected
  if (!res.ok && res.status !== 409) {
    const text = await res.text();
    throw new Error(
      `Cloudflare create project failed (${res.status}): ${text.slice(0, 300)}`,
    );
  }
}

/**
 * Get a short-lived JWT upload token for asset uploads.
 */
async function getUploadToken(
  projectName: string,
  env: CloudflareEnv,
): Promise<string> {
  const res = await fetch(
    `${CF_API}/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/pages/projects/${projectName}/upload-token`,
    {
      method: "GET",
      headers: authHeaders(env.CLOUDFLARE_API_TOKEN),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Cloudflare upload-token failed (${res.status}): ${text.slice(0, 300)}`,
    );
  }

  const data = (await res.json()) as { result: { jwt: string } };
  return data.result.jwt;
}

/**
 * Upload file content to the asset store.
 * Each entry: { key: hash, value: base64Content, metadata: { contentType }, base64: true }
 */
async function uploadAssets(
  uploadToken: string,
  assets: Array<{
    key: string;
    value: string;
    metadata: { contentType: string };
    base64: boolean;
  }>,
): Promise<void> {
  const res = await fetch(`${CF_API}/pages/assets/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${uploadToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(assets),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Cloudflare asset upload failed (${res.status}): ${text.slice(0, 300)}`,
    );
  }
}

/**
 * Register uploaded hashes so the deployment can reference them.
 */
async function upsertHashes(
  uploadToken: string,
  hashes: string[],
): Promise<void> {
  const res = await fetch(`${CF_API}/pages/assets/upsert-hashes`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${uploadToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ hashes }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Cloudflare upsert-hashes failed (${res.status}): ${text.slice(0, 300)}`,
    );
  }
}

/**
 * Create a deployment with a file manifest (multipart/form-data).
 * The manifest maps URL paths → content hashes.
 */
async function createDeployment(
  projectName: string,
  manifest: Record<string, string>,
  env: CloudflareEnv,
): Promise<{ id: string; url: string }> {
  // Must use multipart form-data for this endpoint
  const boundary = `----CFDeploy${Date.now()}`;
  const body = buildMultipartBody(boundary, manifest);

  const res = await fetch(
    `${CF_API}/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/pages/projects/${projectName}/deployments`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
      },
      body,
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Cloudflare deployment failed (${res.status}): ${text.slice(0, 300)}`,
    );
  }

  const data = (await res.json()) as {
    result: {
      id: string;
      url: string;
      aliases?: string[];
    };
  };

  // Prefer the production URL (slug.pages.dev) over deployment-specific URL
  const url =
    data.result.aliases?.[0] ??
    data.result.url ??
    `${projectName}.pages.dev`;

  return { id: data.result.id, url };
}

/* ─── Helpers ─── */

/**
 * MD5 hex digest — used as content hash / asset key.
 * Cloudflare accepts MD5 or Blake3; MD5 is built into Node
 * and sufficient for our single-file use case.
 */
function md5Hex(content: Buffer): string {
  return createHash("md5").update(content).digest("hex");
}

/**
 * Standard auth headers for Cloudflare API calls.
 */
function authHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

/**
 * Build a multipart/form-data body with the manifest field.
 * Cloudflare's deployment endpoint requires proper content-disposition
 * and boundaries — it returns 500 if these are wrong.
 */
function buildMultipartBody(
  boundary: string,
  manifest: Record<string, string>,
): string {
  const parts: string[] = [];

  parts.push(`--${boundary}`);
  parts.push('Content-Disposition: form-data; name="manifest"');
  parts.push("");
  parts.push(JSON.stringify(manifest));

  parts.push(`--${boundary}--`);

  return parts.join("\r\n");
}
