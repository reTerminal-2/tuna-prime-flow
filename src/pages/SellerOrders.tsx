import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Eye, Truck, CheckCircle, XCircle, Sparkles, ShieldCheck, AlertTriangle, Search, Filter, MoreHorizontal, Calendar, Package } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { aiService, OrderRisk } from "@/services/aiService";

interface Order {
  id: string;
  created_at: string;
  total_amount: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  shipping_address: string;
  profiles: {
    full_name: string;
    email: string;
  };
  order_items: {
    id: string;
    quantity: number;
    unit_price: number;
    products: {
      name: string;
      sku: string;
    };
  }[];
}

const SellerOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [orderRisks, setOrderRisks] = useState<OrderRisk[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    const loadRisks = async () => {
      if (orders.length > 0) {
        try {
          const risks = await aiService.analyzeOrderRisk(orders);
          setOrderRisks(risks);
        } catch (error) {
          console.error("Risk analysis failed:", error);
        }
      }
    };

    loadRisks();
    filterOrders(searchQuery, statusFilter, orders);
  }, [orders]);

  useEffect(() => {
    filterOrders(searchQuery, statusFilter, orders);
  }, [searchQuery, statusFilter]);

  const filterOrders = (query: string, status: string, currentOrders: Order[]) => {
    let filtered = currentOrders;

    // Status Filter
    if (status !== "all") {
      filtered = filtered.filter(order => order.status === status);
    }

    // Search Filter
    if (query) {
      const lowerQuery = query.toLowerCase();
      filtered = filtered.filter(order =>
        order.id.toLowerCase().includes(lowerQuery) ||
        order.profiles?.full_name?.toLowerCase()?.includes(lowerQuery) ||
        order.profiles?.email?.toLowerCase()?.includes(lowerQuery)
      );
    }

    setFilteredOrders(filtered);
  };

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          profiles:user_id (
            full_name,
            email
          ),
          order_items (
            id,
            quantity,
            unit_price,
            products (
              name,
              sku
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      // @ts-ignore - Supabase types join
      setOrders(data || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId);

      if (error) throw error;

      toast.success(`Order updated to ${newStatus}`);
      fetchOrders();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, status: newStatus as any } : null);
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update order status");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-200";
      case "processing": return "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-200";
      case "shipped": return "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-200";
      case "delivered": return "bg-green-500/15 text-green-700 dark:text-green-400 border-green-200";
      case "cancelled": return "bg-red-500/15 text-red-700 dark:text-red-400 border-red-200";
      default: return "bg-gray-500/15 text-gray-700 border-gray-200";
    }
  };

  const getRisk = (id: string) => orderRisks.find(r => r.orderId === id);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-12 w-full bg-muted rounded-lg animate-pulse"></div>
        <div className="h-96 w-full bg-muted rounded-lg animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
          <p className="text-muted-foreground">Manage and track your customer orders.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="hidden sm:flex">
            <Filter className="mr-2 h-4 w-4" /> Filter
          </Button>
          <Button className="shadow-lg shadow-primary/20">
            <Truck className="mr-2 h-4 w-4" /> Export Shipments
          </Button>
        </div>
      </div>

      <Card className="glass-card shadow-lg border-border/50">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <Tabs defaultValue="all" className="w-full sm:w-auto" onValueChange={setStatusFilter}>
              <TabsList className="bg-muted/50 p-1">
                <TabsTrigger value="all" className="rounded-md">All</TabsTrigger>
                <TabsTrigger value="pending" className="rounded-md">Pending</TabsTrigger>
                <TabsTrigger value="processing" className="rounded-md">Processing</TabsTrigger>
                <TabsTrigger value="shipped" className="rounded-md">Shipped</TabsTrigger>
                <TabsTrigger value="delivered" className="rounded-md">Delivered</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative w-full sm:w-[300px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search orders..."
                className="pl-9 bg-background/50"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop Table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="w-[100px]">Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Risk Analysis</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      No orders found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => {
                    const risk = getRisk(order.id);
                    return (
                      <TableRow key={order.id} className="hover:bg-muted/40 transition-colors">
                        <TableCell className="font-mono text-xs font-medium">#{order.id.slice(0, 8)}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{order.profiles?.full_name || "Unknown"}</span>
                            <span className="text-xs text-muted-foreground">{order.profiles?.email}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3" />
                            {new Date(order.created_at).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">₱{order.total_amount.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`capitalize ${getStatusColor(order.status)} border shadow-sm`}>
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {risk && (
                            <div className="flex items-center gap-2">
                              {risk.riskLevel === 'Low' ? (
                                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200 gap-1 rounded-full px-2">
                                  <ShieldCheck className="h-3 w-3" /> Safe
                                </Badge>
                              ) : risk.riskLevel === 'Medium' ? (
                                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-200 gap-1 rounded-full px-2">
                                  <AlertTriangle className="h-3 w-3" /> Review
                                </Badge>
                              ) : (
                                <Badge variant="destructive" className="gap-1 rounded-full px-2">
                                  <AlertTriangle className="h-3 w-3" /> High Risk
                                </Badge>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <OrderDetailsDialog
                            order={order}
                            risk={risk}
                            onUpdateStatus={updateStatus}
                            trigger={
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            }
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4 p-4 bg-muted/20">
            {filteredOrders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground bg-background rounded-lg border border-dashed">
                No orders found
              </div>
            ) : (
              filteredOrders.map((order) => {
                const risk = getRisk(order.id);
                return (
                  <div key={order.id} className="bg-card rounded-xl border shadow-sm p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-muted-foreground">#{order.id.slice(0, 8)}</span>
                      <Badge variant="outline" className={`capitalize ${getStatusColor(order.status)}`}>
                        {order.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm">{order.profiles?.full_name}</p>
                        <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</p>
                      </div>
                      <p className="font-bold text-lg">₱{order.total_amount.toFixed(2)}</p>
                    </div>
                    {risk && risk.riskLevel !== 'Low' && (
                      <div className="bg-yellow-500/10 p-2 rounded text-xs text-yellow-700 flex items-center gap-2">
                        <AlertTriangle className="h-3 w-3" />
                        AI Detected Potential Risk
                      </div>
                    )}
                    <div className="pt-2 border-t flex gap-2">
                      <OrderDetailsDialog
                        order={order}
                        risk={risk}
                        onUpdateStatus={updateStatus}
                        trigger={
                          <Button variant="outline" size="sm" className="w-full">
                            View Details
                          </Button>
                        }
                      />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Extracted for cleaner code
const OrderDetailsDialog = ({ order, risk, onUpdateStatus, trigger }: { order: Order, risk?: OrderRisk, onUpdateStatus: (id: string, status: string) => void, trigger: React.ReactNode }) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto glass-card border-none shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex justify-between items-center pr-8 text-xl">
            <span className="font-bold flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Order #{order.id.slice(0, 8)}
            </span>
            {risk && (
              <Badge variant={risk.riskLevel === 'High' ? 'destructive' : 'outline'} className="ml-2">
                Score: {risk.priorityScore}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Status Tracker (Simplified visual) */}
          <div className="flex items-center justify-between px-2 relative">
            <div className="absolute left-0 top-1/2 w-full h-0.5 bg-muted -z-10"></div>
            {['pending', 'processing', 'shipped', 'delivered'].map((step, i) => {
              const steps = ['pending', 'processing', 'shipped', 'delivered'];
              const currentIndex = steps.indexOf(order.status);
              const stepIndex = steps.indexOf(step);
              const isCompleted = stepIndex <= currentIndex;
              const isCurrent = stepIndex === currentIndex;

              return (
                <div key={step} className="flex flex-col items-center bg-background p-1">
                  <div className={`
                         w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors
                         ${isCompleted ? 'bg-primary border-primary text-primary-foreground' : 'bg-muted border-muted-foreground/30 text-muted-foreground'}
                         ${isCurrent ? 'ring-4 ring-primary/20' : ''}
                      `}>
                    {isCompleted ? <CheckCircle className="h-4 w-4" /> : <div className="h-2 w-2 rounded-full bg-current" />}
                  </div>
                  <span className="text-[10px] uppercase font-bold mt-1 text-muted-foreground">{step}</span>
                </div>
              )
            })}
          </div>

          <div className="grid md:grid-cols-2 gap-6 p-4 bg-muted/30 rounded-xl border border-border/50">
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Customer</h3>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {order.profiles?.full_name?.charAt(0)}
                </div>
                <div>
                  <p className="font-medium">{order.profiles?.full_name}</p>
                  <p className="text-sm text-muted-foreground">{order.profiles?.email}</p>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Shipping</h3>
              <div className="flex items-start gap-2">
                <Truck className="h-4 w-4 text-muted-foreground mt-0.5" />
                <p className="text-sm text-foreground/80 leading-relaxed">{order.shipping_address}</p>
              </div>
            </div>
          </div>

          {risk && (
            <div className={`p-4 rounded-xl border ${risk.riskLevel === 'High' ? 'bg-red-500/10 border-red-500/20' :
              risk.riskLevel === 'Medium' ? 'bg-yellow-500/10 border-yellow-500/20' :
                'bg-blue-500/10 border-blue-500/20'
              }`}>
              <div className="flex items-center gap-2 font-semibold mb-2">
                <Sparkles className="h-4 w-4" />
                AI Analysis Report
              </div>
              <ul className="space-y-1">
                {risk.reasons.map((reason, idx) => (
                  <li key={idx} className="text-sm flex items-start gap-2">
                    <span className="text-primary">•</span>
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Package className="h-4 w-4" /> Order Items
            </h3>
            <div className="border rounded-xl overflow-hidden">
              {order.order_items.map((item, idx) => (
                <div key={item.id} className={`flex justify-between items-center p-3 text-sm ${idx !== order.order_items.length - 1 ? 'border-b' : ''} hover:bg-muted/30`}>
                  <div className="flex flex-col">
                    <span className="font-medium">{item.products?.name}</span>
                    <span className="text-xs text-muted-foreground font-mono">SKU: {item.products?.sku}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-muted-foreground text-xs">{item.quantity} x ₱{item.unit_price.toFixed(2)}</span>
                    <p className="font-semibold">₱{(item.quantity * item.unit_price).toFixed(2)}</p>
                  </div>
                </div>
              ))}
              <div className="bg-muted/50 p-4 flex justify-between items-center border-t">
                <span className="font-bold">Total Amount</span>
                <span className="font-bold text-lg text-primary">₱{order.total_amount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            {order.status !== 'cancelled' && order.status !== 'delivered' && (
              <>
                {order.status === 'pending' && (
                  <Button onClick={() => onUpdateStatus(order.id, "processing")} className="bg-blue-600 hover:bg-blue-700">
                    Process Order
                  </Button>
                )}
                {order.status === 'processing' && (
                  <Button onClick={() => onUpdateStatus(order.id, "shipped")} className="bg-purple-600 hover:bg-purple-700">
                    <Truck className="mr-2 h-4 w-4" /> Mark Shipped
                  </Button>
                )}
                {order.status === 'shipped' && (
                  <Button onClick={() => onUpdateStatus(order.id, "delivered")} className="bg-green-600 hover:bg-green-700">
                    <CheckCircle className="mr-2 h-4 w-4" /> Mark Delivered
                  </Button>
                )}
                <Button variant="destructive" onClick={() => onUpdateStatus(order.id, "cancelled")}>
                  Cancel Order
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SellerOrders;
