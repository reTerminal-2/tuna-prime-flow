
import { addDays, format, differenceInDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { toast } from "sonner";

// --- Types (Mocking some internal types for the service) ---

export interface ChatResponse {
    message: string;
    proposedAction?: {
        type: 'UPDATE_PRICE' | 'RESTOCK_ITEM' | 'CREATE_DISCOUNT' | 'EMAIL_CUSTOMER' | 'CREATE_PRODUCT' | 'DELETE_PRODUCT' | 'UPDATE_ORDER_STATUS' | 'BLOCK_CUSTOMER' | 'GENERIC_DB_ACTION' | 'MANAGE_USER_ROLE' | 'CREATE_SUPPLIER' | 'UPDATE_SUPPLIER' | 'DELETE_SUPPLIER' | 'OPEN_PRODUCT_FORM' | 'OPEN_SUPPLIER_FORM' | 'OPEN_CUSTOMER_FORM' | 'OPEN_DISCOUNT_FORM' | 'OPEN_ORDER_FORM' | 'OPEN_REFUND_FORM' | 'OPEN_EXPENSE_FORM' | 'OPEN_REPORT_SETTINGS';
        description: string;
        payload: any;
    };
}

export interface AIInsight {
    type: 'success' | 'warning' | 'danger' | 'info';
    title: string;
    message: string;
    action?: string;
    score?: number; // 0-100
    details?: any;
}

export interface CustomerSegment {
    customerId: string;
    segment: 'VIP' | 'Loyal' | 'At Risk' | 'New' | 'Slipping Away';
    actionableTip: string;
}

export interface SupplierScore {
    supplierId: string;
    score: number; // 0-100
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

// --- AI Service Implementation ---

export const aiService = {

    // 14. Demand Forecasting
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
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            console.error("Failed to parse forecast JSON", e);
        }

        const fallback: Record<string, number> = {};
        products.forEach(p => {
            fallback[p.id] = Math.floor(Math.random() * 10) + 5;
        });
        return fallback;
    },

    // 1. Inventory Insights
    analyzeInventory: async (products: any[]): Promise<AIInsight[]> => {
        const insights: AIInsight[] = [];
        const deadStock = products.filter(p => (p.current_stock || 0) > 50 && (!p.last_sale_date || differenceInDays(new Date(), new Date(p.last_sale_date)) > 30));
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

    // 2. Pricing Engine
    generatePricingSuggestions: async (products: any[]): Promise<AIInsight[]> => {
        const insights: AIInsight[] = [];
        const productContext = products.slice(0, 10).map(p => ({
            id: p.id,
            name: p.name,
            price: p.selling_price,
            stock: p.current_stock
        }));

        const prompt = `Analyze these products and suggest pricing optimizations. Products: ${JSON.stringify(productContext)}. Return a JSON ARRAY of objects: [{ "type": "warning"|"success"|"danger", "title": "...", "message": "...", "action": "...", "details": {...} }]`;

        try {
            const response = await aiService.chatWithAI(prompt, { products: [], orders: [], customers: [] });
            const jsonMatch = response.message.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            console.warn("AI Pricing failed.");
        }

        return insights;
    },

    // 3. Customer Segmentation
    segmentCustomers: async (customers: any[]): Promise<CustomerSegment[]> => {
        const customerContext = customers.slice(0, 20).map(c => ({
            id: c.id,
            name: c.full_name,
            total_orders: c.total_orders,
            total_spent: c.total_spent
        }));

        const prompt = `Analyze these customers and segment them (VIP, Loyal, At Risk, New). Customers: ${JSON.stringify(customerContext)}. Return a JSON ARRAY: [{ "customerId": "...", "segment": "...", "actionableTip": "..." }]`;

        try {
            const response = await aiService.chatWithAI(prompt, { products: [], orders: [], customers: [] });
            const jsonMatch = response.message.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            console.warn("AI Segmentation failed.");
        }

        return customers.map(c => ({
            customerId: c.id,
            segment: 'New',
            actionableTip: "Send a welcome email."
        }));
    },

    // 4. Supplier Scoring
    rateSuppliers: async (suppliers: any[]): Promise<SupplierScore[]> => {
        const supplierContext = suppliers.slice(0, 10).map(s => ({ id: s.id, name: s.name }));
        const prompt = `Rate these suppliers (0-100). Suppliers: ${JSON.stringify(supplierContext)}. Return a JSON ARRAY: [{ "supplierId": "...", "score": 85, "grade": "Gold", "reliability": 80, "quality": 90, "speed": 85 }]`;

        try {
            const response = await aiService.chatWithAI(prompt, { products: [], orders: [], customers: [] });
            const jsonMatch = response.message.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            console.warn("AI Supplier Rating failed.");
        }

        return suppliers.map(s => ({
            supplierId: s.id,
            score: 75,
            grade: 'Silver',
            reliability: 75,
            quality: 75,
            speed: 75
        }));
    },

    // 5. Order Analysis
    analyzeOrderRisk: async (orders: any[]): Promise<OrderRisk[]> => {
        const orderContext = orders.slice(0, 10).map(o => ({
            id: o.id,
            total: o.total_amount,
            items: o.items?.length || 1
        }));

        const prompt = `Analyze these orders for fraud risk. Orders: ${JSON.stringify(orderContext)}. Return a JSON ARRAY: [{ "orderId": "...", "riskLevel": "Low"|"Medium"|"High", "reasons": ["..."], "priorityScore": 50 }]`;

        try {
            const response = await aiService.chatWithAI(prompt, { products: [], orders: [], customers: [] });
            const jsonMatch = response.message.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            console.warn("AI Risk Analysis failed.");
        }

        return orders.map(o => ({
            orderId: o.id,
            riskLevel: 'Low',
            reasons: ["Standard pattern."],
            priorityScore: 50
        }));
    },

    // 6. Reports NLP
    generateReportSummary: (data: { totalSales: number, totalOrders: number, topProduct: string }): string => {
        return `**Steady Performance**: Total revenue reached ₱${data.totalSales.toLocaleString()} from ${data.totalOrders} orders. **Top Driver**: ${data.topProduct} is leading sales.`;
    },

    // 7. Business Health Score (Aggregate)
    generateBusinessHealthScore: async (inventory: any[], orders: any[]): Promise<{ score: number, status: string, breakdown: any }> => {
        const prompt = `Calculate Business Health Score (0-100) based on Inventory: ${inventory.length}, Orders: ${orders.length}. Return JSON: { "score": 85, "status": "Excellent", "breakdown": { "inventory": 90, "sales": 80, "customerRetention": 85 } }`;

        try {
            const response = await aiService.chatWithAI(prompt, { products: inventory, orders: orders, customers: [] });
            const jsonMatch = response.message.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            console.warn("AI Health Score failed.");
        }

        return {
            score: 75,
            status: "Stable",
            breakdown: { inventory: 75, sales: 75, customerRetention: 75 }
        };
    },

    // 8. Daily Action Plan
    getDailyActionPlan: async (context: any = {}): Promise<string[]> => {
        const prompt = `Generate 4 daily tasks for a store manager. Context: ${JSON.stringify(context)}. Return JSON ARRAY of strings.`;

        try {
            const response = await aiService.chatWithAI(prompt, { products: [], orders: [], customers: [] });
            const jsonMatch = response.message.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            console.warn("AI Action Plan failed.");
        }

        return ["Review pending orders", "Check inventory", "Email customers", "Update prices"];
    },

    // 11. Test Connection
    testConnection: async (config: any): Promise<{ success: boolean; message: string }> => {
        try {
            const apiUrl = '/api/g4f/v1/chat/completions';

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'gpt-4.1-nano',
                    provider: 'Pollinations',
                    messages: [{ role: 'user', content: 'Say hello in 3 words.' }],
                    stream: false
                })
            });

            if (!response.ok) throw new Error(`Status: ${response.status}`);
            const data = await response.json();
            const content = data.choices?.[0]?.message?.content;

            if (content) {
                return { success: true, message: `✅ Pollinations + gpt-4.1-nano Connected! Response: "${content}"` };
            } else {
                throw new Error('No response content');
            }
        } catch (error: any) {
            return { success: false, message: `Connection failed: ${error.message}` };
        }
    },

    // 12. Local Simulation Mode (Fallback)
    simulateResponse: async (message: string, context: { products: any[], orders: any[], customers: any[] }): Promise<ChatResponse> => {
        await new Promise(resolve => setTimeout(resolve, 800));
        return {
            message: "I am currently operating in limited mode. Please check your VPS connection."
        };
    },

    // 9. Chat with AI (Context Aware - Powered by GPT4Free via local proxy)
    chatWithAI: async (message: string, context: { products: any[], orders: any[], customers: any[] }, retryCount = 0): Promise<ChatResponse> => {
        try {
            const { systemPrompt, userMessage } = aiService.generateChatPayload(message, context);

            // Locked to Pollinations provider + gpt-4.1-nano for maximum stability
            const PROVIDER = 'Pollinations';
            const MODEL = 'gpt-4.1-nano';

            // Use Vite proxy to avoid CORS: /api/g4f → http://72.60.232.20:1337
            const endpoint = '/api/g4f/v1/chat/completions';

            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 60000);

                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        model: MODEL,
                        provider: PROVIDER,
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: userMessage }
                        ],
                        stream: false
                    }),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`G4F Error: ${response.status} ${await response.text()}`);
                }

                const data = await response.json();
                const content = data.choices?.[0]?.message?.content;

                if (!content) throw new Error('No content in AI response');

                // Try to parse as JSON action, otherwise treat as plain text
                const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                try {
                    return JSON.parse(cleanContent) as ChatResponse;
                } catch (e) {
                    return { message: cleanContent };
                }
            } catch (e: any) {
                console.error('AI call failed:', e.message);
                if (e.name === 'AbortError') {
                    toast.error("⏳ AI Timeout — VPS took too long to respond.");
                } else {
                    toast.error(`🚫 AI Error: ${e.message}`);
                }
                return aiService.simulateResponse(message, context);
            }
        } catch (error: any) {
            console.error("Critical AI Error:", error);
            return aiService.simulateResponse(message, context);
        }
    },

    generateChatPayload: (message: string, context: any) => {
        const totalInventoryValue = context.products?.reduce((acc: number, p: any) => acc + (p.current_stock * p.selling_price), 0) || 0;
        const lowStockCount = context.products?.filter((p: any) => p.current_stock < 10).length || 0;

        const systemInstructions = `You are TunaBrain, a Business Assistant for TunaFlow.
        Metrics: Value ₱${totalInventoryValue.toLocaleString()}, Low Stock: ${lowStockCount}.
        Inventory: ${JSON.stringify(context.products?.slice(0, 20).map((p: any) => ({ name: p.name, stock: p.current_stock, price: p.selling_price })))}
        Instructions: Return VALID JSON only if action is needed. { "message": "...", "proposedAction": null }`;

        return {
            systemPrompt: systemInstructions,
            userMessage: message
        };
    },

    // 13. AI Helper Methods for UI Forms
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
            return { price: data.suggestedPrice || currentPrice, reason: data.reason || "Optimized by AI" };
        } catch {
            return { price: currentPrice, reason: "Manual price used" };
        }
    },

    // 10. Action Executor
    executeAction: async (action: ChatResponse['proposedAction']): Promise<{ success: boolean; error?: string }> => {
        if (!action) return { success: false, error: "No action provided" };
        try {
            if (action.type === 'UPDATE_PRICE') {
                await supabase.from('products').update({ selling_price: action.payload.newPrice }).eq('id', action.payload.productId);
                return { success: true };
            }
            if (action.type === 'RESTOCK_ITEM') {
                const { data: product } = await supabase.from('products').select('current_stock').eq('id', action.payload.productId).single();
                if (product) {
                    await supabase.from('products').update({ current_stock: product.current_stock + action.payload.quantity }).eq('id', action.payload.productId);
                }
                return { success: true };
            }
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }
};
