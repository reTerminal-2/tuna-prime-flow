
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { runGranularSeeder, clearMockData } from "@/lib/mockDataSeeder";
import {
    ShieldCheck, Database, LayoutDashboard, LogOut, Trash2, Play,
    Users, Package, ShoppingCart, TrendingUp, AlertTriangle,
    DollarSign, Activity, BarChart3, Clock, Zap, Server, HardDrive
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { StatCard } from "@/components/superadmin/StatCard";
import { ActivityItem } from "@/components/superadmin/ActivityItem";
import {
    fetchUserStats,
    fetchDatabaseStats,
    fetchRecentActivity,
    checkDatabaseHealth,
    type UserStats,
    type DatabaseStats,
    type ActivityItem as ActivityItemType,
    type SystemHealth
} from "@/lib/superadmin-utils";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";

export default function SuperAdminDashboard() {
    const navigate = useNavigate();
    const [mockSettings, setMockSettings] = useState({
        suppliers: true,
        products: true,
        pricing: true,
        transactions: true
    });

    const [userStats, setUserStats] = useState<UserStats>({ totalUsers: 0, newUsersLast7Days: 0, activeCustomers: 0 });
    const [dbStats, setDbStats] = useState<DatabaseStats>({ totalProducts: 0, totalOrders: 0, totalTransactions: 0, totalSuppliers: 0 });
    const [recentActivity, setRecentActivity] = useState<ActivityItemType[]>([]);
    const [systemHealth, setSystemHealth] = useState<SystemHealth>({ database: 'disconnected', aiCore: 'offline' });
    const [loading, setLoading] = useState(true);
    const [revenueStats, setRevenueStats] = useState({ total: 0, today: 0, thisMonth: 0 });
    const [lowStockCount, setLowStockCount] = useState(0);

    const [featureToggles, setFeatureToggles] = useState({
        aiAssistant: true,
        advancedAnalytics: false,
        autoReorder: true,
        priceOptimization: false,
        pricingEngineRules: true
    });

    useEffect(() => {
        // Ensure dark mode
        document.documentElement.classList.add("dark");

        // Check auth
        const isAuth = sessionStorage.getItem("superAdminAuth");
        if (!isAuth) {
            toast.error("Unauthorized access");
            navigate("/superadmin");
            return;
        }

        // Load feature toggles from localStorage
        const savedToggles = localStorage.getItem("superadmin_feature_toggles");
        if (savedToggles) {
            setFeatureToggles(JSON.parse(savedToggles));
        }

        loadDashboardData();
    }, [navigate]);

    const loadDashboardData = async () => {
        setLoading(true);
        try {
            const [users, db, activity, health] = await Promise.all([
                fetchUserStats(),
                fetchDatabaseStats(),
                fetchRecentActivity(),
                checkDatabaseHealth()
            ]);

            setUserStats(users);
            setDbStats(db);
            setRecentActivity(activity);
            setSystemHealth(health);

            // Fetch revenue stats
            const { data: transactions } = await supabase
                .from('transactions')
                .select('total_amount, transaction_date');

            if (transactions) {
                const total = transactions.reduce((sum, t) => sum + Number(t.total_amount), 0);
                const today = new Date().toISOString().split('T')[0];
                const todayRevenue = transactions
                    .filter(t => t.transaction_date.startsWith(today))
                    .reduce((sum, t) => sum + Number(t.total_amount), 0);

                const thisMonth = new Date().toISOString().slice(0, 7);
                const monthRevenue = transactions
                    .filter(t => t.transaction_date.startsWith(thisMonth))
                    .reduce((sum, t) => sum + Number(t.total_amount), 0);

                setRevenueStats({ total, today: todayRevenue, thisMonth: monthRevenue });
            }

            // Fetch low stock count
            const { data: products } = await supabase
                .from('products')
                .select('current_stock, reorder_level');

            if (products) {
                const lowStock = products.filter(p =>
                    Number(p.current_stock) <= Number(p.reorder_level)
                ).length;
                setLowStockCount(lowStock);
            }

        } catch (error) {
            console.error('Error loading dashboard data:', error);
            toast.error('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        sessionStorage.removeItem("superAdminAuth");
        navigate("/superadmin");
        toast.info("Logged out of Super Admin");
    };

    const handleRunSeeder = async () => {
        await runGranularSeeder(mockSettings);
        await loadDashboardData(); // Refresh stats after seeding
    };

    const handleClearData = async () => {
        if (confirm("Are you sure you want to delete ALL mock data? This cannot be undone.")) {
            await clearMockData();
            await loadDashboardData(); // Refresh stats after clearing
        }
    };

    const handleToggleChange = (key: keyof typeof featureToggles, value: boolean) => {
        const newToggles = { ...featureToggles, [key]: value };
        setFeatureToggles(newToggles);
        localStorage.setItem("superadmin_feature_toggles", JSON.stringify(newToggles));
        toast.success(`${key} ${value ? 'enabled' : 'disabled'}`);
    };

    return (
        <div className="min-h-screen bg-background text-foreground p-8">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex items-center justify-between border-b pb-6 border-border">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/20 rounded-xl">
                            <ShieldCheck className="w-10 h-10 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-bold tracking-tight">Super Admin Panel</h1>
                            <p className="text-muted-foreground text-lg">System Control & Configuration</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline" size="lg" onClick={loadDashboardData} className="gap-2">
                            <Activity className="w-4 h-4" />
                            Refresh
                        </Button>
                        <Button variant="outline" size="lg" onClick={handleLogout} className="gap-2">
                            <LogOut className="w-4 h-4" />
                            Exit Panel
                        </Button>
                    </div>
                </div>

                {/* Quick Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        title="Total Users"
                        value={loading ? "..." : userStats.totalUsers}
                        icon={Users}
                        iconColor="text-blue-500"
                        trend={`+${userStats.newUsersLast7Days} this week`}
                    />
                    <StatCard
                        title="Total Products"
                        value={loading ? "..." : dbStats.totalProducts}
                        icon={Package}
                        iconColor="text-purple-500"
                        trend={lowStockCount > 0 ? `${lowStockCount} low stock` : "All stocked"}
                    />
                    <StatCard
                        title="Total Orders"
                        value={loading ? "..." : dbStats.totalOrders}
                        icon={ShoppingCart}
                        iconColor="text-green-500"
                        trend={`${userStats.activeCustomers} active customers`}
                    />
                    <StatCard
                        title="Total Revenue"
                        value={loading ? "..." : `₱${revenueStats.total.toLocaleString()}`}
                        icon={DollarSign}
                        iconColor="text-yellow-500"
                        trend={`₱${revenueStats.thisMonth.toLocaleString()} this month`}
                    />
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Mock Data Controller */}
                    <Card className="bg-card border-border hover:border-primary/50 transition-colors lg:col-span-2">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Database className="w-5 h-5 text-blue-500" />
                                Mock Data Controller
                            </CardTitle>
                            <CardDescription>
                                Manage synthetic data for demonstration purposes.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex items-center justify-between space-x-2 border p-3 rounded-lg border-border/50 bg-muted/20">
                                    <Label htmlFor="suppliers" className="flex flex-col space-y-1">
                                        <span>Suppliers</span>
                                        <span className="font-normal text-xs text-muted-foreground">Creates mock vendor profiles</span>
                                    </Label>
                                    <Switch
                                        id="suppliers"
                                        checked={mockSettings.suppliers}
                                        onCheckedChange={(c) => setMockSettings(p => ({ ...p, suppliers: c }))}
                                    />
                                </div>
                                <div className="flex items-center justify-between space-x-2 border p-3 rounded-lg border-border/50 bg-muted/20">
                                    <Label htmlFor="products" className="flex flex-col space-y-1">
                                        <span>Products (Inventory)</span>
                                        <span className="font-normal text-xs text-muted-foreground">Populates items with stock levels</span>
                                    </Label>
                                    <Switch
                                        id="products"
                                        checked={mockSettings.products}
                                        onCheckedChange={(c) => setMockSettings(p => ({ ...p, products: c }))}
                                    />
                                </div>
                                <div className="flex items-center justify-between space-x-2 border p-3 rounded-lg border-border/50 bg-muted/20">
                                    <Label htmlFor="pricing" className="flex flex-col space-y-1">
                                        <span>Pricing Engine</span>
                                        <span className="font-normal text-xs text-muted-foreground">Adds rules and history logs</span>
                                    </Label>
                                    <Switch
                                        id="pricing"
                                        checked={mockSettings.pricing}
                                        onCheckedChange={(c) => setMockSettings(p => ({ ...p, pricing: c }))}
                                    />
                                </div>
                                <div className="flex items-center justify-between space-x-2 border p-3 rounded-lg border-border/50 bg-muted/20">
                                    <Label htmlFor="transactions" className="flex flex-col space-y-1">
                                        <span>Transactions & Customers</span>
                                        <span className="font-normal text-xs text-muted-foreground">Generates sales history & users</span>
                                    </Label>
                                    <Switch
                                        id="transactions"
                                        checked={mockSettings.transactions}
                                        onCheckedChange={(c) => setMockSettings(p => ({ ...p, transactions: c }))}
                                    />
                                </div>
                            </div>

                            <Separator className="bg-border/50" />

                            <div className="flex gap-4">
                                <Button
                                    onClick={handleRunSeeder}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white gap-2"
                                >
                                    <Play className="w-4 h-4" />
                                    Generate Selected Data
                                </Button>
                                <Button
                                    onClick={handleClearData}
                                    variant="destructive"
                                    className="flex-1 gap-2 bg-red-600/10 text-red-500 hover:bg-red-600/20 border-red-600/20 border"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Clear All Data
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* System Health */}
                    <Card className="bg-card border-border">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Server className="w-5 h-5 text-green-500" />
                                System Health
                            </CardTitle>
                            <CardDescription>
                                Real-time service status monitoring.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="flex items-center gap-2">
                                        <HardDrive className="w-4 h-4" />
                                        Database
                                    </span>
                                    <span className={`font-medium ${systemHealth.database === 'connected' ? 'text-green-500' : 'text-red-500'}`}>
                                        {systemHealth.database === 'connected' ? '● Connected' : '● Disconnected'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="flex items-center gap-2">
                                        <Zap className="w-4 h-4" />
                                        AI Core
                                    </span>
                                    <span className={`font-medium ${systemHealth.aiCore === 'online' ? 'text-green-500' : 'text-gray-500'}`}>
                                        {systemHealth.aiCore === 'online' ? '● Online' : '● Offline'}
                                    </span>
                                </div>
                                <Separator />
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>Database Load</span>
                                        <span>23%</span>
                                    </div>
                                    <Progress value={23} className="h-2" />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>API Response Time</span>
                                        <span>45ms</span>
                                    </div>
                                    <Progress value={15} className="h-2" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Feature Toggles */}
                    <Card className="bg-card border-border">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <LayoutDashboard className="w-5 h-5 text-purple-500" />
                                Feature Toggles
                            </CardTitle>
                            <CardDescription>
                                Enable/disable experimental features.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-center justify-between space-x-2 p-2 rounded-lg hover:bg-muted/50">
                                <Label htmlFor="aiAssistant" className="text-sm cursor-pointer">AI Assistant</Label>
                                <Switch
                                    id="aiAssistant"
                                    checked={featureToggles.aiAssistant}
                                    onCheckedChange={(c) => handleToggleChange('aiAssistant', c)}
                                />
                            </div>
                            <div className="flex items-center justify-between space-x-2 p-2 rounded-lg hover:bg-muted/50">
                                <Label htmlFor="advancedAnalytics" className="text-sm cursor-pointer">Advanced Analytics</Label>
                                <Switch
                                    id="advancedAnalytics"
                                    checked={featureToggles.advancedAnalytics}
                                    onCheckedChange={(c) => handleToggleChange('advancedAnalytics', c)}
                                />
                            </div>
                            <div className="flex items-center justify-between space-x-2 p-2 rounded-lg hover:bg-muted/50">
                                <Label htmlFor="autoReorder" className="text-sm cursor-pointer">Auto Reorder</Label>
                                <Switch
                                    id="autoReorder"
                                    checked={featureToggles.autoReorder}
                                    onCheckedChange={(c) => handleToggleChange('autoReorder', c)}
                                />
                            </div>
                            <div className="flex items-center justify-between space-x-2 p-2 rounded-lg hover:bg-muted/50">
                                <Label htmlFor="priceOptimization" className="text-sm cursor-pointer">Price Optimization</Label>
                                <Switch
                                    id="priceOptimization"
                                    checked={featureToggles.priceOptimization}
                                    onCheckedChange={(c) => handleToggleChange('priceOptimization', c)}
                                />
                            </div>
                            <div className="flex items-center justify-between space-x-2 p-2 rounded-lg hover:bg-muted/50">
                                <Label htmlFor="pricingEngineRules" className="text-sm cursor-pointer">Pricing Engine Rules</Label>
                                <Switch
                                    id="pricingEngineRules"
                                    checked={featureToggles.pricingEngineRules}
                                    onCheckedChange={(c) => handleToggleChange('pricingEngineRules', c)}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Recent Activity */}
                    <Card className="bg-card border-border lg:col-span-2">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="w-5 h-5 text-orange-500" />
                                Recent Activity
                            </CardTitle>
                            <CardDescription>
                                Latest orders and transactions across the system.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                {loading ? (
                                    <p className="text-sm text-muted-foreground text-center py-8">Loading activity...</p>
                                ) : recentActivity.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-8">No recent activity</p>
                                ) : (
                                    recentActivity.map(activity => (
                                        <ActivityItem key={activity.id} {...activity} />
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Database Statistics */}
                    <Card className="bg-card border-border">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-cyan-500" />
                                Database Stats
                            </CardTitle>
                            <CardDescription>
                                Real-time table row counts.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex justify-between items-center p-2 rounded-lg bg-muted/20">
                                <span className="text-sm">Products</span>
                                <span className="font-semibold">{loading ? "..." : dbStats.totalProducts}</span>
                            </div>
                            <div className="flex justify-between items-center p-2 rounded-lg bg-muted/20">
                                <span className="text-sm">Orders</span>
                                <span className="font-semibold">{loading ? "..." : dbStats.totalOrders}</span>
                            </div>
                            <div className="flex justify-between items-center p-2 rounded-lg bg-muted/20">
                                <span className="text-sm">Transactions</span>
                                <span className="font-semibold">{loading ? "..." : dbStats.totalTransactions}</span>
                            </div>
                            <div className="flex justify-between items-center p-2 rounded-lg bg-muted/20">
                                <span className="text-sm">Suppliers</span>
                                <span className="font-semibold">{loading ? "..." : dbStats.totalSuppliers}</span>
                            </div>
                            <div className="flex justify-between items-center p-2 rounded-lg bg-muted/20">
                                <span className="text-sm">Users</span>
                                <span className="font-semibold">{loading ? "..." : userStats.totalUsers}</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Inventory Alerts */}
                    <Card className="bg-card border-border lg:col-span-2">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                                Inventory Alerts
                            </CardTitle>
                            <CardDescription>
                                Products requiring attention.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {lowStockCount > 0 ? (
                                <div className="flex items-center gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                                    <div>
                                        <p className="font-medium text-sm">Low Stock Warning</p>
                                        <p className="text-xs text-muted-foreground">
                                            {lowStockCount} product{lowStockCount > 1 ? 's' : ''} below reorder level
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                                    <ShieldCheck className="w-5 h-5 text-green-500" />
                                    <div>
                                        <p className="font-medium text-sm">All Stock Levels Normal</p>
                                        <p className="text-xs text-muted-foreground">
                                            No products require immediate reordering
                                        </p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Performance Metrics */}
                    <Card className="bg-card border-border">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-green-500" />
                                Performance
                            </CardTitle>
                            <CardDescription>
                                Key performance indicators.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-muted-foreground">Revenue Today</span>
                                    <span className="font-semibold">₱{revenueStats.today.toLocaleString()}</span>
                                </div>
                                <Progress value={(revenueStats.today / revenueStats.thisMonth) * 100 || 0} className="h-2" />
                            </div>
                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-muted-foreground">Order Fulfillment</span>
                                    <span className="font-semibold">87%</span>
                                </div>
                                <Progress value={87} className="h-2" />
                            </div>
                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-muted-foreground">Customer Satisfaction</span>
                                    <span className="font-semibold">94%</span>
                                </div>
                                <Progress value={94} className="h-2" />
                            </div>
                        </CardContent>
                    </Card>

                </div>
            </div>
        </div>
    );
}
