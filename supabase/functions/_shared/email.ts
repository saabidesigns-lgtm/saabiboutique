// Sends order-confirmation emails via Resend. If RESEND_API_KEY isn't set
// yet, this quietly no-ops so the payment/order flow keeps working while
// email is still being set up.
export async function sendOrderEmails(order: Record<string, any>) {
  const resendKey = Deno.env.get('RESEND_API_KEY');
  const adminEmail = Deno.env.get('ADMIN_ALERT_EMAIL');
  const fromEmail = Deno.env.get('EMAIL_FROM') || 'Saabi Designes <onboarding@resend.dev>';

  if (!resendKey) {
    console.log('RESEND_API_KEY not set — skipping order emails');
    return;
  }

  const itemsHtml = (order.items || [])
    .map((i: any) => `<li>${i.name}${i.size ? ` (Size: ${i.size})` : ''} × ${i.qty} — ₹${i.price}</li>`)
    .join('');

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
      `Order Confirmed — #${order.id}`,
      `<h2>Thanks for your order, ${order.customer_name}!</h2>
       <p>Order #${order.id} — ₹${order.total}</p>
       <ul>${itemsHtml}</ul>
       <p>We'll notify you when it ships.</p>`
    ));
  }

  if (adminEmail) {
    tasks.push(send(
      adminEmail,
      `New Order #${order.id} — ₹${order.total}`,
      `<h2>New order received — #${order.id}</h2>
       <p>${order.customer_name} · ${order.phone}${order.email ? ` · ${order.email}` : ''}</p>
       <p>${order.address}, ${order.city} ${order.zip}</p>
       <ul>${itemsHtml}</ul>
       <p>Total: ₹${order.total} (${order.payment_method})</p>`
    ));
  }

  await Promise.all(tasks);
}
