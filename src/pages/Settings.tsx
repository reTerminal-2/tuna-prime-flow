import { Bell, Package, Palette } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const Settings = () => {
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    notify_low_stock: true,
    notify_expiring: true,
    notify_new_order: true,
    stock_alert_days: "7",
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('notification_preferences, stock_alert_days')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setSettings({
          notify_low_stock: data.notification_preferences?.low_stock ?? true,
          notify_expiring: data.notification_preferences?.expiring_items ?? true,
          notify_new_order: data.notification_preferences?.new_orders ?? true,
          stock_alert_days: data.stock_alert_days?.toString() || "7",
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({
          notification_preferences: {
            low_stock: settings.notify_low_stock,
            expiring_items: settings.notify_expiring,
            new_orders: settings.notify_new_order,
          },
          stock_alert_days: parseInt(settings.stock_alert_days),
        })
        .eq('id', user.id);

      if (error) throw error;

      // Also save alert days to localStorage for immediate use in other services
      localStorage.setItem("stockAlertDays", settings.stock_alert_days);

      toast.success("Settings saved successfully");
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your store preferences and system configuration</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <div className="grid gap-6">
        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Appearance
            </CardTitle>
            <CardDescription>Customize how the application looks for you</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Theme</Label>
                <p className="text-sm text-muted-foreground">Switch between light and dark mode</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={theme === "light" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("light")}
                >
                  Light
                </Button>
                <Button
                  variant={theme === "dark" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("dark")}
                >
                  Dark
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>Choose what updates you want to receive</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notify-low-stock">Low Stock Alerts</Label>
                <p className="text-sm text-muted-foreground">Receive alerts when products are below reorder level</p>
              </div>
              <Switch
                id="notify-low-stock"
                checked={settings.notify_low_stock}
                onCheckedChange={(checked) => setSettings({ ...settings, notify_low_stock: checked })}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notify-expiring">Expiring Product Alerts</Label>
                <p className="text-sm text-muted-foreground">Receive alerts for products near expiration date</p>
              </div>
              <Switch
                id="notify-expiring"
                checked={settings.notify_expiring}
                onCheckedChange={(checked) => setSettings({ ...settings, notify_expiring: checked })}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notify-orders">New Order Notifications</Label>
                <p className="text-sm text-muted-foreground">Get notified when a new order is placed</p>
              </div>
              <Switch
                id="notify-orders"
                checked={settings.notify_new_order}
                onCheckedChange={(checked) => setSettings({ ...settings, notify_new_order: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Inventory Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Inventory Rules
            </CardTitle>
            <CardDescription>Configure how system handles your stock data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="alert-days">Expiration Alert Threshold (days)</Label>
              <Select
                value={settings.stock_alert_days}
                onValueChange={(val) => setSettings({ ...settings, stock_alert_days: val })}
              >
                <SelectTrigger id="alert-days">
                  <SelectValue placeholder="Select days" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 days before</SelectItem>
                  <SelectItem value="7">7 days before</SelectItem>
                  <SelectItem value="14">14 days before</SelectItem>
                  <SelectItem value="30">30 days before</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
