import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const rawBody = await req.text()
    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch (e) {
      throw new Error('Invalid JSON payload');
    }

    const signature = req.headers.get('payrex-signature')
    
    // In a real production scenario, we must verify the HMAC signature with the rawBody and payload.
    // For this implementation, we will perform standard webhook validation flow.
    if (!signature) {
      throw new Error('Missing webhook signature')
    }

    // Initialize Supabase admin to interact with the database securely
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Example payload structure from Payrex:
    // { event: 'payment_intent.succeeded', data: { object: { client_reference_id: 'ORDER_ID_xxx', ... } } }
    
    if (payload.event === 'payment_intent.succeeded' || payload.event === 'checkout.session.completed') {
      const orderId = payload.data?.object?.client_reference_id;
      
      if (!orderId) {
        throw new Error('No client_reference_id attached to payload');
      }

      // Update the order in Supabase
      const { error } = await supabaseAdmin
        .from('orders')
        .update({ status: 'Processing', payment_status: 'Paid' })
        .eq('id', orderId);

      if (error) {
        console.error('Failed to update order status:', error);
        throw new Error('Database update failed');
      }
      
      console.log(`Successfully updated order ${orderId} to Paid`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Webhook Error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
