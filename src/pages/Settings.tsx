import { Bell, Package, Palette, BrainCircuit } from "lucide-react";
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
  const [testingConnection, setTestingConnection] = useState(false);
  const [geminiKey, setGeminiKey] = useState("");
  const [hfToken, setHfToken] = useState("");
  
  // Settings State
  const [settings, setSettings] = useState({
    notify_low_stock: true,
    notify_expiring: true,
    notify_new_order: true,
    stock_alert_days: "7",
  });
  
  const [aiProvider, setAiProvider] = useState<'copilot-api' | 'gemini' | 'ernie'>('copilot-api');

  useEffect(() => {
    fetchSettings();
    const savedProvider = localStorage.getItem("ai_provider") || 'copilot-api';
    setAiProvider(savedProvider as 'copilot-api' | 'gemini' | 'ernie');
    setGeminiKey(localStorage.getItem("gemini_api_key") || "");
    setHfToken(localStorage.getItem("hf_token") || "");
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
          notify_low_stock: data.notify_low_stock,
          notify_expiring: data.notify_expiring,
          notify_new_order: data.notify_new_order,
          stock_alert_days: String(data.stock_alert_days),
        });
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to save settings");
        return;
      }

      const updates = {
        user_id: user.id,
        notify_low_stock: settings.notify_low_stock,
        notify_expiring: settings.notify_expiring,
        notify_new_order: settings.notify_new_order,
        stock_alert_days: parseInt(settings.stock_alert_days),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("store_settings")
        .upsert(updates, { onConflict: "user_id" });

      if (error) throw error;
      
      localStorage.setItem("stockAlertDays", settings.stock_alert_days);

      // Save AI Provider and API Key
      localStorage.setItem("ai_provider", aiProvider);
      if (geminiKey) {
        localStorage.setItem("gemini_api_key", geminiKey);
      }
      if (hfToken) {
        localStorage.setItem("hf_token", hfToken);
      } else {
        localStorage.removeItem("hf_token");
      }
      
      window.dispatchEvent(new Event("settingsChanged"));
      
      toast.success("Settings saved successfully");
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading settings...</div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">General Settings</h1>
          <p className="text-muted-foreground">
            Manage your application preferences and alerts
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <div className="grid gap-6">
        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>Manage your alert preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>New Order Alerts</Label>
                <p className="text-sm text-muted-foreground">Get notified when a customer places an order</p>
              </div>
              <Switch
                checked={settings.notify_new_order}
                onCheckedChange={(checked) => setSettings({ ...settings, notify_new_order: checked })}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Low Stock Alerts</Label>
                <p className="text-sm text-muted-foreground">Get notified when inventory is running low</p>
              </div>
              <Switch
                checked={settings.notify_low_stock}
                onCheckedChange={(checked) => setSettings({ ...settings, notify_low_stock: checked })}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Expiring Products</Label>
                <p className="text-sm text-muted-foreground">Alert when products are close to expiration</p>
              </div>
              <Switch
                checked={settings.notify_expiring}
                onCheckedChange={(checked) => setSettings({ ...settings, notify_expiring: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Inventory Config */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Inventory Configuration
            </CardTitle>
            <CardDescription>Customize stock management thresholds</CardDescription>
          </CardHeader>
          <CardContent>
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

        {/* AI Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BrainCircuit className="h-5 w-5" />
              AI Configuration
            </CardTitle>
            <CardDescription>Configure your AI provider and API settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>AI Provider</Label>
              <Select value={aiProvider} onValueChange={(value) => setAiProvider(value as 'copilot-api' | 'gemini' | 'ernie')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="copilot-api">GitHub Copilot API</SelectItem>
                  <SelectItem value="gemini">Google Gemini AI</SelectItem>
                  <SelectItem value="ernie">ERNIE AI (Free)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {aiProvider === 'copilot-api' 
                  ? 'Uses GitHub Copilot for AI responses. Requires active Copilot subscription.'
                  : aiProvider === 'gemini'
                  ? 'Uses Google Gemini AI. Requires API key from Google AI Studio.'
                  : 'Uses ERNIE AI via Hugging Face. Free API access with rate limits.'}
              </p>
            </div>
            
            {aiProvider === 'gemini' && (
              <div className="space-y-2">
                <Label>Gemini API Key</Label>
                <Input
                  type="password"
                  placeholder="Enter your Gemini API key"
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Get your API key from{' '}
                  <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    Google AI Studio
                  </a>
                </p>
              </div>
            )}

            {aiProvider === 'ernie' && (
              <div className="space-y-2">
                <Label>Hugging Face Access Token (Optional but Recommended)</Label>
                <Input
                  type="password"
                  placeholder="Enter your Hugging Face Access Token"
                  value={hfToken}
                  onChange={(e) => setHfToken(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Get a free token from{' '}
                  <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    Hugging Face Settings
                  </a>
                  . Without a token, you may hit rate limits quickly.
                </p>
              </div>
            )}
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={async () => {
                  setTestingConnection(true);
                  try {
                    const result = await aiService.testConnection({});
                    if (result.success) {
                      toast.success(result.message);
                    } else {
                      toast.error(result.message);
                    }
                  } catch (error) {
                    toast.error("Connection test failed");
                  } finally {
                    setTestingConnection(false);
                  }
                }}
                disabled={testingConnection}
              >
                {testingConnection ? "Testing..." : "Test Connection"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Appearance
            </CardTitle>
            <CardDescription>Customize the application theme</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Dark Mode</Label>
                <p className="text-sm text-muted-foreground">Toggle between light and dark theme</p>
              </div>
              <Switch
                checked={theme === "dark"}
                onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
