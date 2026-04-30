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
        const formData = await req.formData()
        const data: Record<string, any> = {}

        for (const [key, value] of formData.entries()) {
            data[key] = value
        }

        const hmac = data['hmac']
        const orderId = data['reference_number']

        if (!hmac || !orderId) {
            throw new Error('Invalid webhook payload')
        }

        // In a production app, you MUST verify the HMAC signature here using the hitpay_salt
        // For this sandbox implementation, we will proceed to update the order if the status is completed.

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        if (data['status'] === 'completed') {
            const { error } = await supabaseAdmin
                .from('orders')
                .update({ status: 'processing', payment_status: 'paid' })
                .eq('id', orderId)

            if (error) {
                console.error('Failed to update order status:', error)
                throw new Error('Database update failed')
            }

            console.log(`Successfully updated order ${orderId} (HitPay) to Paid`)
        }

        return new Response(JSON.stringify({ received: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    } catch (error) {
        console.error('HitPay Webhook Error:', error.message)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
