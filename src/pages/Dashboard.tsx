import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Package, TrendingUp, DollarSign, Users, CreditCard, Activity, ArrowUpRight, ArrowDownRight, Calendar } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Overview } from "@/components/dashboard/Overview";
import { RecentSales } from "@/components/dashboard/RecentSales";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface DashboardStats {
  totalProducts: number;
  totalInventoryValue: number;
  expiringCount: number;
  lowStockCount: number;
  todaySales: number;
  todayProfit: number;
  alertDays: number;
  activeCustomers: number;
}

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalInventoryValue: 0,
    expiringCount: 0,
    lowStockCount: 0,
    todaySales: 0,
    todayProfit: 0,
    alertDays: 3,
    activeCustomers: 0
  });
  const [expiringProducts, setExpiringProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");

    fetchDashboardData();

    const handleSettingsChange = () => {
      fetchDashboardData();
    };

    window.addEventListener("settingsChanged", handleSettingsChange);
    return () => window.removeEventListener("settingsChanged", handleSettingsChange);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { data: products, error } = await supabase.from("products").select("*");
      if (error) throw error;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data: transactions } = await supabase
        .from("transactions")
        .select("*")
        .gte("transaction_date", today.toISOString());

      const { count: customerCount } = await supabase.from("customers" as any).select("*", { count: 'exact', head: true });

      if (products) {
        const totalProducts = products.length;
        const totalInventoryValue = products.reduce(
          (sum, p) => sum + Number(p.current_stock) * Number(p.selling_price),
          0
        );

        const alertDays = parseInt(localStorage.getItem("stockAlertDays") || "3");
        const expirationThreshold = new Date();
        expirationThreshold.setDate(expirationThreshold.getDate() + alertDays);

        const expiring = products.filter(
          (p) => p.expiration_date && new Date(p.expiration_date) <= expirationThreshold
        );

        const lowStock = products.filter(
          (p) => Number(p.current_stock) <= Number(p.reorder_level)
        );

        const todaySales = transactions?.reduce((sum, t) => sum + Number(t.total_amount), 0) || 0;
        const todayProfit = transactions?.reduce((sum, t) => sum + Number(t.profit), 0) || 0;

        setStats({
          totalProducts,
          totalInventoryValue,
          expiringCount: expiring.length,
          lowStockCount: lowStock.length,
          todaySales,
          todayProfit,
          alertDays,
          activeCustomers: customerCount || 0
        });

        setExpiringProducts(expiring);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-20 w-1/3 bg-muted rounded-xl animate-pulse"></div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-40 bg-muted rounded-xl animate-pulse"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="hidden md:block">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            {greeting}, User
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's what's happening with your store today.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center text-sm font-medium text-muted-foreground bg-card/50 px-4 py-2 rounded-lg border border-border/50 shadow-sm backdrop-blur-sm">
            <Calendar className="mr-2 h-4 w-4 text-primary" />
            {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
          <Button className="shadow-lg shadow-primary/20">Download Report</Button>
        </div>
      </div>

      {/* Alerts Section */}
      {(stats.expiringCount > 0 || stats.lowStockCount > 0) && (
        <div className="grid gap-4 md:grid-cols-2 animate-in fade-in slide-in-from-top-4 duration-500">
          {stats.expiringCount > 0 && (
            <Alert variant="destructive" className="glass-card bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400">
              <AlertCircle className="h-5 w-5" />
              <AlertTitle className="ml-2 text-base font-semibold">Expiring Products</AlertTitle>
              <AlertDescription className="ml-2 mt-1">
                <span className="font-bold">{stats.expiringCount} items</span> are expiring within {stats.alertDays} days. Please check inventory immediately.
              </AlertDescription>
            </Alert>
          )}
          {stats.lowStockCount > 0 && (
            <Alert className="glass-card bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-5 w-5" />
              <AlertTitle className="ml-2 text-base font-semibold">Low Stock Warning</AlertTitle>
              <AlertDescription className="ml-2 mt-1">
                <span className="font-bold">{stats.lowStockCount} items</span> are below reorder level. Restocking is recommended.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-8">
        <TabsList className="bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">Overview</TabsTrigger>
          <TabsTrigger value="analytics" disabled className="rounded-lg">Analytics</TabsTrigger>
          <TabsTrigger value="reports" disabled className="rounded-lg">Reports</TabsTrigger>
          <TabsTrigger value="notifications" disabled className="rounded-lg">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-8">
          {/* Stats Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="glass-card overflow-hidden relative group">
              <div className="absolute right-0 top-0 h-24 w-24 bg-primary/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110 duration-500"></div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 z-10 relative">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Revenue
                </CardTitle>
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <DollarSign className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="z-10 relative">
                <div className="text-3xl font-bold tracking-tight">₱{stats.todaySales.toLocaleString()}</div>
                <div className="flex items-center text-xs text-green-500 mt-1 font-medium">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  20.1% <span className="text-muted-foreground ml-1 font-normal">from last month</span>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card overflow-hidden relative group">
              <div className="absolute right-0 top-0 h-24 w-24 bg-blue-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110 duration-500"></div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 z-10 relative">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Active Customers
                </CardTitle>
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                  <Users className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="z-10 relative">
                <div className="text-3xl font-bold tracking-tight">+{stats.activeCustomers}</div>
                <div className="flex items-center text-xs text-green-500 mt-1 font-medium">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  180.1% <span className="text-muted-foreground ml-1 font-normal">from last month</span>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card overflow-hidden relative group">
              <div className="absolute right-0 top-0 h-24 w-24 bg-indigo-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110 duration-500"></div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 z-10 relative">
                <CardTitle className="text-sm font-medium text-muted-foreground">Sales Count</CardTitle>
                <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-500">
                  <CreditCard className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="z-10 relative">
                <div className="text-3xl font-bold tracking-tight">+12,234</div>
                <div className="flex items-center text-xs text-green-500 mt-1 font-medium">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  19% <span className="text-muted-foreground ml-1 font-normal">from last month</span>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card overflow-hidden relative group">
              <div className="absolute right-0 top-0 h-24 w-24 bg-orange-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110 duration-500"></div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 z-10 relative">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Active Inventory
                </CardTitle>
                <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500">
                  <Activity className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="z-10 relative">
                <div className="text-3xl font-bold tracking-tight">{stats.totalProducts}</div>
                <div className="flex items-center text-xs text-orange-500 mt-1 font-medium">
                  <ArrowDownRight className="h-3 w-3 mr-1" />
                  4 <span className="text-muted-foreground ml-1 font-normal">low stock items</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4 glass-card shadow-lg border-border/50">
              <CardHeader>
                <CardTitle>Overview</CardTitle>
                <CardDescription>
                  Monthly sales performance for the current year.
                </CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <Overview />
              </CardContent>
            </Card>
            <Card className="col-span-3 glass-card shadow-lg border-border/50">
              <CardHeader>
                <CardTitle>Recent Sales</CardTitle>
                <CardDescription>
                  You made 265 sales this month.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RecentSales />
              </CardContent>
            </Card>
          </div>

          {/* Expiring Products Table Section */}
          {expiringProducts.length > 0 && (
            <Card className="glass-card border-l-4 border-l-red-500">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-red-500 flex items-center gap-2">
                      <AlertCircle className="h-5 w-5" />
                      Expiring Soon
                    </CardTitle>
                    <CardDescription>Products requiring immediate attention</CardDescription>
                  </div>
                  <Badge variant="destructive" className="px-3 py-1">{expiringProducts.length} Critical Items</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {expiringProducts.map((product, i) => (
                    <div key={product.id} className="flex items-center justify-between border-b border-border/50 pb-4 last:border-0 last:pb-0 hover:bg-muted/50 p-2 rounded-lg transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                          <Package className="h-5 w-5 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{product.name}</p>
                          <p className="text-sm text-muted-foreground">Current Stock: <span className="font-mono">{product.current_stock}</span></p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-red-600 dark:text-red-400">
                          {new Date(product.expiration_date).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Expires</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;
