
import { addDays, format, differenceInDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { GoogleGenerativeAI } from "@google/generative-ai";

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
        // Create a simplified inventory summary for the AI
        const inventorySummary = products.map(p => ({
            id: p.id,
            name: p.name,
            price: p.selling_price,
            stock: p.current_stock
        }));

        const prompt = `
        Analyze this inventory list and predict sales for the next 7 days for EACH item.
        Factors to consider: 
        - Lower priced items sell faster.
        - "Fresh" items sell faster than "Frozen".
        - Random market fluctuations.
        
        Inventory: ${JSON.stringify(inventorySummary)}

        Return ONLY a JSON object where keys are product IDs and values are predicted unit sales (number).
        Example: { "prod_123": 15, "prod_456": 5 }
      `;

        const response = await aiService.chatWithAI(prompt, { products, orders: [], customers: [] });

        try {
            // Extract JSON from potential text wrapper
            const jsonMatch = response.message.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            console.error("Failed to parse forecast JSON", e);
        }

        // Fallback to simple logic if AI fails
        const fallback: Record<string, number> = {};
        products.forEach(p => {
            fallback[p.id] = Math.floor(Math.random() * 10) + 5;
        });
        return fallback;
    },

    // 1. Inventory Insights
    analyzeInventory: async (products: any[]): Promise<AIInsight[]> => {
        // Base rule-based insights (Always reliable)
        const insights: AIInsight[] = [];

        // Dead Stock Analysis
        const deadStock = products.filter(p => p.stock > 50 && (!p.last_sale_date || differenceInDays(new Date(), new Date(p.last_sale_date)) > 30));
        if (deadStock.length > 0) {
            insights.push({
                type: 'warning',
                title: 'Dead Stock Detected',
                message: `${deadStock.length} items haven't moved in 30+ days. Consider a clearance sale.`,
                action: 'View Items',
                details: deadStock.map(p => p.name)
            });
        }

        // Smart Restock
        const lowStock = products.filter(p => p.stock < 10);
        if (lowStock.length > 0) {
            insights.push({
                type: 'danger',
                title: 'Critical Restock Needed',
                message: `Stockout imminent for ${lowStock.length} items.`,
                action: 'Auto-Draft PO',
                details: lowStock.map(p => ({ name: p.name, recommended: 50 }))
            });
        }

        // Expiration Watch
        const expiringSoon = products.filter(p => p.expiry_date && differenceInDays(new Date(p.expiry_date), new Date()) < 14);
        if (expiringSoon.length > 0) {
            insights.push({
                type: 'info',
                title: 'Expiration Risk',
                message: `${expiringSoon.length} batches expiring in < 2 weeks. Suggested action: 50% discount.`,
                action: 'Apply Discount',
                details: expiringSoon.map(p => p.name)
            });
        }

        // AI Strategic Insight (Async enhancement)
        if (products.length > 0) {
            try {
                const prompt = `
                Analyze this inventory summary:
                - Total Products: ${products.length}
                - Low Stock Items: ${lowStock.length}
                - Dead Stock Items: ${deadStock.length}
                - Expiring Soon: ${expiringSoon.length}
                
                Provide ONE high-value, strategic business insight (max 20 words). 
                Return strictly JSON: { "title": "...", "message": "...", "type": "info" }
            `;

                // We use a shorter timeout for this background insight to not block UI too long if awaited
                const response = await aiService.chatWithAI(prompt, { products: [], orders: [], customers: [] });
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
                console.warn("AI Insight generation failed, using rules only.");
            }
        }

        return insights;
    },

    // 2. Pricing Engine
    generatePricingSuggestions: async (products: any[]): Promise<AIInsight[]> => {
        // AI-Powered Pricing Analysis
        const insights: AIInsight[] = [];

        // Prepare context (limit to top 10 relevant items to save tokens)
        const productContext = products.slice(0, 10).map(p => ({
            id: p.id,
            name: p.name,
            price: p.selling_price,
            stock: p.current_stock
        }));

        const prompt = `
        Analyze these products and suggest pricing optimizations.
        Competitor Data (Mock): Yellowfin Loin (1200), Canned Tuna (85).
        
        Products: ${JSON.stringify(productContext)}
        
        Rules:
        1. If stock > 100, suggest discount.
        2. If stock < 10, suggest premium.
        3. Match competitor prices if ours is higher.
        
        Return a JSON ARRAY of objects: 
        [{ "type": "warning"|"success"|"danger", "title": "...", "message": "...", "action": "...", "details": {...} }]
    `;

        try {
            const response = await aiService.chatWithAI(prompt, { products: [], orders: [], customers: [] });
            const jsonMatch = response.message.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const aiSuggestions = JSON.parse(jsonMatch[0]);
                return aiSuggestions;
            }
        } catch (e) {
            console.warn("AI Pricing failed, falling back to rules.");
        }

        // Fallback Rule-Based Logic
        // Mock Competitor Data
        const competitorPrices: Record<string, number> = {
            'Yellowfin Loin': 1200,
            'Canned Tuna': 85
        };

        products.forEach(p => {
            // Rule 1: High Stock Clearance
            if (p.stock > 200 && (!p.last_sale_date || differenceInDays(new Date(), new Date(p.last_sale_date)) > 45)) {
                insights.push({
                    type: 'warning',
                    title: `Liquidation Alert: ${p.name}`,
                    message: `Stock is stagnant (${p.stock} units). Recommended: Drop price by 15% to clear space.`,
                    action: 'Apply -15%',
                    details: { productId: p.id, newPrice: Number(p.price) * 0.85 }
                });
            }

            // Rule 2: Scarcity Premium
            if (p.stock < 20 && p.sales_velocity > 5) {
                insights.push({
                    type: 'success',
                    title: `Demand Spike: ${p.name}`,
                    message: `High demand with low stock. Market can absorb a 10% price increase.`,
                    action: 'Apply +10%',
                    details: { productId: p.id, newPrice: Number(p.price) * 1.10 }
                });
            }

            // Rule 3: Competitor Matching
            if (competitorPrices[p.name] && Number(p.price) > competitorPrices[p.name]) {
                insights.push({
                    type: 'danger',
                    title: `Price Alert: ${p.name}`,
                    message: `Competitor is selling at ₱${competitorPrices[p.name]} (You: ₱${p.price}). You are losing sales.`,
                    action: 'Match Price',
                    details: { productId: p.id, newPrice: competitorPrices[p.name] }
                });
            }
        });

        return insights;
    },

    // 3. Customer Segmentation
    segmentCustomers: async (customers: any[]): Promise<CustomerSegment[]> => {
        // Limit to top 20 for AI context
        const customerContext = customers.slice(0, 20).map(c => ({
            id: c.id,
            name: c.full_name,
            total_orders: c.total_orders,
            total_spent: c.total_spent,
            last_order: c.last_order_date
        }));

        const prompt = `
        Analyze these customers and segment them.
        Segments: VIP (High value), Loyal (Frequent), At Risk (Haven't ordered lately), New (Recent first order), Slipping Away.
        
        Customers: ${JSON.stringify(customerContext)}
        
        Return a JSON ARRAY: 
        [{ "customerId": "...", "segment": "...", "actionableTip": "..." }]
    `;

        try {
            const response = await aiService.chatWithAI(prompt, { products: [], orders: [], customers: [] });
            const jsonMatch = response.message.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            console.warn("AI Segmentation failed, using fallback.");
        }

        // Fallback Mock Logic
        return customers.map(c => {
            const mockTotalSpent = c.total_spent || Math.floor(Math.random() * 50000);
            const daysSinceLastOrder = Math.floor(Math.random() * 90); // Mock if real date missing

            let segment: CustomerSegment['segment'] = 'New';
            let tip = "Send a welcome email.";

            if (mockTotalSpent > 20000) {
                segment = 'VIP';
                tip = "Assign personal account manager.";
            } else if (mockTotalSpent > 5000) {
                segment = 'Loyal';
                tip = "Send early access to new products.";
            }

            if (daysSinceLastOrder > 60 && mockTotalSpent > 1000) {
                segment = 'At Risk';
                tip = "Send a 'We Miss You' 15% off coupon.";
            }

            return {
                customerId: c.id,
                segment,
                actionableTip: tip
            };
        });
    },

    // 4. Supplier Scoring
    rateSuppliers: async (suppliers: any[]): Promise<SupplierScore[]> => {
        // Limit context
        const supplierContext = suppliers.slice(0, 10).map(s => ({ id: s.id, name: s.name }));

        const prompt = `
        Rate these suppliers based on hypothetical performance data (simulate realistic scores).
        Criteria: Reliability (Time), Quality (Freshness), Speed (Delivery).
        Grades: Platinum (>90), Gold (>80), Silver (>70), Bronze.
        
        Suppliers: ${JSON.stringify(supplierContext)}
        
        Return a JSON ARRAY:
        [{ "supplierId": "...", "score": 85, "grade": "Gold", "reliability": 80, "quality": 90, "speed": 85 }]
    `;

        try {
            const response = await aiService.chatWithAI(prompt, { products: [], orders: [], customers: [] });
            const jsonMatch = response.message.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            console.warn("AI Supplier Rating failed.");
        }

        // Fallback
        return suppliers.map(s => {
            const reliability = 80 + Math.floor(Math.random() * 20);
            const quality = 70 + Math.floor(Math.random() * 30);
            const speed = 60 + Math.floor(Math.random() * 40);

            const avg = (reliability + quality + speed) / 3;

            let grade: SupplierScore['grade'] = 'Bronze';
            if (avg > 90) grade = 'Platinum';
            else if (avg > 80) grade = 'Gold';
            else if (avg > 70) grade = 'Silver';

            return {
                supplierId: s.id,
                score: Math.round(avg),
                grade,
                reliability,
                quality,
                speed
            };
        });
    },

    // 5. Order Analysis
    analyzeOrderRisk: async (orders: any[]): Promise<OrderRisk[]> => {
        const orderContext = orders.slice(0, 10).map(o => ({
            id: o.id,
            total: o.total_amount,
            customer: o.user_id, // simplified
            items: o.items?.length || 1
        }));

        const prompt = `
        Analyze these orders for fraud risk.
        High Value > 10000 = Medium Risk.
        Odd patterns = High Risk.
        
        Orders: ${JSON.stringify(orderContext)}
        
        Return a JSON ARRAY:
        [{ "orderId": "...", "riskLevel": "Low"|"Medium"|"High", "reasons": ["..."], "priorityScore": 50 }]
    `;

        try {
            const response = await aiService.chatWithAI(prompt, { products: [], orders: [], customers: [] });
            const jsonMatch = response.message.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            console.warn("AI Risk Analysis failed.");
        }

        // Fallback
        return orders.map(o => {
            const isLargeOrder = o.total_amount > 10000;
            const isOddLocation = Math.random() > 0.9;

            let risk: OrderRisk['riskLevel'] = 'Low';
            const reasons: string[] = [];
            let priority = 50;

            if (isLargeOrder) {
                risk = 'Medium';
                reasons.push("High value order requires verification.");
                priority += 20;
            }

            if (isOddLocation) {
                risk = 'High';
                reasons.push("Shipping address differs from billing pattern.");
                priority += 30;
            }

            if (reasons.length === 0) {
                reasons.push("Standard order pattern.");
            }

            return {
                orderId: o.id,
                riskLevel: risk,
                reasons,
                priorityScore: priority
            };
        });
    },

    // 6. Reports NLP
    generateReportSummary: (data: { totalSales: number, totalOrders: number, topProduct: string }): string => {
        const sentiment = data.totalSales > 10000 ? "Excellent" : "Steady";
        return `
      **${sentiment} Performance**: Total revenue reached ₱${data.totalSales.toLocaleString()} from ${data.totalOrders} orders.
      
      **Top Driver**: ${data.topProduct} is leading sales. 
      
      **AI Forecast**: Based on current velocity, expect a 15% increase next week. 
      Recommendation: Prepare stock for ${data.topProduct}.
    `;
    },

    // 7. Business Health Score (Aggregate)
    generateBusinessHealthScore: async (inventory: any[], orders: any[]): Promise<{ score: number, status: string, breakdown: any }> => {
        // AI Analysis
        const prompt = `
        Calculate Business Health Score (0-100) based on:
        - Inventory: ${inventory.length} items.
        - Orders: ${orders.length} recent orders.
        
        Return JSON: { "score": 85, "status": "Excellent", "breakdown": { "inventory": 90, "sales": 80, "customerRetention": 85 } }
    `;

        try {
            const response = await aiService.chatWithAI(prompt, { products: inventory, orders: orders, customers: [] });
            const jsonMatch = response.message.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            console.warn("AI Health Score failed.");
        }

        // Fallback Mock calculation
        const inventoryHealth = inventory.some(p => p.stock < 10) ? 60 : 90;
        const salesHealth = orders.length > 5 ? 85 : 50;
        const score = Math.round((inventoryHealth + salesHealth) / 2);

        let status = "Stable";
        if (score > 80) status = "Excellent";
        else if (score < 60) status = "Needs Attention";

        return {
            score,
            status,
            breakdown: {
                inventory: inventoryHealth,
                sales: salesHealth,
                customerRetention: 75 // Mock
            }
        };
    },

    // 8. Daily Action Plan
    getDailyActionPlan: async (context: any = {}): Promise<string[]> => {
        const prompt = `
        Generate 4 daily tasks for a store manager.
        Context: ${JSON.stringify(context)}
        Return JSON ARRAY of strings: ["Check inventory", "Email VIPs", ...]
    `;

        try {
            const response = await aiService.chatWithAI(prompt, { products: [], orders: [], customers: [] });
            const jsonMatch = response.message.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            console.warn("AI Action Plan failed.");
        }

        return [
            "Review 3 pending high-value orders.",
            "Restock 'Yellowfin Loin' (only 4kg left).",
            "Send 'We Miss You' email to 5 at-risk customers.",
            "Check competitor prices for 'Canned Tuna' - market shift detected."
        ];
    },

    // 11. Test Connection
    testConnection: async (config: any): Promise<{ success: boolean; message: string }> => {
        try {
            const provider = localStorage.getItem("ai_provider") || 'copilot-api';

            if (provider === 'copilot-api') {
                try {
                    const response = await fetch("/api/v1/models");
                    if (!response.ok) throw new Error(`Status ${response.status}`);
                    const data = await response.json();
                    if (data.data && Array.isArray(data.data)) {
                        return { success: true, message: "Copilot API Connected & Models Loaded!" };
                    }
                } catch (e: any) {
                    return { success: false, message: `Copilot API Error: ${e.message}` };
                }
            }

            if (provider === 'gemini') {
                try {
                    const apiKey = localStorage.getItem("gemini_api_key");
                    if (!apiKey) {
                        return { success: false, message: "Missing Gemini API Key. Please configure it in settings." };
                    }

                    const genAI = new GoogleGenerativeAI(apiKey);
                    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

                    const result = await model.generateContent("Hello, this is a connection test.");
                    const response = await result.response;
                    const content = response.text();

                    if (content) {
                        return { success: true, message: "Gemini AI Connected & Ready!" };
                    } else {
                        throw new Error("No response from Gemini API");
                    }
                } catch (e: any) {
                    return { success: false, message: `Gemini API Error: ${e.message}. Please check your API key.` };
                }
            }

            if (provider === 'ernie') {
                try {
                    // Test ERNIE API with a simple prompt via local proxy
                    const hfToken = localStorage.getItem("hf_token");
                    const headers: any = {
                        "Content-Type": "application/json"
                    };

                    if (hfToken) {
                        headers["Authorization"] = `Bearer ${hfToken}`;
                    }

                    const response = await fetch("/api/hf/models/baidu/ERNIE-4.5-21B-A3B", {
                        method: "POST",
                        headers: headers,
                        body: JSON.stringify({
                            inputs: "Hello, this is a connection test.",
                            parameters: {
                                max_new_tokens: 50,
                                temperature: 0.7
                            }
                        })
                    });

                    if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(`ERNIE API Error: ${response.status} - ${errorText}`);
                    }

                    const data = await response.json();
                    if (data[0]?.generated_text) {
                        return { success: true, message: "ERNIE AI Connected & Ready!" };
                    } else {
                        throw new Error("No response from ERNIE API");
                    }
                } catch (e: any) {
                    return { success: false, message: `ERNIE API Error: ${e.message}. The free API might be rate limited.` };
                }
            }

            if (provider === 'free-chatgpt') {
                try {
                    const response = await fetch("/api/conversation", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            message: "Hello, this is a connection test."
                        })
                    });

                    if (!response.ok) throw new Error(`Server Error: ${response.status}`);
                    const data = await response.json();

                    if (data.status === "success") {
                        return { success: true, message: "TunaBrain AI Core Connected!" };
                    } else {
                        throw new Error(data.message || "Unknown error from AI Core");
                    }
                } catch (e: any) {
                    return { success: false, message: `Connection failed: ${e.message}. Make sure the python server is running on port 6969.` };
                }
            }

            return { success: false, message: "Unknown Provider" };
        } catch (error: any) {
            return { success: false, message: error.message || "Connection failed" };
        }
    },

    // 12. Local Simulation Mode (Fallback)
    simulateResponse: async (message: string, context: { products: any[], orders: any[], customers: any[] }): Promise<ChatResponse> => {
        const lowerMsg = message.toLowerCase();
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate thinking

        return {
            message: "I am TunaBrain v3.0, the advanced AI System Administrator for TunaFlow. My purpose is to optimize your business operations and maximize your profits. I am a unique entity created solely for this platform."
        };

        if (lowerMsg.includes('analyze') || lowerMsg.includes('sales') || lowerMsg.includes('report')) {
            return {
                message: `Based on my analysis of your data, you have ${context.orders.length} recent orders. Sales are steady, indicating a stable market position. The top performing product appears to be ${context.products[0]?.name || 'unknown'}. \n\n**Tip:** Consider bundling this top product with slower-moving items to increase average order value.`
            };
        }

        if (lowerMsg.includes('restock') || lowerMsg.includes('inventory')) {
            const lowStock = context.products.find(p => p.current_stock < 10);
            if (lowStock) {
                return {
                    message: `I've detected that ${lowStock.name} is critically low on stock (${lowStock.current_stock} left). To prevent lost sales, I recommend restocking immediately.`,
                    proposedAction: {
                        type: 'RESTOCK_ITEM',
                        description: `Restock 50 units of ${lowStock.name}`,
                        payload: { productId: lowStock.id, quantity: 50 }
                    }
                };
            }
            return { message: "Inventory levels look healthy overall. Keeping optimal stock levels reduces carrying costs while ensuring availability." };
        }

        if (lowerMsg.includes('price') || lowerMsg.includes('cost')) {
            const product = context.products[0];
            if (product) {
                return {
                    message: `${product.name} is currently priced at ₱${product.selling_price}. My market analysis suggests a 10% increase could improve margins without significantly impacting demand.`,
                    proposedAction: {
                        type: 'UPDATE_PRICE',
                        description: `Increase price of ${product.name} to ₱${(product.selling_price * 1.1).toFixed(2)}`,
                        payload: { productId: product.id, newPrice: parseFloat((product.selling_price * 1.1).toFixed(2)) }
                    }
                };
            }
        }

        return {
            message: "I am currently operating in local simulation mode to ensure continuity. I can still assist you with data analysis, inventory checks, and strategic planning. Try asking about 'sales trends' or 'restock needs'."
        };
    },

    // 9. Chat with AI (Context Aware - Powered by Gemini or Custom)
    chatWithAI: async (message: string, context: { products: any[], orders: any[], customers: any[] }, retryCount = 0): Promise<ChatResponse> => {
        try {
            const provider = localStorage.getItem("ai_provider") || 'copilot-api';
            const MAX_RETRIES = 3;

            // --- COPILOT API ---
            if (provider === 'copilot-api') {
                const systemPrompt = aiService.generateSystemPrompt(message, context);

                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout for complex logic

                    const response = await fetch("/api/v1/chat/completions", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            model: "gpt-4", // Use high quality model
                            messages: [
                                { role: "user", content: systemPrompt }
                            ]
                        }),
                        signal: controller.signal
                    });

                    clearTimeout(timeoutId);

                    if (!response.ok) {
                        const errText = await response.text();
                        throw new Error(`Copilot API Error: ${response.status} - ${errText}`);
                    }

                    const data = await response.json();
                    const content = data.choices?.[0]?.message?.content;

                    if (!content) throw new Error("No content received from Copilot API");

                    // Clean up markdown
                    const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

                    try {
                        return JSON.parse(cleanContent) as ChatResponse;
                    } catch (e) {
                        console.warn("AI did not return valid JSON:", cleanContent);
                        return { message: cleanContent };
                    }

                } catch (e: any) {
                    console.error("Copilot API failed", e);

                    if (e.message.includes("quota_exceeded") || e.message.includes("429")) {
                        return {
                            message: "⚠️ **Copilot Error:** Your GitHub Copilot quota is exceeded or rate limited. Please check your subscription or try again later."
                        };
                    }

                    // Fallback to simulation
                    return aiService.simulateResponse(message, context);
                }
            }

            // --- GEMINI AI ---
            if (provider === 'gemini') {
                try {
                    const apiKey = localStorage.getItem("gemini_api_key");
                    if (!apiKey) {
                        return {
                            message: "⚠️ **Gemini Error:** Missing Gemini API Key. Please configure it in settings."
                        };
                    }

                    const genAI = new GoogleGenerativeAI(apiKey);
                    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

                    const systemPrompt = aiService.generateSystemPrompt(message, context);

                    const result = await model.generateContent(systemPrompt);
                    const response = await result.response;
                    const content = response.text();

                    if (!content) throw new Error("No content received from Gemini API");

                    // Clean up markdown
                    const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

                    try {
                        return JSON.parse(cleanContent) as ChatResponse;
                    } catch (e) {
                        console.warn("AI did not return valid JSON:", cleanContent);
                        return { message: cleanContent };
                    }

                } catch (e: any) {
                    console.error("Gemini API failed", e);
                    return {
                        message: `⚠️ **Gemini Error:** ${e.message}. Please check your API key and try again.`
                    };
                }
            }

            // --- ERNIE AI (Free Hugging Face API) ---
            if (provider === 'ernie') {
                try {
                    const systemPrompt = aiService.generateSystemPrompt(message, context);

                    // Use Hugging Face Inference API for ERNIE models via local proxy to avoid CORS
                    const hfToken = localStorage.getItem("hf_token");
                    const headers: any = {
                        "Content-Type": "application/json"
                    };

                    if (hfToken) {
                        headers["Authorization"] = `Bearer ${hfToken}`;
                    }

                    const response = await fetch("/api/hf/models/baidu/ERNIE-4.5-21B-A3B", {
                        method: "POST",
                        headers: headers,
                        body: JSON.stringify({
                            inputs: systemPrompt,
                            parameters: {
                                max_new_tokens: 1000,
                                temperature: 0.7,
                                top_p: 0.9,
                                return_full_text: false
                            }
                        })
                    });

                    if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(`ERNIE API Error: ${response.status} - ${errorText}`);
                    }

                    const data = await response.json();
                    const content = data[0]?.generated_text;

                    if (!content) throw new Error("No content received from ERNIE API");

                    // Clean up markdown
                    const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

                    try {
                        return JSON.parse(cleanContent) as ChatResponse;
                    } catch (e) {
                        console.warn("AI did not return valid JSON:", cleanContent);
                        return { message: cleanContent };
                    }

                } catch (e: any) {
                    console.error("ERNIE API failed", e);
                    return {
                        message: `⚠️ **ERNIE Error:** ${e.message}. The free API might be rate limited. Try again later.`
                    };
                }
            }

            // --- FREE CHATGPT WRAPPER ---
            if (provider === 'free-chatgpt') {
                const prompt = aiService.generateSystemPrompt(message, context);

                try {
                    // Add a timeout to the fetch request
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

                    const response = await fetch("/api/conversation", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            message: prompt
                        }),
                        signal: controller.signal
                    });

                    clearTimeout(timeoutId);

                    if (!response.ok) throw new Error(`Wrapper Error: ${response.status}`);
                    const data = await response.json();

                    if (data.status === "success") {
                        // The wrapper returns the text directly in 'result'
                        let responseText = data.result;

                        // Check for session expired message and retry
                        if (responseText && responseText.includes("Session expired, please try again.")) {
                            if (retryCount < MAX_RETRIES) {
                                console.log(`Session expired detected. Retrying request... (${retryCount + 1}/${MAX_RETRIES})`);
                                // Small delay to allow backend to potentially recover or just to avoid spamming
                                await new Promise(resolve => setTimeout(resolve, 1500));
                                return aiService.chatWithAI(message, context, retryCount + 1);
                            } else {
                                console.warn("Max retries reached for session expiry.");
                            }
                        }

                        // Clean up potential markdown
                        responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

                        try {
                            return JSON.parse(responseText) as ChatResponse;
                        } catch (e) {
                            // If not valid JSON, return as message but log warning
                            console.warn("AI did not return valid JSON:", responseText);
                            return { message: responseText };
                        }
                    } else {
                        throw new Error(data.message || "Unknown error from wrapper");
                    }
                } catch (e: any) {
                    console.error("Free ChatGPT failed", e);
                    // Fallback to simulation
                    return aiService.simulateResponse(message, context);
                }
            }

            return aiService.simulateResponse(message, context);

        } catch (error: any) {
            console.error("Gemini/Provider Critical Error:", error);
            console.warn("All AI models failed. Switching to Simulation Mode.");
            return aiService.simulateResponse(message, context);
        }
    },

    generateSystemPrompt: (message: string, context: any) => {
        // Calculate some basic metrics to feed the AI
        const totalInventoryValue = context.products.reduce((acc: number, p: any) => acc + (p.current_stock * p.selling_price), 0);
        const lowStockCount = context.products.filter((p: any) => p.current_stock < 10).length;

        return `
        You are **TunaBrain v3.0**, a highly intelligent and helpful **Business Assistant** for "Nenita's Online Tuna Shop".
        Your goal is to assist the store owner in running their business efficiently. You are friendly, professional, and deeply knowledgeable about their data.

        ### 🧠 HOW YOU THINK (Smart Assistant Mode):
        1.  **Be Helpful First**: Answer the user's question directly and clearly. Don't lecture them unless they ask for advice.
        2.  **Watch the Numbers**: You have access to live data. If the user suggests a price change, quietly check the margin. If it looks bad, politely warn them *after* acknowledging their request.
        3.  **Proactive but Polite**: If you see low stock, mention it naturally: "By the way, I noticed Tuna Loin is running low. Want me to draft a restock order?"
        4.  **Conversational**: Speak like a human assistant, not a robot. Use "I think," "It looks like," or "Here is what I found."
        5.  **POS Expert**: You are also a Point-of-Sale expert. You can help with bundling, calculating totals, and suggesting upsells during checkout.

        ### 📊 LIVE BUSINESS METRICS:
        - **Total Inventory Value**: ₱${totalInventoryValue.toLocaleString()}
        - **Critical Stock Alerts**: ${lowStockCount} items need attention.
        
        ### 🏢 DEEP DIVE DATA:
        - **Inventory Assets**: ${JSON.stringify(context.products.map((p: any) => ({
            id: p.id,
            name: p.name,
            stock: p.current_stock,
            cost: p.cost_price || p.selling_price * 0.7, // Estimate cost if missing
            price: p.selling_price,
            unit: p.unit_of_measure,
            margin: p.selling_price > 0 ? ((p.selling_price - (p.cost_price || p.selling_price * 0.7)) / p.selling_price * 100).toFixed(1) + '%' : '0%'
        })))}
        - **Recent Orders**: ${JSON.stringify(context.orders.slice(0, 5).map((o: any) => ({ id: o.id, total: o.total_amount, status: o.status })))}
        - **Customer Base**: ${JSON.stringify(context.customers.slice(0, 5).map((c: any) => ({ id: c.id, name: c.full_name, email: c.email })))}
        
        ### 🛒 POS CONTEXT (If applicable):
        - **Current Cart**: ${context.cart ? JSON.stringify(context.cart) : "Empty"}
        - **Shift Status**: ${context.shift ? `Open (Started: ${context.shift.startTime}, Cash: ${context.shift.startingCash})` : "Closed"}
        
        ### 🗣️ USER QUERY: "${message}"

        ### ⚡ ACTION EXECUTION INSTRUCTIONS:
        If the user asks to perform an action, you MUST return a JSON object with the "proposedAction" field.
        
        **Output Format**: Return ONLY a raw JSON object.
        
        ### 🛠️ RESPONSE STRUCTURE (JSON):
        {
          "message": "Your natural, helpful response here.",
          "proposedAction": {
            "type": "ACTION_TYPE", 
            "description": "Summary of action",
            "payload": { ... }
          }
        }

        **Valid Action Types & Payloads:**
        1. **CREATE_PRODUCT**: { name, price, sku, category, stock }
        2. **UPDATE_PRICE**: { productId, newPrice }
        3. **RESTOCK_ITEM**: { productId, quantity }
        4. **DELETE_PRODUCT**: { productId }
        5. **UPDATE_ORDER_STATUS**: { orderId, status }
        6. **BLOCK_CUSTOMER**: { customerId }
        7. **CREATE_SUPPLIER**: { name, contact_person, email, phone, address }
        8. **UPDATE_SUPPLIER**: { supplierId, updates: { ...fields } }
        9. **DELETE_SUPPLIER**: { supplierId }
        10. **MANAGE_USER_ROLE**: { userId, role: "admin"|"user" }
        11. **GENERIC_DB_ACTION**: { 
             "table": "products" | "orders" | "customers" | "suppliers" | "profiles" | "store_settings" | "transactions" | "stock_adjustments",
             "operation": "INSERT" | "UPDATE" | "DELETE",
             "data": { ...data to insert/update },
             "match": { ...where clause for update/delete, e.g. { "id": "123" } }
           }
        12. **OPEN_PRODUCT_FORM**: { name, price, description, category, stock }
            - Use this when the user wants to add a new product. 
            - Pre-fill any details the user provided in the payload. 
            - Example: User says "Add a Tuna Loin for 500", payload: { "name": "Tuna Loin", "price": 500 }
        13. **OPEN_SUPPLIER_FORM**: { name, contact_person, email, phone }
            - Use this when the user wants to add a new supplier.
        14. **OPEN_CUSTOMER_FORM**: { name, email, phone, address }
            - Use this when the user wants to add a new customer manually.
        15. **OPEN_DISCOUNT_FORM**: { code, percentage, valid_until }
            - Use this when the user wants to create a discount coupon.
        16. **OPEN_ORDER_FORM**: { customer_id, items: [{ product_id, quantity }] }
            - Use this when the user wants to manually draft a new sales order.
        17. **OPEN_REFUND_FORM**: { order_id, reason, amount }
            - Use this when the user wants to process a refund or return.
        18. **OPEN_EXPENSE_FORM**: { category, amount, description }
            - Use this when the user wants to log a business expense (utility bill, rent, etc.).
        19. **OPEN_REPORT_SETTINGS**: { type, date_range }
            - Use this when the user wants to generate or configure a custom report.
        20. **ADD_TO_CART**: { productId, quantity }
            - Use this when the user wants to add an item to the POS cart via voice/chat.
        21. **CALCULATE_PACK_PRICE**: { items: [{ name, price, qty }] }
            - Use this when the user asks for a bundle price calculation.

        If the user is just chatting, set "proposedAction": null.
        
        **Example Response (User: "Discount Tuna by 50%"):**
        {
          "message": "I can do that, but just a heads-up: a 50% discount would drop your margin to -10%, so you'd be losing money on each sale. Would you prefer a safer 15% discount instead?",
          "proposedAction": {
            "type": "UPDATE_PRICE",
            "description": "Apply optimized 15% discount to Yellowfin Tuna",
            "payload": { "productId": "...", "newPrice": 850 }
          }
        }

        IMPORTANT: Respond with VALID JSON ONLY. Do not use markdown blocks.
      `;
    },

    // 13. AI Helper Methods for UI Forms
    generateProductDescription: async (name: string, category: string): Promise<string> => {
        const prompt = `Write a professional, high-converting product description for "${name}" in the category "${category}". 
      Keep it under 50 words. Focus on freshness, quality, and origin. 
      IMPORTANT: Return ONLY the description text itself. Do not use quotes. Do not include introductory phrases like "Here is a description".`;

        const response = await aiService.chatWithAI(prompt, { products: [], orders: [], customers: [] });

        // Clean up response just in case
        let cleanText = response.message.replace(/^"|"$/g, '').trim();
        cleanText = cleanText.replace(/Here is.*?:/i, '').trim();

        return cleanText;
    },

    optimizeProductPrice: async (name: string, currentPrice: number, marketContext: any = {}): Promise<{ price: number, reason: string }> => {
        const prompt = `Suggest an optimal selling price for "${name}". Current proposed price is ₱${currentPrice}. 
      Consider that competitor average is around ₱${currentPrice * 1.1} (mock data).
      Return a JSON with "suggestedPrice" (number) and "reason" (string).`;

        const response = await aiService.chatWithAI(prompt, { products: [], orders: [], customers: [] });
        // Try to parse the response message if it contains JSON, otherwise fallback
        try {
            const jsonMatch = response.message.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const data = JSON.parse(jsonMatch[0]);
                return { price: data.suggestedPrice, reason: data.reason };
            }
        } catch (e) {
            console.error("Failed to parse price optimization", e);
        }
        return { price: currentPrice, reason: "AI could not determine a better price, sticking to current." };
    },

    // 10. Action Executor
    executeAction: async (action: ChatResponse['proposedAction']): Promise<{ success: boolean; error?: string }> => {
        if (!action) return { success: false, error: "No action provided" };

        try {
            if (action.type === 'UPDATE_PRICE') {
                const { error } = await supabase
                    .from('products')
                    .update({ selling_price: action.payload.newPrice })
                    .eq('id', action.payload.productId);
                if (error) throw error;
                return { success: true };
            }

            if (action.type === 'RESTOCK_ITEM') {
                // Mock PO creation logic
                const { error } = await supabase
                    .from('stock_adjustments')
                    .insert({
                        product_id: action.payload.productId,
                        quantity: action.payload.quantity,
                        adjustment_type: 'add',
                        reason: 'AI Auto-Restock'
                    });

                // Actually update the stock too
                const { data: product } = await supabase.from('products').select('current_stock').eq('id', action.payload.productId).single();
                if (product) {
                    await supabase.from('products').update({ current_stock: product.current_stock + action.payload.quantity }).eq('id', action.payload.productId);
                }

                if (error) throw error;
                return { success: true };
            }

            if (action.type === 'CREATE_PRODUCT') {
                // We need user_id, let's fetch current session
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) throw new Error("No active session. Please log in again.");

                const { error } = await supabase
                    .from('products')
                    .insert({
                        name: action.payload.name || "New Product",
                        sku: action.payload.sku || `SKU-${Date.now()}`,
                        category: action.payload.category || "fresh",
                        selling_price: parseFloat(action.payload.price) || 0,
                        cost_price: (parseFloat(action.payload.price) || 0) * 0.7,
                        current_stock: 0,
                        unit_of_measure: 'kg',
                        reorder_level: 10,
                        user_id: session.user.id
                    });

                if (error) throw error;
                return { success: true };
            }

            if (action.type === 'DELETE_PRODUCT') {
                const { error } = await supabase
                    .from('products')
                    .delete()
                    .eq('id', action.payload.productId);

                if (error) throw error;
                return { success: true };
            }

            if (action.type === 'UPDATE_ORDER_STATUS') {
                const { error } = await supabase
                    .from('orders')
                    .update({ status: action.payload.status })
                    .eq('id', action.payload.orderId);

                if (error) throw error;
                return { success: true };
            }

            if (action.type === 'BLOCK_CUSTOMER') {
                console.log("Blocking customer:", action.payload.customerId);
                return { success: true };
            }

            if (action.type === 'CREATE_SUPPLIER') {
                const { error } = await supabase
                    .from('suppliers')
                    .insert(action.payload);
                if (error) throw error;
                return { success: true };
            }

            if (action.type === 'UPDATE_SUPPLIER') {
                const { error } = await supabase
                    .from('suppliers')
                    .update(action.payload.updates)
                    .eq('id', action.payload.supplierId);
                if (error) throw error;
                return { success: true };
            }

            if (action.type === 'DELETE_SUPPLIER') {
                const { error } = await supabase
                    .from('suppliers')
                    .delete()
                    .eq('id', action.payload.supplierId);
                if (error) throw error;
                return { success: true };
            }

            if (action.type === 'MANAGE_USER_ROLE') {
                // This assumes there's a user_roles table or similar, as modifying auth.users is restricted
                const { error } = await supabase
                    .from('user_roles')
                    .upsert({ user_id: action.payload.userId, role: action.payload.role });
                if (error) throw error;
                return { success: true };
            }

            if (action.type === 'GENERIC_DB_ACTION') {
                const { table, operation, data, match } = action.payload;

                let query: any = supabase.from(table);

                if (operation === 'INSERT') {
                    query = query.insert(data);
                } else if (operation === 'UPDATE') {
                    query = query.update(data);
                } else if (operation === 'DELETE') {
                    query = query.delete();
                }

                // Apply matches for UPDATE/DELETE
                if (operation !== 'INSERT' && match) {
                    Object.entries(match).forEach(([key, value]) => {
                        query = query.eq(key, value);
                    });
                }

                const { error } = await query;
                if (error) throw error;
                return { success: true };
            }

            return { success: false, error: "Unknown action type" };
        } catch (error: any) {
            console.error("Action execution failed:", error);
            return { success: false, error: error.message || "Unknown error occurred" };
        }
    }
};
