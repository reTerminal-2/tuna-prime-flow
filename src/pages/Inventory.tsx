
import { useState, useEffect, Suspense, lazy } from "react";
import { useIsMobileLayout } from "@/hooks/use-layout-mode";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Package, Plus, Search, AlertCircle, RefreshCw, Sparkles,
  Edit, Trash2, ArrowUpCircle, Minus, LayoutGrid, List,
  Image as ImageIcon, Loader2, Camera, X, MoreVertical,
  ChevronRight, BarChart3, History, TrendingUp
} from "lucide-react";
import { toast } from "sonner";
import { auditService } from "@/services/auditService";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { uploadService } from "@/services/uploadService";
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
import { cn } from "@/lib/utils";
import { getFallbackImage } from "@/lib/mockImages";

// Lazy load AI service
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
  image_url: string | null;
  images: string[] | null;
}

export default function Inventory() {
  const isMobileLayout = useIsMobileLayout();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(isMobileLayout ? 'grid' : 'table');

  // Dialog States
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAIAddDialogOpen, setIsAIAddDialogOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isStockOpen, setIsStockOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  // Multi-image upload state
  const [uploadingImage, setUploadingImage] = useState(false);
  const [newProductImages, setNewProductImages] = useState<string[]>([]);

  // Form states
  const [newProduct, setNewProduct] = useState({
    name: "",
    sku: "",
    category: "fresh",
    price: "",
    cost: "",
    stock: "",
    unit: "kg",
    description: ""
  });

  const [stockAdjustment, setStockAdjustment] = useState({
    type: 'add',
    quantity: '',
    reason: ''
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

      const formattedData = (data || []).map(p => ({
        ...p,
        images: Array.isArray(p.images) ? p.images : (p.image_url ? [p.image_url] : [])
      }));

      setProducts(formattedData);
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

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, isEdit: boolean) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);
    try {
      const uploadedUrls = [];
      for (const file of Array.from(files)) {
        const filePath = `product-images/${Date.now()}-${file.name}`;
        const url = await uploadService.uploadImage(file, 'avatars', filePath);
        uploadedUrls.push(url);
      }

      if (isEdit && selectedProduct) {
        const currentImages = selectedProduct.images || [];
        setSelectedProduct({
          ...selectedProduct,
          images: [...currentImages, ...uploadedUrls]
        });
      } else {
        setNewProductImages(prev => [...prev, ...uploadedUrls]);
      }
      toast.success(`${uploadedUrls.length} image(s) uploaded!`);
    } catch (error: any) {
      toast.error("Upload failed: " + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = (index: number, isEdit: boolean) => {
    if (isEdit && selectedProduct) {
      const newImages = [...(selectedProduct.images || [])];
      newImages.splice(index, 1);
      setSelectedProduct({ ...selectedProduct, images: newImages });
    } else {
      setNewProductImages(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleSaveProduct = async (isEdit: boolean) => {
    try {
      const currentImages = isEdit ? selectedProduct?.images : newProductImages;
      const primaryImage = currentImages && currentImages.length > 0 ? currentImages[0] : null;

      const productPayload = isEdit ? {
        name: selectedProduct?.name,
        sku: selectedProduct?.sku,
        category: selectedProduct?.category,
        selling_price: selectedProduct?.selling_price,
        cost_price: selectedProduct?.cost_price,
        current_stock: selectedProduct?.current_stock,
        unit_of_measure: selectedProduct?.unit_of_measure,
        description: selectedProduct?.description,
        image_url: primaryImage,
        images: currentImages,
        updated_at: new Date().toISOString()
      } : {
        name: newProduct.name,
        sku: newProduct.sku || `SKU-${Date.now()}`,
        category: newProduct.category,
        selling_price: parseFloat(newProduct.price) || 0,
        cost_price: parseFloat(newProduct.cost) || 0,
        current_stock: parseFloat(newProduct.stock) || 0,
        unit_of_measure: newProduct.unit,
        description: newProduct.description,
        image_url: primaryImage,
        images: currentImages,
      };

      let error;
      if (isEdit && selectedProduct) {
        ({ error } = await supabase.from('products').update(productPayload).eq('id', selectedProduct.id));
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        ({ error } = await supabase.from('products').insert({ ...productPayload, user_id: session?.user?.id }));
      }

      if (error) throw error;

      await auditService.log({
        action: isEdit ? 'UPDATE' : 'CREATE',
        entityType: 'product',
        entityId: isEdit ? selectedProduct?.id : undefined,
        newValues: productPayload
      });

      toast.success(isEdit ? "Product updated" : "Product added");
      isEdit ? setIsEditOpen(false) : setIsAddDialogOpen(false);
      if (!isEdit) {
        setNewProduct({ name: "", sku: "", category: "fresh", price: "", cost: "", stock: "", unit: "kg", description: "" });
        setNewProductImages([]);
      }
      fetchProducts();
    } catch (err: any) {
      toast.error(err.message || "Action failed");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      toast.success("Product deleted");
      fetchProducts();
    } catch (err: any) {
      toast.error("Delete failed");
    }
  };

  const filteredProducts = products.filter(p => {
    const name = p.name || "";
    const sku = p.sku || "";
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sku.toLowerCase().includes(searchTerm.toLowerCase());
    let matchesTab = true;
    if (activeTab === 'low_stock') matchesTab = p.current_stock <= p.reorder_level;
    if (activeTab === 'out_of_stock') matchesTab = p.current_stock <= 0;
    return matchesSearch && matchesTab;
  });

  return (
    <div className="flex flex-col h-full bg-background/50 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="px-4 py-6 md:px-8 border-b bg-white/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
              <Package className="h-8 w-8 text-primary" />
              Inventory
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Manage stock, track prices, and organize your products.</p>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Button className="flex-1 md:flex-none shadow-premium transition-all hover:scale-[1.02] active:scale-[0.98]" onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Manual Add
            </Button>
            <Button className="flex-1 md:flex-none bg-purple-600 hover:bg-purple-700 shadow-premium transition-all hover:scale-[1.02] active:scale-[0.98]" onClick={() => setIsAIAddDialogOpen(true)}>
              <Sparkles className="mr-2 h-4 w-4" /> AI Add
            </Button>
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="px-4 py-4 md:px-8 border-b bg-white/30">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-4 justify-between items-center">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
            <TabsList className="bg-muted/50 p-1">
              <TabsTrigger value="all" className="rounded-md">All Items</TabsTrigger>
              <TabsTrigger value="low_stock" className="rounded-md flex items-center gap-2">
                Low Stock
                {products.filter(p => p.current_stock <= p.reorder_level && p.current_stock > 0).length > 0 &&
                  <span className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                }
              </TabsTrigger>
              <TabsTrigger value="out_of_stock" className="rounded-md text-red-500">Out of Stock</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                placeholder="Search by name or SKU..."
                className="flex h-10 w-full rounded-md border border-input bg-white/50 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 transition-all pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex bg-muted/50 p-1 rounded-lg border">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon" className="h-8 w-8"
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                size="icon" className="h-8 w-8"
                onClick={() => setViewMode('table')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 pb-24 md:pb-8">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <div className="relative">
                <RefreshCw className="h-12 w-12 animate-spin text-primary opacity-20" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Package className="h-5 w-5 text-primary" />
                </div>
              </div>
              <p className="text-muted-foreground animate-pulse font-medium">Synchronizing inventory...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-96 text-center animate-in zoom-in duration-300">
              <div className="h-24 w-24 bg-primary/5 rounded-full flex items-center justify-center mb-6">
                <Package className="h-12 w-12 text-primary opacity-20" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">No products discovered</h3>
              <p className="text-muted-foreground max-w-xs mt-2">Adjust your search or add a new product to populate your inventory.</p>
              <Button variant="outline" className="mt-6" onClick={() => { setSearchTerm(""); setActiveTab("all"); }}>
                Clear filters
              </Button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in slide-in-from-bottom-4 duration-500">
              {filteredProducts.map(product => (
                <InventoryCard
                  key={product.id}
                  product={product}
                  onEdit={() => { setSelectedProduct(product); setIsEditOpen(true); }}
                  onDelete={() => handleDelete(product.id)}
                  onStockUpdate={(type) => {
                    setSelectedProduct(product);
                    setStockAdjustment({ type, quantity: '', reason: '' });
                    setIsStockOpen(true);
                  }}
                />
              ))}
            </div>
          ) : (
            <Card className="border-none shadow-premium overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[300px]">Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Stock Level</TableHead>
                      <TableHead>Pricing</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Manage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map(product => (
                      <InventoryTableRow
                        key={product.id}
                        product={product}
                        onEdit={() => { setSelectedProduct(product); setIsEditOpen(true); }}
                        onStockUpdate={(type) => {
                          setSelectedProduct(product);
                          setStockAdjustment({ type, quantity: '', reason: '' });
                          setIsStockOpen(true);
                        }}
                      />
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Add/Edit/AI Dialogs & Modals */}
      <ProductFormModal
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onSave={() => handleSaveProduct(false)}
        data={newProduct}
        setData={setNewProduct}
        images={newProductImages}
        onImageUpload={(e: any) => handleImageUpload(e, false)}
        onImageRemove={(i: number) => removeImage(i, false)}
        isUploading={uploadingImage}
        title="Add New Listing"
      />

      <ProductFormModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSave={() => handleSaveProduct(true)}
        data={selectedProduct}
        setData={setSelectedProduct}
        images={selectedProduct?.images || []}
        onImageUpload={(e: any) => handleImageUpload(e, true)}
        onImageRemove={(i: number) => removeImage(i, true)}
        isUploading={uploadingImage}
        title="Refine Listing"
        isEdit
      />

      <StockAdjustmentModal
        isOpen={isStockOpen}
        onClose={() => setIsStockOpen(false)}
        product={selectedProduct}
        adjustment={stockAdjustment}
        setAdjustment={setStockAdjustment}
        onConfirm={async () => {
          if (!selectedProduct) return;
          const qty = parseFloat(stockAdjustment.quantity);
          if (isNaN(qty)) { toast.error("Please enter a valid quantity"); return; }

          const newStock = stockAdjustment.type === 'add' ? selectedProduct.current_stock + qty : selectedProduct.current_stock - qty;

          const { error } = await supabase.from('products').update({ current_stock: newStock }).eq('id', selectedProduct.id);
          if (error) { toast.error("Stock update failed"); return; }

          await auditService.log({
            action: stockAdjustment.type === 'add' ? 'CREATE' : 'DELETE',
            entityType: 'stock_adjustment',
            entityId: selectedProduct.id,
            newValues: { ...stockAdjustment, newStock }
          });

          toast.success("Inventory adjusted");
          setIsStockOpen(false);
          fetchProducts();
        }}
      />

      {isAIAddDialogOpen && (
        <Suspense fallback={<div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"><RefreshCw className="h-10 w-10 animate-spin text-white" /></div>}>
          <AIProductForm
            open={isAIAddDialogOpen}
            onOpenChange={setIsAIAddDialogOpen}
            onSuccess={() => { fetchProducts(); setIsAIAddDialogOpen(false); }}
          />
        </Suspense>
      )}
    </div>
  );
}

// Sub-components
function InventoryCard({ product, onEdit, onDelete, onStockUpdate }: { product: Product, onEdit: () => void, onDelete: () => void, onStockUpdate: (type: 'add' | 'remove') => void }) {
  const isLowStock = product.current_stock <= product.reorder_level && product.current_stock > 0;
  const isOut = product.current_stock <= 0;

  return (
    <Card className="group border-none shadow-premium hover:shadow-hover transition-all duration-300 overflow-hidden flex flex-col bg-white">
      <div className="relative h-48 bg-muted overflow-hidden">
        {product.images && product.images.length > 0 ? (
          <img src={product.images[0]} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={product.name} />
        ) : (
          <img src={getFallbackImage(product.category)} className="w-full h-full object-cover opacity-40 transition-transform duration-700 group-hover:scale-110" alt={product.name} />
        )}

        {product.images && product.images.length > 1 && (
          <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full backdrop-blur-sm border border-white/10 flex items-center gap-1 font-bold">
            <LayoutGrid className="h-3 w-3" />
            +{product.images.length - 1}
          </div>
        )}

        {isOut && <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center font-bold text-white uppercase tracking-tighter">Sold Out</div>}
      </div>

      <CardContent className="p-4 flex-1">
        <div className="flex justify-between items-start mb-1">
          <Badge variant="outline" className="text-[10px] uppercase tracking-tighter opacity-70 border-primary/20 text-primary">{product.category}</Badge>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-muted" onClick={onEdit}>
              <Edit className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-muted">
                  <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Maintenance</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => onStockUpdate('add')}><ArrowUpCircle className="h-4 w-4 mr-2 text-green-500" /> Restock</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onStockUpdate('remove')}><Minus className="h-4 w-4 mr-2 text-red-500" /> Reduce</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-500" onClick={onDelete}><Trash2 className="h-4 w-4 mr-2" /> Delete Listing</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <h4 className="font-bold text-gray-900 leading-tight mb-2 line-clamp-1">{product.name}</h4>

        <div className="flex items-center justify-between mb-3 bg-muted/30 p-2 rounded-lg border border-black/[0.03]">
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Current Stock</span>
            <div className="flex items-center gap-1.5">
              <span className={cn("text-lg font-black", isOut ? "text-red-500" : isLowStock ? "text-orange-500" : "text-primary")}>
                {product.current_stock}
              </span>
              <span className="text-[10px] text-muted-foreground uppercase">{product.unit_of_measure}</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Selling Price</span>
            <div className="text-lg font-black text-gray-900">₱{Number(product.selling_price).toFixed(0)}</div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-[11px] font-medium border-t pt-2">
            <span className="text-muted-foreground">SKU:</span>
            <span className="font-mono text-gray-600 uppercase">{product.sku}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-0">
        <Button className="w-full rounded-none h-10 gap-2 border-t font-bold text-xs" variant="secondary" onClick={() => onStockUpdate('add')}>
          <ArrowUpCircle className="h-4 w-4" /> Quick Restock
        </Button>
      </CardFooter>
    </Card>
  );
}

function InventoryTableRow({ product, onEdit, onStockUpdate }: { product: Product, onEdit: () => void, onStockUpdate: (type: 'add' | 'remove') => void }) {
  const isLowStock = product.current_stock <= product.reorder_level && product.current_stock > 0;
  const isOut = product.current_stock <= 0;

  return (
    <TableRow className="hover:bg-muted/30 group">
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg bg-muted overflow-hidden border">
            {product.images && product.images.length > 0 ? (
              <img src={product.images[0]} className="h-full w-full object-cover" alt={product.name} />
            ) : (
              <img src={getFallbackImage(product.category)} className="h-full w-full object-cover opacity-30" alt={product.name} />
            )}
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-gray-900">{product.name}</span>
            <span className="text-[10px] text-muted-foreground font-mono uppercase">{product.sku}</span>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="secondary" className="bg-primary/5 text-primary border-none text-[10px] uppercase font-bold">{product.category}</Badge>
      </TableCell>
      <TableCell>
        <div className="flex flex-col">
          <span className={cn("text-base font-black", isOut ? "text-red-500" : isLowStock ? "text-orange-500" : "text-gray-900")}>
            {product.current_stock}
          </span>
          <span className="text-[10px] text-muted-foreground uppercase">{product.unit_of_measure}</span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col">
          <span className="text-base font-black">₱{Number(product.selling_price).toFixed(2)}</span>
          <span className="text-[10px] text-muted-foreground">List Price</span>
        </div>
      </TableCell>
      <TableCell>
        {isOut ? <Badge variant="destructive" className="rounded-full">Critical: Out of Stock</Badge> :
          isLowStock ? <Badge variant="secondary" className="bg-orange-50 text-orange-500 border-orange-200">Alert: Low stock</Badge> :
            <Badge variant="secondary" className="bg-green-50 text-green-600 border-green-200">Stable: In Stock</Badge>
        }
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={onEdit}><Edit className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onStockUpdate('add')}><Plus className="h-4 w-4" /></Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function ProductFormModal({ isOpen, onClose, onSave, data, setData, images, onImageUpload, onImageRemove, isUploading, title, isEdit = false }: any) {
  if (!data && isEdit) return null;

  const currentData = data || { name: "", sku: "", category: "fresh", price: "", cost: "", stock: "", unit: "kg", description: "" };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] gap-0 p-0 overflow-hidden border-none shadow-premium rounded-2xl max-h-[90vh]">
        <div className="bg-primary/5 px-6 py-4 border-b flex items-center justify-between shrink-0">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">{title}</DialogTitle>
            <DialogDescription>Define your product presentation and inventory details.</DialogDescription>
          </DialogHeader>
          <div className="h-10 w-10 bg-white rounded-xl shadow-sm flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
        </div>

        <div className="px-6 py-6 overflow-y-auto bg-white flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Col: Info */}
            <div className="space-y-6">
              <div className="space-y-4">
                <Label className="text-sm font-bold flex items-center gap-2 border-b pb-2">General Information</Label>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider">Product Title</Label>
                    <Input
                      placeholder="e.g. Fresh Yellowfin Steak"
                      className="bg-muted/30 border-none h-11"
                      value={currentData.name}
                      onChange={e => isEdit ? setData({ ...data, name: e.target.value }) : setData({ ...data, name: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider">SKU Code</Label>
                      <Input
                        placeholder="YFT-001"
                        className="bg-muted/30 border-none h-11"
                        value={currentData.sku}
                        onChange={e => isEdit ? setData({ ...data, sku: e.target.value }) : setData({ ...data, sku: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider">Category</Label>
                      <Select
                        value={currentData.category}
                        onValueChange={val => isEdit ? setData({ ...data, category: val }) : setData({ ...data, category: val })}
                      >
                        <SelectTrigger className="bg-muted/30 border-none h-11"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fresh">Fresh Water</SelectItem>
                          <SelectItem value="frozen">Deep Frozen</SelectItem>
                          <SelectItem value="canned">Processed/Canned</SelectItem>
                          <SelectItem value="dried">Dried Goods</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-sm font-bold flex items-center gap-2 border-b pb-2">Economics & Inventory</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider">Price (₱)</Label>
                    <Input
                      type="number"
                      className="bg-muted/30 border-none h-11 font-bold text-primary"
                      value={isEdit ? currentData.selling_price : currentData.price}
                      onChange={e => isEdit ? setData({ ...data, selling_price: parseFloat(e.target.value) || 0 }) : setData({ ...data, price: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider">In Stock</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        className="bg-muted/30 border-none h-11"
                        value={isEdit ? currentData.current_stock : currentData.stock}
                        onChange={e => isEdit ? setData({ ...data, current_stock: parseFloat(e.target.value) || 0 }) : setData({ ...data, stock: e.target.value })}
                      />
                      <Input
                        placeholder="kg"
                        className="bg-muted/30 border-none h-11 w-20"
                        value={isEdit ? currentData.unit_of_measure : currentData.unit}
                        onChange={e => isEdit ? setData({ ...data, unit_of_measure: e.target.value }) : setData({ ...data, unit: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider">Product Story (Description)</Label>
                <textarea
                  className="w-full bg-muted/30 border-none rounded-xl p-3 min-h-[100px] text-sm focus:ring-1 ring-primary/20 outline-none"
                  placeholder="Share details about flavor profile, source, or preparation tips..."
                  value={currentData.description || ""}
                  onChange={e => isEdit ? setData({ ...data, description: e.target.value }) : setData({ ...data, description: e.target.value })}
                />
              </div>
            </div>

            {/* Right Col: Gallery */}
            <div className="space-y-6">
              <Label className="text-sm font-bold flex items-center gap-2 border-b pb-2">Visual Gallery</Label>
              <div className="bg-muted/30 rounded-2xl border-2 border-dashed border-muted flex flex-col items-center justify-center p-8 text-center gap-4 relative">
                {isUploading ? (
                  <div className="flex flex-col items-center gap-2 py-4">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="text-xs font-bold text-primary uppercase tracking-[0.2em]">Optimizing...</p>
                  </div>
                ) : (
                  <>
                    <div className="h-16 w-16 bg-white rounded-2xl shadow-premium flex items-center justify-center group-hover:scale-110 transition-transform cursor-pointer" onClick={() => document.getElementById('gallery-upload-trigger')?.click()}>
                      <Camera className="h-8 w-8 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold">Add product photos</p>
                      <p className="text-[10px] text-muted-foreground leading-tight px-4">Upload high-res images to showcase quality. First image is the cover.</p>
                    </div>
                    <Button variant="secondary" size="sm" className="shadow-premium" onClick={() => document.getElementById('gallery-upload-trigger')?.click()}>
                      Browse Assets
                    </Button>
                    <input id="gallery-upload-trigger" type="file" multiple className="hidden" accept="image/*" onChange={onImageUpload} />
                  </>
                )}
              </div>

              {images && images.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {images.map((url: string, i: number) => (
                    <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border">
                      <img src={url} className="h-full w-full object-cover" alt="Gallery preview" />
                      <button
                        onClick={() => onImageRemove(i)}
                        className="absolute top-1 right-1 h-5 w-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                      {i === 0 && (
                        <div className="absolute bottom-0 inset-x-0 bg-primary text-[8px] font-black text-white text-center py-0.5 uppercase tracking-widest">Cover</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="bg-muted/30 px-6 py-4 border-t gap-2 sm:gap-0 shrink-0">
          <Button variant="ghost" className="font-bold text-xs" onClick={onClose}>Discard</Button>
          <Button className="shadow-premium px-8 font-bold" onClick={onSave}>{isEdit ? "Publish Improvements" : "Publish Listing"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StockAdjustmentModal({ isOpen, onClose, product, adjustment, setAdjustment, onConfirm }: any) {
  if (!product) return null;
  const isAdd = adjustment.type === 'add';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden border-none shadow-premium rounded-2xl">
        <div className={cn("p-6 border-b flex items-center justify-between", isAdd ? "bg-green-50" : "bg-red-50")}>
          <div className="space-y-1">
            <h3 className={cn("text-xl font-bold", isAdd ? "text-green-900" : "text-red-900")}>
              {isAdd ? "Replenish Inventory" : "Stock Disbursement"}
            </h3>
            <p className="text-sm opacity-70">Updating: <span className="font-bold uppercase tracking-tighter">{product.name}</span></p>
          </div>
          <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center shadow-sm bg-white")}>
            {isAdd ? <TrendingUp className="h-6 w-6 text-green-600" /> : <BarChart3 className="h-6 w-6 text-red-600" />}
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between p-4 bg-muted/10 rounded-2xl border">
            <div>
              <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest mb-1">Current</p>
              <p className="text-2xl font-black">{product.current_stock} <span className="text-xs font-medium opacity-50">{product.unit_of_measure}</span></p>
            </div>
            <ChevronRight className="h-6 w-6 text-muted-foreground/30" />
            <div className="text-right">
              <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest mb-1">Forecast</p>
              <p className={cn("text-2xl font-black", isAdd ? "text-green-600" : "text-red-600")}>
                {isAdd ? (product.current_stock + (parseFloat(adjustment.quantity) || 0)) : (product.current_stock - (parseFloat(adjustment.quantity) || 0))}
                <span className="text-xs font-medium opacity-50 ml-1">{product.unit_of_measure}</span>
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[11px] font-black uppercase text-muted-foreground">Adjustment Quantity</Label>
              <div className="relative">
                <input
                  type="number"
                  autoFocus
                  className="flex h-14 w-full rounded-md border border-input px-3 py-2 ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-2xl font-black bg-muted/30 border-none pl-4 h-14 focus-visible:ring-primary/20"
                  value={adjustment.quantity}
                  onChange={e => setAdjustment({ ...adjustment, quantity: e.target.value })}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-muted-foreground uppercase">{product.unit_of_measure}</div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[11px] font-black uppercase text-muted-foreground">Verification Reason</Label>
              <div className="relative">
                <History className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/50" />
                <textarea
                  className="w-full bg-muted/30 border-none rounded-xl p-3 pl-9 min-h-[80px] text-sm focus:ring-1 ring-primary/20 outline-none"
                  placeholder="e.g. Regular restock, spoilage audit, transfer..."
                  value={adjustment.reason}
                  onChange={e => setAdjustment({ ...adjustment, reason: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="bg-muted/30 px-6 py-4 border-t gap-2 sm:gap-0">
          <Button variant="ghost" className="font-bold text-xs" onClick={onClose}>Cancel</Button>
          <Button
            className={cn("shadow-premium font-bold px-8", isAdd ? "bg-green-600 hover:bg-green-700 font-bold" : "bg-red-600 hover:bg-red-700 text-white font-bold")}
            onClick={onConfirm}
          >
            Confirm Change
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
