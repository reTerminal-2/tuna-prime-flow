
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { addDays, subDays } from "date-fns";

// --- Helpers ---

async function getUserId() {
    let userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) {
        const { data: profiles } = await supabase.from('profiles').select('id').limit(1);
        if (profiles && profiles.length > 0) {
            userId = profiles[0].id;
        }
    }
    return userId;
}

// --- Granular Seeders ---

export const seedSuppliers = async (userId: string) => {
    const mockSuppliers = [
        { name: "Ocean Harvest Co.", contact_person: "Captain Sarah", email: "sarah@oceanharvest.com", phone: "0917-123-4567", address: "General Santos City Port", notes: "Best source for Yellowfin Tuna." },
        { name: "Deep Blue Logistics", contact_person: "Mike Waters", email: "mike@deepblue.com", phone: "0918-987-6543", address: "Davao City Cold Storage", notes: "Reliable frozen logistics." },
        { name: "Pacific Canning Supply", contact_person: "Jenny Tin", email: "jenny@pacificcan.com", phone: "0920-555-0000", address: "Manila Industrial Park", notes: "Canned goods wholesale." },
        { name: "AquaFresh Farms", contact_person: "Roberto Gomez", email: "roberto@aquafresh.ph", phone: "0915-222-3333", address: "Batangas City", notes: "Aquaculture supplier." }
    ];

    const supplierMap = new Map();

    for (const supplier of mockSuppliers) {
        const { data: existing } = await supabase.from("suppliers").select("id").eq("email", supplier.email).maybeSingle();
        if (!existing) {
            const { data } = await supabase.from("suppliers").insert({ ...supplier, user_id: userId }).select("id").single();
            if (data) supplierMap.set(supplier.name, data.id);
        } else {
            supplierMap.set(supplier.name, existing.id);
        }
    }
    return supplierMap;
};

export const seedProducts = async (userId: string, supplierMap: Map<string, string>) => {
    const mockProducts = [
        { name: "Premium Yellowfin Tuna Loin", sku: "TUNA-YF-LOIN-001", category: "fresh", selling_price: 850.00, cost_price: 600.00, current_stock: 45, unit_of_measure: "kg", reorder_level: 20, expiration_date: addDays(new Date(), 5).toISOString(), description: "Sashimi grade yellowfin tuna loin.", supplier_id: supplierMap.get("Ocean Harvest Co.") },
        { name: "Bluefin Tuna Belly (Otoro)", sku: "TUNA-BF-OTORO-002", category: "fresh", selling_price: 2500.00, cost_price: 1800.00, current_stock: 5, unit_of_measure: "kg", reorder_level: 10, expiration_date: addDays(new Date(), 2).toISOString(), description: "Premium fatty tuna belly.", supplier_id: supplierMap.get("Ocean Harvest Co.") },
        { name: "Frozen Tuna Steaks", sku: "TUNA-FZ-STK-003", category: "frozen", selling_price: 450.00, cost_price: 300.00, current_stock: 500, unit_of_measure: "pack", reorder_level: 50, expiration_date: addDays(new Date(), 180).toISOString(), description: "Vacuum sealed 500g steaks.", supplier_id: supplierMap.get("Deep Blue Logistics") },
        { name: "Canned Tuna in Oil", sku: "TUNA-CAN-OIL-004", category: "canned", selling_price: 45.00, cost_price: 30.00, current_stock: 2000, unit_of_measure: "can", reorder_level: 200, expiration_date: addDays(new Date(), 365).toISOString(), description: "Standard 150g can.", supplier_id: supplierMap.get("Pacific Canning Supply") },
        { name: "Spicy Tuna Mix", sku: "TUNA-SPC-MIX-005", category: "other", selling_price: 120.00, cost_price: 80.00, current_stock: 0, unit_of_measure: "tub", reorder_level: 20, expiration_date: addDays(new Date(), 10).toISOString(), description: "Ready, spicy tuna mix for sushi.", supplier_id: supplierMap.get("AquaFresh Farms") },
        { name: "Gourmet Dried Tuna (Tapa)", sku: "TUNA-DRY-TAPA-006", category: "other", selling_price: 350.00, cost_price: 200.00, current_stock: 80, unit_of_measure: "pack", reorder_level: 30, expiration_date: addDays(new Date(), 90).toISOString(), description: "Marinated and dried tuna slices.", supplier_id: supplierMap.get("AquaFresh Farms") }
    ];

    const insertedProductIds: string[] = [];
    for (const product of mockProducts) {
        const { data: existing } = await supabase.from("products").select("id").eq("sku", product.sku).maybeSingle();
        if (!existing) {
            const { data } = await supabase.from("products").insert({ ...product, user_id: userId } as any).select("id").single();
            if (data) insertedProductIds.push(data.id);
        } else {
            insertedProductIds.push(existing.id);
        }
    }
    return insertedProductIds;
};

