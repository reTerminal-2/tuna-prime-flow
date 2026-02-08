import { Outlet, Link } from "react-router-dom";
import { ShoppingCart, Search, User, LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

import { useProfileRedirect } from "@/hooks/useProfileRedirect";

const StoreLayout = () => {
  const [cartCount, setCartCount] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { profileLink } = useProfileRedirect();

  useEffect(() => {
    let mounted = true;

    // Check auth
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) setUser(session?.user || null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setUser(session?.user || null);
    });

    // Listen for cart updates
    const updateCartCount = () => {
      const cart = JSON.parse(localStorage.getItem("cart") || "[]");
      setCartCount(cart.reduce((acc: number, item: any) => acc + item.quantity, 0));
    };

    window.addEventListener("cartUpdated", updateCartCount);
    updateCartCount();

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.removeEventListener("cartUpdated", updateCartCount);
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white shadow-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-bold text-xl text-primary">
            <img src="/favicon.png" alt="TunaFlow Logo" className="h-8 w-8 object-contain" />
            <span className="hidden sm:inline-block">TunaFlow</span>
          </Link>

          {/* Search Bar - Desktop */}
          <div className="flex-1 max-w-xl relative hidden sm:block">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search for fresh tuna..."
              className="w-full pl-9 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
            />
          </div>

          {/* Search Bar - Mobile Overlay */}
          {isSearchOpen && (
            <div className="absolute top-0 left-0 w-full h-16 bg-white z-50 flex items-center px-4 border-b animate-in fade-in slide-in-from-top-2">
              <Search className="absolute left-6 top-6 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search products..."
                className="w-full pl-9 bg-gray-50 border-gray-200 focus:bg-white transition-colors mr-2"
                autoFocus
              />
              <Button variant="ghost" size="sm" onClick={() => setIsSearchOpen(false)}>
                Cancel
              </Button>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="sm:hidden"
              onClick={() => setIsSearchOpen(true)}
            >
              <Search className="h-5 w-5" />
            </Button>

            <Link to="/cart">
              <Button variant="ghost" size="icon" className="relative">
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs rounded-full">
                    {cartCount}
                  </Badge>
                )}
              </Button>
            </Link>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to={profileLink}>My Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/orders">My Orders</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/seller/dashboard">Seller Dashboard</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/auth">
                  <Button variant="ghost" size="sm">Login</Button>
                </Link>
                <Link to="/auth?tab=signup">
                  <Button size="sm">Sign Up</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t py-8 mt-auto">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; 2026 TunaFlow. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default StoreLayout;
