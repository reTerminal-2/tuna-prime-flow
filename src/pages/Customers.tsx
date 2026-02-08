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
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Customers</h1>
        <p className="text-muted-foreground">View your customer base and their purchase history</p>
      </div>

      {/* AI Insights */}
      {segments.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-purple-50 border-purple-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-purple-900">
                <Sparkles className="h-4 w-4 text-purple-600" />
                VIP Opportunities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-700">
                {segments.filter(s => s.segment === 'VIP').length}
              </div>
              <p className="text-xs text-purple-600 mt-1">
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
              <div className="text-2xl font-bold text-orange-700">
                {segments.filter(s => s.segment === 'At Risk').length}
              </div>
              <p className="text-xs text-orange-600 mt-1">
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
              <div className="text-2xl font-bold text-green-700">
                {segments.filter(s => s.segment === 'Loyal').length}
              </div>
              <p className="text-xs text-green-600 mt-1">
                Steady repeat buyers. Suggested action: Early access to new products.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Customers ({customers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Segment</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Total Orders</TableHead>
                <TableHead>Total Spent</TableHead>
                <TableHead>Last Order</TableHead>
                <TableHead>AI Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No customers found yet.
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((customer) => {
                  const segment = getCustomerSegment(customer.id);
                  return (
                    <TableRow key={customer.id}>
                      <TableCell className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={customer.avatar_url || ""} />
                          <AvatarFallback>{customer.full_name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{customer.full_name}</span>
                      </TableCell>
                      <TableCell>
                        {segment && (
                          <Badge variant={
                            segment.segment === 'VIP' ? 'default' :
                            segment.segment === 'At Risk' ? 'destructive' :
                            segment.segment === 'Loyal' ? 'secondary' : 'outline'
                          }>
                            {segment.segment}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{customer.email}</TableCell>
                      <TableCell>{customer.total_orders}</TableCell>
                      <TableCell>₱{customer.total_spent.toFixed(2)}</TableCell>
                      <TableCell>{new Date(customer.last_order_date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {segment && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            onClick={() => toast.success(`Action: ${segment.actionableTip}`)}
                            title={segment.actionableTip}
                          >
                            <Gift className="h-4 w-4 text-primary" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Customers;
