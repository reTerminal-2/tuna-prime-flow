import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useProfileRedirect = () => {
  const [profilePath, setProfilePath] = useState("/profile");
  const [loading, setLoading] = useState(true);
  const [isSeller, setIsSeller] = useState(false);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setProfilePath("/auth");
        setIsSeller(false);
        setLoading(false);
        return;
      }

      // Check metadata first (faster)
      const role = session.user.user_metadata?.role;
      if (role === 'admin') {
        setProfilePath("/seller/profile");
        setIsSeller(true);
        setLoading(false);
        return;
      }

      // Check store_settings DB
      const { data: store, error } = await supabase
        .from("store_settings")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (store && !error) {
        setProfilePath("/seller/profile");
        setIsSeller(true);
      } else {
        setProfilePath("/profile");
        setIsSeller(false);
      }
    } catch (error) {
      console.error("Profile check failed", error);
      // Default to normal profile on error to prevent blocking
      setProfilePath("/profile");
      setIsSeller(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        // Reset state slightly to indicate re-check if needed, or just re-run
        checkUser();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { profilePath, loading, isSeller };
};
