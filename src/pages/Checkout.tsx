import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { UserCircle } from "lucide-react";


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
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "payrex">("payrex");
  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    const savedCart = JSON.parse(localStorage.getItem("cart") || "[]");
    setCart(savedCart);

    if (savedCart.length === 0) {
      navigate("/cart");
      return;
    }

    fetchProfile();
  }, [navigate]);

  const fetchProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();

      if (data) {
        setProfile(data);
        if (data.address) setShippingAddress(data.address);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setProfileLoading(false);
    }
  };

  const isProfileComplete = profile && profile.full_name && profile.phone_number && profile.address;

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
          payment_status: paymentMethod === "payrex" ? "pending_payment" : "pending"
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

      // Handle Payrex Redirection (Online Payment via GCash/Card)
      if (paymentMethod === "payrex" && cart.length > 0) {
        // Fetch seller details from the first product
        const { data: productData } = await supabase
          .from('products')
          .select('user_id')
          .eq('id', cart[0].id)
          .single();
          
        const sellerId = productData?.user_id;

        if (sellerId) {
          toast.info("Redirecting to secure payment gateway (GCash / Card)...");
          
          const { data: edgeData, error: edgeError } = await supabase.functions.invoke('create-payrex-checkout', {
            body: {
               seller_id: sellerId,
               order_id: order.id,
               items: cart,
               success_url: `${window.location.origin}/orders`,
               cancel_url: `${window.location.origin}/cart`
            }
          });
          
          if (edgeError || !edgeData?.url) {
            console.error("Payrex Edge Error:", edgeError || edgeData);
            toast.error("Payment gateway is temporarily unavailable. Defaulting to COD.");
            await supabase.from('orders').update({ payment_status: 'failed_payrex_fallback' }).eq('id', order.id);
          } else {
            localStorage.removeItem("cart");
            window.dispatchEvent(new Event("cartUpdated"));
            // Secure Redirect to Payrex hosted checkout
            window.location.href = edgeData.url;
            return; 
          }
        } else {
          toast.error("Could not determine seller to route payment. Proceeding as COD.");
        }
      }

      // Success (COD or Fallback)
      localStorage.removeItem("cart");
      window.dispatchEvent(new Event("cartUpdated"));
      setTimeout(() => {
        toast.info("Order placed! You can now chat with the seller to arrange location or manual payment.");
      }, 1000);
      navigate("/orders");

    } catch (error: any) {
      console.error("Order placement error:", error);
      toast.error("Failed to place order: " + (error.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  if (profileLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isProfileComplete) {
    return (
      <div className="container mx-auto px-4 py-16 flex justify-center">
        <Card className="max-w-md w-full text-center p-6 border-red-100 shadow-xl shadow-red-500/5">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <UserCircle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-xl">Profile Incomplete</CardTitle>
            <CardDescription className="text-md mt-2">
              To complete your purchase, you must first set up your profile details (Full Name, Phone Number, and Address).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              These details are required so sellers can contact you and ship your tuna safely.
            </p>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button className="w-full" onClick={() => navigate("/profile")}>
              Set Up My Profile
            </Button>
            <Button variant="ghost" onClick={() => navigate("/cart")}>
              Back to Cart
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

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
              <div className="space-y-3 pt-2">
                <Label>Payment Method</Label>
                <div 
                  className={`p-4 border rounded-xl cursor-pointer transition-all ${paymentMethod === 'payrex' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-muted/50'}`}
                  onClick={() => setPaymentMethod('payrex')}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-primary">Secure Online Payment</div>
                    <div className="flex gap-2">
                      <div className="h-6 w-10 bg-blue-600 rounded text-[10px] text-white flex items-center justify-center font-bold">GCash</div>
                      <div className="h-6 w-10 bg-slate-800 rounded text-[10px] text-white flex items-center justify-center font-bold">Card</div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Powered securely by Payrex</p>
                </div>
                
                <div 
                  className={`p-4 border rounded-xl cursor-pointer transition-all ${paymentMethod === 'cod' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-muted/50'}`}
                  onClick={() => setPaymentMethod('cod')}
                >
                  <div className="font-semibold">Cash on Delivery (COD)</div>
                  <p className="text-sm text-muted-foreground mt-1">Pay when your order arrives</p>
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
