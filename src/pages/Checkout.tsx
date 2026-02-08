import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface CartItem {
  id: string;
  name: string;
  selling_price: number;
  quantity: number;
  unit_of_measure: string;
  current_stock: number;
  sku: string;
}

const Checkout = () => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [shippingAddress, setShippingAddress] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const savedCart = JSON.parse(localStorage.getItem("cart") || "[]");
    setCart(savedCart);

    if (savedCart.length === 0) {
      navigate("/cart");
    }
  }, [navigate]);

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + (item.selling_price * item.quantity), 0);
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Please login to complete your order");
        navigate("/auth");
        return;
      }

      if (!shippingAddress.trim()) {
        toast.error("Please enter a shipping address");
        setLoading(false);
        return;
      }

      // 1. Create Order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          total_amount: calculateTotal(),
          status: "pending",
          shipping_address: shippingAddress,
          payment_status: "pending" // In a real app, integrate Stripe/PayPal here
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. Create Order Items and Update Stock
      for (const item of cart) {
        // Create Order Item
        const { error: itemError } = await supabase
          .from("order_items")
          .insert({
            order_id: order.id,
            product_id: item.id,
            quantity: item.quantity,
            unit_price: item.selling_price,
            total_price: item.selling_price * item.quantity
          });

        if (itemError) throw itemError;

        // Create Transaction (for seller reporting)
        const { error: txError } = await supabase.from("transactions").insert({
            product_id: item.id,
            quantity: item.quantity,
            unit_price: item.selling_price,
            total_amount: item.selling_price * item.quantity,
            profit: 0, 
            cost_price: 0,
            created_by: user.id,
            transaction_date: new Date().toISOString(),
            notes: `Order #${order.id.slice(0, 8)}`
        });
        if (txError) throw txError;


        // Update Stock (Optimistic)
        // Note: For production, use a Database Function (RPC) to ensure atomicity
        const { error: updateError } = await supabase
            .from("products")
            .update({ current_stock: item.current_stock - item.quantity })
            .eq("id", item.id);
            
        if (updateError) {
             console.error(`Failed to update stock for ${item.name}`, updateError);
             // Consider rolling back or alerting admin
        }
      }

      // Success
      localStorage.removeItem("cart");
      window.dispatchEvent(new Event("cartUpdated"));
      toast.success("Order placed successfully!");
      navigate("/orders");

    } catch (error: any) {
      console.error("Order placement error:", error);
      toast.error("Failed to place order: " + (error.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">Checkout</h1>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Shipping Form */}
        <Card>
          <CardHeader>
            <CardTitle>Shipping Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form id="checkout-form" onSubmit={handlePlaceOrder} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">Delivery Address</Label>
                <Input
                  id="address"
                  placeholder="Enter your full delivery address"
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  required
                  className="h-24"
                />
              </div>
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <div className="p-4 border rounded-md bg-muted/50 text-muted-foreground text-sm">
                  Cash on Delivery (COD) - Standard
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Order Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>{item.name} x {item.quantity}</span>
                  <span>₱{(item.selling_price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span className="text-primary">₱{calculateTotal().toFixed(2)}</span>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              type="submit" 
              form="checkout-form" 
              className="w-full" 
              size="lg" 
              disabled={loading}
            >
              {loading ? "Placing Order..." : "Place Order"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Checkout;
