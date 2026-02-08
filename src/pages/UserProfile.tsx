import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { User, MapPin, Phone, Globe, Camera, Loader2, Upload } from "lucide-react";

import { useProfileRedirect } from "@/hooks/useProfileRedirect";

const UserProfile = () => {
  const navigate = useNavigate();
  const { isSeller, loading: redirectLoading } = useProfileRedirect();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState({
    full_name: "",
    email: "",
    avatar_url: "",
    address: "",
    phone_number: "",
    social_media_links: {
      facebook: "",
      twitter: "",
      instagram: ""
    }
  });

  useEffect(() => {
    if (!redirectLoading) {
      if (isSeller) {
        toast.info("Redirecting to Seller Profile...");
        navigate("/seller/profile");
      } else {
        // Fetch profile only if not seller
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session) fetchProfile(session.user.id);
          else navigate("/auth");
        });
      }
    }
  }, [isSeller, redirectLoading, navigate]);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;

      if (data) {
        setProfile({
          full_name: data.full_name || "",
          email: data.email || "",
          avatar_url: data.avatar_url || "",
          address: data.address || "",
          phone_number: data.phone_number || "",
          social_media_links: {
            facebook: data.social_media_links?.facebook || "",
            twitter: data.social_media_links?.twitter || "",
            instagram: data.social_media_links?.instagram || ""
          }
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
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
        id: user.id,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        address: profile.address,
        phone_number: profile.phone_number,
        social_media_links: profile.social_media_links,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("profiles")
        .upsert(updates);

      if (error) throw error;
      toast.success("Profile updated successfully");
    } catch (error: any) {
      console.error("Error saving profile:", error);
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleSocialChange = (platform: string, value: string) => {
    setProfile(prev => ({
      ...prev,
      social_media_links: {
        ...prev.social_media_links,
        [platform]: value
      }
    }));
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }
      
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      setUploading(true);

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      
      setProfile(prev => ({ ...prev, avatar_url: data.publicUrl }));
      toast.success("Profile picture uploaded!");
      
    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      toast.error(error.message || "Error uploading avatar");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar / Info Card */}
        <div className="md:w-1/3 space-y-6">
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto w-24 h-24 relative mb-4 group">
                <Avatar className="w-24 h-24 border-2 border-border group-hover:border-primary transition-colors">
                  <AvatarImage src={profile.avatar_url} alt={profile.full_name} className="object-cover" />
                  <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                    {profile.full_name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div 
                  className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full cursor-pointer hover:bg-primary/90 transition-colors shadow-sm" 
                  title="Change Avatar"
                  onClick={() => fileInputRef.current?.click()}
                >
                   {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  disabled={uploading}
                />
              </div>
              <CardTitle>{profile.full_name || "User"}</CardTitle>
              <CardDescription>{profile.email}</CardDescription>
            </CardHeader>
            <CardContent>
               <p className="text-sm text-muted-foreground mb-4">
                 Manage your personal information and preferences.
               </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Form */}
        <div className="md:w-2/3">
          <Card>
            <CardHeader>
              <CardTitle>Edit Profile</CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div className="space-y-2">
                <Label>Profile Picture</Label>
                <div className="flex gap-2 items-center">
                    <Input 
                        value={profile.avatar_url} 
                        onChange={(e) => setProfile({...profile, avatar_url: e.target.value})}
                        placeholder="https://example.com/avatar.jpg"
                        className="flex-1"
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                      Upload
                    </Button>
                </div>
                <p className="text-xs text-muted-foreground">Upload an image or paste a direct URL.</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="fullName" 
                      className="pl-9" 
                      value={profile.full_name} 
                      onChange={(e) => setProfile({...profile, full_name: e.target.value})}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="phone" 
                      className="pl-9" 
                      value={profile.phone_number} 
                      onChange={(e) => setProfile({...profile, phone_number: e.target.value})}
                      placeholder="+63 900 000 0000"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <div className="relative">
                  <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Textarea 
                    id="address" 
                    className="pl-9 min-h-[80px]" 
                    value={profile.address} 
                    onChange={(e) => setProfile({...profile, address: e.target.value})}
                    placeholder="123 Tuna St, General Santos City"
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h3 className="font-medium flex items-center gap-2">
                    <Globe className="w-4 h-4" /> Social Media
                </h3>
                <div className="grid gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="facebook">Facebook</Label>
                        <Input 
                            id="facebook" 
                            value={profile.social_media_links.facebook} 
                            onChange={(e) => handleSocialChange('facebook', e.target.value)}
                            placeholder="facebook.com/username"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="instagram">Instagram</Label>
                        <Input 
                            id="instagram" 
                            value={profile.social_media_links.instagram} 
                            onChange={(e) => handleSocialChange('instagram', e.target.value)}
                            placeholder="instagram.com/username"
                        />
                    </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "Saving Changes..." : "Save Changes"}
                </Button>
              </div>

            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
