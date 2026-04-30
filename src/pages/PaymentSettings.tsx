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
    enable_tax: false,
    tax_rate: "0",
  });

  const [payrex, setPayrex] = useState({
    payrex_secret_key: "",
    payrex_public_key: "",
    payrex_webhook_secret: "",
    is_active: false,
  });

  const [hitpay, setHitpay] = useState({
    hitpay_api_key: "",
    hitpay_salt: "",
    hitpay_is_active: false,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: storeData } = await supabase
        .from("store_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (storeData) {
        setSettings({
          enable_cod: storeData.enable_cod,
          enable_tax: storeData.enable_tax || false,
          tax_rate: String(storeData.tax_rate || 0),
        });
      }

      const { data: payrexData, error: payrexError } = await supabase
        .from("seller_payment_settings")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (payrexError && payrexError.code !== "PGRST116") throw payrexError;

      if (payrexData) {
        setPayrex({
          payrex_secret_key: payrexData.payrex_secret_key || "",
          payrex_public_key: payrexData.payrex_public_key || "",
          payrex_webhook_secret: payrexData.payrex_webhook_secret || "",
          is_active: payrexData.is_active || false,
        });

        setHitpay({
          hitpay_api_key: payrexData.hitpay_api_key || "",
          hitpay_salt: payrexData.hitpay_salt || "",
          hitpay_is_active: payrexData.hitpay_is_active || false,
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

      const storeUpdates = {
        user_id: user.id,
        enable_cod: settings.enable_cod,
        enable_tax: settings.enable_tax,
        tax_rate: parseFloat(settings.tax_rate) || 0,
        updated_at: new Date().toISOString(),
      };

      const { error: storeError } = await supabase
        .from("store_settings")
        .upsert(storeUpdates, { onConflict: "user_id" });

      if (storeError) throw storeError;

      const payrexUpdates = {
        user_id: user.id,
        ...payrex,
        ...hitpay,
        updated_at: new Date().toISOString(),
      };

      const { error: payrexError } = await supabase
        .from("seller_payment_settings")
        .upsert(payrexUpdates, { onConflict: "user_id" });

      if (payrexError) throw payrexError;

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
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto pb-20 md:pb-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Payments & Taxes</h1>
          <p className="text-sm md:text-base text-muted-foreground">Manage payment gateways and tax calculations</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
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

          <div className="flex flex-col border p-4 rounded-lg space-y-4 bg-blue-50/30 border-blue-100">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base text-blue-700 font-semibold">HitPay Gateway (Sandbox Testing)</Label>
                <p className="text-sm text-muted-foreground">Accept GCash, Maya, Cards via HitPay Sandbox</p>
              </div>
              <Switch
                checked={hitpay.hitpay_is_active}
                onCheckedChange={(c) => setHitpay({ ...hitpay, hitpay_is_active: c })}
              />
            </div>

            {hitpay.hitpay_is_active && (
              <div className="pt-4 space-y-4 border-t border-blue-100 mt-2">
                <div className="space-y-2 pl-2">
                  <Label>API Key (Sandbox)</Label>
                  <Input
                    type="password"
                    placeholder="X-BUSINESS-API-KEY"
                    value={hitpay.hitpay_api_key}
                    onChange={(e) => setHitpay({ ...hitpay, hitpay_api_key: e.target.value })}
                  />
                  <p className="text-[10px] text-muted-foreground">Found in HitPay Sandbox Dashboard > Settings > Business > API Keys.</p>
                </div>
                <div className="space-y-2 pl-2">
                  <Label>Salt (Sandbox)</Label>
                  <Input
                    type="password"
                    placeholder="HitPay Salt"
                    value={hitpay.hitpay_salt}
                    onChange={(e) => setHitpay({ ...hitpay, hitpay_salt: e.target.value })}
                  />
                  <p className="text-[10px] text-muted-foreground">Found in HitPay Sandbox Dashboard > Settings > Business > Salt.</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col border p-4 rounded-lg space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base text-primary font-semibold">Payrex Gateway (Alternate/Production)</Label>
                <p className="text-sm text-muted-foreground">Accept GCash, PayMaya, Cards via Payrex Philippines</p>
              </div>
              <Switch
                checked={payrex.is_active}
                onCheckedChange={(c) => setPayrex({ ...payrex, is_active: c })}
              />
            </div>

            {payrex.is_active && (
              <div className="pt-4 space-y-4 border-t mt-2">
                <div className="space-y-2 pl-2">
                  <Label>Secret Key</Label>
                  <Input
                    type="password"
                    placeholder="sk_test_..."
                    value={payrex.payrex_secret_key}
                    onChange={(e) => setPayrex({ ...payrex, payrex_secret_key: e.target.value })}
                  />
                  <p className="text-[10px] text-muted-foreground">Never share this key. It is used by our secure backend to process payments.</p>
                </div>
                <div className="space-y-2 pl-2">
                  <Label>Public Key</Label>
                  <Input
                    type="text"
                    placeholder="pk_test_..."
                    value={payrex.payrex_public_key}
                    onChange={(e) => setPayrex({ ...payrex, payrex_public_key: e.target.value })}
                  />
                </div>
                <div className="space-y-2 pl-2">
                  <Label>Webhook Secret</Label>
                  <Input
                    type="password"
                    placeholder="wh_sec_..."
                    value={payrex.payrex_webhook_secret}
                    onChange={(e) => setPayrex({ ...payrex, payrex_webhook_secret: e.target.value })}
                  />
                </div>
              </div>
            )}
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