export const seedPricingRules = async (userId: string, productIds: string[]) => {
    const rules = [
        { name: "Clearance: Expiring Soon", rule_type: "expiration_based", is_active: true, priority: 10, condition_days: 3, price_adjustment_percent: -30, applies_to_category: "fresh", description: "30% off items expiring in 3 days", user_id: userId },
        { name: "Happy Hour: Canned Goods", rule_type: "demand_based", is_active: true, priority: 5, price_adjustment_percent: -10, applies_to_category: "canned", description: "10% off canned goods promo", user_id: userId },
        { name: "Frozen Bulk Discount", rule_type: "demand_based", is_active: true, priority: 4, price_adjustment_percent: -5, applies_to_category: "frozen", description: "5% off all frozen items", user_id: userId },
        { name: "Premium Fresh Markup", rule_type: "demand_based", is_active: false, priority: 8, price_adjustment_percent: 15, applies_to_category: "fresh", description: "Temporary price increase for fresh catch", user_id: userId },
        { name: "Weekend Special: Other", rule_type: "demand_based", is_active: true, priority: 3, price_adjustment_percent: -12, applies_to_category: "other", description: "Promo for dried goods", user_id: userId },
        { name: "Holiday Surge Pricing", rule_type: "demand_based", is_active: false, priority: 1, price_adjustment_percent: 10, applies_to_category: "all", description: "General price increase", user_id: userId },
        { name: "Flash Sale: Sashimi", rule_type: "age_based", is_active: true, priority: 9, price_adjustment_percent: -25, applies_to_category: "fresh", description: "Quick sale for sashimi grade", user_id: userId }
    ];

    const ruleIds = [];
    for (const rule of rules) {
        const { data: existing } = await supabase.from("pricing_rules").select("id").eq("name", rule.name).maybeSingle();
        if (!existing) {
            const { data } = await supabase.from("pricing_rules").insert(rule).select('id').single();
            if (data) ruleIds.push(data.id);
        } else {
            ruleIds.push(existing.id);
        }
    }

    if (productIds.length > 0 && ruleIds.length > 0) {
        const logs = [];
        for (let i = 0; i < 15; i++) {
            const prodId = productIds[Math.floor(Math.random() * productIds.length)];
            const ruleId = ruleIds[Math.floor(Math.random() * ruleIds.length)];
            const oldPrice = 100 + Math.random() * 500;
            const newPrice = oldPrice * (Math.random() > 0.5 ? 1.1 : 0.9);
            logs.push({
                product_id: prodId,
                rule_id: ruleId,
                old_price: parseFloat(oldPrice.toFixed(2)),
                new_price: parseFloat(newPrice.toFixed(2)),
                reason: i % 2 === 0 ? "Automated Rule Application" : "Manual Bulk Update",
                user_id: userId,
                created_at: subDays(new Date(), Math.floor(Math.random() * 30)).toISOString()
            });
        }
        await supabase.from("pricing_logs").insert(logs);
    }
    return ruleIds;
};

