import { corsHeaders } from '../_shared/cors.ts';
import { hmacSha256Hex } from '../_shared/hmac.ts';
import { completeOrderForPayment } from '../_shared/completeOrder.ts';

// Called by the client immediately after Razorpay's checkout success
// callback fires. Verifies the payment signature ourselves (never trust the
// client blindly) before creating the order. The webhook function serves as
// a backup in case this call never happens (tab closed, network drop, etc).
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = await req.json();

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return new Response(JSON.stringify({ error: 'Missing payment verification fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET')!;
    const expectedSignature = await hmacSha256Hex(keySecret, `${razorpayOrderId}|${razorpayPaymentId}`);

    if (expectedSignature !== razorpaySignature) {
      console.error('Razorpay signature mismatch for order', razorpayOrderId);
      return new Response(JSON.stringify({ error: 'Payment verification failed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const order = await completeOrderForPayment(razorpayOrderId);

    return new Response(JSON.stringify({ order }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('verify-razorpay-payment error:', e);
    return new Response(JSON.stringify({ error: e.message || 'Unexpected error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
