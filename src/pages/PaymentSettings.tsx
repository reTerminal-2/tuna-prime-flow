import { CreditCard, Banknote, Wallet } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const PaymentSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    enable_cod: true,
    enable_stripe: false,
    enable_paypal: false,
    enable_tax: false,
    tax_rate: "0",
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("store_settings")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setSettings({
          enable_cod: data.enable_cod,
          enable_stripe: data.enable_stripe || false,
          enable_paypal: data.enable_paypal || false,
          enable_tax: data.enable_tax || false,
          tax_rate: String(data.tax_rate || 0),
        });
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Failed to load payment settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const updates = {
        user_id: user.id,
        enable_cod: settings.enable_cod,
        enable_stripe: settings.enable_stripe,
        enable_paypal: settings.enable_paypal,
        enable_tax: settings.enable_tax,
        tax_rate: parseFloat(settings.tax_rate),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("store_settings")
        .upsert(updates, { onConflict: "user_id" });

      if (error) throw error;
      toast.success("Payment settings saved");
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Payments & Taxes</h1>
          <p className="text-muted-foreground">Manage payment gateways and tax calculations</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Methods
          </CardTitle>
          <CardDescription>Select which payment options to accept</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between border p-4 rounded-lg">
            <div className="space-y-0.5">
              <Label className="text-base">Cash on Delivery (COD)</Label>
              <p className="text-sm text-muted-foreground">Safe option for local customers</p>
            </div>
            <Switch
              checked={settings.enable_cod}
              onCheckedChange={(checked) => setSettings({ ...settings, enable_cod: checked })}
            />
          </div>
          
          <div className="flex items-center justify-between border p-4 rounded-lg opacity-80">
            <div className="space-y-0.5">
              <Label className="text-base">Stripe Integration</Label>
              <p className="text-sm text-muted-foreground">Accept credit cards securely</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">Coming Soon</span>
              <Switch checked={settings.enable_stripe} disabled />
            </div>
          </div>

          <div className="flex items-center justify-between border p-4 rounded-lg opacity-80">
            <div className="space-y-0.5">
              <Label className="text-base">PayPal</Label>
              <p className="text-sm text-muted-foreground">International payments</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">Coming Soon</span>
              <Switch checked={settings.enable_paypal} disabled />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5" />
            Tax Configuration
          </CardTitle>
          <CardDescription>Configure automated tax calculations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Tax Calculation</Label>
              <p className="text-sm text-muted-foreground">Apply tax rate to orders at checkout</p>
            </div>
            <Switch
              checked={settings.enable_tax}
              onCheckedChange={(checked) => setSettings({ ...settings, enable_tax: checked })}
            />
          </div>
          {settings.enable_tax && (
             <div className="space-y-2 pl-4 border-l-2">
              <Label>Tax Rate (%)</Label>
              <Input
                type="number"
                value={settings.tax_rate}
                onChange={(e) => setSettings({ ...settings, tax_rate: e.target.value })}
                placeholder="12"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSettings;
