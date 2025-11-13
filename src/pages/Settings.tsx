import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, DollarSign, Package, Calendar } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";

const Settings = () => {
  const [notifications, setNotifications] = useState({
    lowStock: true,
    expiringProducts: true,
    priceChanges: false,
  });
  const [currency, setCurrency] = useState("USD");
  const [stockAlertDays, setStockAlertDays] = useState("7");

  const handleSave = () => {
    toast.success("Settings saved successfully");
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Configure application settings and preferences
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>Manage your notification preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="low-stock">Low Stock Alerts</Label>
                <p className="text-sm text-muted-foreground">Get notified when products are running low</p>
              </div>
              <Switch
                id="low-stock"
                checked={notifications.lowStock}
                onCheckedChange={(checked) => setNotifications({ ...notifications, lowStock: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="expiring">Expiring Products</Label>
                <p className="text-sm text-muted-foreground">Alert when products are close to expiration</p>
              </div>
              <Switch
                id="expiring"
                checked={notifications.expiringProducts}
                onCheckedChange={(checked) => setNotifications({ ...notifications, expiringProducts: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="price">Price Changes</Label>
                <p className="text-sm text-muted-foreground">Notify about automatic price adjustments</p>
              </div>
              <Switch
                id="price"
                checked={notifications.priceChanges}
                onCheckedChange={(checked) => setNotifications({ ...notifications, priceChanges: checked })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Currency & Display
            </CardTitle>
            <CardDescription>Configure display preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currency">Default Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="currency">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                  <SelectItem value="JPY">JPY (¥)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Inventory Settings
            </CardTitle>
            <CardDescription>Configure inventory management options</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="alert-days">Stock Alert Threshold (days)</Label>
              <Select value={stockAlertDays} onValueChange={setStockAlertDays}>
                <SelectTrigger id="alert-days">
                  <SelectValue placeholder="Select days" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 days</SelectItem>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">Alert when products will expire within this period</p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave}>Save Settings</Button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
