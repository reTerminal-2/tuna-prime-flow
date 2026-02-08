import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Fish } from "lucide-react";

const UpdatePassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    // Check URL hash immediately
    const hasRecoveryToken = window.location.hash.includes("type=recovery");
    if (hasRecoveryToken) {
        setIsRecovery(true);
    }

    // Listen for the PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth event:", event);
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
        setSession(session);
      } else if (session) {
        setSession(session);
      }
    });

    // Initial check
    supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        
        // Strict Security Check:
        // If we don't have a recovery token in URL AND we haven't seen a recovery event,
        // we should redirect, even if logged in.
        // However, give a small buffer for the event to fire if hash exists.
        
        const currentHash = window.location.hash;
        if (!currentHash.includes("type=recovery") && !isRecovery) {
            // No recovery token found.
            // If logged in, go to home. If not, go to auth.
            // We use a small timeout to allow the onAuthStateChange to potentially fire if it was racing.
            setTimeout(() => {
                if (!isRecovery) { // Check state again inside timeout
                    navigate(session ? "/" : "/auth");
                }
            }, 500);
        }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (password.length < 6) {
        toast.error("Password must be at least 6 characters");
        setLoading(false);
        return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      toast.success("Password updated successfully!");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  // Render nothing while checking security or if invalid
  if ((!session && !window.location.hash) || (!isRecovery && !window.location.hash.includes("type=recovery"))) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
            <div className="mx-auto h-12 w-12 rounded-xl bg-primary flex items-center justify-center mb-4">
              <Fish className="h-8 w-8 text-white" />
            </div>
          <CardTitle>Update Password</CardTitle>
          <CardDescription>Enter your new password below.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default UpdatePassword;
