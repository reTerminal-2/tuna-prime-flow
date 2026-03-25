import { supabase } from "@/integrations/supabase/client";

export interface ChatResponse {
    message: string;
    proposedAction?: {
        type: 'UPDATE_PRICE' | 'RESTOCK_ITEM' | 'GENERAL_ADVICE';
        payload: any;
        description: string;
    };
}

export interface AIInsight {
    type: 'success' | 'warning' | 'danger' | 'info';
    title: string;
    message: string;
    action?: string;
    details?: any;
}

export interface CustomerSegment {
    customerId: string;
    segment: 'VIP' | 'Loyal' | 'At Risk' | 'New';
    actionableTip: string;
}

export interface SupplierScore {
    supplierId: string;
    score: number;
    grade: 'Gold' | 'Silver' | 'Bronze';
    reliability: number;
    quality: number;
    speed: number;
}

export interface OrderRisk {
    orderId: string;
    riskLevel: 'Low' | 'Medium' | 'High';
    reasons: string[];
    priorityScore: number;
}

export const aiService = {

    // =====================================================================
    // LEARNING SYSTEM
    // =====================================================================

    submitFeedback: async (messageId: string, vote: 1 | -1, userQuestion: string, aiResponse: string) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            await supabase.from('chat_history').update({ feedback: vote }).eq('id', messageId);
            if (vote === 1) {
                await supabase.from('learned_patterns').upsert({
                    user_question: userQuestion.slice(0, 1000),
                    ai_response: aiResponse.slice(0, 2000),
                    upvotes: 1,
                    category: 'business'
                }, { onConflict: 'user_question' });
            }
        } catch (e) { console.error('[TunaBrain] Feedback failed:', e); }
    },

    getLearnedPatterns: async (limit = 3): Promise<any[]> => {
        const { data } = await supabase.from('learned_patterns')
            .select('user_question, ai_response')
            .order('upvotes', { ascending: false })
            .limit(limit);
        return data || [];
    },

    // =====================================================================
    // CORE INTELLIGENCE (Gemini API)
    // =====================================================================

    chatWithAI: async (message: string, context: { products: any[], orders: any[], customers: any[] }): Promise<ChatResponse> => {
        
        // Retrieve Gemini API Key from SuperAdmin config or fallback
        let GEMINI_API_KEY = localStorage.getItem("gemini_api_key");
        if (!GEMINI_API_KEY) {
            const { data } = await supabase.from('system_configs' as any).select('config_value').eq('config_key', 'gemini_api_key').single();
            GEMINI_API_KEY = data?.config_value || 'YOUR_GEMINI_API_KEY_HERE';
        }

        if (GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
            return { message: "⚠️ Gemini API key is missing. Please configure it in the SuperAdmin dashboard or database (`system_configs` -> `gemini_api_key`)." };
        }

        const totalValue = context.products?.reduce((acc, p) => acc + ((p.current_stock || 0) * (p.selling_price || 0)), 0) || 0;
        const lowStock = context.products?.filter(p => (p.current_stock || 0) < 10).length || 0;
        const learned = await aiService.getLearnedPatterns(2);
        const examples = learned.map(l => `User: ${l.user_question}\nTunaBrain: ${l.ai_response}`).join('\n\n');

        const systemPrompt = `
IDENTITY: You are TunaBrain (powered by Gemini), the AI manager for TunaFlow.
ROLE: Business Analyst & Operations Expert.
TONE: Professional, insightful, direct.

CURRENT METRICS:
- Total Inventory Value: ₱${totalValue.toLocaleString()}
- Low Stock Items: ${lowStock}
- Recent Sales: ${JSON.stringify(context.orders?.slice(0, 3))}

GUIDELINES:
- Provide clear, actionable advice.
- Use readable Markdown with bolded keywords and lists.
- If suggesting a systemic action like updating a price or restocking, output ONLY a JSON object formatted precisely like this at the very end of your response, after your normal text:
{"proposedAction": {"type": "UPDATE_PRICE", "payload": {"productId": "ID", "newPrice": 100}, "description": "Update product price to 100"}}

${examples ? `LEARNED PAST EXAMPLES:\n${examples}` : ''}
`;

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    system_instruction: { parts: [{ text: systemPrompt }] },
                    contents: [{ role: 'user', parts: [{ text: message }] }],
                    generationConfig: { temperature: 0.7 }
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Gemini API Error: ${response.status} - ${errText}`);
            }

            const data = await response.json();
            const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!content) throw new Error("Empty response from Gemini");

            // Look for proposed action JSON in the response
            let finalMessage = content;
            let actionObj = undefined;

            const jsonMatch = content.match(/\{[\s\S]*"proposedAction"[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    const parsed = JSON.parse(jsonMatch[0]);
                    if (parsed.proposedAction) {
                        actionObj = parsed.proposedAction;
                        // Strip the JSON from the user-facing message
                        finalMessage = content.replace(jsonMatch[0], '').trim();
                    }
                } catch (e) { /* ignore parse error */ }
            }

            return { message: finalMessage || content, proposedAction: actionObj };

        } catch (error: any) {
            console.error('[TunaBrain] Gemini Failure:', error.message);
            return { message: `🔌 Connection fluctuation. Error: ${error.message}. Please retry.` };
        }
    },

    // =====================================================================
    // BACKGROUND ANALYTICS
    // =====================================================================

    generateBusinessHealthScore: async (inventory: any[], orders: any[]) => {
        const prompt = `Calculate business health. Context: ${inventory.length} products, ${orders.length} orders. Reply ONLY with valid JSON: {"score": 85, "status": "Strong", "breakdown": "Details"}`;
        const res = await aiService.chatWithAI(prompt, { products: inventory, orders, customers: [] });
        try { return JSON.parse(res.message.match(/\{[\s\S]*\}/)?.[0] || '{"score": 75, "status": "Stable"}'); } catch { return { score: 75, status: 'Stable' }; }
    },

    getDailyActionPlan: async (context: any) => {
        const res = await aiService.chatWithAI("List 4 concise daily tasks for the manager as a clean JSON array of strings ONLY. No markdown wrapper.", { products: [], orders: [], customers: [] });
        try { return JSON.parse(res.message.match(/\[[\s\S]*\]/)?.[0] || '[]'); } catch { return ["Review stock levels", "Check new messages", "Process pending orders"]; }
    },

    testConnection: async () => {
        let GEMINI_API_KEY = localStorage.getItem("gemini_api_key");
        if (!GEMINI_API_KEY) {
            const { data } = await supabase.from('system_configs' as any).select('config_value').eq('config_key', 'gemini_api_key').single();
            GEMINI_API_KEY = data?.config_value;
        }

        if (!GEMINI_API_KEY) return { success: false, message: "❌ Gemini API Key not configured" };

        try {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'ping' }] }] }) 
            });
            return res.ok ? { success: true, message: "✅ Gemini API Online" } : { success: false, message: "❌ API Offline/Key Invalid" };
        } catch { return { success: false, message: "❌ Network Error" }; }
    },

    executeAction: async (action: any) => {
        if (action?.type === 'UPDATE_PRICE') {
            await supabase.from('products').update({ selling_price: action.payload.newPrice }).eq('id', action.payload.productId);
            return { success: true };
        }
        return { success: true };
    }
};

export default aiService;
