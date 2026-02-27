import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Mail, Gift } from "lucide-react";
import { toast } from "sonner";
import { aiService, CustomerSegment } from "@/services/aiService";

interface Customer {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  total_orders: number;
  total_spent: number;
  last_order_date: string;
}

const Customers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [segments, setSegments] = useState<CustomerSegment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (customers.length > 0) {
      (async () => {
        const result = await aiService.segmentCustomers(customers);
        setSegments(result);
      })();
    }
  }, [customers]);

  const fetchCustomers = async () => {
    try {
      // 1. Fetch all orders
      const { data: orders, error } = await supabase
        .from("orders")
        .select("user_id, total_amount, created_at, profiles(full_name, email, avatar_url)");

      if (error) throw error;

      // 2. Aggregate data by user
      const customerMap = new Map<string, Customer>();

      orders?.forEach((order: any) => {
        const userId = order.user_id;
        if (!userId) return;

        const existing = customerMap.get(userId);
        const profile = order.profiles;

        if (existing) {
          existing.total_orders += 1;
          existing.total_spent += Number(order.total_amount);
          if (new Date(order.created_at) > new Date(existing.last_order_date)) {
            existing.last_order_date = order.created_at;
          }
        } else {
          customerMap.set(userId, {
            id: userId,
            full_name: profile?.full_name || "Unknown User",
            email: profile?.email || "No Email",
            avatar_url: profile?.avatar_url,
            total_orders: 1,
            total_spent: Number(order.total_amount),
            last_order_date: order.created_at,
          });
        }
      });

      setCustomers(Array.from(customerMap.values()));
    } catch (error) {
      console.error("Error fetching customers:", error);
      toast.error("Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading customers...</div>;
  }

  const getCustomerSegment = (id: string) => segments.find(s => s.customerId === id);

  return (
    <div className="p-4 md:p-6 space-y-6 pb-20 md:pb-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Customers</h1>
        <p className="text-sm md:text-base text-muted-foreground">View your customer base and their purchase history</p>
      </div>

      {/* AI Insights */}
      {segments.length > 0 && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="bg-purple-50 border-purple-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-purple-900">
                <Sparkles className="h-4 w-4 text-purple-600" />
                VIP Opportunities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold text-purple-700">
                {segments.filter(s => s.segment === 'VIP').length}
              </div>
              <p className="text-[10px] md:text-xs text-purple-600 mt-1">
                High-value customers identified. Suggested action: Assign personal account manager.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-orange-50 border-orange-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-orange-900">
                <Sparkles className="h-4 w-4 text-orange-600" />
                Churn Risk
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold text-orange-700">
                {segments.filter(s => s.segment === 'At Risk').length}
              </div>
              <p className="text-[10px] md:text-xs text-orange-600 mt-1">
                Customers drifting away. Suggested action: Send "We Miss You" coupon.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-green-50 border-green-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-green-900">
                <Sparkles className="h-4 w-4 text-green-600" />
                Loyal Growth
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold text-green-700">
                {segments.filter(s => s.segment === 'Loyal').length}
              </div>
              <p className="text-[10px] md:text-xs text-green-600 mt-1">
                Steady repeat buyers. Suggested action: Early access to new products.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader className="px-4 py-3 md:px-6 md:py-4">
          <CardTitle className="text-lg md:text-xl">All Customers ({customers.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0 md:p-6">
          <div className="mobile-table-list">
            <div className="mobile-table-header hidden md:grid md:grid-cols-7 gap-4 px-4 py-3 bg-muted/50 font-medium text-xs uppercase tracking-wider">
              <div>Customer</div>
              <div>Segment</div>
              <div>Email</div>
              <div className="text-center">Orders</div>
              <div className="text-right">Spent</div>
              <div className="text-right">Last Order</div>
              <div className="text-center">Action</div>
            </div>

            <div className="divide-y">
              {customers.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  No customers found yet.
                </div>
              ) : (
                customers.map((customer) => {
                  const segment = getCustomerSegment(customer.id);
                  return (
                    <div key={customer.id} className="mobile-table-row items-center p-4 md:p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 md:h-10 md:w-10">
                          <AvatarImage src={customer.avatar_url || ""} />
                          <AvatarFallback>{customer.full_name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm md:text-base">{customer.full_name}</span>
                          <span className="text-xs text-muted-foreground md:hidden">{customer.email}</span>
                        </div>
                      </div>

                      <div className="mobile-table-cell mt-2 md:mt-0">
                        <span className="mobile-table-cell-label">Segment</span>
                        {segment && (
                          <Badge className="text-[10px] md:text-xs" variant={
                            segment.segment === 'VIP' ? 'default' :
                              segment.segment === 'At Risk' ? 'destructive' :
                                segment.segment === 'Loyal' ? 'secondary' : 'outline'
                          }>
                            {segment.segment}
                          </Badge>
                        )}
                      </div>

                      <div className="mobile-table-cell hidden md:block truncate text-sm">
                        {customer.email}
                      </div>

                      <div className="mobile-table-cell md:text-center text-sm">
                        <span className="mobile-table-cell-label">Orders</span>
                        {customer.total_orders}
                      </div>

                      <div className="mobile-table-cell md:text-right font-medium text-sm">
                        <span className="mobile-table-cell-label">Spent</span>
                        ₱{customer.total_spent.toFixed(2)}
                      </div>

                      <div className="mobile-table-cell md:text-right text-xs md:text-sm text-muted-foreground">
                        <span className="mobile-table-cell-label">Last Order</span>
                        {new Date(customer.last_order_date).toLocaleDateString()}
                      </div>

                      <div className="mobile-table-cell items-center gap-2 md:justify-center mt-2 md:mt-0">
                        <span className="mobile-table-cell-label">Action</span>
                        {segment && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-full md:w-8 p-1 gap-2 md:gap-0"
                            onClick={() => toast.success(`Action: ${segment.actionableTip}`)}
                          >
                            <Gift className="h-4 w-4 text-primary" />
                            <span className="md:hidden text-xs">AI Tip</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Customers;