export const seedTransactions = async (userId: string, productIds: string[]) => {
    let ghostUserMode = false;
    const randomUuid = crypto.randomUUID();

    // Test Ghost Mode
    const { error: testError } = await supabase.from("orders").insert({ user_id: randomUuid, status: 'pending', total_amount: 100, payment_status: 'pending' } as any);
    if (!testError) {
        ghostUserMode = true;
        await supabase.from("orders").delete().eq("user_id", randomUuid);
    }

    if (productIds.length > 0) {
        const { data: products } = await supabase.from("products").select("*").in("id", productIds);
        if (products && products.length > 0) {
            const mockTransactions = [];
            const mockOrders = [];
            const mockOrderItems = [];

            for (let i = 0; i < 50; i++) {
                const randomProduct = products[Math.floor(Math.random() * products.length)];
                const qty = Math.floor(Math.random() * 10) + 1;
                const pastDate = subDays(new Date(), Math.floor(Math.random() * 60));

                let orderUserId = userId;
                if (ghostUserMode) {
                    const ghostId = `00000000-0000-0000-0000-00000000000${(i % 5) + 1}`;
                    orderUserId = ghostId;
                }

                mockTransactions.push({
                    product_id: randomProduct.id,
                    quantity: qty,
                    unit_price: randomProduct.selling_price,
                    cost_price: randomProduct.cost_price,
                    total_amount: randomProduct.selling_price * qty,
                    profit: (randomProduct.selling_price - randomProduct.cost_price) * qty,
                    created_by: userId,
                    transaction_date: pastDate.toISOString(),
                    notes: `Order #${1000 + i}`
                });

                if (userId) {
                    const orderId = crypto.randomUUID();
                    mockOrders.push({
                        id: orderId,
                        user_id: orderUserId,
                        status: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'][Math.floor(Math.random() * 5)],
                        total_amount: randomProduct.selling_price * qty,
                        created_at: pastDate.toISOString(),
                        updated_at: pastDate.toISOString(),
                        payment_status: ['paid', 'pending', 'failed'][Math.floor(Math.random() * 3)]
                    });
                    mockOrderItems.push({
                        order_id: orderId,
                        product_id: randomProduct.id,
                        quantity: qty,
                        unit_price: randomProduct.selling_price,
                        total_price: randomProduct.selling_price * qty
                    });
                }
            }

            await supabase.from("transactions").insert(mockTransactions);
            if (mockOrders.length > 0) {
                const { error: orderError } = await supabase.from("orders").insert(mockOrders);
                if (!orderError) {
                    await supabase.from("order_items").insert(mockOrderItems);
                    if (ghostUserMode) {
                        const ghostProfiles = [];
                        for (let k = 1; k <= 5; k++) {
                            const ghostId = `00000000-0000-0000-0000-00000000000${k}`;
                            ghostProfiles.push({ id: ghostId, email: `mock_customer_${k}@example.com`, full_name: `Mock Customer ${k}`, avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${k}` });
                        }
                        await supabase.from("profiles").upsert(ghostProfiles);
                    }
                }
            }
        }
    }
};

// --- Main Control Functions ---

export const clearMockData = async () => {
    try {
        toast.loading("Clearing all mock data...");
        // Delete in reverse order of dependencies
        await supabase.from("stock_adjustments").delete().neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all
        await supabase.from("pricing_logs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
        await supabase.from("order_items").delete().neq("id", "00000000-0000-0000-0000-000000000000");
        await supabase.from("orders").delete().neq("id", "00000000-0000-0000-0000-000000000000");
        await supabase.from("transactions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
        await supabase.from("products").delete().neq("id", "00000000-0000-0000-0000-000000000000");
        await supabase.from("suppliers").delete().neq("id", "00000000-0000-0000-0000-000000000000");
        await supabase.from("pricing_rules").delete().neq("id", "00000000-0000-0000-0000-000000000000");

        toast.success("All mock data cleared.");
    } catch (error: any) {
        console.error("Clear Error:", error);
        toast.error(`Failed to clear data: ${error.message}`);
    }
};

export const runGranularSeeder = async (settings: { suppliers: boolean; products: boolean; pricing: boolean; transactions: boolean }) => {
    try {
        toast.loading("Running Selected Mock Seeders...");
        const userId = await getUserId();
        if (!userId) throw new Error("No user found.");

        let supplierMap = new Map();
        let productIds: string[] = [];

        if (settings.suppliers) {
            supplierMap = await seedSuppliers(userId);
            toast.info("Suppliers seeded.");
        }

        if (settings.products) {
            // If suppliers weren't just seeded, we try to fetch existing ones to link to
            if (supplierMap.size === 0) {
                const { data: exSups } = await supabase.from("suppliers").select("name, id");
                exSups?.forEach(s => supplierMap.set(s.name, s.id));
            }
            productIds = await seedProducts(userId, supplierMap);
            toast.info("Products seeded.");
        }

        if (settings.pricing) {
            if (productIds.length === 0) {
                const { data: exProds } = await supabase.from("products").select("id");
                productIds = exProds?.map(p => p.id) || [];
            }
            await seedPricingRules(userId, productIds);
            toast.info("Pricing Rules seeded.");
        }

        if (settings.transactions) {
            if (productIds.length === 0) {
                const { data: exProds } = await supabase.from("products").select("id");
                productIds = exProds?.map(p => p.id) || [];
            }
            await seedTransactions(userId, productIds);
            toast.info("Transactions/Orders seeded.");
        }

        toast.success("Seeding Operations Complete.");

    } catch (error: any) {
        console.error("Seeder Error:", error);
        toast.error(`Seeding Failed: ${error.message}`);
    }
};

// Backward compatibility or "Quick Start"
export const enableMockDemo = async () => {
    await runGranularSeeder({ suppliers: true, products: true, pricing: true, transactions: true });
};
