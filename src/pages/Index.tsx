import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Star, Filter } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface Product {
  id: string;
  name: string;
  category: string;
  description: string | null;
  selling_price: number;
  current_stock: number;
  unit_of_measure: string;
  profiles?: {
    full_name: string | null;
  } | null;
}

const Index = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      // 1. Fetch all in-stock products
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("*")
        .gt("current_stock", 0)
        .order("created_at", { ascending: false });

      if (productsError) throw productsError;

      if (!productsData || productsData.length === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }

      // 2. Extract unique user IDs to fetch seller names
      const userIds = [...new Set(productsData.map(p => p.user_id).filter(Boolean))];

      // 3. Fetch profiles for these users
      const profilesMap: Record<string, string> = {};

      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);

        if (!profilesError && profilesData) {
          profilesData.forEach(p => {
            if (p.full_name) profilesMap[p.id] = p.full_name;
          });
        }
      }

      // 4. Merge data
      const enrichedProducts: Product[] = productsData.map(p => ({
        ...p,
        profiles: p.user_id && profilesMap[p.user_id] ? { full_name: profilesMap[p.user_id] } : null
      }));

      setProducts(enrichedProducts);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (product: Product) => {
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    const existingItem = cart.find((item: any) => item.id === product.id);

    if (existingItem) {
      if (existingItem.quantity >= product.current_stock) {
        toast.error("Cannot add more. Stock limit reached.");
        return;
      }
      existingItem.quantity += 1;
    } else {
      cart.push({ ...product, quantity: 1 });
    }

    localStorage.setItem("cart", JSON.stringify(cart));

    // Dispatch event to update header
    window.dispatchEvent(new Event("cartUpdated"));
    toast.success("Added to cart");
  };

  const filteredProducts = category === "all"
    ? products
    : products.filter(p => p.category === category);

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="bg-primary/5 rounded-2xl p-8 md:p-12 text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold text-primary tracking-tight">
          TunaFlow
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Premium quality fresh, frozen, and canned tuna products sourced directly from the best suppliers.
        </p>
        <div className="flex justify-center gap-4 pt-4">
          <Button size="lg" className="rounded-full px-8">Shop Now</Button>
          <Button size="lg" variant="outline" className="rounded-full px-8">View Deals</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center justify-center">
        <Button
          variant={category === "all" ? "default" : "outline"}
          onClick={() => setCategory("all")}
          className="rounded-full"
        >
          All Products
        </Button>
        <Button
          variant={category === "fresh" ? "default" : "outline"}
          onClick={() => setCategory("fresh")}
          className="rounded-full"
        >
          Fresh Tuna
        </Button>
        <Button
          variant={category === "frozen" ? "default" : "outline"}
          onClick={() => setCategory("frozen")}
          className="rounded-full"
        >
          Frozen
        </Button>
        <Button
          variant={category === "canned" ? "default" : "outline"}
          onClick={() => setCategory("canned")}
          className="rounded-full"
        >
          Canned
        </Button>
      </div>

      {/* Product Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-64 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="group overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow">
              <div className="aspect-square bg-muted relative overflow-hidden">
                <img
                  src="/placeholder.svg"
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-2 right-2">
                  <Badge className="bg-white/90 text-black hover:bg-white">
                    {product.category}
                  </Badge>
                </div>
              </div>
              <CardHeader className="p-4 pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <Link to={`/product/${product.id}`} className="hover:underline">
                      <CardTitle className="text-lg font-semibold line-clamp-1">{product.name}</CardTitle>
                    </Link>
                    {product.profiles?.full_name && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Sold by: {product.profiles.full_name}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2 min-h-[2.5rem]">
                      {product.description || "No description available"}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="flex items-center gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  ))}
                  <span className="text-xs text-muted-foreground ml-1">(4.8)</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold text-primary">₱{product.selling_price.toFixed(2)}</span>
                  <span className="text-sm text-muted-foreground">/{product.unit_of_measure}</span>
                </div>
              </CardContent>
              <CardFooter className="p-4 pt-0">
                <Button className="w-full gap-2" onClick={() => handleAddToCart(product)}>
                  <ShoppingCart className="h-4 w-4" />
                  Add to Cart
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {filteredProducts.length === 0 && !loading && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No products found.</p>
        </div>
      )}
    </div>
  );
};

export default Index;
