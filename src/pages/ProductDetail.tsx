import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Star, ArrowLeft, Truck, ShieldCheck, Clock } from "lucide-react";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

interface Product {
  id: string;
  name: string;
  category: string;
  description: string | null;
  selling_price: number;
  current_stock: number;
  unit_of_measure: string;
  sku: string;
}

const ProductDetail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (id) {
      fetchProduct(id);
    }
  }, [id]);

  const fetchProduct = async (productId: string) => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .single();

      if (error) throw error;
      setProduct(data);
    } catch (error) {
      console.error("Error fetching product:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!product) return;

    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    const existingItem = cart.find((item: any) => item.id === product.id);

    if (existingItem) {
      if (existingItem.quantity + quantity > product.current_stock) {
        toast.error("Cannot add more. Stock limit reached.");
        return;
      }
      existingItem.quantity += quantity;
    } else {
      cart.push({ ...product, quantity });
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("cartUpdated"));
    toast.success("Added to cart");
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 animate-pulse">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="h-96 bg-muted rounded-xl"></div>
          <div className="space-y-4">
            <div className="h-8 w-3/4 bg-muted rounded"></div>
            <div className="h-4 w-1/2 bg-muted rounded"></div>
            <div className="h-32 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl font-bold mb-4">Product not found</h2>
        <Link to="/">
          <Button>Return to Shop</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Link to="/" className="inline-flex items-center text-muted-foreground hover:text-primary mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Products
      </Link>

      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        {/* Product Image */}
        <div className="bg-muted rounded-2xl aspect-square flex items-center justify-center overflow-hidden">
          <img 
            src="/placeholder.svg" 
            alt={product.name} 
            className="w-full h-full object-cover"
          />
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          <div>
            <Badge className="mb-2">{product.category}</Badge>
            <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex text-yellow-400">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">(4.8 stars) • 120 sold</span>
            </div>
          </div>

          <div className="text-4xl font-bold text-primary">
            ₱{product.selling_price.toFixed(2)}
            <span className="text-lg text-muted-foreground font-normal ml-2">/{product.unit_of_measure}</span>
          </div>

          <p className="text-gray-600 leading-relaxed">
            {product.description || "Freshly sourced tuna product. High quality and perfect for your culinary needs. Sourced directly from sustainable fisheries."}
          </p>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <span className="font-medium">Quantity:</span>
              <div className="flex items-center border rounded-md">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-10 w-10 rounded-none"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  -
                </Button>
                <div className="w-12 text-center font-medium">{quantity}</div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-10 w-10 rounded-none"
                  onClick={() => setQuantity(Math.min(product.current_stock, quantity + 1))}
                  disabled={quantity >= product.current_stock}
                >
                  +
                </Button>
              </div>
              <span className="text-sm text-muted-foreground">
                {product.current_stock} available
              </span>
            </div>

            <div className="flex gap-4 pt-4">
              <Button size="lg" className="flex-1 gap-2" onClick={handleAddToCart}>
                <ShoppingCart className="h-5 w-5" />
                Add to Cart
              </Button>
              <Button size="lg" variant="outline" className="flex-1">
                Buy Now
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-6">
            <div className="flex flex-col items-center text-center gap-2 p-4 bg-gray-50 rounded-lg">
              <Truck className="h-6 w-6 text-primary" />
              <span className="text-xs font-medium">Fast Delivery</span>
            </div>
            <div className="flex flex-col items-center text-center gap-2 p-4 bg-gray-50 rounded-lg">
              <ShieldCheck className="h-6 w-6 text-primary" />
              <span className="text-xs font-medium">Quality Guarantee</span>
            </div>
            <div className="flex flex-col items-center text-center gap-2 p-4 bg-gray-50 rounded-lg">
              <Clock className="h-6 w-6 text-primary" />
              <span className="text-xs font-medium">Fresh Daily</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
