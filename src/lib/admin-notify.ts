/**
 * Send an email notification to the admin (dzontak@gmail.com) when a new
 * project request is submitted.
 *
 * This fires before the graph executes — instant awareness of incoming leads.
 * Uses Resend API directly (same pattern as the deliver node).
 */

import type { ProjectIntakeData } from "./intake-types";
import type { GraphEnv } from "./graph-executor";

const ADMIN_EMAIL = "dzontak@gmail.com";

export async function sendNewRequestNotification(
  intake: ProjectIntakeData,
  sessionId: string,
  env: GraphEnv,
): Promise<void> {
  if (!env.RESEND_API_KEY || !env.FROM_EMAIL) {
    console.warn("Resend not configured — skipping admin notification");
    return;
  }

  const { business, project, contact } = intake;
  const now = new Date().toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0D0B08;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#F5EDE0">
<div style="max-width:600px;margin:0 auto;padding:32px 20px">

  <div style="margin-bottom:24px">
    <span style="font-size:24px;font-weight:800">
      <span style="color:#F07D2E">ZON</span><span style="color:#3DA7DB">TAK</span>
    </span>
    <span style="color:#F5EDE060;font-size:12px;margin-left:12px">New Request</span>
  </div>

  <div style="background:#1A1510;border:1px solid #2A2520;border-radius:14px;padding:24px;margin-bottom:16px">
    <p style="color:#F07D2E;font-size:20px;font-weight:700;margin:0 0 4px">
      📋 ${escapeHtml(business.businessName)}
    </p>
    <p style="color:#F5EDE060;font-size:13px;margin:0">${now}</p>
  </div>

  <div style="background:#1A1510;border:1px solid #2A2520;border-radius:14px;padding:20px;margin-bottom:16px">
    <table style="border-collapse:collapse;width:100%">
      ${row("Industry", business.industry)}
      ${row("Type", business.businessType)}
      ${row("Website", business.website)}
      ${row("Description", project.description)}
      ${row("Goals", project.goals)}
      ${row("CTA", project.callToAction)}
    </table>
  </div>

  <div style="background:#1A1510;border:1px solid #2A2520;border-radius:14px;padding:20px;margin-bottom:16px">
    <p style="color:#3DA7DB;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;margin:0 0 12px">Contact</p>
    <table style="border-collapse:collapse;width:100%">
      ${row("Name", contact.name)}
      <tr>
        <td style="color:#F5EDE060;padding:6px 12px 6px 0;font-size:13px;white-space:nowrap">Email</td>
        <td style="padding:6px 0;font-size:13px">
          <a href="mailto:${escapeHtml(contact.email)}" style="color:#3DA7DB;text-decoration:none">${escapeHtml(contact.email)}</a>
        </td>
      </tr>
      ${row("Phone", contact.phone)}
    </table>
  </div>

  <div style="text-align:center;padding:16px 0">
    <span style="color:#F5EDE030;font-size:11px;font-family:monospace">Session: ${escapeHtml(sessionId.slice(0, 8))}…</span>
  </div>

  <div style="text-align:center;border-top:1px solid #2A2520;padding-top:16px">
    <span style="color:#F5EDE030;font-size:11px">
      INTAKE → ASSESS → GENERATE → VALIDATE → BUILD → DEPLOY → DELIVER
    </span>
  </div>

</div>
</body></html>`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `📋 New Request: ${business.businessName} — ${contact.name}`,
      html,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Resend API error ${response.status}: ${text.slice(0, 200)}`);
  }
}

function row(label: string, value: string): string {
  if (!value) return "";
  return `<tr>
    <td style="color:#F5EDE060;padding:6px 12px 6px 0;font-size:13px;vertical-align:top;white-space:nowrap">${label}</td>
    <td style="color:#F5EDE0CC;padding:6px 0;font-size:13px">${escapeHtml(value)}</td>
  </tr>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
