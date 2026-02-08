
import { useState, useEffect, Suspense, lazy } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Plus, Search, AlertCircle, RefreshCw, Sparkles, TrendingUp, Edit, Trash2, ArrowUpCircle, Minus } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

// Lazy load AI service and components to prevent top-level crashes
const AIProductForm = lazy(() => import("@/components/ai/AIProductForm").then(m => ({ default: m.AIProductForm })));

// Types
interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  current_stock: number;
  selling_price: number;
  cost_price: number;
  unit_of_measure: string;
  reorder_level: number;
  min_order: number;
  expiration_date: string | null;
  description: string | null;
}

export default function Inventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Dialog States
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAIAddDialogOpen, setIsAIAddDialogOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isStockOpen, setIsStockOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // Stock Adjustment State
  const [stockAdjustment, setStockAdjustment] = useState({
    type: 'add', // add | remove
    quantity: '',
    reason: ''
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  // New Product State
  const [newProduct, setNewProduct] = useState({
    name: "",
    sku: "",
    category: "fresh",
    price: "",
    cost: "",
    stock: "",
    unit: "kg"
  });

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (err: any) {
      console.error("Inventory fetch error:", err);
      setError(err.message || "Failed to load inventory");
      toast.error("Failed to load inventory data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleManualAdd = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("You must be logged in");
        return;
      }

      const { error } = await supabase.from('products').insert({
        name: newProduct.name,
        sku: newProduct.sku || `SKU-${Date.now()}`,
        category: newProduct.category,
        selling_price: parseFloat(newProduct.price) || 0,
        cost_price: parseFloat(newProduct.cost) || 0,
        current_stock: parseFloat(newProduct.stock) || 0,
        unit_of_measure: newProduct.unit,
        user_id: session.user.id
      });

      if (error) throw error;

      toast.success("Product added successfully");
      setIsAddDialogOpen(false);
      setNewProduct({ name: "", sku: "", category: "fresh", price: "", cost: "", stock: "", unit: "kg" });
      fetchProducts();
    } catch (err: any) {
      toast.error(err.message || "Failed to add product");
    }
  };

  const handleEditProduct = async () => {
    if (!selectedProduct) return;
    try {
        const { error } = await supabase.from('products').update({
            name: selectedProduct.name,
            sku: selectedProduct.sku,
            category: selectedProduct.category,
            selling_price: selectedProduct.selling_price,
            current_stock: selectedProduct.current_stock, // Explicitly allow stock override
            min_order: selectedProduct.min_order,
            cost_price: selectedProduct.cost_price,
            unit_of_measure: selectedProduct.unit_of_measure
        }).eq('id', selectedProduct.id);

        if (error) throw error;
        toast.success("Product updated successfully");
        setIsEditOpen(false);
        fetchProducts();
    } catch (err: any) {
        toast.error(err.message || "Failed to update product");
    }
  };

  const handleDeleteProduct = async (id: string) => {
      if (!confirm("Are you sure you want to delete this product?")) return;
      try {
          const { error } = await supabase.from('products').delete().eq('id', id);
          if (error) throw error;
          toast.success("Product deleted");
          fetchProducts();
      } catch (err: any) {
          toast.error(err.message || "Failed to delete product");
      }
  };

  const handleStockAdjustment = async () => {
      if (!selectedProduct) return;
      const qty = parseFloat(stockAdjustment.quantity);
      if (!qty || qty <= 0) {
          toast.error("Invalid quantity");
          return;
      }

      try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) throw new Error("No session");

          // 1. Record Adjustment
          const { error: adjError } = await supabase.from('stock_adjustments').insert({
              product_id: selectedProduct.id,
              quantity: qty,
              adjustment_type: stockAdjustment.type,
              reason: stockAdjustment.reason || 'Manual Adjustment',
              adjusted_by: session.user.id
          });
          if (adjError) throw adjError;

          // 2. Update Product Stock
          const newStock = stockAdjustment.type === 'add' 
              ? selectedProduct.current_stock + qty 
              : selectedProduct.current_stock - qty;

          const { error: prodError } = await supabase.from('products').update({
              current_stock: newStock
          }).eq('id', selectedProduct.id);
          
          if (prodError) throw prodError;

          toast.success("Stock updated");
          setIsStockOpen(false);
          setStockAdjustment({ type: 'add', quantity: '', reason: '' });
          fetchProducts();
      } catch (err: any) {
          toast.error(err.message || "Failed to adjust stock");
      }
  };

  const openEdit = (product: Product) => {
      setSelectedProduct(product);
      setIsEditOpen(true);
  };

  const openStock = (product: Product, type: 'add' | 'remove') => {
      setSelectedProduct(product);
      setStockAdjustment({ type, quantity: '', reason: '' });
      setIsStockOpen(true);
  };

  // Filter Logic
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesTab = true;
    if (activeTab === 'low_stock') matchesTab = p.current_stock <= p.reorder_level;
    if (activeTab === 'out_of_stock') matchesTab = p.current_stock <= 0;

    return matchesSearch && matchesTab;
  });

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-red-500 gap-4">
        <AlertCircle className="h-12 w-12" />
        <h2 className="text-xl font-bold">Something went wrong</h2>
        <p>{error}</p>
        <Button onClick={fetchProducts} variant="outline">Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground">Manage your stock and products</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Manual Add
          </Button>
          <Button className="bg-purple-600 hover:bg-purple-700" onClick={() => setIsAIAddDialogOpen(true)}>
            <Sparkles className="mr-2 h-4 w-4" /> AI Add Product
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
          <TabsList>
            <TabsTrigger value="all">All Items</TabsTrigger>
            <TabsTrigger value="low_stock">Low Stock</TabsTrigger>
            <TabsTrigger value="out_of_stock">Out of Stock</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search products..." 
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Package className="h-12 w-12 mb-4 opacity-50" />
              <p>No products found matching your criteria.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product Name</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.sku}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{product.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className={product.current_stock <= product.reorder_level ? "text-red-500 font-bold" : ""}>
                        {product.current_stock} {product.unit_of_measure}
                      </span>
                    </TableCell>
                    <TableCell>₱{product.selling_price.toFixed(2)}</TableCell>
                    <TableCell>
                      {product.current_stock <= 0 ? (
                        <Badge variant="destructive">Out of Stock</Badge>
                      ) : product.current_stock <= product.reorder_level ? (
                        <Badge variant="secondary" className="text-orange-500">Low Stock</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-green-600 bg-green-50">In Stock</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => openEdit(product)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit Details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => openStock(product, 'add')}>
                            <ArrowUpCircle className="mr-2 h-4 w-4 text-green-600" /> Add Stock
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openStock(product, 'remove')}>
                            <Minus className="mr-2 h-4 w-4 text-red-600" /> Deduct Stock
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteProduct(product.id)}>
                            <Trash2 className="mr-2 h-4 w-4" /> Delete Product
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Manual Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
            <DialogDescription>Enter product details manually.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>SKU</Label>
                <Input value={newProduct.sku} onChange={e => setNewProduct({...newProduct, sku: e.target.value})} placeholder="Auto-generated if empty" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Price (₱)</Label>
                <Input type="number" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Stock</Label>
                <Input type="number" value={newProduct.stock} onChange={e => setNewProduct({...newProduct, stock: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={newProduct.category} onValueChange={val => setNewProduct({...newProduct, category: val})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fresh">Fresh</SelectItem>
                    <SelectItem value="frozen">Frozen</SelectItem>
                    <SelectItem value="canned">Canned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Input value={newProduct.unit} onChange={e => setNewProduct({...newProduct, unit: e.target.value})} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleManualAdd}>Save Product</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={selectedProduct.name} onChange={e => setSelectedProduct({...selectedProduct, name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>SKU</Label>
                  <Input value={selectedProduct.sku} onChange={e => setSelectedProduct({...selectedProduct, sku: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Price (₱)</Label>
                  <Input type="number" value={selectedProduct.selling_price} onChange={e => setSelectedProduct({...selectedProduct, selling_price: parseFloat(e.target.value) || 0})} />
                </div>
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Input value={selectedProduct.unit_of_measure} onChange={e => setSelectedProduct({...selectedProduct, unit_of_measure: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Current Stock ({selectedProduct.unit_of_measure})</Label>
                  <Input 
                    type="number" 
                    value={selectedProduct.current_stock} 
                    onChange={e => setSelectedProduct({...selectedProduct, current_stock: parseFloat(e.target.value) || 0})} 
                    className="border-orange-200 focus:border-orange-500 bg-orange-50/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Min. Order Qty</Label>
                  <Input 
                    type="number" 
                    value={selectedProduct.min_order || 1} 
                    onChange={e => setSelectedProduct({...selectedProduct, min_order: parseFloat(e.target.value) || 1})} 
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEditProduct}>Update Product</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock Adjustment Dialog */}
      <Dialog open={isStockOpen} onOpenChange={setIsStockOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{stockAdjustment.type === 'add' ? 'Add Stock' : 'Deduct Stock'}</DialogTitle>
            <DialogDescription>
              Adjusting stock for: <span className="font-semibold">{selectedProduct?.name}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Quantity ({selectedProduct?.unit_of_measure})</Label>
              <Input 
                type="number" 
                value={stockAdjustment.quantity} 
                onChange={e => setStockAdjustment({...stockAdjustment, quantity: e.target.value})}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Input 
                value={stockAdjustment.reason} 
                onChange={e => setStockAdjustment({...stockAdjustment, reason: e.target.value})}
                placeholder={stockAdjustment.type === 'add' ? "e.g. New Shipment" : "e.g. Spoilage, Damage"}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStockOpen(false)}>Cancel</Button>
            <Button 
                onClick={handleStockAdjustment} 
                className={stockAdjustment.type === 'add' ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
            >
                Confirm {stockAdjustment.type === 'add' ? 'Addition' : 'Deduction'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Add Dialog (Lazy Loaded) */}
      {isAIAddDialogOpen && (
        <Suspense fallback={<div className="fixed inset-0 flex items-center justify-center bg-black/20 z-50"><RefreshCw className="animate-spin h-8 w-8 text-white" /></div>}>
          <AIProductForm 
            open={isAIAddDialogOpen} 
            onOpenChange={setIsAIAddDialogOpen}
            onSuccess={() => {
              fetchProducts();
              toast.success("Product created with AI!");
            }} 
          />
        </Suspense>
      )}
    </div>
  );
}
