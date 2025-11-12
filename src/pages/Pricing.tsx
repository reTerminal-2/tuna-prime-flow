import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingDown, Clock } from "lucide-react";
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

const Pricing = () => {
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [pricingLogs, setPricingLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPricingRules();
    fetchPricingLogs();
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

  const getRuleTypeIcon = (type: string) => {
    switch (type) {
      case "expiration_based":
        return <Clock className="h-5 w-5" />;
      case "age_based":
        return <TrendingDown className="h-5 w-5" />;
      case "demand_based":
        return <DollarSign className="h-5 w-5" />;
      default:
        return <DollarSign className="h-5 w-5" />;
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
      <div>
        <h1 className="text-3xl font-bold">Pricing Engine</h1>
        <p className="text-muted-foreground">
          Configure dynamic pricing rules for optimal profit
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Active Rules</h2>
        {rules.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">
                No pricing rules configured yet.
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
                      onCheckedChange={() =>
                        toggleRuleStatus(rule.id, rule.is_active)
                      }
                    />
                  </div>
                  <CardDescription>{rule.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <Badge variant="outline">
                        {rule.rule_type.replace("_", " ")}
                      </Badge>
                    </div>
                    {rule.condition_days && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Condition:</span>
                        <span>{rule.condition_days} days</span>
                      </div>
                    )}
                    {rule.price_adjustment_percent && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Adjustment:</span>
                        <span className="font-medium text-primary">
                          {rule.price_adjustment_percent}%
                        </span>
                      </div>
                    )}
                    {rule.applies_to_category && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Category:</span>
                        <Badge>{rule.applies_to_category}</Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Recent Price Changes</h2>
        <Card>
          <CardContent className="p-0">
            {pricingLogs.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No price changes recorded yet
              </div>
            ) : (
              <div className="divide-y">
                {pricingLogs.map((log) => (
                  <div key={log.id} className="p-4 flex justify-between items-center">
                    <div>
                      <p className="font-medium">
                        {log.products?.name || "Unknown Product"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {log.reason || "Automatic price adjustment"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">
                        <span className="line-through text-muted-foreground">
                          ${log.old_price}
                        </span>
                        {" → "}
                        <span className="font-medium text-primary">
                          ${log.new_price}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Pricing;
