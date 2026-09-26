import { corsHeaders } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { sendOrderEmails } from '../_shared/email.ts';

// Cash-on-Delivery orders need no payment verification, but still go
// through the service role here — same as the Razorpay path — so client
// requests never insert into public.orders directly.
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

    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .insert({
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
        payment_method: 'cod',
        payment_status: 'cod_pending',
        status: 'Pending',
      })
      .select()
      .single();

    if (error) throw error;

    sendOrderEmails(order).catch((e) => console.error('sendOrderEmails failed:', e));

    return new Response(JSON.stringify({ order }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('create-cod-order error:', e);
    return new Response(JSON.stringify({ error: e.message || 'Unexpected error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
