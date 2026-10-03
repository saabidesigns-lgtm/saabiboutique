// Sends order-confirmation emails via Resend. If RESEND_API_KEY isn't set
// yet, this quietly no-ops so the payment/order flow keeps working while
// email is still being set up.
//
// Markup here is deliberately old-fashioned — nested tables, inline styles,
// no flex/grid — because Gmail and Outlook strip <style> blocks and ignore
// modern layout CSS.

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

const money = (v: unknown) => `₹${Number(v || 0).toLocaleString('en-IN')}`;

const formatDate = (iso?: string) => {
  try {
    return new Date(iso || Date.now()).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch {
    return '';
  }
};

const PAYMENT_LABEL: Record<string, string> = {
  phonepe: 'Paid online (UPI / Card)',
  razorpay: 'Paid online (UPI / Card)',
  card: 'Paid online (Card)',
  cod: 'Cash on Delivery',
};

const paymentSummary = (order: Record<string, any>) => {
  const method = PAYMENT_LABEL[order.payment_method] || esc(order.payment_method);
  const isCod = order.payment_status === 'cod_pending';
  const paid = order.payment_status === 'paid' || order.payment_status === 'paid_simulated';
  const state = isCod
    ? `<span style="color:${BRAND};font-weight:700;">Pay ${money(order.total)} on delivery</span>`
    : paid
    ? `<span style="color:#4CAF50;font-weight:700;">✓ Payment received</span>`
    : `<span style="color:#e63946;font-weight:700;">Payment pending</span>`;
  return { method, state };
};

const itemRows = (items: any[]) =>
  (items || [])
    .map((i) => {
      const qty = Number(i.qty || 1);
      const lineTotal = Number(i.price || 0) * qty;
      const thumb = i.image
        ? `<img src="${esc(i.image)}" width="64" height="64" alt="" style="display:block;width:64px;height:64px;object-fit:cover;border-radius:8px;border:1px solid ${LINE};" />`
        : `<div style="width:64px;height:64px;border-radius:8px;border:1px solid ${LINE};background:${CREAM};"></div>`;
      const meta = [
        i.category ? esc(i.category) : '',
        i.size ? `Size: ${esc(i.size)}` : '',
        `Qty: ${qty}`,
      ].filter(Boolean).join(' &nbsp;·&nbsp; ');

      return `
      <tr>
        <td style="padding:14px 0;border-bottom:1px solid ${LINE};vertical-align:top;width:80px;">${thumb}</td>
        <td style="padding:14px 10px;border-bottom:1px solid ${LINE};vertical-align:top;">
          <div style="font-size:14px;font-weight:600;color:${INK};line-height:1.4;">${esc(i.name)}</div>
          <div style="font-size:12px;color:${MUTED};margin-top:4px;">${meta}</div>
          ${qty > 1 ? `<div style="font-size:12px;color:${MUTED};margin-top:2px;">${money(i.price)} each</div>` : ''}
        </td>
        <td style="padding:14px 0;border-bottom:1px solid ${LINE};vertical-align:top;text-align:right;white-space:nowrap;font-size:14px;font-weight:700;color:${INK};">
          ${money(lineTotal)}
        </td>
      </tr>`;
    })
    .join('');

const totalsRows = (order: Record<string, any>) => `
  <tr>
    <td style="padding:6px 0;font-size:14px;color:${MUTED};">Subtotal</td>
    <td style="padding:6px 0;font-size:14px;color:${INK};text-align:right;">${money(order.subtotal)}</td>
  </tr>
  <tr>
    <td style="padding:6px 0;font-size:14px;color:${MUTED};">Shipping</td>
    <td style="padding:6px 0;font-size:14px;text-align:right;${Number(order.shipping) === 0 ? 'color:#4CAF50;font-weight:600;' : `color:${INK};`}">
      ${Number(order.shipping) === 0 ? 'FREE' : money(order.shipping)}
    </td>
  </tr>
  <tr>
    <td style="padding:12px 0 0;border-top:2px solid ${LINE};font-size:16px;font-weight:800;color:${INK};">Total</td>
    <td style="padding:12px 0 0;border-top:2px solid ${LINE};font-size:18px;font-weight:800;color:${BRAND};text-align:right;">${money(order.total)}</td>
  </tr>`;

const addressBlock = (order: Record<string, any>) => `
  <div style="font-size:14px;color:${INK};line-height:1.6;">
    <strong>${esc(order.customer_name)}</strong><br />
    ${esc(order.address)}<br />
    ${esc(order.city)}${order.zip ? ` — ${esc(order.zip)}` : ''}<br />
    <span style="color:${MUTED};">${esc(order.phone)}</span>
  </div>`;

const panel = (title: string, body: string) => `
  <div style="background:${CREAM};border:1px solid ${LINE};border-radius:12px;padding:16px;">
    <div style="font-size:11px;font-weight:700;color:${BRAND};text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">${title}</div>
    ${body}
  </div>`;

const shell = (opts: { heading: string; sub: string; order: Record<string, any>; body: string }) => `
<div style="background:#f4f1ec;padding:24px 12px;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid ${LINE};">
    <tr>
      <td style="background:${INK};padding:28px 24px;text-align:center;">
        <div style="color:${BRAND};font-size:11px;font-weight:700;letter-spacing:3px;margin-bottom:8px;">✦ SAABI DESIGNES ✦</div>
        <div style="color:#ffffff;font-size:24px;font-weight:800;">${opts.heading}</div>
        <div style="color:#C4A96A;font-size:14px;margin-top:6px;">${opts.sub}</div>
      </td>
    </tr>
    <tr>
      <td style="padding:24px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:20px;">
          <tr>
            <td style="font-size:13px;color:${MUTED};">
              <strong style="color:${INK};font-size:15px;">Order #${esc(opts.order.id)}</strong><br />
              ${formatDate(opts.order.created_at)}
            </td>
            <td style="text-align:right;font-size:13px;">${paymentSummary(opts.order).state}</td>
          </tr>
        </table>
        ${opts.body}
      </td>
    </tr>
    <tr>
      <td style="background:${CREAM};padding:20px 24px;text-align:center;border-top:1px solid ${LINE};">
        <div style="font-size:12px;color:${MUTED};line-height:1.6;">
          Questions about this order? Just reply to this email.<br />
          <span style="color:${BRAND};font-weight:600;">Saabi Designes</span> · Tradition Meets Elegance
        </div>
      </td>
    </tr>
  </table>
</div>`;

const orderDetailsBody = (order: Record<string, any>, opts: { showCustomerContact?: boolean } = {}) => {
  const pay = paymentSummary(order);
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:8px;">
      ${itemRows(order.items)}
    </table>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:16px 0 24px;">
      ${totalsRows(order)}
    </table>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td style="vertical-align:top;padding-bottom:12px;">
          ${panel('Delivery Address', addressBlock(order))}
        </td>
      </tr>
      <tr>
        <td style="vertical-align:top;">
          ${panel('Payment', `
            <div style="font-size:14px;color:${INK};line-height:1.6;">
              ${pay.method}<br />
              ${pay.state}
            </div>`)}
        </td>
      </tr>
      ${opts.showCustomerContact ? `
      <tr>
        <td style="vertical-align:top;padding-top:12px;">
          ${panel('Customer Contact', `
            <div style="font-size:14px;color:${INK};line-height:1.6;">
              ${esc(order.customer_name)}<br />
              <a href="tel:${esc(order.phone)}" style="color:${BRAND};text-decoration:none;">${esc(order.phone)}</a><br />
              ${order.email ? `<a href="mailto:${esc(order.email)}" style="color:${BRAND};text-decoration:none;">${esc(order.email)}</a>` : `<span style="color:${MUTED};">No email provided</span>`}
            </div>`)}
        </td>
      </tr>` : ''}
    </table>`;
};

export function buildCustomerEmailHtml(order: Record<string, any>) {
  const isCod = order.payment_status === 'cod_pending';
  return shell({
    heading: 'Thank you for your order!',
    sub: `We've received it, ${esc(order.customer_name)} — here are the details.`,
    order,
    body: orderDetailsBody(order) + `
      <div style="margin-top:20px;padding:14px;background:#f5f9f0;border:1px solid #d4edda;border-radius:10px;font-size:13px;color:#2f6b3f;line-height:1.6;text-align:center;">
        ${isCod
          ? `Please keep <strong>${money(order.total)}</strong> ready for payment on delivery.`
          : `Your payment is confirmed. We'll email you again once your order ships.`}
      </div>`,
  });
}

export function buildAdminEmailHtml(order: Record<string, any>) {
  return shell({
    heading: 'New order received',
    sub: `${esc(order.customer_name)} · ${money(order.total)}`,
    order,
    body: orderDetailsBody(order, { showCustomerContact: true }),
  });
}

export async function sendOrderEmails(order: Record<string, any>) {
  const resendKey = Deno.env.get('RESEND_API_KEY');
  const adminEmail = Deno.env.get('ADMIN_ALERT_EMAIL');
  const fromEmail = Deno.env.get('EMAIL_FROM') || 'Saabi Designes <onboarding@resend.dev>';

  if (!resendKey) {
    console.log('RESEND_API_KEY not set — skipping order emails');
    return;
  }

  const send = async (to: string, subject: string, html: string) => {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: fromEmail, to, subject, html }),
      });
      if (!res.ok) console.error('Resend error:', await res.text());
    } catch (e) {
      console.error('Email send failed:', e);
    }
  };

  const tasks: Promise<void>[] = [];

  if (order.email) {
    tasks.push(send(
      order.email,
      `Order Confirmed — #${order.id} · Saabi Designes`,
      buildCustomerEmailHtml(order)
    ));
  }

  if (adminEmail) {
    tasks.push(send(
      adminEmail,
      `New Order #${order.id} — ${money(order.total)}`,
      buildAdminEmailHtml(order)
    ));
  }

  await Promise.all(tasks);
}
