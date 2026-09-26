import { corsHeaders } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json();
    const {
      userId, customerName, phone, email, address, city, zip,
      items, subtotal, shipping, total,
    } = body;

    if (!customerName || !phone || !address || !city || !items?.length || !total) {
      return new Response(JSON.stringify({ error: 'Missing required checkout fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const keyId = Deno.env.get('RAZORPAY_KEY_ID')!;
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET')!;
    const auth = btoa(`${keyId}:${keySecret}`);

    // Razorpay amounts are in paise (smallest currency unit).
    const amountPaise = Math.round(Number(total) * 100);

    const rpRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: amountPaise,
        currency: 'INR',
        receipt: `saabi_${Date.now()}`,
      }),
    });

    if (!rpRes.ok) {
      const errText = await rpRes.text();
      console.error('Razorpay order creation failed:', errText);
      return new Response(JSON.stringify({ error: 'Could not create payment order' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rpOrder = await rpRes.json();

    const { error: insertErr } = await supabaseAdmin.from('pending_payments').insert({
      user_id: userId || null,
      customer_name: customerName,
      phone,
      email: email || '',
      address,
      city,
      zip: zip || '',
      items,
      subtotal,
      shipping,
      total,
      razorpay_order_id: rpOrder.id,
      status: 'created',
    });

    if (insertErr) throw insertErr;

    return new Response(JSON.stringify({
      razorpayOrderId: rpOrder.id,
      keyId,
      amount: amountPaise,
      currency: 'INR',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('create-razorpay-order error:', e);
    return new Response(JSON.stringify({ error: e.message || 'Unexpected error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
