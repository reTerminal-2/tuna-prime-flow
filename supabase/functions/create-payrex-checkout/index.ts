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
    const { seller_id, order_id, items, success_url, cancel_url } = await req.json()

    if (!seller_id || !order_id || !items || !items.length) {
      throw new Error('Missing required parameters')
    }

    // Initialize Supabase client with admin privileges to safely get the secret key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Fetch the seller's Payrex credentials
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('seller_payment_settings')
      .select('payrex_secret_key, is_active')
      .eq('user_id', seller_id)
      .single()

    if (settingsError || !settings) {
      throw new Error('Payment settings not found for this seller')
    }

    if (!settings.is_active || !settings.payrex_secret_key) {
      throw new Error('Seller has not fully configured or activated the payment gateway')
    }

    // Prepare line items for Payrex
    const line_items = items.map((item: any) => ({
      name: item.name,
      // Handle both 'price' (generic) and 'selling_price' (from our specific cart schema)
      amount: Math.round((item.selling_price || item.price || 0) * 100), 
      currency: 'PHP',
      quantity: item.quantity,
    }))


    // Call Payrex API
    const payrexReq = await fetch('https://api.payrex.com.ph/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(settings.payrex_secret_key + ':')}` // Basic auth is common for Payrex
      },
      body: JSON.stringify({
        success_url,
        cancel_url,
        payment_method_types: ['card', 'paymaya', 'gcash', 'grab_pay'],
        line_items,
        client_reference_id: order_id,
      })
    })

    const payrexRes = await payrexReq.json()

    if (!payrexReq.ok) {
      console.error('Payrex API Error:', payrexRes)
      throw new Error(payrexRes.message || 'Failed to create payment session with gateway')
    }

    // Return the checkout URL to the frontend
    return new Response(
      JSON.stringify({ url: payrexRes.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('Checkout Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
    )
  }
})
