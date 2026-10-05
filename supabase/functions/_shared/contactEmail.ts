// Sends the Contact page form submission to the store admin (with reply-to
// set to the customer, so admin can just hit reply) and a short confirmation
// back to the customer. Mirrors the branded look of the order emails but is
// deliberately self-contained rather than reusing email.ts's `shell`, since
// that one is built around order-specific fields this message doesn't have.

const BRAND = '#C4922A';
const INK = '#1C1611';
const CREAM = '#FDFAF5';
const LINE = '#F0E6CC';
const MUTED = '#888888';

const esc = (v: unknown) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const shell = (heading: string, sub: string, body: string) => `
<div style="background:#f4f1ec;padding:24px 12px;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid ${LINE};">
    <tr>
      <td style="background:${INK};padding:26px 24px;text-align:center;">
        <div style="color:${BRAND};font-size:11px;font-weight:700;letter-spacing:3px;margin-bottom:8px;">✦ SAABI DESIGNES ✦</div>
        <div style="color:#ffffff;font-size:22px;font-weight:800;">${heading}</div>
        <div style="color:#C4A96A;font-size:13px;margin-top:6px;">${sub}</div>
      </td>
    </tr>
    <tr>
      <td style="padding:24px;">${body}</td>
    </tr>
    <tr>
      <td style="background:${CREAM};padding:18px 24px;text-align:center;border-top:1px solid ${LINE};">
        <div style="font-size:12px;color:${MUTED};">
          <span style="color:${BRAND};font-weight:600;">Saabi Designes</span> · Tradition Meets Elegance
        </div>
      </td>
    </tr>
  </table>
</div>`;

function buildAdminEmailHtml({ name, email, subject, message }: Record<string, string>) {
  const body = `
    <div style="font-size:14px;color:${INK};line-height:1.6;margin-bottom:16px;">
      <strong>${esc(name)}</strong><br/>
      <a href="mailto:${esc(email)}" style="color:${BRAND};text-decoration:none;">${esc(email)}</a>
    </div>
    ${subject ? `
    <div style="margin-bottom:14px;">
      <div style="font-size:11px;font-weight:700;color:${BRAND};text-transform:uppercase;letter-spacing:1px;">Subject</div>
      <div style="font-size:14px;color:${INK};margin-top:4px;">${esc(subject)}</div>
    </div>` : ''}
    <div>
      <div style="font-size:11px;font-weight:700;color:${BRAND};text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Message</div>
      <div style="font-size:14px;color:${INK};line-height:1.6;white-space:pre-wrap;border:1px solid ${LINE};background:${CREAM};border-radius:10px;padding:14px;">${esc(message)}</div>
    </div>`;
  return shell('New Contact Message', `From ${esc(name)}`, body);
}

function buildCustomerEmailHtml({ name, subject }: Record<string, string>) {
  const body = `
    <p style="font-size:14px;color:${INK};line-height:1.7;margin:0;">
      Hi ${esc(name)},<br/><br/>
      Thanks for reaching out${subject ? ` about "${esc(subject)}"` : ''} — we've received your message and our team will get back to you within 24 hours.
    </p>`;
  return shell('We received your message', `Thanks for contacting us, ${esc(name)}!`, body);
}

export async function sendContactEmails({ name, email, subject, message }: Record<string, string>) {
  const resendKey = Deno.env.get('RESEND_API_KEY');
  const adminEmail = Deno.env.get('ADMIN_ALERT_EMAIL');
  const fromEmail = Deno.env.get('EMAIL_FROM') || 'Saabi Designes <onboarding@resend.dev>';

  if (!resendKey || !adminEmail) {
    console.log('RESEND_API_KEY or ADMIN_ALERT_EMAIL not set — skipping contact emails');
    return;
  }

  const send = async (to: string, subjectLine: string, html: string, replyTo?: string) => {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: fromEmail, to, subject: subjectLine, html, ...(replyTo ? { reply_to: replyTo } : {}) }),
      });
      if (!res.ok) console.error('Resend error:', await res.text());
    } catch (e) {
      console.error('Email send failed:', e);
    }
  };

  const tasks: Promise<void>[] = [
    send(
      adminEmail,
      `New Contact Message${subject ? ' — ' + subject : ''}`,
      buildAdminEmailHtml({ name, email, subject, message }),
      email
    ),
  ];

  if (email) {
    tasks.push(send(email, 'We received your message — Saabi Designes', buildCustomerEmailHtml({ name, subject })));
  }

  await Promise.all(tasks);
}
