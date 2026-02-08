import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Package, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { aiService } from "@/services/aiService";

interface ReportData {
  totalSales: number;
  totalProfit: number;
  totalWaste: number;
  inventoryValue: number;
  salesByCategory: { name: string; value: number }[];
  profitTrend: { date: string; profit: number }[];
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

const Reports = () => {
  const [reportData, setReportData] = useState<ReportData>({
    totalSales: 0,
    totalProfit: 0,
    totalWaste: 0,
    inventoryValue: 0,
    salesByCategory: [],
    profitTrend: []
  });
  const [aiSummary, setAiSummary] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReportData();
  }, []);

  useEffect(() => {
    if (reportData.totalSales > 0 || reportData.totalProfit > 0) {
      const topProduct = reportData.salesByCategory.length > 0 ? reportData.salesByCategory[0].name : "N/A";
      // Estimate total orders from sales (mock average order value of 500)
      const totalOrders = Math.floor(reportData.totalSales / 500); 
      
      setAiSummary(aiService.generateReportSummary({
        totalSales: reportData.totalSales,
        totalOrders,
        topProduct
      }));
    }
  }, [reportData]);

  const fetchReportData = async () => {
    try {
      // Fetch transactions for sales and profit
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*, product:products(category, cost_price)')
        .order('transaction_date', { ascending: false });

      // Fetch products for inventory valuation
      const { data: products } = await supabase
        .from('products')
        .select('current_stock, cost_price, category, expiration_date');

      if (transactions && products) {
        const totalSales = transactions.reduce((sum, t) => sum + Number(t.total_amount), 0);
        const totalProfit = transactions.reduce((sum, t) => sum + Number(t.profit), 0);
        
        // Calculate waste (expired products)
        const now = new Date();
        const waste = products
          .filter(p => p.expiration_date && new Date(p.expiration_date) < now)
          .reduce((sum, p) => sum + (Number(p.current_stock) * Number(p.cost_price)), 0);

        // Calculate inventory value
        const inventoryValue = products.reduce((sum, p) => 
          sum + (Number(p.current_stock) * Number(p.cost_price)), 0
        );

        // Sales by category
        const categoryMap = new Map();
        transactions.forEach(t => {
          const category = t.product?.category || 'Other';
          categoryMap.set(category, (categoryMap.get(category) || 0) + Number(t.total_amount));
        });
        const salesByCategory = Array.from(categoryMap.entries()).map(([name, value]) => ({ name, value }));

        // Profit trend (last 7 days)
        const profitTrend = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dayTransactions = transactions.filter(t => {
            const tDate = new Date(t.transaction_date);
            return tDate.toDateString() === date.toDateString();
          });
          const dayProfit = dayTransactions.reduce((sum, t) => sum + Number(t.profit), 0);
          profitTrend.push({
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            profit: dayProfit
          });
        }

        setReportData({
          totalSales,
          totalProfit,
          totalWaste: waste,
          inventoryValue,
          salesByCategory,
          profitTrend
        });
      }
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reports & Analytics</h1>
        <p className="text-muted-foreground">
          View performance insights and analytics
        </p>
      </div>

      {/* AI Executive Summary */}
      {aiSummary && (
        <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-indigo-900">
              <Sparkles className="h-5 w-5 text-indigo-600" />
              AI Executive Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-indigo-800 leading-relaxed whitespace-pre-wrap">
              {aiSummary.split('**').map((part, i) => 
                i % 2 === 1 ? <strong key={i}>{part}</strong> : part
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₱{reportData.totalSales.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₱{reportData.totalProfit.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Waste Value</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₱{reportData.totalWaste.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₱{reportData.inventoryValue.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sales by Category</CardTitle>
            <CardDescription>Distribution of sales across product categories</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={reportData.salesByCategory}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="hsl(var(--primary))"
                  dataKey="value"
                >
                  {reportData.salesByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profit Trend</CardTitle>
            <CardDescription>Daily profit over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={reportData.profitTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="profit" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Reports;
