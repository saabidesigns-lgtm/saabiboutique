import { corsHeaders } from '../_shared/cors.ts';
import { hmacSha256Hex } from '../_shared/hmac.ts';
import { completeOrderForPayment } from '../_shared/completeOrder.ts';

// Razorpay's server-to-server confirmation. Backs up verify-razorpay-payment
// in case the customer's browser never calls it (closed tab, crash, network
// drop right after paying) — completeOrderForPayment is idempotent, so it's
// safe for both paths to fire for the same payment.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature') || '';
    const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET')!;

    const expectedSignature = await hmacSha256Hex(webhookSecret, rawBody);
    if (expectedSignature !== signature) {
      console.error('Razorpay webhook signature mismatch');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const event = JSON.parse(rawBody);

    if (event.event === 'payment.captured' || event.event === 'order.paid') {
      const orderId = event.payload?.payment?.entity?.order_id
        || event.payload?.order?.entity?.id;
      if (orderId) {
        await completeOrderForPayment(orderId);
      }
    }
    // Any other event type: acknowledge without action, so Razorpay doesn't retry.

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('razorpay-webhook error:', e);
    // Still return 200 if we already validated the signature but processing
    // failed downstream — otherwise Razorpay will hammer retries. Log and
    // move on; the order can be reconciled manually via pending_payments.
    return new Response(JSON.stringify({ received: true, note: 'processed with errors' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
