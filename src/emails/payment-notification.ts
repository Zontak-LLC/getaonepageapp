/**
 * HTML email template for internal payment notifications.
 * Sent to the Zontak team when a Stripe payment is completed.
 *
 * Ported from zontak-ai, adapted for getaonepageapp branding:
 *   - Orange #F07D2E / Blue #3DA7DB dual-color scheme
 *   - Dark warm palette (#0D0B08 bg, #1A1510 card, #2A2520 border)
 *   - Links to getaonepageapp.com
 */

type PaymentNotificationData = {
  name: string;
  email: string;
  tier: string;
  amount: string;
  sessionId: string;
  timestamp: string;
};

export function buildPaymentNotificationEmail(data: PaymentNotificationData): string {
  const { name, email, tier, amount, sessionId, timestamp } = data;
  const date = new Date(timestamp).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background-color:#0D0B08; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0D0B08; padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%;">

          <!-- Header -->
          <tr>
            <td style="padding:0 0 24px 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size:24px; font-weight:800;">
                      <span style="color:#F07D2E;">ZON</span><span style="color:#3DA7DB;">TAK</span>
                    </span>
                  </td>
                  <td align="right" style="font-size:12px; color:#F5EDE060;">
                    New Payment
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td style="background-color:#1A1510; border:1px solid #2A2520; border-radius:16px; padding:32px;">

              <!-- Title -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:20px; font-weight:600; color:#F5EDE0; padding-bottom:4px;">
                    ${escapeHtml(name || "Unknown Customer")}
                  </td>
                </tr>
                <tr>
                  <td style="font-size:14px; color:#F5EDE060; padding-bottom:24px;">
                    ${date}
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-bottom:1px solid #2A2520; height:1px;"></td>
                </tr>
              </table>

              <!-- Fields -->
              <table width="100%" cellpadding="0" cellspacing="0" style="padding-top:20px;">

                <!-- Email -->
                <tr>
                  <td style="padding:8px 0;">
                    <span style="font-size:12px; color:#F5EDE060; text-transform:uppercase; letter-spacing:0.5px;">Email</span><br>
                    <a href="mailto:${escapeHtml(email)}" style="font-size:15px; color:#3DA7DB; text-decoration:none;">${escapeHtml(email)}</a>
                  </td>
                </tr>

                <!-- Tier -->
                <tr>
                  <td style="padding:8px 0;">
                    <span style="font-size:12px; color:#F5EDE060; text-transform:uppercase; letter-spacing:0.5px;">Tier</span><br>
                    <span style="display:inline-block; margin-top:4px; padding:4px 12px; background-color:#F07D2E; color:#0D0B08; font-size:13px; font-weight:600; border-radius:6px;">
                      ${escapeHtml(tier)}
                    </span>
                  </td>
                </tr>

                <!-- Amount -->
                <tr>
                  <td style="padding:8px 0;">
                    <span style="font-size:12px; color:#F5EDE060; text-transform:uppercase; letter-spacing:0.5px;">Amount</span><br>
                    <span style="font-size:20px; font-weight:700; color:#F5EDE0;">${escapeHtml(amount)}</span>
                  </td>
                </tr>

                <!-- Session ID -->
                <tr>
                  <td style="padding:8px 0 16px 0;">
                    <span style="font-size:12px; color:#F5EDE060; text-transform:uppercase; letter-spacing:0.5px;">Stripe Session</span><br>
                    <span style="font-size:13px; color:#F5EDE040; font-family:monospace;">${escapeHtml(sessionId)}</span>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-bottom:1px solid #2A2520; height:1px;"></td>
                </tr>
              </table>

              <!-- Status -->
              <table width="100%" cellpadding="0" cellspacing="0" style="padding-top:20px;">
                <tr>
                  <td style="font-size:14px; color:#F5EDE060; line-height:1.6;">
                    Customer will receive a welcome email with a link to submit their project brief.
                    Credits provisioned in KV. Awaiting brief at <a href="https://getaonepageapp.com/welcome" style="color:#F07D2E; text-decoration:none;">getaonepageapp.com/welcome</a>.
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 0 0 0; text-align:center;">
              <span style="font-size:11px; color:#F5EDE040;">
                PAYMENT &rarr; BRIEF &rarr; BUILD &rarr; DEPLOY &rarr; DELIVER
              </span>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
