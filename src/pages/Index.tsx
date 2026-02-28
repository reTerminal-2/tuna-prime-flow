import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Star, Filter, Store, Image as ImageIcon, LayoutGrid } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { useIsMobileLayout } from "@/hooks/use-layout-mode";
import { getFallbackImage, getMockImagesByCategory } from "@/lib/mockImages";
import { QuickViewDialog } from "@/components/marketplace/QuickViewDialog";
import { Eye, ShoppingCart as CartIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  category: string;
  description: string | null;
  selling_price: number;
  current_stock: number;
  unit_of_measure: string;
  image_url: string | null;
  images: string[] | null;
  store?: {
    store_name: string | null;
    profile_url: string | null;
  } | null;
}

const Index = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);

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

      // 3. Fetch store settings for these users
      const storeMap: Record<string, { store_name: string | null, profile_url: string | null }> = {};

      if (userIds.length > 0) {
        const { data: storeData, error: storeError } = await supabase
          .from("store_settings")
          .select("*")
          .in("user_id", userIds);

        if (!storeError && storeData) {
          storeData.forEach(s => {
            if (s.user_id) {
              storeMap[s.user_id] = {
                store_name: s.store_name,
                profile_url: s.profile_url
              };
            }
          });
        }
      }

      // 4. Merge data
      const enrichedProducts: Product[] = productsData.map(p => ({
        ...p,
        images: Array.isArray(p.images) ? (p.images as string[]) : (p.image_url ? [p.image_url] : []),
        store: p.user_id && storeMap[p.user_id] ? storeMap[p.user_id] : null
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

  const categories = ["all", "fresh", "frozen", "canned", "dried"];

  const filteredProducts = category === "all"
    ? products
    : products.filter(p => p.category === category);

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Hero Section */}
      <div className="bg-primary/5 rounded-2xl p-6 md:p-12 text-center space-y-4">
        <h1 className="text-3xl md:text-5xl font-bold text-primary tracking-tight">
          TunaFlow
        </h1>
        <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
          Premium quality fresh, frozen, and canned tuna products sourced directly from the best suppliers.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-3 md:gap-4 pt-4">
          <Button size="lg" className="rounded-full px-8 w-full sm:w-auto">Shop Now</Button>
          <Button size="lg" variant="outline" className="rounded-full px-8 w-full sm:w-auto">View Deals</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center justify-center overflow-x-auto pb-2 sm:pb-0 px-2">
        <Button
          variant={category === "all" ? "default" : "outline"}
          onClick={() => setCategory("all")}
          className="rounded-full shrink-0 h-9 text-xs sm:text-sm"
        >
          All Products
        </Button>
        <Button
          variant={category === "fresh" ? "default" : "outline"}
          onClick={() => setCategory("fresh")}
          className="rounded-full shrink-0 h-9 text-xs sm:text-sm"
        >
          Fresh Tuna
        </Button>
        <Button
          variant={category === "frozen" ? "default" : "outline"}
          onClick={() => setCategory("frozen")}
          className="rounded-full shrink-0 h-9 text-xs sm:text-sm"
        >
          Frozen
        </Button>
        <Button
          variant={category === "canned" ? "default" : "outline"}
          onClick={() => setCategory("canned")}
          className="rounded-full shrink-0 h-9 text-xs sm:text-sm"
        >
          Canned
        </Button>
      </div>

      {/* Product Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-64 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="group overflow-hidden border-none shadow-premium hover:shadow-hover transition-all duration-500 bg-white">
              <CardHeader className="p-0 overflow-hidden relative">
                <div className="h-64 w-full bg-muted relative overflow-hidden">
                  {/* Primary Image */}
                  <div className="absolute inset-0 transition-opacity duration-700 group-hover:opacity-0">
                    {product.images && product.images.length > 0 ? (
                      <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                    ) : product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <img src={getFallbackImage(product.category)} alt={product.name} className="w-full h-full object-cover" />
                    )}
                  </div>

                  {/* Secondary Image (Hover) */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 scale-105 group-hover:scale-100 transition-transform">
                    {product.images && product.images.length > 1 ? (
                      <img src={product.images[1]} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <img src={getMockImagesByCategory(product.category)[1] || getFallbackImage(product.category)} alt={product.name} className="w-full h-full object-cover" />
                    )}
                  </div>

                  {/* Quick Action Overlay */}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3 z-10">
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-12 w-12 rounded-full shadow-premium hover:scale-110 active:scale-95 transition-all bg-white/90 backdrop-blur-sm"
                      onClick={(e) => {
                        e.preventDefault();
                        setQuickViewProduct(product);
                        setIsQuickViewOpen(true);
                      }}
                    >
                      <Eye className="h-5 w-5 text-primary" />
                    </Button>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-12 w-12 rounded-full shadow-premium hover:scale-110 active:scale-95 transition-all bg-primary text-white"
                      onClick={(e) => {
                        e.preventDefault();
                        handleAddToCart(product);
                      }}
                    >
                      <CartIcon className="h-5 w-5" />
                    </Button>
                  </div>

                  <Badge className="absolute top-4 left-4 bg-white/90 text-primary hover:bg-white backdrop-blur-sm border-none shadow-sm capitalize px-3 py-1 text-[10px] font-bold tracking-widest z-20">
                    {product.category}
                  </Badge>

                  {product.images && product.images.length > 1 && (
                    <div className="absolute bottom-4 right-4 bg-black/60 text-white text-[10px] px-2.5 py-1 rounded-full backdrop-blur-sm flex items-center gap-1.5 font-bold z-20">
                      <LayoutGrid className="h-3 w-3" />
                      +{product.images.length - 1} photos
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardHeader className="p-4 pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <Link to={`/product/${product.id}`} className="hover:underline">
                      <CardTitle className="text-lg font-semibold line-clamp-1">{product.name}</CardTitle>
                    </Link>
                    <div className="flex items-center gap-1.5 mt-1.5 pb-1">
                      <Avatar className="h-4 w-4">
                        <AvatarImage src={product.store?.profile_url || ""} />
                        <AvatarFallback className="text-[8px] bg-primary/10">
                          {product.store?.store_name?.charAt(0) || <Store className="h-2 w-2" />}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                        {product.store?.store_name || "Unknown Shop"}
                      </span>
                    </div>
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
      {/* Quick View Dialog */}
      <QuickViewDialog
        product={quickViewProduct}
        isOpen={isQuickViewOpen}
        onClose={() => setIsQuickViewOpen(false)}
        onAddToCart={handleAddToCart}
      />
    </div>
  );
};

export default Index;
