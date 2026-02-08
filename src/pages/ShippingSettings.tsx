import { Truck, MapPin, Store } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const ShippingSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    enable_shipping: true,
    shipping_fee: "0",
    min_order_amount: "0",
    enable_pickup: false,
    pickup_instructions: "",
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
          enable_shipping: data.enable_shipping,
          shipping_fee: String(data.shipping_fee),
          min_order_amount: String(data.min_order_amount),
          enable_pickup: data.enable_pickup || false,
          pickup_instructions: data.pickup_instructions || "",
        });
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Failed to load shipping settings");
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
        enable_shipping: settings.enable_shipping,
        shipping_fee: parseFloat(settings.shipping_fee),
        min_order_amount: parseFloat(settings.min_order_amount),
        enable_pickup: settings.enable_pickup,
        pickup_instructions: settings.pickup_instructions,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("store_settings")
        .upsert(updates, { onConflict: "user_id" });

      if (error) throw error;
      toast.success("Shipping settings saved");
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
          <h1 className="text-3xl font-bold">Shipping & Pickup</h1>
          <p className="text-muted-foreground">Manage delivery methods and store pickup options</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Standard Delivery
          </CardTitle>
          <CardDescription>Configure courier delivery options</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between border p-4 rounded-lg">
            <div className="space-y-0.5">
              <Label className="text-base">Enable Delivery</Label>
              <p className="text-sm text-muted-foreground">Allow customers to choose delivery at checkout</p>
            </div>
            <Switch
              checked={settings.enable_shipping}
              onCheckedChange={(checked) => setSettings({ ...settings, enable_shipping: checked })}
            />
          </div>

          {settings.enable_shipping && (
            <div className="grid md:grid-cols-2 gap-6 pl-4 border-l-2">
              <div className="space-y-2">
                <Label>Flat Shipping Fee (₱)</Label>
                <Input
                  type="number"
                  value={settings.shipping_fee}
                  onChange={(e) => setSettings({ ...settings, shipping_fee: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Free Shipping Threshold (₱)</Label>
                <Input
                  type="number"
                  value={settings.min_order_amount}
                  onChange={(e) => setSettings({ ...settings, min_order_amount: e.target.value })}
                  placeholder="0 (Disabled)"
                />
                <p className="text-xs text-muted-foreground">Orders above this amount get free shipping</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Store Pickup
          </CardTitle>
          <CardDescription>Allow customers to collect orders from your store</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between border p-4 rounded-lg">
            <div className="space-y-0.5">
              <Label className="text-base">Enable Pickup</Label>
              <p className="text-sm text-muted-foreground">Allow customers to pick up orders from your location</p>
            </div>
            <Switch
              checked={settings.enable_pickup}
              onCheckedChange={(checked) => setSettings({ ...settings, enable_pickup: checked })}
            />
          </div>

          {settings.enable_pickup && (
            <div className="space-y-2 pl-4 border-l-2">
              <Label>Pickup Instructions</Label>
              <Textarea
                value={settings.pickup_instructions}
                onChange={(e) => setSettings({ ...settings, pickup_instructions: e.target.value })}
                placeholder="e.g., Available 9AM-5PM, bring valid ID. Located at..."
                rows={3}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ShippingSettings;
