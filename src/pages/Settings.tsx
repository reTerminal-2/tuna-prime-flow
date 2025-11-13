import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, DollarSign, Package, Palette, Receipt } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useTheme } from "next-themes";

const Settings = () => {
  const { theme, setTheme } = useTheme();
  const [notifications, setNotifications] = useState({
    lowStock: true,
    expiringProducts: true,
    priceChanges: false,
  });
  const [stockAlertDays, setStockAlertDays] = useState("7");
  
  const [taxSettings, setTaxSettings] = useState({
    vatRate: "12",
    includeVat: true,
    seniorPwdDiscount: true,
    withholdingTax: false,
    withholdingTaxRate: "5",
  });

  useEffect(() => {
    // Load saved settings from localStorage
    const savedTaxSettings = localStorage.getItem("taxSettings");
    if (savedTaxSettings) {
      setTaxSettings(JSON.parse(savedTaxSettings));
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem("taxSettings", JSON.stringify(taxSettings));
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
              <Palette className="h-5 w-5" />
              Appearance
            </CardTitle>
            <CardDescription>Customize the look and feel of the application</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="dark-mode">Dark Mode</Label>
                <p className="text-sm text-muted-foreground">Toggle between light and dark theme</p>
              </div>
              <Switch
                id="dark-mode"
                checked={theme === "dark"}
                onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
              />
            </div>
          </CardContent>
        </Card>

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
              Currency
            </CardTitle>
            <CardDescription>System currency configuration</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Default Currency</Label>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">PHP (Philippine Peso ₱)</span>
              </div>
              <p className="text-sm text-muted-foreground">All prices and transactions are in Philippine Peso</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Tax & Pricing (Philippine Settings)
            </CardTitle>
            <CardDescription>Configure Philippine tax and pricing rules</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
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
                  <p className="text-sm text-muted-foreground">Enable 20% discount + VAT exemption</p>
                </div>
                <Switch
                  id="senior-pwd"
                  checked={taxSettings.seniorPwdDiscount}
                  onCheckedChange={(checked) => setTaxSettings({ ...taxSettings, seniorPwdDiscount: checked })}
                />
              </div>

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
                <div className="space-y-2 pl-4 border-l-2 border-muted">
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
