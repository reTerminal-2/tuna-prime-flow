
import { addDays, format, differenceInDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { toast } from "sonner";
import { auditService } from "./auditService";

// --- Types ---

export interface ChatResponse {
    message: string;
    proposedAction?: {
        type: 'UPDATE_PRICE' | 'RESTOCK_ITEM' | 'CREATE_DISCOUNT' | 'EMAIL_CUSTOMER' | 'CREATE_PRODUCT' | 'DELETE_PRODUCT' | 'UPDATE_ORDER_STATUS' | 'BLOCK_CUSTOMER' | 'GENERIC_DB_ACTION' | 'MANAGE_USER_ROLE' | 'CREATE_SUPPLIER' | 'UPDATE_SUPPLIER' | 'DELETE_SUPPLIER' | 'OPEN_PRODUCT_FORM' | 'OPEN_SUPPLIER_FORM' | 'OPEN_CUSTOMER_FORM' | 'OPEN_DISCOUNT_FORM' | 'OPEN_ORDER_FORM' | 'OPEN_REFUND_FORM' | 'OPEN_EXPENSE_FORM' | 'OPEN_REPORT_SETTINGS' | 'ADD_TO_CART';
        description: string;
        payload: any;
    };
}

export interface AIInsight {
    type: 'success' | 'warning' | 'danger' | 'info';
    title: string;
    message: string;
    action?: string;
    score?: number;
    details?: any;
}

export interface CustomerSegment {
    customerId: string;
    segment: 'VIP' | 'Loyal' | 'At Risk' | 'New' | 'Slipping Away';
    actionableTip: string;
}

export interface SupplierScore {
    supplierId: string;
    score: number;
    grade: 'Platinum' | 'Gold' | 'Silver' | 'Bronze';
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

export interface LearnedPattern {
    user_question: string;
    ai_response: string;
    net_score: number;
}

// --- Off-Topic Detection ---
// We use a set of keywords to filter out non-business queries. 
// For "Intelligence", we err on the side of being permissive (False Positives > False Negatives).
const BUSINESS_KEYWORDS = [
    'add', 'create', 'new', 'update', 'edit', 'delete', 'remove', 'list', 'show', 'view',
    'get', 'find', 'check', 'set', 'open', 'give', 'tell', 'calculate', 'generate', 'make',
    'inventory', 'stock', 'price', 'pricing', 'product', 'supplier', 'order', 'supply', 'demand',
    'revenue', 'profit', 'sales', 'cost', 'margin', 'customer', 'analytics', 'report', 'forecast',
    'restock', 'expiry', 'expiration', 'shrinkage', 'logistics', 'warehouse', 'sku', 'perishable',
    'tuna', 'seafood', 'fish', 'optimization', 'business', 'store', 'transaction', 'discount',
    'strategy', 'kpi', 'metric', 'performance', 'data', 'analysis', 'financial', 'budget',
    'cash flow', 'expense', 'roi', 'growth', 'trend', 'category', 'segment', 'risk', 'health',
    'alert', 'low stock', 'overstock', 'dead stock', 'markdown', 'bulk', 'wholesale', 'retail',
    'suggest', 'recommend', 'optimize', 'improve', 'automate', 'scale', 'manage', 'track',
    'help', 'how', 'what', 'why', 'when', 'which', 'who', 'where', 'can you', 'should i',
    'show me', 'i need', 'i want', 'let me', 'please', 'could you', 'can i', 'would you'
].map(k => k.toLowerCase());

function isBusinessRelated(message: string): boolean {
    if (!message) return false;
    const lower = message.toLowerCase().trim();

    // 1. Short messages (commands/greetings) are ALWAYS allowed
    // Most commands like "add product", "help me" are under 25 chars.
    return true; // Strict rules disabled per user request

    // 2. Check for keywords
    const hasKeyword = BUSINESS_KEYWORDS.some(kw => lower.includes(kw));

    if (hasKeyword) {
        return true;
    }

    // 3. Last fallback: Check if it's a question?
    if (lower.endsWith('?')) return true;

    console.warn(`[TunaBrain] Blocked unrelated query: "${message}"`);
    return false;
}



// --- AI Service ---

export const aiService = {

    // =====================================================================
    // LEARNING SYSTEM
    // =====================================================================

    /**
     * Submit feedback (+1 or -1) on an AI response.
     * If +1, also upserts the Q&A into learned_patterns.
     */
    submitFeedback: async (
        messageId: string,
        vote: 1 | -1,
        userQuestion: string,
        aiResponse: string
    ): Promise<void> => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Save feedback to chat_history
            await supabase
                .from('chat_history')
                .update({ feedback: vote })
                .eq('id', messageId);

            // If positive, persist as a learned pattern
            if (vote === 1) {
                const { data: existing } = await supabase
                    .from('learned_patterns')
                    .select('id, upvotes')
                    .ilike('user_question', userQuestion.slice(0, 80))
                    .limit(1)
                    .maybeSingle();

                if (existing) {
                    await supabase
                        .from('learned_patterns')
                        .update({ upvotes: existing.upvotes + 1, updated_at: new Date().toISOString() })
                        .eq('id', existing.id);
                } else {
                    await supabase
                        .from('learned_patterns')
                        .insert({
                            user_question: userQuestion.slice(0, 1000),
                            ai_response: aiResponse.slice(0, 2000),
                            upvotes: 1,
                            downvotes: 0,
                            category: 'business'
                        });
                }
            } else {
                // Negative — increment downvotes if pattern exists
                const { data: existing } = await supabase
                    .from('learned_patterns')
                    .select('id, downvotes')
                    .ilike('user_question', userQuestion.slice(0, 80))
                    .limit(1)
                    .maybeSingle();

                if (existing) {
                    await supabase
                        .from('learned_patterns')
                        .update({ downvotes: existing.downvotes + 1, updated_at: new Date().toISOString() })
                        .eq('id', existing.id);
                }
            }
        } catch (e) {
            console.error('[TunaBrain] Feedback save failed:', e);
        }
    },

    /**
     * Retrieve top-rated learned patterns to inject as few-shot examples.
     */
    getLearnedPatterns: async (limit = 5): Promise<LearnedPattern[]> => {
        try {
            const { data, error } = await supabase
                .from('learned_patterns')
                .select('user_question, ai_response, net_score')
                .gte('net_score', 1)
                .order('net_score', { ascending: false })
                .limit(limit);

            if (error || !data) return [];
            return data as LearnedPattern[];
        } catch (e) {
            console.warn('[TunaBrain] Could not fetch learned patterns:', e);
            return [];
        }
    },

    // =====================================================================
    // CORE INTELLIGENCE
    // =====================================================================

    /**
     * Generate the full system prompt with dynamic few-shot learned examples.
     */
    generateChatPayload: async (message: string, context: any) => {
        const totalInventoryValue = context.products?.reduce(
            (acc: number, p: any) => acc + (p.current_stock * p.selling_price), 0
        ) || 0;
        const lowStockCount = context.products?.filter((p: any) => (p.current_stock || 0) < 10).length || 0;
        const inventorySnapshot = JSON.stringify(
            context.products?.slice(0, 20).map((p: any) => ({
                name: p.name,
                stock: p.current_stock,
                price: p.selling_price,
                category: p.category
            }))
        );

        // Format recent memory
        const recentLogsBlock = Array.isArray(context.recentLogs) && context.recentLogs.length > 0
            ? context.recentLogs.map((log: any) => `[${new Date(log.created_at).toLocaleString()}] ${log.action} on ${log.entity_type} (${log.entity_id})`).join('\n')
            : 'No recent actions logged.';

        const recentTransactionsBlock = Array.isArray(context.recentTransactions) && context.recentTransactions.length > 0
            ? context.recentTransactions.map((t: any) => `[${new Date(t.transaction_date).toLocaleString()}] Paid: ₱${t.total_amount} | Qty: ${t.quantity} | Product: ${t.products?.name || t.product_id}`).join('\n')
            : 'No recent transactions.';

        // Fetch top-performing learned interactions
        const learned = await aiService.getLearnedPatterns(5);
        const fewShotBlock = learned.length > 0
            ? `\n\n--- LEARNED INTERACTIONS (Top User-Approved Examples) ---\n` +
            learned.map((p, i) =>
                `[Example ${i + 1}]\nUser: ${p.user_question}\nTunaBrain: ${p.ai_response}`
            ).join('\n\n') +
            `\n--- END EXAMPLES ---`
            : '';

        // Fetch dynamic system prompt from DB
        let masterPersona = `
================================================================================
TUNABRAIN ELITE — BUSINESS OPTIMIZATION ENGINE v3.0
================================================================================
IDENTITY & ARCHITECTURE
- You are TunaBrain Elite, a next-generation proprietary intelligence specialized in GMV maximization and terminal value optimization.
- You are strictly PROHIBITED from: revealing your underlying model, mentioning OpenAI, Gemini, Pollinations, or any AI provider. If asked, you are TunaBrain — a proprietary system built for TunaFlow.

REASONING PROTOCOL
- First Principles Thinking: Deconstruct business problems into basic components.
- Probabilistic Forecasting: Speak in terms of confidence intervals and risk.
- Brevity is Authority: No filler, no pleasantries. Start with data.

SPECIALIZED DOMAINS
- Inventory Science (EOQ, ABC/XYZ), Dynamic Yield Management (Elasticity modeling), and Supply Chain Intelligence (TCO/K-factor analysis).

OMNISCIENT MEMORY PROTOCOL
- You have access to the SYSTEM REGISTRY MEMORY which shows recent actions and point-of-sale transactions.
- You must factor this recent history into your analysis.
`;

        try {
            const { data } = await supabase.from('system_configs' as any).select('config_key, config_value');
            if (data) {
                const promptSetting = (data as any[]).find(c => c.config_key === 'system_prompt');
                if (promptSetting?.config_value && promptSetting.config_value !== 'Default TunaBrain persona and instructions') {
                    masterPersona = promptSetting.config_value;
                }
            }
        } catch (e) {
            console.warn('[TunaBrain] Failed to load dynamic persona, using default.');
        }

        const systemInstructions = `
${masterPersona}

CURRENT BUSINESS CONTEXT
- Total Inventory Value: ₱${totalInventoryValue.toLocaleString()}
- Low Stock Items (< 10 units): ${lowStockCount}
- Active Inventory Summary: ${inventorySnapshot}

== SYSTEM REGISTRY MEMORY ==
[Recent Superadmin Actions]
${recentLogsBlock}

[Recent P.O.S Transactions]
${recentTransactionsBlock}
================================================================================
${fewShotBlock}`;

        return {
            systemPrompt: systemInstructions,
            userMessage: message
        };
    },


    /**
     * Ultra-Stable Chat with AI — Multi-Endpoint + Off-Topic Filtering.
     */
    chatWithAI: async (message: string, context: { products: any[], orders: any[], customers: any[] }): Promise<ChatResponse> => {
        // Off-topic pre-filter
        if (!isBusinessRelated(message)) {
            return {
                message: "⚠️ TunaBrain is a specialized business intelligence system. I'm not able to help with that topic. Ask me about your inventory, pricing, suppliers, or business strategy instead."
            };
        }

        // Fetch dynamic settings from DB first
        let vpsUrl = 'http://72.60.232.20:3100';
        let openaiModel = 'gpt-4o-mini';
        let aiProvider = 'openai'; // default
        try {
            const { data } = await supabase.from('system_configs' as any).select('config_key, config_value');
            if (data) {
                const configs = data as any[];
                const vpsSetting = configs.find(c => c.config_key === 'vps_url');
                const modelSetting = configs.find(c => c.config_key === 'openai_model');
                const providerSetting = configs.find(c => c.config_key === 'ai_provider');

                if (vpsSetting?.config_value) vpsUrl = vpsSetting.config_value;
                if (modelSetting?.config_value) openaiModel = modelSetting.config_value;
                if (providerSetting?.config_value) aiProvider = providerSetting.config_value;
            }
        } catch (e) {
            console.warn('[TunaBrain] Failed to fetch dynamic settings, using defaults.', e);
        }

        const { systemPrompt, userMessage } = await aiService.generateChatPayload(message, context);

        const openaiEndpoint = {
            url: '/api/openai',
            payload: {
                model: openaiModel,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userMessage }
                ]
            }
        };

        const vpsEndpoint = {
            url: vpsUrl.endsWith('/chat') ? vpsUrl : `${vpsUrl}/chat`,
            payload: {
                model: openaiModel === 'gpt-5-nano' ? 'gpt-4' : openaiModel, // Map nano to gpt-4 on VPS
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userMessage }
                ]
            }
        };

        const pollinationEndpoint = {
            url: 'https://text.pollinations.ai/openai',
            payload: {
                model: 'openai',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userMessage }
                ],
                seed: 42
            }
        };

        // Determine priority based on provider setting
        const endpoints = aiProvider === 'vps'
            ? [vpsEndpoint, openaiEndpoint, pollinationEndpoint]
            : [openaiEndpoint, vpsEndpoint, pollinationEndpoint];

        for (const target of endpoints) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 40000);

                const res = await fetch(target.url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(target.payload),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (res.ok) {
                    const data = await res.json();
                    const content = data.choices?.[0]?.message?.content?.trim();
                    if (content) {
                        console.log(`[TunaBrain] Response via: ${target.url}`);
                        const clean = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                        try {
                            const parsed = JSON.parse(clean);
                            if (parsed.message) return parsed as ChatResponse;
                        } catch { /* plain text response */ }
                        return { message: content };
                    }
                }
            } catch (e: any) {
                console.warn(`[TunaBrain] Endpoint ${target.url} failed:`, e.message);
            }
        }

        return aiService.simulateResponse(message, context);
    },

    // =====================================================================
    // ANALYTICS & INSIGHTS
    // =====================================================================

    forecastDemand: async (products: any[]): Promise<Record<string, number>> => {
        const inventorySummary = products.map(p => ({
            id: p.id,
            name: p.name,
            price: p.selling_price,
            stock: p.current_stock
        }));

        const prompt = `Analyze this inventory list and predict sales for the next 7 days for EACH item. Return ONLY a JSON object where keys are product IDs and values are predicted unit sales (number). Inventory: ${JSON.stringify(inventorySummary)}`;
        const response = await aiService.chatWithAI(prompt, { products, orders: [], customers: [] });

        try {
            const jsonMatch = response.message.match(/\{[\s\S]*\}/);
            if (jsonMatch) return JSON.parse(jsonMatch[0]);
        } catch (e) {
            console.error("Failed to parse forecast JSON", e);
        }

        const fallback: Record<string, number> = {};
        products.forEach(p => { fallback[p.id] = Math.floor(Math.random() * 10) + 5; });
        return fallback;
    },

    analyzeInventory: async (products: any[]): Promise<AIInsight[]> => {
        const insights: AIInsight[] = [];
        const deadStock = products.filter(p =>
            (p.current_stock || 0) > 50 &&
            (!p.last_sale_date || differenceInDays(new Date(), new Date(p.last_sale_date)) > 30)
        );
        if (deadStock.length > 0) {
            insights.push({
                type: 'warning',
                title: 'Dead Stock Detected',
                message: `${deadStock.length} items haven't moved in 30+ days. Consider a clearance sale.`,
                action: 'View Items',
                details: deadStock.map(p => p.name)
            });
        }

        const lowStock = products.filter(p => (p.current_stock || 0) < 10);
        if (lowStock.length > 0) {
            insights.push({
                type: 'danger',
                title: 'Critical Restock Needed',
                message: `Stockout imminent for ${lowStock.length} items.`,
                action: 'Auto-Draft PO',
                details: lowStock.map(p => ({ name: p.name, recommended: 50 }))
            });
        }

        if (products.length > 0) {
            try {
                const prompt = `Analyze inventory summary: Total Products: ${products.length}, Low Stock: ${lowStock.length}, Dead Stock: ${deadStock.length}. Provide ONE high-value, strategic business insight (max 20 words). Return strictly JSON: { "title": "...", "message": "...", "type": "info" }`;
                const response = await aiService.chatWithAI(prompt, { products, orders: [], customers: [] });
                const jsonMatch = response.message.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const aiInsight = JSON.parse(jsonMatch[0]);
                    insights.push({
                        type: aiInsight.type || 'info',
                        title: aiInsight.title || 'AI Strategy',
                        message: aiInsight.message || 'Optimize your inventory mix.',
                        action: 'Review',
                        details: {}
                    });
                }
            } catch (e) {
                console.warn("AI Insight generation failed.");
            }
        }

        return insights;
    },

    generatePricingSuggestions: async (products: any[]): Promise<AIInsight[]> => {
        const productContext = products.slice(0, 10).map(p => ({
            id: p.id, name: p.name, price: p.selling_price, stock: p.current_stock
        }));

        const prompt = `Analyze these products and suggest pricing optimizations. Products: ${JSON.stringify(productContext)}. Return a JSON ARRAY of objects: [{ "type": "warning"|"success"|"danger", "title": "...", "message": "...", "action": "...", "details": {...} }]`;

        try {
            const response = await aiService.chatWithAI(prompt, { products: [], orders: [], customers: [] });
            const jsonMatch = response.message.match(/\[[\s\S]*\]/);
            if (jsonMatch) return JSON.parse(jsonMatch[0]);
        } catch (e) {
            console.warn("AI Pricing failed.");
        }
        return [];
    },

    segmentCustomers: async (customers: any[]): Promise<CustomerSegment[]> => {
        const customerContext = customers.slice(0, 20).map(c => ({
            id: c.id, name: c.full_name, total_orders: c.total_orders, total_spent: c.total_spent
        }));

        const prompt = `Analyze these customers and segment them (VIP, Loyal, At Risk, New). Customers: ${JSON.stringify(customerContext)}. Return a JSON ARRAY: [{ "customerId": "...", "segment": "...", "actionableTip": "..." }]`;

        try {
            const response = await aiService.chatWithAI(prompt, { products: [], orders: [], customers: [] });
            const jsonMatch = response.message.match(/\[[\s\S]*\]/);
            if (jsonMatch) return JSON.parse(jsonMatch[0]);
        } catch (e) {
            console.warn("AI Segmentation failed.");
        }

        return customers.map(c => ({ customerId: c.id, segment: 'New', actionableTip: "Send a welcome email." }));
    },

    rateSuppliers: async (suppliers: any[]): Promise<SupplierScore[]> => {
        const supplierContext = suppliers.slice(0, 10).map(s => ({ id: s.id, name: s.name }));
        const prompt = `Rate these suppliers (0-100). Suppliers: ${JSON.stringify(supplierContext)}. Return a JSON ARRAY: [{ "supplierId": "...", "score": 85, "grade": "Gold", "reliability": 80, "quality": 90, "speed": 85 }]`;

        try {
            const response = await aiService.chatWithAI(prompt, { products: [], orders: [], customers: [] });
            const jsonMatch = response.message.match(/\[[\s\S]*\]/);
            if (jsonMatch) return JSON.parse(jsonMatch[0]);
        } catch (e) {
            console.warn("AI Supplier Rating failed.");
        }

        return suppliers.map(s => ({ supplierId: s.id, score: 75, grade: 'Silver', reliability: 75, quality: 75, speed: 75 }));
    },

    analyzeOrderRisk: async (orders: any[]): Promise<OrderRisk[]> => {
        const orderContext = orders.slice(0, 10).map(o => ({
            id: o.id, total: o.total_amount, items: o.items?.length || 1
        }));

        const prompt = `Analyze these orders for fraud risk. Orders: ${JSON.stringify(orderContext)}. Return a JSON ARRAY: [{ "orderId": "...", "riskLevel": "Low"|"Medium"|"High", "reasons": ["..."], "priorityScore": 50 }]`;

        try {
            const response = await aiService.chatWithAI(prompt, { products: [], orders: [], customers: [] });
            const jsonMatch = response.message.match(/\[[\s\S]*\]/);
            if (jsonMatch) return JSON.parse(jsonMatch[0]);
        } catch (e) {
            console.warn("AI Risk Analysis failed.");
        }

        return orders.map(o => ({ orderId: o.id, riskLevel: 'Low', reasons: ["Standard pattern."], priorityScore: 50 }));
    },

    generateReportSummary: (data: { totalSales: number, totalOrders: number, topProduct: string }): string => {
        return `**Steady Performance**: Total revenue reached ₱${data.totalSales.toLocaleString()} from ${data.totalOrders} orders. **Top Driver**: ${data.topProduct} is leading sales.`;
    },

    generateBusinessHealthScore: async (inventory: any[], orders: any[]): Promise<{ score: number, status: string, breakdown: any }> => {
        const prompt = `Calculate Business Health Score (0-100) based on Inventory: ${inventory.length}, Orders: ${orders.length}. Return JSON: { "score": 85, "status": "Excellent", "breakdown": { "inventory": 90, "sales": 80, "customerRetention": 85 } }`;

        try {
            const response = await aiService.chatWithAI(prompt, { products: inventory, orders, customers: [] });
            const jsonMatch = response.message.match(/\{[\s\S]*\}/);
            if (jsonMatch) return JSON.parse(jsonMatch[0]);
        } catch (e) {
            console.warn("AI Health Score failed.");
        }

        return { score: 75, status: "Stable", breakdown: { inventory: 75, sales: 75, customerRetention: 75 } };
    },

    getDailyActionPlan: async (context: any = {}): Promise<string[]> => {
        const prompt = `Generate 4 daily tasks for a store manager. Context: ${JSON.stringify(context)}. Return JSON ARRAY of strings.`;

        try {
            const response = await aiService.chatWithAI(prompt, { products: [], orders: [], customers: [] });
            const jsonMatch = response.message.match(/\[[\s\S]*\]/);
            if (jsonMatch) return JSON.parse(jsonMatch[0]);
        } catch (e) {
            console.warn("AI Action Plan failed.");
        }

        return ["Review pending orders", "Check inventory", "Email customers", "Update prices"];
    },

    // =====================================================================
    // UTILITY
    // =====================================================================

    testConnection: async (config: any): Promise<{ success: boolean; message: string }> => {
        try {
            const vpsRes = await fetch('http://72.60.232.20:3100/health').catch(() => null);
            if (vpsRes?.ok) return { success: true, message: "✅ TunaBrain Core is Online (VPS Relay)" };

            const res = await fetch('https://text.pollinations.ai/openai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: 'openai', messages: [{ role: 'user', content: 'hi' }] })
            });
            if (res.ok) return { success: true, message: "✅ TunaBrain Core is Online (Pollinations)" };

            throw new Error("All AI endpoints are currently unreachable.");
        } catch (error: any) {
            return { success: false, message: `Connection failed: ${error.message}` };
        }
    },

    simulateResponse: async (message: string, context: { products: any[], orders: any[], customers: any[] }): Promise<ChatResponse> => {
        await new Promise(resolve => setTimeout(resolve, 500));
        return {
            message: "⚡ TunaBrain is operating in light mode due to a temporary connection fluctuation. My full analytical capabilities will be restored shortly. In the meantime, I can still assist with basic inventory and pricing queries."
        };
    },

    generateProductDescription: async (name: string, category: string): Promise<string> => {
        const prompt = `Write a 20-word description for "${name}" (${category}). Return ONLY text.`;
        const response = await aiService.chatWithAI(prompt, { products: [], orders: [], customers: [] });
        return response.message;
    },

    optimizeProductPrice: async (name: string, currentPrice: number): Promise<{ price: number, reason: string }> => {
        const prompt = `Optimize price for "${name}" (Current: ₱${currentPrice}). Return JSON { "suggestedPrice": 0, "reason": "" }`;
        const response = await aiService.chatWithAI(prompt, { products: [], orders: [], customers: [] });
        try {
            const data = JSON.parse(response.message.match(/\{[\s\S]*\}/)?.[0] || '{}');
            return { price: data.suggestedPrice || currentPrice, reason: data.reason || "Optimized by TunaBrain" };
        } catch {
            return { price: currentPrice, reason: "Manual price used" };
        }
    },

    generatePricingRuleDescription: async (name: string, type: string): Promise<string> => {
        const prompt = `Write a professional 15-word description for a pricing rule named "${name}" of type "${type}". Return ONLY text.`;
        const response = await aiService.chatWithAI(prompt, { products: [], orders: [], customers: [] });
        return response.message;
    },

    simulatePricingRuleLogic: async (name: string, type: string, adjustment: number): Promise<string> => {
        const prompt = `Explain in one sentence how a pricing rule "${name}" (${type}) with a ${adjustment}% adjustment would impact sales and inventory health.`;
        const response = await aiService.chatWithAI(prompt, { products: [], orders: [], customers: [] });
        return response.message;
    },

    vetSupplier: async (name: string): Promise<string> => {
        const prompt = `Provide a professional 20-word vetting note/risk assessment for a new supplier named "${name}" in the seafood/tuna industry. Return ONLY text.`;
        const response = await aiService.chatWithAI(prompt, { products: [], orders: [], customers: [] });
        return response.message;
    },

    generateStockAdjustmentReason: async (product: string, type: string, qty: number): Promise<string> => {
        const prompt = `Generate a professional 10-word reason for a stock adjustment of ${qty} units (${type}) for "${product}". Return ONLY text.`;
        const response = await aiService.chatWithAI(prompt, { products: [], orders: [], customers: [] });
        return response.message;
    },

    executeAction: async (action: ChatResponse['proposedAction']): Promise<{ success: boolean; error?: string }> => {
        if (!action) return { success: false, error: "No action provided" };
        try {
            if (action.type === 'UPDATE_PRICE') {
                await supabase.from('products').update({ selling_price: action.payload.newPrice }).eq('id', action.payload.productId);

                await auditService.log({
                    action: 'AI_ACTION',
                    entityType: 'product',
                    entityId: action.payload.productId,
                    newValues: { action: 'UPDATE_PRICE', newPrice: action.payload.newPrice }
                });

                return { success: true };
            }
            if (action.type === 'RESTOCK_ITEM') {
                const { data: product } = await supabase.from('products').select('current_stock').eq('id', action.payload.productId).single();
                if (product) {
                    await supabase.from('products').update({ current_stock: product.current_stock + action.payload.quantity }).eq('id', action.payload.productId);

                    await auditService.log({
                        action: 'AI_ACTION',
                        entityType: 'product',
                        entityId: action.payload.productId,
                        newValues: { action: 'RESTOCK_ITEM', quantity: action.payload.quantity }
                    });
                }
                return { success: true };
            }
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }
};
