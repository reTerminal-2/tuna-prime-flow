import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Trash2, Minus, Plus, ShoppingBag } from "lucide-react";
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

const Cart = () => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const savedCart = JSON.parse(localStorage.getItem("cart") || "[]");
    setCart(savedCart);
  }, []);

  const updateCart = (newCart: CartItem[]) => {
    setCart(newCart);
    localStorage.setItem("cart", JSON.stringify(newCart));
    window.dispatchEvent(new Event("cartUpdated"));
  };

  const updateQuantity = (id: string, newQuantity: number) => {
    const item = cart.find(i => i.id === id);
    if (!item) return;

    if (newQuantity > item.current_stock) {
      toast.error("Stock limit reached");
      return;
    }

    if (newQuantity < 1) {
      removeItem(id);
      return;
    }

    const newCart = cart.map(item => 
      item.id === id ? { ...item, quantity: newQuantity } : item
    );
    updateCart(newCart);
  };

  const removeItem = (id: string) => {
    const newCart = cart.filter(item => item.id !== id);
    updateCart(newCart);
    toast.success("Item removed");
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + (item.selling_price * item.quantity), 0);
  };

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.info("Please login or create an account to complete your purchase");
        // Save current path to return after login
        navigate("/auth?returnUrl=/cart");
        return;
      }

      // Create transactions for each item
      for (const item of cart) {
        // 1. Create transaction record
        const { error: txError } = await supabase.from("transactions").insert({
          product_id: item.id,
          quantity: item.quantity,
          unit_price: item.selling_price,
          total_amount: item.selling_price * item.quantity,
          profit: 0, // Simplified for now, backend usually calculates this
          cost_price: 0, // Should be fetched from product
          created_by: user.id,
          transaction_date: new Date().toISOString(),
          notes: `Online Order - ${user.email}`
        });

        if (txError) throw txError;

        // 2. Update stock
        const { error: stockError } = await supabase.rpc('decrement_stock', { 
          p_id: item.id, 
          q: item.quantity 
        });
        
        // Fallback if RPC doesn't exist (client-side update - less safe but works for demo)
        if (stockError) {
          const { error: updateError } = await supabase
            .from("products")
            .update({ current_stock: item.current_stock - item.quantity })
            .eq("id", item.id);
            
          if (updateError) throw updateError;
        }
      }

      // Clear cart
      updateCart([]);
      toast.success("Order placed successfully!");
      navigate("/orders");

    } catch (error: any) {
      console.error("Checkout error:", error);
      toast.error("Failed to place order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <div className="bg-gray-50 rounded-2xl p-12 inline-block mb-6">
          <ShoppingBag className="h-16 w-16 text-gray-300 mx-auto" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
        <p className="text-muted-foreground mb-8">Looks like you haven't added any items yet.</p>
        <Link to="/">
          <Button size="lg">Start Shopping</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">Shopping Cart ({cart.length} items)</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {cart.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-4 flex gap-4 items-center">
                <div className="h-24 w-24 bg-muted rounded-md flex-shrink-0 overflow-hidden">
                  <img src="/placeholder.svg" alt={item.name} className="h-full w-full object-cover" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg truncate">{item.name}</h3>
                  <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
                  <div className="font-bold text-primary mt-1">
                    ₱{item.selling_price.toFixed(2)}
                    <span className="text-xs text-muted-foreground font-normal"> /{item.unit_of_measure}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center border rounded-md">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 rounded-none"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <div className="w-10 text-center text-sm font-medium">{item.quantity}</div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 rounded-none"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => removeItem(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>₱{calculateTotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping Fee</span>
                <span>Calculated at checkout</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-primary">₱{calculateTotal().toFixed(2)}</span>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full" size="lg" onClick={handleCheckout} disabled={loading}>
                {loading ? "Processing..." : "Proceed to Checkout"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Cart;
