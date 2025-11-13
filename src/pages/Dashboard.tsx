import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Package, TrendingDown, TrendingUp, DollarSign } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface DashboardStats {
  totalProducts: number;
  totalInventoryValue: number;
  expiringCount: number;
  lowStockCount: number;
}

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalInventoryValue: 0,
    expiringCount: 0,
    lowStockCount: 0,
  });
  const [expiringProducts, setExpiringProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch all products
      const { data: products, error } = await supabase
        .from("products")
        .select("*");

      if (error) throw error;

      if (products) {
        // Calculate stats
        const totalProducts = products.length;
        const totalInventoryValue = products.reduce(
          (sum, p) => sum + Number(p.current_stock) * Number(p.selling_price),
          0
        );

        // Find products expiring in 3 days
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

        const expiring = products.filter(
          (p) => p.expiration_date && new Date(p.expiration_date) <= threeDaysFromNow
        );

        // Find low stock products
        const lowStock = products.filter(
          (p) => Number(p.current_stock) <= Number(p.reorder_level)
        );

        setStats({
          totalProducts,
          totalInventoryValue,
          expiringCount: expiring.length,
          lowStockCount: lowStock.length,
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
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-muted rounded-lg"></div>
          <div className="h-32 bg-muted rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your inventory and key metrics
        </p>
      </div>

      {/* Alerts */}
      {(stats.expiringCount > 0 || stats.lowStockCount > 0) && (
        <div className="space-y-3">
          {stats.expiringCount > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Expiring Products Alert</AlertTitle>
              <AlertDescription>
                {stats.expiringCount} product(s) expiring within 3 days. Review pricing engine to optimize prices.
              </AlertDescription>
            </Alert>
          )}
          {stats.lowStockCount > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Low Stock Alert</AlertTitle>
              <AlertDescription>
                {stats.lowStockCount} product(s) below reorder level.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <p className="text-xs text-muted-foreground">Active inventory items</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₱{stats.totalInventoryValue.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Total current value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {stats.expiringCount}
            </div>
            <p className="text-xs text-muted-foreground">Within 3 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <TrendingUp className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {stats.lowStockCount}
            </div>
            <p className="text-xs text-muted-foreground">Below reorder level</p>
          </CardContent>
        </Card>
      </div>

      {/* Expiring Products Table */}
      {expiringProducts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Products Expiring Soon</CardTitle>
            <CardDescription>
              Products that will expire within the next 3 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {expiringProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-3 border border-border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      SKU: {product.sku}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      Expires:{" "}
                      {new Date(product.expiration_date).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Stock: {product.current_stock} {product.unit_of_measure}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
