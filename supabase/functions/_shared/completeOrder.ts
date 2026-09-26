import { supabaseAdmin } from './supabaseAdmin.ts';
import { sendOrderEmails } from './email.ts';

// Idempotent: safe to call twice for the same razorpay_order_id (once from
// the client right after payment, once from Razorpay's webhook) — only the
// first call actually creates the order and sends emails.
export async function completeOrderForPayment(razorpayOrderId: string) {
  const { data: pending, error: findErr } = await supabaseAdmin
    .from('pending_payments')
    .select('*')
    .eq('razorpay_order_id', razorpayOrderId)
    .single();

  if (findErr || !pending) {
    throw new Error(`No pending payment found for razorpay_order_id ${razorpayOrderId}`);
  }

  if (pending.status === 'paid' && pending.order_id) {
    // Already processed by the other path (client or webhook) — return the
    // existing order instead of creating a duplicate.
    const { data: existing } = await supabaseAdmin.from('orders').select('*').eq('id', pending.order_id).single();
    return existing;
  }

  const { data: order, error: insertErr } = await supabaseAdmin
    .from('orders')
    .insert({
      user_id: pending.user_id,
      customer_name: pending.customer_name,
      phone: pending.phone,
      email: pending.email,
      address: pending.address,
      city: pending.city,
      zip: pending.zip,
      items: pending.items,
      subtotal: pending.subtotal,
      shipping: pending.shipping,
      total: pending.total,
      payment_method: 'phonepe',
      payment_status: 'paid',
      status: 'Pending',
    })
    .select()
    .single();

  if (insertErr) throw insertErr;

  await supabaseAdmin
    .from('pending_payments')
    .update({ status: 'paid', order_id: order.id })
    .eq('id', pending.id);

  sendOrderEmails(order).catch((e) => console.error('sendOrderEmails failed:', e));

  return order;
}
