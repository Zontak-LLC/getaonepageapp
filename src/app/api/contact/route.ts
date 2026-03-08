import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

const TO_EMAIL = "dzontak@gmail.com";
const HOUR_MS = 60 * 60 * 1000;

export async function POST(req: Request) {
  /* ── Rate limit by IP (5 submissions / hour) ── */
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = rateLimit(`contact:${ip}`, 5, HOUR_MS);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many messages. Please try again later." },
      { status: 429 },
    );
  }

  /* ── Validate body ── */
  let body: { name?: string; email?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const name = body.name?.trim() ?? "";
  const email = body.email?.trim() ?? "";
  const message = body.message?.trim() ?? "";

  if (!name || name.length > 120) {
    return NextResponse.json({ error: "Name is required (max 120 chars)." }, { status: 400 });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
  }
  if (!message || message.length < 10 || message.length > 2000) {
    return NextResponse.json(
      { error: "Message must be 10–2000 characters." },
      { status: 400 },
    );
  }

  /* ── Send via Resend ── */
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.FROM_EMAIL ?? "Zontak <noreply@getaonepageapp.com>";

  if (!resendKey) {
    console.error("RESEND_API_KEY not configured");
    return NextResponse.json(
      { error: "Email service unavailable. Please email us directly at dzontak@gmail.com." },
      { status: 503 },
    );
  }

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
    <span style="color:#F5EDE060;font-size:12px;margin-left:12px">Contact Form</span>
  </div>

  <div style="background:#1A1510;border:1px solid #2A2520;border-radius:14px;padding:24px;margin-bottom:16px">
    <p style="color:#F07D2E;font-size:18px;font-weight:700;margin:0 0 4px">
      ✉️ ${esc(name)}
    </p>
    <p style="color:#F5EDE060;font-size:13px;margin:0">${now}</p>
  </div>

  <div style="background:#1A1510;border:1px solid #2A2520;border-radius:14px;padding:20px;margin-bottom:16px">
    <table style="border-collapse:collapse;width:100%">
      <tr>
        <td style="color:#F5EDE060;padding:6px 12px 6px 0;font-size:13px;white-space:nowrap">Email</td>
        <td style="padding:6px 0;font-size:13px">
          <a href="mailto:${esc(email)}" style="color:#3DA7DB;text-decoration:none">${esc(email)}</a>
        </td>
      </tr>
    </table>
  </div>

  <div style="background:#1A1510;border:1px solid #2A2520;border-radius:14px;padding:20px;margin-bottom:16px">
    <p style="color:#3DA7DB;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;margin:0 0 12px">Message</p>
    <p style="color:#F5EDE0CC;font-size:14px;line-height:1.6;margin:0;white-space:pre-wrap">${esc(message)}</p>
  </div>

  <div style="text-align:center;border-top:1px solid #2A2520;padding-top:16px">
    <span style="color:#F5EDE030;font-size:11px">Sent from getaonepage.app contact form</span>
  </div>

</div>
</body></html>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: TO_EMAIL,
      reply_to: email,
      subject: `✉️ Contact: ${name}`,
      html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`Resend error ${res.status}: ${text.slice(0, 200)}`);
    return NextResponse.json(
      { error: "Failed to send. Please email us directly at dzontak@gmail.com." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}

function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
