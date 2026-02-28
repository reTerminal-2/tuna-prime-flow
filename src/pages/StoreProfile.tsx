import { Store, Camera, Upload, Loader2, Mail, Phone, MapPin, Facebook, Instagram, Share2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

const StoreProfile = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const profileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [settings, setSettings] = useState({
    store_name: "",
    store_description: "",
    store_address: "",
    store_email: "",
    store_phone: "",
    social_facebook: "",
    social_instagram: "",
    profile_url: "",
    cover_url: "",
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
          profile_url: data.profile_url || "",
          cover_url: data.cover_url || "",
        });
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'cover') => {
    try {
      if (!event.target.files || event.target.files.length === 0) return;

      setUploading(type);
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `store-${type}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars') // Using existing bucket for now, or create 'store-assets'
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);

      const newUrl = data.publicUrl;
      setSettings(prev => ({ ...prev, [type === 'profile' ? 'profile_url' : 'cover_url']: newUrl }));
      toast.success(`${type === 'profile' ? 'Profile' : 'Cover'} photo uploaded!`);
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("Upload failed: " + error.message);
    } finally {
      setUploading(null);
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

  if (loading) return (
    <div className="flex justify-center items-center min-h-[50vh]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto pb-20 md:pb-10 bg-background min-h-screen">
      {/* Social-style Header */}
      <div className="relative group">
        {/* Cover Photo */}
        <div className="h-48 md:h-80 bg-muted overflow-hidden relative rounded-b-xl shadow-inner">
          {settings.cover_url ? (
            <img src={settings.cover_url} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground opacity-20">
              <Share2 className="h-20 w-20" />
            </div>
          )}
          <Button
            variant="secondary"
            size="sm"
            className="absolute bottom-4 right-4 gap-2 opacity-90 hover:opacity-100"
            onClick={() => coverInputRef.current?.click()}
            disabled={uploading === 'cover'}
          >
            {uploading === 'cover' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            {settings.cover_url ? "Change Cover" : "Add Cover"}
          </Button>
          <input type="file" ref={coverInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'cover')} />
        </div>

        {/* Profile Info Overlay */}
        <div className="px-6 -mt-12 md:-mt-16 flex flex-col md:flex-row items-center md:items-end gap-6 relative z-10">
          <div className="relative group/avatar">
            <Avatar className="w-32 h-32 md:w-40 md:h-40 border-4 border-background shadow-xl ring-2 ring-primary/5">
              <AvatarImage src={settings.profile_url} className="object-cover" />
              <AvatarFallback className="bg-primary/10 text-primary text-4xl">
                {settings.store_name?.charAt(0) || <Store className="h-12 w-12" />}
              </AvatarFallback>
            </Avatar>
            <div
              className="absolute bottom-2 right-2 bg-primary text-white p-2 rounded-full cursor-pointer hover:scale-110 transition-transform shadow-lg z-20"
              onClick={() => profileInputRef.current?.click()}
            >
              {uploading === 'profile' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </div>
            <input type="file" ref={profileInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'profile')} />
          </div>

          <div className="flex-1 text-center md:text-left pt-2 pb-4">
            <h1 className="text-2xl md:text-4xl font-black tracking-tight text-foreground truncate max-w-md">
              {settings.store_name || "New Store"}
            </h1>
            <p className="text-muted-foreground font-medium flex items-center justify-center md:justify-start gap-1.5 mt-1">
              <MapPin className="h-3.5 w-3.5" />
              {settings.store_address || "Gensan, Philippines"}
            </p>
          </div>

          <div className="flex gap-2 pb-4 self-center md:self-end">
            <Button onClick={handleSave} disabled={saving} className="shadow-lg px-8">
              {saving ? "Saving..." : "Save Profile"}
            </Button>
          </div>
        </div>
      </div>

      <div className="px-6 py-8 grid md:grid-cols-3 gap-8">
        {/* Left Column: About & Contact */}
        <div className="space-y-6">
          <Card className="border-none shadow-sm bg-muted/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                Intro
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm leading-relaxed text-muted-foreground">
                {settings.store_description || "Add a bio to tell customers about your tuna shop mission and history."}
              </div>
              <Separator />
              <ul className="space-y-3 text-sm font-medium">
                {settings.store_address && (
                  <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> {settings.store_address}</li>
                )}
                {settings.store_email && (
                  <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /> {settings.store_email}</li>
                )}
                {settings.store_phone && (
                  <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-primary" /> {settings.store_phone}</li>
                )}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-blue-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold">Social Presence</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Facebook className="h-5 w-5 text-blue-600" />
                <Input
                  placeholder="Facebook page"
                  className="h-8 text-xs"
                  value={settings.social_facebook}
                  onChange={e => setSettings({ ...settings, social_facebook: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-3">
                <Instagram className="h-5 w-5 text-pink-600" />
                <Input
                  placeholder="@username"
                  className="h-8 text-xs"
                  value={settings.social_instagram}
                  onChange={e => setSettings({ ...settings, social_instagram: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Middle & Right Column: Detailed Forms */}
        <div className="md:col-span-2 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5 text-primary" />
                Store Branding
              </CardTitle>
              <CardDescription>How customers see your brand across TunaFlow</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Store Name</Label>
                  <Input
                    value={settings.store_name}
                    onChange={(e) => setSettings({ ...settings, store_name: e.target.value })}
                    placeholder="e.g., General Santos Premium Tuna"
                    className="font-bold border-primary/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contact Email</Label>
                  <Input
                    type="email"
                    value={settings.store_email}
                    onChange={(e) => setSettings({ ...settings, store_email: e.target.value })}
                    placeholder="sales@yourstore.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contact Number</Label>
                  <Input
                    value={settings.store_phone}
                    onChange={(e) => setSettings({ ...settings, store_phone: e.target.value })}
                    placeholder="+63 9xx xxx xxxx"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Store Address</Label>
                  <Input
                    value={settings.store_address}
                    onChange={(e) => setSettings({ ...settings, store_address: e.target.value })}
                    placeholder="City, Province"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Store Bio (About Us)</Label>
                <Textarea
                  value={settings.store_description}
                  onChange={(e) => setSettings({ ...settings, store_description: e.target.value })}
                  placeholder="Tell your story. Tip: Customers love hearing about freshness and sourcing!"
                  rows={5}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StoreProfile;
