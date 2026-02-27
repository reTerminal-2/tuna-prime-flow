import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AIProvider } from "./contexts/AIContext";
import { Suspense, lazy, useEffect } from "react";

// Layouts
import MainLayout from "./components/MainLayout";
import MobileLayout from "./components/MobileLayout";
import StoreLayout from "./components/StoreLayout";

// Eager loaded pages (critical)
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import POS from "./pages/POS"; // Reverted to Eager Load for Debugging

// Lazy loaded pages (for performance and isolation)
// const POS = lazy(() => import("./pages/POS"));
const Inventory = lazy(() => import("./pages/Inventory"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Suppliers = lazy(() => import("./pages/Suppliers"));
const Reports = lazy(() => import("./pages/Reports"));
const Settings = lazy(() => import("./pages/Settings"));
const ShippingSettings = lazy(() => import("./pages/ShippingSettings"));
const PaymentSettings = lazy(() => import("./pages/PaymentSettings"));
const StoreProfile = lazy(() => import("./pages/StoreProfile"));
const SellerOrders = lazy(() => import("./pages/SellerOrders"));
const Customers = lazy(() => import("./pages/Customers"));
const AIManager = lazy(() => import("./pages/AIManager"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Cart = lazy(() => import("./pages/Cart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const Orders = lazy(() => import("./pages/Orders"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const UpdatePassword = lazy(() => import("./pages/UpdatePassword"));
const SuperAdminLogin = lazy(() => import("./pages/SuperAdminLogin"));
const SuperAdminDashboard = lazy(() => import("./pages/SuperAdminDashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

// Loading Fallback
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen w-full bg-muted/20">
    <div className="flex flex-col items-center gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      <p className="text-muted-foreground font-medium">Loading...</p>
    </div>
  </div>
);

// Device Redirector Component
const DeviceRedirector = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Only redirect if explicitly on a seller or dashboard path to avoid breaking everything
    const isMobileDevice = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isMobilePath = location.pathname.startsWith('/mobile');
    const isSellerPath = location.pathname.includes('/seller');
    const isDashboardPath = location.pathname === '/dashboard';

    // Logic: Mobile users should be on /mobile version of the current page
    if (isMobileDevice && !isMobilePath) {
      const newPath = `/mobile${location.pathname === '/' ? '' : location.pathname}`;
      navigate(newPath, { replace: true });
    }
    // Note: Removed the "away" redirect for desktop to allow testing/manual access to /mobile
  }, [location.pathname, navigate]);

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AIProvider>
            <Suspense fallback={<PageLoader />}>
              <DeviceRedirector>
                <Routes>
                  {/* Shared/Common Routes (Responsive) */}
                  <Route path="/" element={<StoreLayout />}>
                    <Route index element={<Index />} />
                    <Route path="product/:id" element={<ProductDetail />} />
                    <Route path="cart" element={<Cart />} />
                    <Route path="checkout" element={<Checkout />} />
                    <Route path="orders" element={<Orders />} />
                    <Route path="profile" element={<UserProfile />} />
                  </Route>

                  <Route path="/auth" element={<Auth />} />
                  <Route path="/update-password" element={<UpdatePassword />} />
                  <Route path="/superadmin" element={<SuperAdminLogin />} />
                  <Route path="/superadmin/dashboard" element={<SuperAdminDashboard />} />

                  {/* Desktop Specific Seller Routes */}
                  <Route path="/seller" element={<Navigate to="/seller/dashboard" replace />} />
                  <Route path="/seller/dashboard" element={<MainLayout><Dashboard /></MainLayout>} />
                  <Route path="/seller/pos" element={<MainLayout><POS /></MainLayout>} />
                  <Route path="/seller/ai" element={<MainLayout><AIManager /></MainLayout>} />
                  <Route path="/seller/orders" element={<MainLayout><SellerOrders /></MainLayout>} />
                  <Route path="/seller/inventory" element={<MainLayout><Inventory /></MainLayout>} />
                  <Route path="/seller/pricing" element={<MainLayout><Pricing /></MainLayout>} />
                  <Route path="/seller/customers" element={<MainLayout><Customers /></MainLayout>} />
                  <Route path="/seller/suppliers" element={<MainLayout><Suppliers /></MainLayout>} />
                  <Route path="/seller/reports" element={<MainLayout><Reports /></MainLayout>} />
                  <Route path="/seller/settings" element={<MainLayout><Settings /></MainLayout>} />
                  <Route path="/seller/profile" element={<MainLayout><StoreProfile /></MainLayout>} />
                  <Route path="/seller/shipping" element={<MainLayout><ShippingSettings /></MainLayout>} />
                  <Route path="/seller/payments" element={<MainLayout><PaymentSettings /></MainLayout>} />

                  {/* Mobile Version of Shared Routes */}
                  <Route path="/mobile" element={<StoreLayout />}>
                    <Route index element={<Index />} />
                  </Route>
                  <Route path="/mobile/auth" element={<Auth />} />
                  <Route path="/mobile/seller/dashboard" element={<MobileLayout><Dashboard /></MobileLayout>} />
                  <Route path="/mobile/seller/pos" element={<MobileLayout><POS /></MobileLayout>} />
                  <Route path="/mobile/seller/ai" element={<MobileLayout><AIManager /></MobileLayout>} />
                  <Route path="/mobile/seller/orders" element={<MobileLayout><SellerOrders /></MobileLayout>} />
                  <Route path="/mobile/seller/inventory" element={<MobileLayout><Inventory /></MobileLayout>} />
                  <Route path="/mobile/seller/pricing" element={<MobileLayout><Pricing /></MobileLayout>} />
                  <Route path="/mobile/seller/customers" element={<MobileLayout><Customers /></MobileLayout>} />
                  <Route path="/mobile/seller/suppliers" element={<MobileLayout><Suppliers /></MobileLayout>} />
                  <Route path="/mobile/seller/reports" element={<MobileLayout><Reports /></MobileLayout>} />
                  <Route path="/mobile/seller/settings" element={<MobileLayout><Settings /></MobileLayout>} />
                  <Route path="/mobile/seller/profile" element={<MobileLayout><StoreProfile /></MobileLayout>} />
                  <Route path="/mobile/seller/shipping" element={<MobileLayout><ShippingSettings /></MobileLayout>} />
                  <Route path="/mobile/seller/payments" element={<MobileLayout><PaymentSettings /></MobileLayout>} />

                  {/* Legacy Redirects */}
                  <Route path="/dashboard" element={<Navigate to="/seller/dashboard" replace />} />
                  <Route path="/inventory" element={<Navigate to="/seller/inventory" replace />} />

                  {/* Catch-all */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </DeviceRedirector>
            </Suspense>
          </AIProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
