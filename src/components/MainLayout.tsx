import { ReactNode, useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import {
  LayoutDashboard,
  Package,
  Tags,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Fish,
  Menu,
  ShoppingCart,
  UserCircle,
  Truck,
  CreditCard,
  Store,
  PhilippinePeso,
  BrainCircuit,
  Calculator,
  Search,
  Bell,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const navItems = [
  { title: "Dashboard", url: "/seller/dashboard", icon: LayoutDashboard },
  { title: "Point of Sale", url: "/seller/pos", icon: Calculator },
  { title: "AI Manager", url: "/seller/ai", icon: BrainCircuit },
  { title: "Orders", url: "/seller/orders", icon: ShoppingCart },
  { title: "Inventory", url: "/seller/inventory", icon: Package },
  { title: "Pricing Engine", url: "/seller/pricing", icon: PhilippinePeso },
  { title: "Customers", url: "/seller/customers", icon: UserCircle },
  { title: "Suppliers", url: "/seller/suppliers", icon: Users },
  { title: "Reports", url: "/seller/reports", icon: BarChart3 },
];

const configItems = [
  { title: "Store Profile", url: "/seller/profile", icon: Store },
  { title: "Shipping", url: "/seller/shipping", icon: Truck },
  { title: "Payments", url: "/seller/payments", icon: CreditCard },
  { title: "Settings", url: "/seller/settings", icon: Settings },
];

const AppSidebar = () => {
  const { state, setOpenMobile } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogoutClick = () => {
    setShowLogoutDialog(true);
  };

  const handleLogoutConfirm = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    try {
      setOpenMobile(false);
      setShowLogoutDialog(false);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success("Logged out successfully");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Unable to log out. Please try closing and reopening the app.");
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <Sidebar className="border-r border-border/50 bg-sidebar/95 backdrop-blur supports-[backdrop-filter]:bg-sidebar/60">
      <SidebarContent>
        <div className="p-6">
          <div className="flex items-center gap-3 transition-all duration-300">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/20">
              <Fish className="h-6 w-6 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight">TunaFlow</span>
              <span className="text-xs text-muted-foreground">Management System</span>
            </div>
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="px-6 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent className="px-3">
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = currentPath === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className={`
                        w-full transition-all duration-200 ease-in-out rounded-lg my-1
                        ${isActive
                          ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90 hover:text-primary-foreground"
                          : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"
                        }
                      `}
                    >
                      <NavLink
                        to={item.url}
                        className="flex items-center gap-3 px-3 py-2"
                      >
                        <item.icon className="h-4 w-4" />
                        <span className="font-medium">{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="px-6 text-xs font-medium text-muted-foreground uppercase tracking-wider mt-4">
            Settings
          </SidebarGroupLabel>
          <SidebarGroupContent className="px-3">
            <SidebarMenu>
              {configItems.map((item) => {
                const isActive = currentPath === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className={`
                        w-full transition-all duration-200 ease-in-out rounded-lg my-1
                        ${isActive
                          ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90 hover:text-primary-foreground"
                          : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"
                        }
                      `}
                    >
                      <NavLink
                        to={item.url}
                        className="flex items-center gap-3 px-3 py-2"
                      >
                        <item.icon className="h-4 w-4" />
                        <span className="font-medium">{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto p-4 border-t border-border/50">
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            onClick={handleLogoutClick}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </SidebarContent>

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent className="glass-card border-none max-w-[90vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to logout? You will need to login again to access the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel disabled={isLoggingOut} className="w-full sm:w-auto">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogoutConfirm}
              disabled={isLoggingOut}
              className="w-full sm:w-auto bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {isLoggingOut ? "Logging out..." : "Logout"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sidebar>
  );
}

import MobileLayout from "./MobileLayout";
import { useIsMobile } from "@/hooks/use-mobile";

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const hasNavigatedRef = useRef(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (event === 'SIGNED_OUT' || !session) {
          setUser(null);
          setIsLoading(false);
          if (!hasNavigatedRef.current) {
            hasNavigatedRef.current = true;
            navigate("/auth", { replace: true });
            setTimeout(() => hasNavigatedRef.current = false, 100);
          }
        } else if (session) {
          setUser(session.user);
          setIsLoading(false);
          hasNavigatedRef.current = false;
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session) {
        setUser(session.user);
      } else if (!hasNavigatedRef.current) {
        hasNavigatedRef.current = true;
        navigate("/auth", { replace: true });
        setTimeout(() => hasNavigatedRef.current = false, 100);
      }
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  if (isLoading || !user) return null;

  if (isMobile) {
    return <MobileLayout>{children}</MobileLayout>;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background selection:bg-primary/20">
        <AppSidebar />
        <main className="flex-1 flex flex-col min-w-0 bg-muted/30 transition-all duration-300 ease-in-out">
          <header className="flex h-16 items-center gap-4 border-b border-border/40 bg-background/80 px-6 sticky top-0 z-20 backdrop-blur-md shrink-0 supports-[backdrop-filter]:bg-background/60">
            <div className="w-full flex-1">
              <form onSubmit={(e) => e.preventDefault()}>
                <div className="relative group">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    type="search"
                    placeholder="Search..."
                    className="w-full bg-muted/50 border-transparent focus:bg-background focus:border-primary/20 pl-9 md:w-[200px] lg:w-[300px] rounded-full transition-all duration-300"
                  />
                </div>
              </form>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <Button variant="ghost" size="icon" className="relative hover:bg-accent rounded-full">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <span className="absolute top-2.5 right-2.5 h-2 w-2 bg-red-500 rounded-full ring-2 ring-background animate-pulse"></span>
              </Button>
              <div className="flex items-center gap-3 pl-2 border-l border-border/50">
                <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-primary/80 to-primary flex items-center justify-center text-primary-foreground font-medium shadow-md shadow-primary/20 ring-2 ring-background">
                  {user?.email?.charAt(0).toUpperCase()}
                </div>
                <div className="hidden md:block text-sm">
                  <p className="font-medium leading-none text-foreground">Admin</p>
                  <p className="text-xs text-muted-foreground truncate max-w-[120px]">{user?.email}</p>
                </div>
              </div>
            </div>
          </header>
          <div className="flex-1 overflow-auto p-4 md:p-8 scroll-smooth">
            <div className="mx-auto max-w-7xl animate-in fade-in-50 duration-500 space-y-6">
              {children}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default MainLayout;
