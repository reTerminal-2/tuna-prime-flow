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

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { data: settings, error: settingsError } = await supabaseAdmin
            .from('seller_payment_settings')
            .select('hitpay_api_key, hitpay_salt, hitpay_is_active')
            .eq('user_id', seller_id)
            .single()

        if (settingsError || !settings) {
            throw new Error('HitPay settings not found for this seller')
        }

        if (!settings.hitpay_is_active || !settings.hitpay_api_key) {
            throw new Error('Seller has not activated HitPay sandbox')
        }

        const total_amount = items.reduce((sum: number, item: any) => sum + (item.selling_price * item.quantity), 0);

        // Call HitPay Sandbox API
        const hitpayReq = await fetch('https://api.sandbox.hit-pay.com/v1/payment-requests', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-BUSINESS-API-KEY': settings.hitpay_api_key,
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: new URLSearchParams({
                amount: total_amount.toFixed(2),
                currency: 'PHP',
                reference_number: order_id,
                redirect_url: success_url,
                webhook: `${Deno.env.get('SUPABASE_URL')}/functions/v1/hitpay-webhook`,
                'payment_methods[]': 'gcash', // We can add more here like 'qrph_netbank' for Maya
                // The HitPay API allows multiple payment methods
                'payment_methods[1]': 'qrph_netbank',
                'payment_methods[2]': 'card_cybersource'
            })
        })

        const hitpayRes = await hitpayReq.json()

        if (!hitpayReq.ok) {
            console.error('HitPay API Error:', hitpayRes)
            throw new Error(hitpayRes.message || 'Failed to create HitPay payment request')
        }

        return new Response(
            JSON.stringify({ url: hitpayRes.url }),
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
