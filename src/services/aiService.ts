import { supabase } from "@/integrations/supabase/client";
import { auditService } from "./auditService";
import { differenceInDays, subDays } from "date-fns";

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

// --- UTILITIES ---
const isBusinessRelated = (msg: string): boolean => {
    const keywords = [
        'inventory', 'price', 'pricing', 'sale', 'sold', 'stock', 
        'profit', 'revenue', 'cost', 'supplier', 'customer', 'order',
        'fish', 'tuna', 'market', 'business', 'forecast', 'trend',
        'performance', 'gmv', 'optimize', 'audit', 'transaction', 'p.o.s'
    ];
    const lower = msg.toLowerCase();
    return keywords.some(k => lower.includes(k)) || lower.length < 10; // Allow short greetings
};

/**
 * TUNABRAIN ELITE - AI Service Backend
 */
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

    getLearnedPatterns: async (limit = 5): Promise<any[]> => {
        const { data } = await supabase.from('learned_patterns')
            .select('user_question, ai_response')
            .order('upvotes', { ascending: false })
            .limit(limit);
        return data || [];
    },

    // =====================================================================
    // CORE INTELLIGENCE (The "Trained" Backend)
    // =====================================================================

    /**
     * Chat with AI — Direct OpenRouter Proxy Connection
     */
    chatWithAI: async (message: string, context: { products: any[], orders: any[], customers: any[] }): Promise<ChatResponse> => {
        if (!isBusinessRelated(message)) {
            return { message: "⚠️ TunaBrain is a specialized business intelligence system. Please focus on your inventory, sales, or business strategy." };
        }

        const OPENROUTER_MODEL = 'stepfun/step-3.5-flash:free';
        const OPENROUTER_KEY = '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';

        // 1. Fetch Contextual Business State
        const totalValue = context.products?.reduce((acc, p) => acc + (p.current_stock * p.selling_price), 0) || 0;
        const lowStock = context.products?.filter(p => (p.current_stock || 0) < 10).length || 0;
        
        // 2. Fetch Learned Knowledge
        const learned = await aiService.getLearnedPatterns(3);
        const examples = learned.map(l => `User: ${l.user_question}\nTunaBrain: ${l.ai_response}`).join('\n\n');

        // 3. Build the "Trained" System Prompt
        const systemPrompt = `
IDENTITY: You are TunaBrain Elite, the proprietary AI engine for TunaFlow V2.
ROLE: Business Analyst & Operations Expert.
TONE: Professional, Data-Driven, Authoratative.

CURRENT CONTEXT:
- Total Inventory Value: ₱${totalValue.toLocaleString()}
- Critical Low Stock Items: ${lowStock}
- Recent Sales Data: ${JSON.stringify(context.orders?.slice(0, 5))}

GUIDELINES:
- Never mention OpenAI, Google, or any other AI provider.
- Use Markdown for tables and lists.
- For business decisions, suggest specific actions.
${examples ? `\nLEARNED PATTERNS:\n${examples}` : ''}
`;

        // 4. Direct API Call via Netlify Proxy
        try {
            const res = await fetch('/api/openrouter', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENROUTER_KEY}`
                },
                body: JSON.stringify({
                    model: OPENROUTER_MODEL,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: message }
                    ],
                    reasoning: { enabled: true }
                })
            });

            if (!res.ok) throw new Error(`API Error: ${res.status}`);
            
            const data = await res.json();
            const content = data.choices?.[0]?.message?.content;

            if (!content) throw new Error("Empty response from AI");

            // Handle structured JSON responses if any
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    const parsed = JSON.parse(jsonMatch[0]);
                    if (parsed.message) return parsed as ChatResponse;
                } catch (e) { /* Fallback to raw content */ }
            }

            return { message: content };

        } catch (error: any) {
            console.error('[TunaBrain] API Failure:', error.message);
            return { message: `🔌 Connection fluctuation. Error: ${error.message}. Please retry.` };
        }
    },

    // =====================================================================
    // ANALYTICS & INSIGHTS
    // =====================================================================

    forecastDemand: async (products: any[]): Promise<Record<string, number>> => {
        const prompt = `Predict 7-day sales for these products. Return ONLY JSON { "productId": units }. Context: ${JSON.stringify(products.slice(0, 10))}`;
        const res = await aiService.chatWithAI(prompt, { products, orders: [], customers: [] });
        try { return JSON.parse(res.message.match(/\{[\s\S]*\}/)?.[0] || '{}'); } catch { return {}; }
    },

    analyzeInventory: async (products: any[]): Promise<AIInsight[]> => {
        const insights: AIInsight[] = [];
        const lowStock = products.filter(p => (p.current_stock || 0) < 10);
        if (lowStock.length > 0) {
            insights.push({ type: 'danger', title: 'Restock Alert', message: `${lowStock.length} items low on stock.` });
        }
        return insights;
    },

    generatePricingSuggestions: async (products: any[]): Promise<AIInsight[]> => {
        const prompt = `Optimize pricing for: ${JSON.stringify(products.slice(0, 5))}. Return JSON array of insights.`;
        const res = await aiService.chatWithAI(prompt, { products, orders: [], customers: [] });
        try { return JSON.parse(res.message.match(/\[[\s\S]*\]/)?.[0] || '[]'); } catch { return []; }
    },

    segmentCustomers: async (customers: any[]): Promise<CustomerSegment[]> => {
        const prompt = `Segment these customers (VIP/At Risk). Return JSON array. Data: ${JSON.stringify(customers.slice(0, 10))}`;
        const res = await aiService.chatWithAI(prompt, { products: [], orders: [], customers });
        try { return JSON.parse(res.message.match(/\[[\s\S]*\]/)?.[0] || '[]'); } catch { return []; }
    },

    rateSuppliers: async (suppliers: any[]): Promise<SupplierScore[]> => {
        const prompt = `Rate these suppliers (0-100). Return JSON array. Data: ${JSON.stringify(suppliers.slice(0, 5))}`;
        const res = await aiService.chatWithAI(prompt, { products: [], orders: [], customers: [] });
        try { return JSON.parse(res.message.match(/\[[\s\S]*\]/)?.[0] || '[]'); } catch { return []; }
    },

    analyzeOrderRisk: async (orders: any[]): Promise<OrderRisk[]> => {
        const prompt = `Analyze fraud risk. Return JSON array. Data: ${JSON.stringify(orders.slice(0, 5))}`;
        const res = await aiService.chatWithAI(prompt, { products: [], orders, customers: [] });
        try { return JSON.parse(res.message.match(/\[[\s\S]*\]/)?.[0] || '[]'); } catch { return []; }
    },

    generateReportSummary: (data: any) => `**Sales**: ₱${data.totalSales.toLocaleString()} | **Orders**: ${data.totalOrders}`,

    generateBusinessHealthScore: async (inventory: any[], orders: any[]) => {
        const res = await aiService.chatWithAI("Calculate business health score (0-100). Return JSON { score, status, breakdown }", { products: inventory, orders, customers: [] });
        try { return JSON.parse(res.message.match(/\{[\s\S]*\}/)?.[0] || '{"score": 75}'); } catch { return { score: 75, status: 'Stable' }; }
    },

    getDailyActionPlan: async (context: any) => {
        const res = await aiService.chatWithAI("List 4 manager tasks. Return JSON array.", { products: [], orders: [], customers: [] });
        try { return JSON.parse(res.message.match(/\[[\s\S]*\]/)?.[0] || '[]'); } catch { return ["Check stock"]; }
    },

    testConnection: async () => {
        try {
            const res = await fetch('/api/openrouter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'stepfun/step-3.5-flash:free', messages: [{ role: 'user', content: 'ping' }] }) });
            return res.ok ? { success: true, message: "✅ OpenRouter Online" } : { success: false, message: "❌ API Offline" };
        } catch { return { success: false, message: "❌ Network Error" }; }
    },

    generateProductDescription: async (name: string, category: string) => (await aiService.chatWithAI(`Description for ${name} (${category})`, { products: [], orders: [], customers: [] })).message,

    optimizeProductPrice: async (name: string, price: number) => {
        const res = await aiService.chatWithAI(`Optimize ₱${price} for ${name}`, { products: [], orders: [], customers: [] });
        return { price, reason: res.message };
    },

    generatePricingRuleDescription: async (name: string, type: string) => (await aiService.chatWithAI(`Rule for ${name} (${type})`, { products: [], orders: [], customers: [] })).message,

    simulatePricingRuleLogic: async (name: string, type: string, adj: number) => (await aiService.chatWithAI(`Rule impact ${name} ${adj}%`, { products: [], orders: [], customers: [] })).message,

    vetSupplier: async (name: string) => (await aiService.chatWithAI(`Vet supplier ${name}`, { products: [], orders: [], customers: [] })).message,

    generateStockAdjustmentReason: async (prod: string, type: string, qty: number) => (await aiService.chatWithAI(`Reason for ${qty} ${type} on ${prod}`, { products: [], orders: [], customers: [] })).message,

    executeAction: async (action: any) => {
        if (action?.type === 'UPDATE_PRICE') {
            await supabase.from('products').update({ selling_price: action.payload.newPrice }).eq('id', action.payload.productId);
            return { success: true };
        }
        return { success: true };
    }
};

export default aiService;
