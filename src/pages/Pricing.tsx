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
import { Calculator, TrendingDown, Clock, Receipt, Plus, Settings2 } from "lucide-react";
import { toast } from "sonner";

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

  useEffect(() => {
    fetchPricingRules();
    fetchPricingLogs();
    fetchProducts();
    
    const savedTaxSettings = localStorage.getItem("taxSettings");
    if (savedTaxSettings) {
      setTaxSettings(JSON.parse(savedTaxSettings));
    }
  }, []);

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
      toast.error("Failed to load pricing rules");
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
        toast.error("Please fill in all required fields");
        return;
      }

      const ruleData: any = {
        name: newRule.name,
        rule_type: newRule.rule_type as "expiration_based" | "age_based" | "demand_based",
        is_active: true,
        priority: parseInt(newRule.priority),
        price_adjustment_percent: parseFloat(newRule.price_adjustment_percent),
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
      toast.error(error.message || "Failed to create rule");
    }
  };

  const handleApplyRulesToProducts = async () => {
    try {
      const activeRules = rules.filter(r => r.is_active);
      if (activeRules.length === 0) {
        toast.error("No active rules to apply");
        return;
      }

      let filteredProducts = products;
      if (selectedCategory !== "all") {
        filteredProducts = products.filter(p => p.category === selectedCategory);
      }

      if (filteredProducts.length === 0) {
        toast.error("No products found for selected category");
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
            await supabase.from("pricing_logs").insert({
              product_id: product.id,
              old_price: product.selling_price,
              new_price: newPrice,
              rule_id: appliedRule.id,
              reason: `Applied rule: ${appliedRule.name}`,
            });
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

  const calculatePrice = () => {
    const basePrice = parseFloat(calculatorInputs.basePrice);
    if (isNaN(basePrice)) {
      toast.error("Please enter a valid base price");
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

      <Tabs defaultValue="rules" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rules">Pricing Rules</TabsTrigger>
          <TabsTrigger value="calculator">Price Calculator</TabsTrigger>
          <TabsTrigger value="tax">Tax Configuration</TabsTrigger>
          <TabsTrigger value="logs">Price History</TabsTrigger>
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Price Calculator
              </CardTitle>
              <CardDescription>
                Calculate final price based on active rules and tax settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="calc-base-price">Base Price</Label>
                  <Input
                    id="calc-base-price"
                    type="number"
                    step="0.01"
                    value={calculatorInputs.basePrice}
                    onChange={(e) => setCalculatorInputs({ ...calculatorInputs, basePrice: e.target.value })}
                    placeholder="Enter base price"
                  />
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
              <Button onClick={() => {
                const result = calculatePrice();
                if (result) {
                  toast.success("Price calculated successfully");
                }
              }}>
                Calculate Price
              </Button>
              {calculatorInputs.basePrice && (() => {
                const result = calculatePrice();
                if (!result) return null;
                return (
                  <div className="border rounded-lg p-4 space-y-3 bg-muted/50">
                    <div className="flex justify-between text-sm">
                      <span>Base Price:</span>
                      <span className="font-medium">₱{parseFloat(calculatorInputs.basePrice).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>After Pricing Rules:</span>
                      <span className="font-medium">₱{result.finalPrice.toFixed(2)}</span>
                    </div>
                    {taxSettings.includeVat && (
                      <div className="flex justify-between text-sm">
                        <span>With VAT ({taxSettings.vatRate}%):</span>
                        <span className="font-medium">₱{result.priceWithVat.toFixed(2)}</span>
                      </div>
                    )}
                    {taxSettings.seniorPwdDiscount && result.seniorPwdPrice && (
                      <div className="flex justify-between text-sm border-t pt-2">
                        <span>Senior/PWD Price (20% off and VAT exempt):</span>
                        <span className="font-medium">₱{result.seniorPwdPrice.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                );
              })()}
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
