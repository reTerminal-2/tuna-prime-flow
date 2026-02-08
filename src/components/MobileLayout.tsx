import { ReactNode, useState, useEffect, useRef } from "react";
import { NavLink as RouterNavLink, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, ShoppingCart, Calculator, Menu, Search, Bell, X, Store, Package, Users, BarChart3, Settings, LogOut, Truck, CreditCard, BrainCircuit, UserCircle, PhilippinePeso, Fish } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { toast } from "sonner";

interface MobileLayoutProps {
    children: ReactNode;
}

const MobileLayout = ({ children }: MobileLayoutProps) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [user, setUser] = useState<User | null>(null);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const hasNavigatedRef = useRef(false);

    // Authentication Logic (Parity with MainLayout)
    useEffect(() => {
        let mounted = true;

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (!mounted) return;

                if (event === 'SIGNED_OUT' || !session) {
                    setUser(null);
                    if (!hasNavigatedRef.current) {
                        hasNavigatedRef.current = true;
                        navigate("/auth", { replace: true });
                        setTimeout(() => hasNavigatedRef.current = false, 100);
                    }
                } else if (session) {
                    setUser(session.user);
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
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [navigate]);

    useEffect(() => {
        if (isSearchOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isSearchOpen]);

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut();
            toast.success("Logged out successfully");
        } catch (error) {
            toast.error("Error logging out");
        }
    };

    const navItems = [
        { title: "Dashboard", url: "/seller/dashboard", icon: LayoutDashboard },
        { title: "Orders", url: "/seller/orders", icon: ShoppingCart },
        { title: "POS", url: "/seller/pos", icon: Calculator },
        { title: "Inventory", url: "/seller/inventory", icon: Package },
    ];

    const menuItems = [
        { title: "AI Manager", url: "/seller/ai", icon: BrainCircuit },
        { title: "Pricing", url: "/seller/pricing", icon: PhilippinePeso },
        { title: "Customers", url: "/seller/customers", icon: UserCircle },
        { title: "Suppliers", url: "/seller/suppliers", icon: Users },
        { title: "Reports", url: "/seller/reports", icon: BarChart3 },
        { title: "Store Profile", url: "/seller/profile", icon: Store },
        { title: "Shipping", url: "/seller/shipping", icon: Truck },
        { title: "Payments", url: "/seller/payments", icon: CreditCard },
        { title: "Settings", url: "/seller/settings", icon: Settings },
    ];

    const isMenuPage = menuItems.some(item => location.pathname === item.url);

    return (
        <div className="min-h-screen bg-muted/20 pb-safe-offset-20 flex flex-col">
            {/* Top Header */}
            <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50 px-4 h-16 flex items-center justify-between shadow-sm supports-[backdrop-filter]:bg-background/60">
                {!isSearchOpen ? (
                    <>
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-md shadow-primary/20">
                                <Fish className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
                            </div>
                            <span className="font-bold text-lg tracking-tight">Nenita's</span>
                        </div>
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-300">
                            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setIsSearchOpen(true)}>
                                <Search className="h-5 w-5 text-muted-foreground" />
                            </Button>
                            <Button variant="ghost" size="icon" className="relative rounded-full">
                                <Bell className="h-5 w-5 text-muted-foreground" />
                                <span className="absolute top-2.5 right-2.5 h-2 w-2 bg-red-500 rounded-full animate-pulse"></span>
                            </Button>
                            <Avatar className="h-8 w-8 border border-border">
                                <AvatarImage src="" />
                                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                                    {user?.email?.charAt(0).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                        </div>
                    </>
                ) : (
                    <div className="w-full flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                ref={searchInputRef}
                                placeholder="Search..."
                                className="pl-9 bg-muted/50 border-none focus-visible:ring-1"
                            />
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setIsSearchOpen(false)}>
                            Cancel
                        </Button>
                    </div>
                )}
            </header>

            {/* Main Content Area */}
            <main className="flex-1 p-4 pb-24 overflow-x-hidden animate-in fade-in duration-500">
                {children}
            </main>

            {/* Bottom Navigation Bar */}
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-lg border-t border-border/50 h-16 pb-safe px-2 flex items-center justify-around shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.url;
                    return (
                        <RouterNavLink
                            key={item.url}
                            to={item.url}
                            className={`flex flex-col items-center justify-center p-2 rounded-lg gap-1 transition-all duration-300 w-16
                ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-primary/70'}
              `}
                        >
                            <div className={`relative ${isActive ? '-translate-y-1' : ''} transition-transform duration-300`}>
                                <item.icon className="h-6 w-6" strokeWidth={isActive ? 2.5 : 2} />
                                {isActive && <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 h-1 w-1 bg-primary rounded-full"></div>}
                            </div>
                            <span className="text-[10px] font-medium">{item.title}</span>
                        </RouterNavLink>
                    );
                })}

                {/* More Menu Sheet */}
                <Sheet>
                    <SheetTrigger asChild>
                        <button className={`flex flex-col items-center justify-center p-2 rounded-lg gap-1 transition-all duration-300 w-16
               ${isMenuPage ? 'text-primary' : 'text-muted-foreground hover:text-primary/70'}
            `}>
                            <div className={`relative ${isMenuPage ? '-translate-y-1' : ''} transition-transform duration-300`}>
                                <Menu className="h-6 w-6" strokeWidth={isMenuPage ? 2.5 : 2} />
                                {isMenuPage && <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 h-1 w-1 bg-primary rounded-full"></div>}
                            </div>
                            <span className="text-[10px] font-medium">Menu</span>
                        </button>
                    </SheetTrigger>
                    <SheetContent side="bottom" className="h-[85vh] rounded-t-[20px] p-0 flex flex-col">
                        <SheetHeader className="p-6 border-b text-left">
                            <SheetTitle className="text-xl font-bold flex items-center gap-2">
                                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <Menu className="h-5 w-5 text-primary" />
                                </div>
                                Menu
                            </SheetTitle>
                        </SheetHeader>
                        <ScrollArea className="flex-1 p-4">
                            <div className="grid grid-cols-4 gap-4 mb-8">
                                {menuItems.map((item) => {
                                    const isActive = location.pathname === item.url;
                                    return (
                                        <RouterNavLink
                                            key={item.url}
                                            to={item.url}
                                            className={`flex flex-col items-center gap-2 group`}
                                        >
                                            <div className={`h-14 w-14 rounded-2xl flex items-center justify-center transition-colors duration-200
                              ${isActive ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'bg-muted/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'}
                            `}>
                                                <item.icon className="h-6 w-6" />
                                            </div>
                                            <span className={`text-xs text-center font-medium leading-tight max-w-[64px] ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>{item.title}</span>
                                        </RouterNavLink>
                                    )
                                })}
                            </div>

                            <div className="p-4 bg-muted/30 rounded-xl mb-safe mx-2">
                                <div className="flex items-center gap-3 mb-4">
                                    <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                                        <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                                            {user?.email?.charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-bold truncate max-w-[200px]">{user?.email}</p>
                                        <p className="text-xs text-muted-foreground">Store Admin</p>
                                    </div>
                                </div>
                                <Button variant="destructive" className="w-full shadow-sm" onClick={handleLogout}>
                                    <LogOut className="mr-2 h-4 w-4" /> Log Out
                                </Button>
                            </div>
                        </ScrollArea>
                    </SheetContent>
                </Sheet>
            </div>
        </div>
    );
};

export default MobileLayout;
