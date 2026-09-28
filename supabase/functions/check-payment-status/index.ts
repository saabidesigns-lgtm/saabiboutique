import { corsHeaders } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';

// Lets the client double-check a payment's real status before giving up.
// Needed because Razorpay's UPI flow can report payment.failed on the
// client (e.g. the widget timing out waiting for the UPI app/bank) even
// though the payment actually completes a moment later and the webhook
// records it as paid. Returns minimal info — just enough to show the
// success screen if it turns out the payment did go through.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { razorpayOrderId } = await req.json();
    if (!razorpayOrderId) {
      return new Response(JSON.stringify({ error: 'razorpayOrderId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: pending, error } = await supabaseAdmin
      .from('pending_payments')
      .select('status, order_id')
      .eq('razorpay_order_id', razorpayOrderId)
      .single();

    if (error || !pending) {
      return new Response(JSON.stringify({ status: 'unknown' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ status: pending.status, orderId: pending.order_id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('check-payment-status error:', e);
    return new Response(JSON.stringify({ error: e.message || 'Unexpected error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
