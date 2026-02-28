import { Store, Camera, Upload, Loader2, Mail, Phone, MapPin, Facebook, Instagram, Share2, Globe, Info } from "lucide-react";
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
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("store_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

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
    } catch (error: any) {
      console.error("Error fetching settings:", error);
      toast.error("Failed to load store profile: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'cover') => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      // Basic validation
      if (!file.type.startsWith('image/')) {
        toast.error("Please upload an image file");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB");
        return;
      }

      setUploading(type);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Authentication required");

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${type}-${Date.now()}.${fileExt}`;
      const filePath = `store-assets/${fileName}`;

      // Upload to 'avatars' bucket (assuming it's the main public bucket)
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const publicUrl = data.publicUrl;

      // Update state immediately
      setSettings(prev => ({
        ...prev,
        [type === 'profile' ? 'profile_url' : 'cover_url']: publicUrl
      }));

      toast.success(`${type === 'profile' ? 'Profile' : 'Cover'} photo uploaded!`);
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("Upload failed: " + error.message);
    } finally {
      setUploading(null);
    }
  };

  const handleSave = async () => {
    if (!settings.store_name.trim()) {
      toast.error("Store name is required");
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Session expired. Please log in again.");

      const updates = {
        user_id: user.id,
        ...settings,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("store_settings")
        .upsert(updates, { onConflict: "user_id" });

      if (error) throw error;
      toast.success("Store profile saved successfully!");
    } catch (error: any) {
      console.error("Error saving profile:", error);
      toast.error("Failed to save: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col justify-center items-center min-h-[60vh] gap-4">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="text-muted-foreground animate-pulse font-medium">Loading store branding...</p>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto pb-24 md:pb-12 bg-background min-h-screen">
      {/* Social-style Header */}
      <div className="relative group">
        {/* Cover Photo Backdrop */}
        <div className="h-56 md:h-96 bg-gradient-to-b from-muted to-muted/50 overflow-hidden relative rounded-b-2xl shadow-sm border-b overflow-hidden">
          {settings.cover_url ? (
            <img src={settings.cover_url} alt="Cover" className="w-full h-full object-cover transition-transform duration-700 hover:scale-105" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/30 bg-muted/20">
              <Share2 className="h-24 w-24 mb-2 opacity-10" />
              <p className="text-sm font-medium opacity-40">No cover photo set</p>
            </div>
          )}

          <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

          <Button
            variant="secondary"
            size="sm"
            className="absolute bottom-4 right-4 gap-2 shadow-xl border border-white/20 backdrop-blur-md bg-white/80 hover:bg-white"
            onClick={() => coverInputRef.current?.click()}
            disabled={uploading === 'cover'}
          >
            {uploading === 'cover' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4 text-primary" />}
            <span className="hidden sm:inline">{settings.cover_url ? "Change Cover" : "Add Cover Photo"}</span>
          </Button>
          <input type="file" ref={coverInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'cover')} />
        </div>

        {/* Profile Info Overlay */}
        <div className="px-6 -mt-16 md:-mt-24 flex flex-col md:flex-row items-center md:items-end gap-6 relative z-10">
          <div className="relative">
            <Avatar className="w-36 h-36 md:w-48 md:h-48 border-[6px] border-background shadow-2xl ring-1 ring-black/5">
              <AvatarImage src={settings.profile_url} className="object-cover" />
              <AvatarFallback className="bg-primary/5 text-primary text-6xl font-black">
                {settings.store_name?.charAt(0) || <Store className="h-16 w-16" />}
              </AvatarFallback>
            </Avatar>
            <Button
              size="icon"
              variant="secondary"
              className="absolute bottom-2 right-2 rounded-full shadow-lg border-4 border-background h-12 w-12 hover:scale-110 active:scale-95 transition-all bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => profileInputRef.current?.click()}
              disabled={uploading === 'profile'}
            >
              {uploading === 'profile' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
            </Button>
            <input type="file" ref={profileInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'profile')} />
          </div>

          <div className="flex-1 text-center md:text-left pt-4 pb-2">
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-foreground break-words drop-shadow-sm">
              {settings.store_name || "Enter Store Name"}
            </h1>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-2 text-muted-foreground font-semibold uppercase tracking-widest text-[10px] md:text-xs">
              <span className="flex items-center gap-1.5 bg-muted/50 px-3 py-1 rounded-full">
                <MapPin className="h-3 w-3 text-primary" />
                {settings.store_address || "Location not set"}
              </span>
              {settings.store_phone && (
                <span className="flex items-center gap-1.5 bg-muted/50 px-3 py-1 rounded-full">
                  <Phone className="h-3 w-3 text-primary" />
                  {settings.store_phone}
                </span>
              )}
            </div>
          </div>

          <div className="pb-4 self-center md:self-end">
            <Button onClick={handleSave} disabled={saving} className="shadow-2xl px-10 py-6 h-auto text-lg font-bold rounded-xl transition-all hover:translate-y-[-2px] hover:shadow-primary/20">
              {saving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Upload className="mr-2 h-5 w-5" />}
              Update Brand
            </Button>
          </div>
        </div>
      </div>

      <div className="px-6 py-12 grid lg:grid-cols-12 gap-10">
        {/* Left Column: About & Social */}
        <div className="lg:col-span-4 space-y-8">
          <Card className="border-none shadow-xl bg-card overflow-hidden">
            <CardHeader className="bg-primary/5 pb-4 border-b">
              <CardTitle className="text-lg font-black flex items-center gap-2 text-primary uppercase tracking-tighter">
                <Info className="h-5 w-5" />
                Shop Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-3">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">About the store</Label>
                <p className="text-sm leading-relaxed text-foreground/80 font-medium italic">
                  "{settings.store_description || "No bio added yet. Tell your customers why your tuna is the best in GenSan!"}"
                </p>
              </div>

              <Separator className="opacity-50" />

              <div className="space-y-4 pt-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Contact Details</Label>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3 text-sm">
                    <div className="bg-primary/10 p-2 rounded-lg"><MapPin className="h-4 w-4 text-primary" /></div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter leading-none mb-1">Address</span>
                      <span className="font-medium">{settings.store_address || "Not specified"}</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-3 text-sm">
                    <div className="bg-primary/10 p-2 rounded-lg"><Mail className="h-4 w-4 text-primary" /></div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter leading-none mb-1">Business Email</span>
                      <span className="font-medium">{settings.store_email || "Not specified"}</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-3 text-sm">
                    <div className="bg-primary/10 p-2 rounded-lg"><Phone className="h-4 w-4 text-primary" /></div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter leading-none mb-1">Phone Number</span>
                      <span className="font-medium">{settings.store_phone || "Not specified"}</span>
                    </div>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-blue-50/20 dark:bg-blue-950/20 overflow-hidden">
            <CardHeader className="bg-blue-600/5 pb-4 border-b">
              <CardTitle className="text-base font-black flex items-center gap-2 text-blue-700">
                <Globe className="h-4 w-4" />
                Social Connections
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-5">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-blue-700 flex items-center gap-2">
                  <Facebook className="h-4 w-4" /> Facebook URL
                </Label>
                <Input
                  placeholder="facebook.com/your-shop"
                  className="bg-white/50 border-blue-200 focus:border-blue-500 font-medium"
                  value={settings.social_facebook}
                  onChange={e => setSettings({ ...settings, social_facebook: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-pink-600 flex items-center gap-2">
                  <Instagram className="h-4 w-4" /> Instagram Handle
                </Label>
                <Input
                  placeholder="@yourstore"
                  className="bg-white/50 border-pink-100 focus:border-pink-500 font-medium"
                  value={settings.social_instagram}
                  onChange={e => setSettings({ ...settings, social_instagram: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Middle & Right Column: Detailed Forms */}
        <div className="lg:col-span-8 space-y-8">
          <Card className="border-none shadow-lg shadow-black/5 ring-1 ring-black/5">
            <CardHeader className="border-b bg-muted/30">
              <CardTitle className="flex items-center gap-2 text-2xl font-black">
                <Store className="h-6 w-6 text-primary" />
                Store Branding Editor
              </CardTitle>
              <CardDescription className="text-base font-medium">Fine-tune how your business appears to the world.</CardDescription>
            </CardHeader>
            <CardContent className="pt-8 space-y-8">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label className="font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                    Official Store Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={settings.store_name}
                    onChange={(e) => setSettings({ ...settings, store_name: e.target.value })}
                    placeholder="e.g., General Santos Premium Tuna"
                    className="font-bold text-lg h-12 border-muted-foreground/20 focus:border-primary px-4"
                  />
                  <p className="text-[10px] text-muted-foreground leading-none">This appears on receipts and the shop list.</p>
                </div>

                <div className="space-y-3">
                  <Label className="font-bold text-xs uppercase tracking-widest">Business Email</Label>
                  <Input
                    type="email"
                    value={settings.store_email}
                    onChange={(e) => setSettings({ ...settings, store_email: e.target.value })}
                    placeholder="sales@tunaapp.com"
                    className="h-12 border-muted-foreground/20 px-4 font-medium"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="font-bold text-xs uppercase tracking-widest">Business Hotline</Label>
                  <Input
                    value={settings.store_phone}
                    onChange={(e) => setSettings({ ...settings, store_phone: e.target.value })}
                    placeholder="+63 9xx xxx xxxx"
                    className="h-12 border-muted-foreground/20 px-4 font-medium"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="font-bold text-xs uppercase tracking-widest">Physical Address</Label>
                  <Input
                    value={settings.store_address}
                    onChange={(e) => setSettings({ ...settings, store_address: e.target.value })}
                    placeholder="Fish Port, GenSan"
                    className="h-12 border-muted-foreground/20 px-4 font-medium"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-4">
                <Label className="font-bold text-xs uppercase tracking-widest">The Shop's Story (Bio)</Label>
                <Textarea
                  value={settings.store_description}
                  onChange={(e) => setSettings({ ...settings, store_description: e.target.value })}
                  placeholder="Share your heritage. Are you a multi-generation family business? Do you source the freshest catch daily? Let customers know!"
                  rows={8}
                  className="border-muted-foreground/20 focus:border-primary p-4 text-base font-medium leading-relaxed resize-none"
                />
                <div className="flex justify-between items-center px-1">
                  <p className="text-xs text-muted-foreground">Keep it engaging and professional.</p>
                  <p className="text-[10px] font-bold text-primary uppercase tracking-tighter">Markdown supported</p>
                </div>
              </div>

              <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10 flex flex-col md:flex-row items-center gap-6 justify-between mt-8">
                <div className="space-y-1 text-center md:text-left">
                  <h4 className="font-black text-primary text-lg leading-tight tracking-tight">Ready to publish?</h4>
                  <p className="text-sm font-medium text-muted-foreground">Changes will be visible to all customers immediately.</p>
                </div>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full md:w-auto px-12 py-7 h-auto text-xl font-black rounded-xl shadow-lg hover:shadow-primary/30"
                >
                  {saving ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <Store className="mr-2 h-6 w-6" />}
                  Save Brand Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StoreProfile;
