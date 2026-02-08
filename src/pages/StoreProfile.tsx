import { Store } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const StoreProfile = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    store_name: "",
    store_description: "",
    store_address: "",
    store_email: "",
    store_phone: "",
    social_facebook: "",
    social_instagram: "",
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
          store_name: data.store_name || "",
          store_description: data.store_description || "",
          store_address: data.store_address || "",
          store_email: data.store_email || "",
          store_phone: data.store_phone || "",
          social_facebook: data.social_facebook || "",
          social_instagram: data.social_instagram || "",
        });
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Failed to load profile");
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
        ...settings,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("store_settings")
        .upsert(updates, { onConflict: "user_id" });

      if (error) throw error;
      toast.success("Store profile updated");
    } catch (error: any) {
      console.error("Error saving profile:", error);
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
          <h1 className="text-3xl font-bold">Store Profile</h1>
          <p className="text-muted-foreground">Manage your public store information</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            General Information
          </CardTitle>
          <CardDescription>Visible to your customers</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Store Name</Label>
              <Input
                value={settings.store_name}
                onChange={(e) => setSettings({ ...settings, store_name: e.target.value })}
                placeholder="e.g., General Santos Premium Tuna"
              />
            </div>
            <div className="space-y-2">
              <Label>Contact Email</Label>
              <Input
                value={settings.store_email}
                onChange={(e) => setSettings({ ...settings, store_email: e.target.value })}
                placeholder="contact@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input
                value={settings.store_phone}
                onChange={(e) => setSettings({ ...settings, store_phone: e.target.value })}
                placeholder="+63 900 000 0000"
              />
            </div>
            <div className="space-y-2">
              <Label>Facebook URL</Label>
              <Input
                value={settings.social_facebook}
                onChange={(e) => setSettings({ ...settings, social_facebook: e.target.value })}
                placeholder="facebook.com/yourstore"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Store Address</Label>
            <Textarea
              value={settings.store_address}
              onChange={(e) => setSettings({ ...settings, store_address: e.target.value })}
              placeholder="Street Address, City, Province, Zip Code"
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>About Us</Label>
            <Textarea
              value={settings.store_description}
              onChange={(e) => setSettings({ ...settings, store_description: e.target.value })}
              placeholder="Tell customers about your business history and mission..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StoreProfile;
