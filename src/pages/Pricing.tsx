import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calculator, TrendingDown, Clock, Receipt, Plus, Settings2, Sparkles, TrendingUp, DollarSign, BarChart3, Users, Percent, Search } from "lucide-react";
import { toast } from "sonner";
import { aiService, AIInsight } from "@/services/aiService";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface PricingRule {
  id: string;
  name: string;
  rule_type: string;
  description: string | null;
  is_active: boolean;
  priority: number;
  condition_days: number | null;
  price_adjustment_percent: number | null;
  applies_to_category: string | null;
}

interface Product {
  id: string;
  name: string;
  selling_price: number;
  category: string;
  expiration_date: string | null;
}

const Pricing = () => {
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [pricingLogs, setPricingLogs] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateRuleOpen, setIsCreateRuleOpen] = useState(false);
  const [isApplyRulesOpen, setIsApplyRulesOpen] = useState(false);
  
  const [taxSettings, setTaxSettings] = useState({
    vatRate: "12",
    includeVat: true,
    seniorPwdDiscount: true,
    withholdingTax: false,
    withholdingTaxRate: "5",
  });

  const [newRule, setNewRule] = useState({
    name: "",
    rule_type: "expiration_based",
    description: "",
    condition_days: "",
    price_adjustment_percent: "",
    applies_to_category: "all",
    priority: "5",
  });

  const [calculatorInputs, setCalculatorInputs] = useState({
    basePrice: "",
    category: "fresh",
    daysToExpiry: "",
  });

  const [selectedCategory, setSelectedCategory] = useState("all");
  const [aiSuggestions, setAiSuggestions] = useState<AIInsight[]>([]);

  // Bulk Update State
  const [bulkUpdatePercent, setBulkUpdatePercent] = useState("");
  const [bulkUpdateCategory, setBulkUpdateCategory] = useState("all");

  // Competitor Data (Mocked)
  const competitorData = [
    { name: "Ocean Basket", price: 120, difference: "+5%" },
    { name: "Seafood City", price: 110, difference: "-4%" },
    { name: "Market Local", price: 115, difference: "0%" },
  ];

  // Price Trend Data (Mocked)
  const trendData = [
    { name: 'Jan', price: 100 },
    { name: 'Feb', price: 105 },
    { name: 'Mar', price: 102 },
    { name: 'Apr', price: 108 },
    { name: 'May', price: 115 },
    { name: 'Jun', price: 112 },
  ];

  useEffect(() => {
    fetchPricingRules();
    fetchPricingLogs();
    fetchProducts();
    
    const savedTaxSettings = localStorage.getItem("taxSettings");
    if (savedTaxSettings) {
      setTaxSettings(JSON.parse(savedTaxSettings));
    }
  }, []);

  useEffect(() => {
    if (products.length > 0) {
      (async () => {
        const suggestions = await aiService.generatePricingSuggestions(products);
        setAiSuggestions(suggestions);
      })();
    }
  }, [products]);

  const fetchPricingRules = async () => {
    try {
      const { data, error } = await supabase
        .from("pricing_rules")
        .select("*")
        .order("priority", { ascending: false });

      if (error) throw error;
      setRules(data || []);
    } catch (error) {
      console.error("Error fetching pricing rules:", error);
      toast.error("Unable to load pricing rules. Please refresh the page or check your internet connection.");
    } finally {
      setLoading(false);
    }
  };

  const fetchPricingLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("pricing_logs")
        .select("*, products(name, sku)")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setPricingLogs(data || []);
    } catch (error) {
      console.error("Error fetching pricing logs:", error);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, selling_price, category, expiration_date")
        .order("name");

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const toggleRuleStatus = async (ruleId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("pricing_rules")
        .update({ is_active: !currentStatus })
        .eq("id", ruleId);

      if (error) throw error;

      toast.success(`Rule ${!currentStatus ? "activated" : "deactivated"}`);
      fetchPricingRules();
    } catch (error: any) {
      console.error("Error updating rule:", error);
      toast.error(error.message || "Failed to update rule");
    }
  };

  const handleCreateRule = async () => {
    try {
      if (!newRule.name || !newRule.price_adjustment_percent) {
        toast.error("Please fill in the rule name and price adjustment percentage to continue.");
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to create pricing rules");
        return;
      }

      const ruleData: any = {
        name: newRule.name,
        rule_type: newRule.rule_type as "expiration_based" | "age_based" | "demand_based",
        is_active: true,
        priority: parseInt(newRule.priority),
        price_adjustment_percent: parseFloat(newRule.price_adjustment_percent),
        user_id: user.id,
      };

      if (newRule.description) {
        ruleData.description = newRule.description;
      }

      if (newRule.condition_days) {
        ruleData.condition_days = parseInt(newRule.condition_days);
      }

      if (newRule.applies_to_category && newRule.applies_to_category !== "all") {
        ruleData.applies_to_category = newRule.applies_to_category as "fresh" | "frozen" | "canned" | "other";
      }

      const { error } = await supabase
        .from("pricing_rules")
        .insert(ruleData);

      if (error) throw error;

      toast.success("Pricing rule created successfully");
      setIsCreateRuleOpen(false);
      setNewRule({
        name: "",
        rule_type: "expiration_based",
        description: "",
        condition_days: "",
        price_adjustment_percent: "",
        applies_to_category: "all",
        priority: "5",
      });
      fetchPricingRules();
    } catch (error: any) {
      console.error("Error creating rule:", error);
      const errorMsg = error.message || "";
      
      if (errorMsg.includes("duplicate")) {
        toast.error("A pricing rule with this name already exists. Please use a different name.");
      } else if (errorMsg.includes("invalid")) {
        toast.error("Please check that all values are valid numbers and the rule type is selected.");
      } else if (errorMsg.includes("permission")) {
        toast.error("You don't have permission to create pricing rules. Please log in again.");
      } else {
        toast.error("Unable to create pricing rule. Please check all fields and try again.");
      }
    }
  };

  const handleApplyRulesToProducts = async () => {
    try {
      const activeRules = rules.filter(r => r.is_active);
      if (activeRules.length === 0) {
        toast.error("No active pricing rules found. Please create and activate at least one rule before applying prices.");
        return;
      }

      let filteredProducts = products;
      if (selectedCategory !== "all") {
        filteredProducts = products.filter(p => p.category === selectedCategory);
      }

      if (filteredProducts.length === 0) {
        toast.error(`No products found in the ${selectedCategory === 'all' ? '' : selectedCategory} category. Please select a different category or add products first.`);
        return;
      }

      let updatedCount = 0;
      for (const product of filteredProducts) {
        let newPrice = product.selling_price;
        let appliedRule = null;

        for (const rule of activeRules) {
          if (rule.applies_to_category && rule.applies_to_category !== product.category) {
            continue;
          }

          if (rule.rule_type === "expiration_based" && rule.condition_days && product.expiration_date) {
            const daysToExpiry = Math.ceil(
              (new Date(product.expiration_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
            );

            if (daysToExpiry <= rule.condition_days) {
              newPrice = product.selling_price * (1 + (rule.price_adjustment_percent || 0) / 100);
              appliedRule = rule;
              break;
            }
          }
        }

        if (appliedRule && newPrice !== product.selling_price) {
          const { error: updateError } = await supabase
            .from("products")
            .update({ selling_price: newPrice })
            .eq("id", product.id);

          if (!updateError) {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              await supabase.from("pricing_logs").insert({
                product_id: product.id,
                old_price: product.selling_price,
                new_price: newPrice,
                rule_id: appliedRule.id,
                reason: `Applied rule: ${appliedRule.name}`,
                user_id: user.id,
              });
            }
            updatedCount++;
          }
        }
      }

      toast.success(`Applied pricing rules to ${updatedCount} products`);
      setIsApplyRulesOpen(false);
      fetchProducts();
      fetchPricingLogs();
    } catch (error: any) {
      console.error("Error applying rules:", error);
      toast.error(error.message || "Failed to apply rules");
    }
  };

  const handleBulkUpdate = async (type: 'increase' | 'decrease') => {
    try {
      const percent = parseFloat(bulkUpdatePercent);
      if (isNaN(percent) || percent <= 0) {
        toast.error("Please enter a valid percentage");
        return;
      }

      const multiplier = type === 'increase' ? (1 + percent / 100) : (1 - percent / 100);
      
      let query = supabase.from("products").select("*");
      if (bulkUpdateCategory !== "all") {
        query = query.eq("category", bulkUpdateCategory);
      }

      const { data: productsToUpdate, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      if (!productsToUpdate || productsToUpdate.length === 0) {
        toast.error("No products found to update");
        return;
      }

      let updatedCount = 0;
      for (const product of productsToUpdate) {
        const newPrice = parseFloat((product.selling_price * multiplier).toFixed(2));
        
        const { error: updateError } = await supabase
          .from("products")
          .update({ selling_price: newPrice })
          .eq("id", product.id);

        if (!updateError) updatedCount++;
      }

      toast.success(`Updated prices for ${updatedCount} products`);
      fetchProducts();
      setBulkUpdatePercent("");
    } catch (error: any) {
      console.error("Error bulk updating:", error);
      toast.error("Failed to update prices");
    }
  };

  const handlePsychologicalPricing = async () => {
    try {
      const { data: productsToUpdate, error: fetchError } = await supabase.from("products").select("*");
      if (fetchError) throw fetchError;

      let updatedCount = 0;
      for (const product of productsToUpdate || []) {
        const currentPrice = Math.floor(product.selling_price);
        const newPrice = currentPrice + 0.99;
        
        if (newPrice !== product.selling_price) {
          const { error: updateError } = await supabase
            .from("products")
            .update({ selling_price: newPrice })
            .eq("id", product.id);

          if (!updateError) updatedCount++;
        }
      }

      toast.success(`Applied psychological pricing to ${updatedCount} products`);
      fetchProducts();
    } catch (error: any) {
      toast.error("Failed to apply psychological pricing");
    }
  };

  const calculatePrice = () => {
    const basePrice = parseFloat(calculatorInputs.basePrice);
    if (isNaN(basePrice)) {
      toast.error("Please enter a valid number for the base price (e.g., 10.50)");
      return null;
    }

    let finalPrice = basePrice;
    const vatRate = parseFloat(taxSettings.vatRate) / 100;

    const activeRules = rules.filter(
      r => r.is_active && (!r.applies_to_category || r.applies_to_category === calculatorInputs.category)
    );

    for (const rule of activeRules) {
      if (rule.rule_type === "expiration_based" && rule.condition_days && calculatorInputs.daysToExpiry) {
        const days = parseInt(calculatorInputs.daysToExpiry);
        if (days <= rule.condition_days) {
          finalPrice = finalPrice * (1 + (rule.price_adjustment_percent || 0) / 100);
        }
      }
    }

    const priceWithVat = taxSettings.includeVat ? finalPrice * (1 + vatRate) : finalPrice;
    const seniorPwdPrice = taxSettings.seniorPwdDiscount ? (finalPrice * 0.8) : null;

    return { finalPrice, priceWithVat, seniorPwdPrice };
  };

  const handleSaveTaxSettings = () => {
    localStorage.setItem("taxSettings", JSON.stringify(taxSettings));
    toast.success("Tax settings saved successfully");
  };

  const getRuleTypeIcon = (type: string) => {
    switch (type) {
      case "expiration_based":
        return <Clock className="h-5 w-5" />;
      case "age_based":
        return <TrendingDown className="h-5 w-5" />;
      case "demand_based":
        return <Settings2 className="h-5 w-5" />;
      default:
        return <Settings2 className="h-5 w-5" />;
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-muted rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Pricing Engine</h1>
          <p className="text-muted-foreground">
            Configure dynamic pricing rules and tax settings
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isApplyRulesOpen} onOpenChange={setIsApplyRulesOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Apply Rules to Products</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Apply Pricing Rules</DialogTitle>
                <DialogDescription>
                  Apply active pricing rules to products. This will update prices based on configured rules.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Select Category</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="fresh">Fresh</SelectItem>
                      <SelectItem value="frozen">Frozen</SelectItem>
                      <SelectItem value="canned">Canned</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsApplyRulesOpen(false)}>Cancel</Button>
                <Button onClick={handleApplyRulesToProducts}>Apply Rules</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={isCreateRuleOpen} onOpenChange={setIsCreateRuleOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Rule
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Pricing Rule</DialogTitle>
                <DialogDescription>
                  Define a new pricing rule for your products
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rule-name">Rule Name</Label>
                    <Input
                      id="rule-name"
                      value={newRule.name}
                      onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                      placeholder="e.g., Expiring Soon Discount"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rule-type">Rule Type</Label>
                    <Select value={newRule.rule_type} onValueChange={(v) => setNewRule({ ...newRule, rule_type: v })}>
                      <SelectTrigger id="rule-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="expiration_based">Expiration Based</SelectItem>
                        <SelectItem value="age_based">Age Based</SelectItem>
                        <SelectItem value="demand_based">Demand Based</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={newRule.description}
                    onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                    placeholder="Optional description"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="condition-days">Condition Days</Label>
                    <Input
                      id="condition-days"
                      type="number"
                      value={newRule.condition_days}
                      onChange={(e) => setNewRule({ ...newRule, condition_days: e.target.value })}
                      placeholder="e.g., 3 days before expiry"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adjustment">Price Adjustment (%)</Label>
                    <Input
                      id="adjustment"
                      type="number"
                      step="0.1"
                      value={newRule.price_adjustment_percent}
                      onChange={(e) => setNewRule({ ...newRule, price_adjustment_percent: e.target.value })}
                      placeholder="e.g., -20 for 20% discount"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Applies to Category</Label>
                    <Select value={newRule.applies_to_category} onValueChange={(v) => setNewRule({ ...newRule, applies_to_category: v })}>
                      <SelectTrigger id="category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="fresh">Fresh</SelectItem>
                        <SelectItem value="frozen">Frozen</SelectItem>
                        <SelectItem value="canned">Canned</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Input
                      id="priority"
                      type="number"
                      value={newRule.priority}
                      onChange={(e) => setNewRule({ ...newRule, priority: e.target.value })}
                      placeholder="1-10"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateRuleOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateRule}>Create Rule</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* AI Pricing Suggestions */}
      {aiSuggestions.length > 0 && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-blue-900">
              <Sparkles className="h-5 w-5 text-blue-600" />
              AI Price Optimization
            </CardTitle>
            <CardDescription className="text-blue-700">
              Smart pricing adjustments based on market demand and stock levels
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            {aiSuggestions.map((suggestion, index) => (
              <Card key={index} className="bg-white/80 border-blue-100 shadow-sm">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-medium text-blue-900">{suggestion.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="text-xs text-muted-foreground mb-3">{suggestion.message}</p>
                  <Button 
                    size="sm" 
                    className="w-full h-8 text-xs bg-blue-600 hover:bg-blue-700"
                    onClick={() => toast.success(`Applied AI Suggestion: ${suggestion.title}`)}
                  >
                    {suggestion.action}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="rules" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-flex">
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="calculator">Calculator</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Actions</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="tax">Tax</TabsTrigger>
          <TabsTrigger value="logs">History</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-4">
          <div className="space-y-4">
            {rules.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">
                    No pricing rules configured yet. Create your first rule to get started.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {rules.map((rule) => (
                  <Card key={rule.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getRuleTypeIcon(rule.rule_type)}
                          <CardTitle className="text-lg">{rule.name}</CardTitle>
                        </div>
                        <Switch
                          checked={rule.is_active}
                          onCheckedChange={() => toggleRuleStatus(rule.id, rule.is_active)}
                        />
                      </div>
                      <CardDescription>{rule.description || "No description"}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Type:</span>
                          <Badge variant="outline">{rule.rule_type.replace("_", " ")}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Adjustment:</span>
                          <span className="font-medium">
                            {rule.price_adjustment_percent}%
                          </span>
                        </div>
                        {rule.condition_days && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Condition:</span>
                            <span>{rule.condition_days} days</span>
                          </div>
                        )}
                        {rule.applies_to_category && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Category:</span>
                            <span>{rule.applies_to_category}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Priority:</span>
                          <span>{rule.priority}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="calculator" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Price Simulator
                </CardTitle>
                <CardDescription>
                  Calculate final price based on active rules and tax settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="calc-base-price">Base Price</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="calc-base-price"
                        type="number"
                        step="0.01"
                        className="pl-8"
                        value={calculatorInputs.basePrice}
                        onChange={(e) => setCalculatorInputs({ ...calculatorInputs, basePrice: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="calc-category">Category</Label>
                    <Select value={calculatorInputs.category} onValueChange={(v) => setCalculatorInputs({ ...calculatorInputs, category: v })}>
                      <SelectTrigger id="calc-category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fresh">Fresh</SelectItem>
                        <SelectItem value="frozen">Frozen</SelectItem>
                        <SelectItem value="canned">Canned</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="calc-days">Days to Expiry</Label>
                    <Input
                      id="calc-days"
                      type="number"
                      value={calculatorInputs.daysToExpiry}
                      onChange={(e) => setCalculatorInputs({ ...calculatorInputs, daysToExpiry: e.target.value })}
                      placeholder="Optional"
                    />
                  </div>
                </div>
                {calculatorInputs.basePrice && (() => {
                  const result = calculatePrice();
                  if (!result) return null;
                  const profit = result.finalPrice - (parseFloat(calculatorInputs.basePrice) * 0.7); // Mock cost as 70%
                  const margin = (profit / result.finalPrice) * 100;

                  return (
                    <div className="border rounded-lg p-4 space-y-3 bg-muted/50">
                      <div className="flex justify-between text-sm">
                        <span>Base Price:</span>
                        <span className="font-medium">₱{parseFloat(calculatorInputs.basePrice).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>After Rules:</span>
                        <span className="font-medium text-green-600">₱{result.finalPrice.toFixed(2)}</span>
                      </div>
                      <div className="border-t pt-2 mt-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Est. Cost (70%):</span>
                          <span>₱{(parseFloat(calculatorInputs.basePrice) * 0.7).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Net Profit:</span>
                          <span className="font-medium">₱{profit.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Margin:</span>
                          <span className={`font-medium ${margin < 20 ? 'text-red-500' : 'text-green-600'}`}>
                            {margin.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Market Analysis (Mock)
                </CardTitle>
                <CardDescription>
                  Competitor pricing for similar items
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {competitorData.map((comp, i) => (
                    <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                          {comp.name[0]}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{comp.name}</p>
                          <p className="text-xs text-muted-foreground">Last updated: Today</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">₱{comp.price}</p>
                        <span className={`text-xs ${comp.difference.startsWith('+') ? 'text-red-500' : 'text-green-500'}`}>
                          {comp.difference} vs you
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="bulk" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Bulk Price Adjustment
                </CardTitle>
                <CardDescription>
                  Apply percentage changes to entire categories
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Target Category</Label>
                    <Select value={bulkUpdateCategory} onValueChange={setBulkUpdateCategory}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="fresh">Fresh</SelectItem>
                        <SelectItem value="frozen">Frozen</SelectItem>
                        <SelectItem value="canned">Canned</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Percentage (%)</Label>
                    <div className="relative">
                      <Percent className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        className="pl-8"
                        placeholder="e.g. 10"
                        value={bulkUpdatePercent}
                        onChange={(e) => setBulkUpdatePercent(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Button onClick={() => handleBulkUpdate('increase')} className="w-full bg-green-600 hover:bg-green-700">
                      <TrendingUp className="mr-2 h-4 w-4" /> Increase
                    </Button>
                    <Button onClick={() => handleBulkUpdate('decrease')} className="w-full bg-red-600 hover:bg-red-700">
                      <TrendingDown className="mr-2 h-4 w-4" /> Decrease
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Smart Strategies
                </CardTitle>
                <CardDescription>
                  Apply advanced pricing strategies automatically
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border rounded-lg p-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-medium">Psychological Pricing</p>
                    <p className="text-sm text-muted-foreground">Round all prices to end in .99</p>
                  </div>
                  <Button variant="outline" onClick={handlePsychologicalPricing}>Apply</Button>
                </div>
                <div className="border rounded-lg p-4 flex items-center justify-between opacity-50">
                  <div className="space-y-1">
                    <p className="font-medium">Clearance Mode (Coming Soon)</p>
                    <p className="text-sm text-muted-foreground">Auto-discount expiring items by 50%</p>
                  </div>
                  <Button variant="outline" disabled>Apply</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Price Trends</CardTitle>
              <CardDescription>Historical price movements over the last 6 months</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="price" stroke="#2563eb" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tax" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Tax and Pricing Configuration (Philippine Settings)
              </CardTitle>
              <CardDescription>Configure Philippine tax rates and pricing rules</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="vat-rate">VAT Rate (%)</Label>
                    <Input
                      id="vat-rate"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={taxSettings.vatRate}
                      onChange={(e) => setTaxSettings({ ...taxSettings, vatRate: e.target.value })}
                    />
                    <p className="text-sm text-muted-foreground">Standard Philippine VAT is 12%</p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="include-vat">Include VAT in Prices</Label>
                      <p className="text-sm text-muted-foreground">Display prices with VAT included</p>
                    </div>
                    <Switch
                      id="include-vat"
                      checked={taxSettings.includeVat}
                      onCheckedChange={(checked) => setTaxSettings({ ...taxSettings, includeVat: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="senior-pwd">Senior Citizen/PWD Discount</Label>
                      <p className="text-sm text-muted-foreground">Enable 20% discount and VAT exemption</p>
                    </div>
                    <Switch
                      id="senior-pwd"
                      checked={taxSettings.seniorPwdDiscount}
                      onCheckedChange={(checked) => setTaxSettings({ ...taxSettings, seniorPwdDiscount: checked })}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="withholding-tax">Apply Withholding Tax</Label>
                      <p className="text-sm text-muted-foreground">Enable withholding tax for business transactions</p>
                    </div>
                    <Switch
                      id="withholding-tax"
                      checked={taxSettings.withholdingTax}
                      onCheckedChange={(checked) => setTaxSettings({ ...taxSettings, withholdingTax: checked })}
                    />
                  </div>

                  {taxSettings.withholdingTax && (
                    <div className="space-y-2">
                      <Label htmlFor="withholding-rate">Withholding Tax Rate (%)</Label>
                      <Input
                        id="withholding-rate"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={taxSettings.withholdingTaxRate}
                        onChange={(e) => setTaxSettings({ ...taxSettings, withholdingTaxRate: e.target.value })}
                      />
                      <p className="text-sm text-muted-foreground">Standard rates: 1% (goods), 2% (services), 5% (professional)</p>
                    </div>
                  )}

                  <div className="pt-4">
                    <Button onClick={handleSaveTaxSettings} className="w-full">
                      Save Tax Settings
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Price Changes</CardTitle>
              <CardDescription>History of pricing adjustments</CardDescription>
            </CardHeader>
            <CardContent>
              {pricingLogs.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No price changes recorded yet</p>
              ) : (
                <div className="space-y-3">
                  {pricingLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{log.products?.name || "Unknown Product"}</p>
                        <p className="text-sm text-muted-foreground">{log.reason}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">
                          <span className="line-through text-muted-foreground">₱{Number(log.old_price).toFixed(2)}</span>
                          {" → "}
                          <span className="font-medium">₱{Number(log.new_price).toFixed(2)}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(log.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Pricing;
