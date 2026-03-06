/**
 * HTML email template for post-payment welcome.
 * Sent to customers after successful Stripe checkout.
 * Contains a CTA button linking to /welcome?session_id=... to submit their project.
 *
 * Ported from zontak-ai, adapted for getaonepageapp branding:
 *   - Orange #F07D2E (primary) + Blue #3DA7DB (secondary) instead of Gold #D4A843
 *   - "ZONTAK" logo with dual-color treatment
 *   - Links to getaonepageapp.com
 */

type PaymentWelcomeData = {
  name: string;
  email: string;
  tier: string;
  amount: string;
  sessionId: string;
};

export function buildPaymentWelcomeEmail(data: PaymentWelcomeData): string {
  const { name, tier, amount, sessionId } = data;
  const firstName = name ? name.split(" ")[0] : "there";
  const welcomeUrl = `https://getaonepageapp.com/welcome?session_id=${encodeURIComponent(sessionId)}`;

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
            <td align="center" style="padding:0 0 32px 0;">
              <span style="font-size:28px; font-weight:800; letter-spacing:-0.5px;">
                <span style="color:#F07D2E;">ZON</span><span style="color:#3DA7DB;">TAK</span>
              </span>
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td style="background-color:#1A1510; border:1px solid #2A2520; border-radius:16px; padding:40px 32px;">

              <!-- Tier Badge -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:24px;">
                    <span style="display:inline-block; padding:6px 16px; background-color:#F07D2E; color:#0D0B08; font-size:13px; font-weight:700; border-radius:20px; text-transform:uppercase; letter-spacing:0.5px;">
                      ${escapeHtml(tier)} &mdash; ${escapeHtml(amount)}
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Greeting -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:22px; font-weight:600; color:#F5EDE0; padding-bottom:16px; text-align:center;">
                    Payment confirmed, ${escapeHtml(firstName)}!
                  </td>
                </tr>
                <tr>
                  <td style="font-size:15px; color:#F5EDE0aa; line-height:1.7; padding-bottom:24px; text-align:center;">
                    Thank you for choosing Zontak. Your project credits are ready.
                    Head to your welcome page to submit your project brief &mdash;
                    our AI-powered pipeline will build and deploy your site.
                  </td>
                </tr>
              </table>

              <!-- Steps -->
              <table width="100%" cellpadding="0" cellspacing="0" style="padding-bottom:24px;">
                <tr>
                  <td style="padding:10px 0;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width:32px; vertical-align:top;">
                          <span style="display:inline-block; width:24px; height:24px; line-height:24px; text-align:center; background-color:#F07D2E; color:#0D0B08; font-size:12px; font-weight:700; border-radius:50%;">1</span>
                        </td>
                        <td style="font-size:14px; color:#F5EDE0; padding-left:8px;">
                          <strong style="color:#F5EDE0;">Submit your project brief</strong>
                          <span style="color:#F5EDE090;"> &mdash; Business info, style, description</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 0;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width:32px; vertical-align:top;">
                          <span style="display:inline-block; width:24px; height:24px; line-height:24px; text-align:center; background-color:#F07D2E; color:#0D0B08; font-size:12px; font-weight:700; border-radius:50%;">2</span>
                        </td>
                        <td style="font-size:14px; color:#F5EDE0; padding-left:8px;">
                          <strong style="color:#F5EDE0;">AI pipeline builds your site</strong>
                          <span style="color:#F5EDE090;"> &mdash; Assess, generate, validate, deploy</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 0;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width:32px; vertical-align:top;">
                          <span style="display:inline-block; width:24px; height:24px; line-height:24px; text-align:center; background-color:#F07D2E; color:#0D0B08; font-size:12px; font-weight:700; border-radius:50%;">3</span>
                        </td>
                        <td style="font-size:14px; color:#F5EDE0; padding-left:8px;">
                          <strong style="color:#F5EDE0;">Live on Cloudflare</strong>
                          <span style="color:#F5EDE090;"> &mdash; Deployed, SSL, custom domain ready</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="padding-top:8px; padding-bottom:8px;">
                <tr>
                  <td align="center">
                    <a href="${welcomeUrl}" style="display:inline-block; padding:14px 40px; background-color:#F07D2E; color:#0D0B08; font-size:16px; font-weight:700; text-decoration:none; border-radius:30px;">
                      Submit Your Project Brief &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Fallback link -->
              <table width="100%" cellpadding="0" cellspacing="0" style="padding-top:16px;">
                <tr>
                  <td style="font-size:12px; color:#F5EDE050; text-align:center; line-height:1.6;">
                    Or copy this link: <a href="${welcomeUrl}" style="color:#3DA7DB; text-decoration:underline;">${welcomeUrl}</a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 0 0 0; text-align:center;">
              <span style="font-size:13px; font-weight:800;">
                <span style="color:#F07D2E;">ZON</span><span style="color:#3DA7DB;">TAK</span>
              </span>
              <br>
              <span style="font-size:11px; color:#F5EDE040;">
                AI-First Creative Company &middot; getaonepageapp.com
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
