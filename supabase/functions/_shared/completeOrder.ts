import { supabaseAdmin } from './supabaseAdmin.ts';
import { sendOrderEmails } from './email.ts';

// Idempotent: safe to call concurrently for the same razorpay_order_id
// (the client's verify call and Razorpay's webhook both call this for the
// same payment, often within milliseconds of each other). The uniqueness
// of orders.razorpay_order_id — not a read-then-write check — is what
// actually prevents duplicates: whichever insert loses the race gets a
// conflict error and just fetches the row the winner created.
export async function completeOrderForPayment(razorpayOrderId: string) {
  const { data: pending, error: findErr } = await supabaseAdmin
    .from('pending_payments')
    .select('*')
    .eq('razorpay_order_id', razorpayOrderId)
    .single();

  if (findErr || !pending) {
    throw new Error(`No pending payment found for razorpay_order_id ${razorpayOrderId}`);
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
      razorpay_order_id: razorpayOrderId,
    })
    .select()
    .single();

  if (insertErr) {
    if (insertErr.code === '23505') {
      // Lost the race — the other caller already created this order.
      const { data: existing, error: fetchErr } = await supabaseAdmin
        .from('orders')
        .select('*')
        .eq('razorpay_order_id', razorpayOrderId)
        .single();
      if (fetchErr) throw fetchErr;
      return existing;
    }
    throw insertErr;
  }

  await supabaseAdmin
    .from('pending_payments')
    .update({ status: 'paid', order_id: order.id })
    .eq('id', pending.id);

  sendOrderEmails(order).catch((e) => console.error('sendOrderEmails failed:', e));

  return order;
}
