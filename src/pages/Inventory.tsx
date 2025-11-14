import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Package, Minus, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { z } from "zod";

const productSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  sku: z.string().trim().min(1, "SKU is required").max(50, "SKU must be less than 50 characters"),
  cost_price: z.number().positive("Cost price must be positive").max(999999, "Cost price too large"),
  selling_price: z.number().positive("Selling price must be positive").max(999999, "Selling price too large"),
  current_stock: z.number().nonnegative("Stock cannot be negative").max(999999, "Stock value too large"),
  reorder_level: z.number().nonnegative("Reorder level cannot be negative").max(999999, "Reorder level too large"),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
});

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  description: string | null;
  unit_of_measure: string;
  cost_price: number;
  selling_price: number;
  current_stock: number;
  reorder_level: number;
  supplier_id: string | null;
  expiration_date: string | null;
}

const Inventory = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isStockDialogOpen, setIsStockDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [stockAction, setStockAction] = useState<"add" | "deduct" | "sell">("add");
  const [stockAdjustment, setStockAdjustment] = useState({
    quantity: "",
    reason: "",
    unitPrice: "", // For sales
    notes: "",
  });
  const [newProduct, setNewProduct] = useState<{
    name: string;
    sku: string;
    category: "fresh" | "frozen" | "canned" | "other";
    description: string;
    unit_of_measure: string;
    cost_price: string;
    selling_price: string;
    current_stock: string;
    reorder_level: string;
    supplier_id: string;
    expiration_date: string;
  }>({
    name: "",
    sku: "",
    category: "fresh",
    description: "",
    unit_of_measure: "kg",
    cost_price: "",
    selling_price: "",
    current_stock: "",
    reorder_level: "",
    supplier_id: "",
    expiration_date: "",
  });

  useEffect(() => {
    fetchProducts();
    fetchSuppliers();
    
    // Set up real-time subscription for products
    const channel = supabase
      .channel('product-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products'
        },
        () => {
          fetchProducts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Unable to load products. Please refresh the page or check your internet connection.");
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .order("name");

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
    }
  };

  const handleAddProduct = async () => {
    try {
      // Validate input
      const validationResult = productSchema.safeParse({
        name: newProduct.name,
        sku: newProduct.sku,
        cost_price: parseFloat(newProduct.cost_price),
        selling_price: parseFloat(newProduct.selling_price),
        current_stock: parseFloat(newProduct.current_stock),
        reorder_level: parseFloat(newProduct.reorder_level),
        description: newProduct.description || undefined,
      });

      if (!validationResult.success) {
        const errors = validationResult.error.errors.map(e => e.message).join(", ");
        toast.error(errors);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to add products");
        return;
      }

      const { error } = await supabase.from("products").insert([
        {
          name: validationResult.data.name,
          sku: validationResult.data.sku,
          category: newProduct.category,
          description: validationResult.data.description || null,
          unit_of_measure: newProduct.unit_of_measure,
          cost_price: validationResult.data.cost_price,
          selling_price: validationResult.data.selling_price,
          current_stock: validationResult.data.current_stock,
          reorder_level: validationResult.data.reorder_level,
          supplier_id: newProduct.supplier_id || null,
          expiration_date: newProduct.expiration_date || null,
          user_id: user.id,
        },
      ]);

      if (error) throw error;

      toast.success("Product added successfully");
      setIsAddDialogOpen(false);
      setNewProduct({
        name: "",
        sku: "",
        category: "fresh",
        description: "",
        unit_of_measure: "kg",
        cost_price: "",
        selling_price: "",
        current_stock: "",
        reorder_level: "",
        supplier_id: "",
        expiration_date: "",
      });
      fetchProducts();
    } catch (error: any) {
      console.error("Error adding product:", error);
      const errorMsg = error.message || "";
      
      // Provide specific guidance based on error
      if (errorMsg.includes("duplicate key") || errorMsg.includes("unique constraint")) {
        toast.error("A product with this SKU already exists in your inventory. Please use a different SKU.");
      } else if (errorMsg.includes("violates row-level security")) {
        toast.error("You don't have permission to add products. Please log in again.");
      } else if (errorMsg.includes("null value")) {
        toast.error("Please fill in all required fields (Name, SKU, Category, Prices).");
      } else {
        toast.error("Unable to add product. Please check all fields and try again.");
      }
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      const { error } = await supabase.from("products").delete().eq("id", id);

      if (error) throw error;

      toast.success("Product deleted successfully");
      fetchProducts();
    } catch (error: any) {
      console.error("Error deleting product:", error);
      const errorMsg = error.message || "";
      
      if (errorMsg.includes("foreign key")) {
        toast.error("Cannot delete this product because it has associated transactions or pricing logs. Please remove those first.");
      } else if (errorMsg.includes("permission")) {
        toast.error("You don't have permission to delete this product.");
      } else {
        toast.error("Unable to delete product. Please try again.");
      }
    }
  };

  const openStockDialog = (product: Product, action: "add" | "deduct" | "sell") => {
    setSelectedProduct(product);
    setStockAction(action);
    setStockAdjustment({
      quantity: "",
      reason: "",
      unitPrice: action === "sell" ? product.selling_price.toString() : "",
      notes: "",
    });
    setIsStockDialogOpen(true);
  };

  const handleStockAdjustment = async () => {
    if (!selectedProduct) return;

    const quantity = parseFloat(stockAdjustment.quantity);
    
    // Validation
    if (isNaN(quantity) || quantity <= 0) {
      toast.error("Please enter a valid positive quantity.");
      return;
    }

    // Check if deduction would result in negative stock
    if ((stockAction === "deduct" || stockAction === "sell") && quantity > selectedProduct.current_stock) {
      toast.error(`Cannot ${stockAction} ${quantity} units. Only ${selectedProduct.current_stock} units available in stock.`);
      return;
    }

    if (stockAction === "sell") {
      const unitPrice = parseFloat(stockAdjustment.unitPrice);
      if (isNaN(unitPrice) || unitPrice <= 0) {
        toast.error("Please enter a valid selling price.");
        return;
      }
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to adjust stock.");
        return;
      }

      // Calculate new stock level
      const newStock = stockAction === "add" 
        ? selectedProduct.current_stock + quantity 
        : selectedProduct.current_stock - quantity;

      // Update product stock
      const { error: updateError } = await supabase
        .from("products")
        .update({ current_stock: newStock })
        .eq("id", selectedProduct.id)
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      // Record stock adjustment
      const { error: adjustmentError } = await supabase
        .from("stock_adjustments")
        .insert({
          product_id: selectedProduct.id,
          quantity: stockAction === "add" ? quantity : -quantity,
          adjustment_type: stockAction === "sell" ? "sale" : stockAction,
          reason: stockAdjustment.reason || (stockAction === "add" ? "Stock received" : stockAction === "sell" ? "Sale" : "Stock removed"),
          adjusted_by: user.id,
        });

      if (adjustmentError) throw adjustmentError;

      // If this is a sale, record transaction
      if (stockAction === "sell") {
        const unitPrice = parseFloat(stockAdjustment.unitPrice);
        const totalAmount = quantity * unitPrice;
        const profit = (unitPrice - selectedProduct.cost_price) * quantity;

        const { error: transactionError } = await supabase
          .from("transactions")
          .insert({
            product_id: selectedProduct.id,
            quantity: quantity,
            unit_price: unitPrice,
            cost_price: selectedProduct.cost_price,
            total_amount: totalAmount,
            profit: profit,
            notes: stockAdjustment.notes || null,
            created_by: user.id,
          });

        if (transactionError) throw transactionError;
      }

      const actionText = stockAction === "add" ? "added to" : stockAction === "sell" ? "sold from" : "removed from";
      toast.success(`${quantity} units ${actionText} ${selectedProduct.name} successfully!`);
      
      setIsStockDialogOpen(false);
      setSelectedProduct(null);
      setStockAdjustment({ quantity: "", reason: "", unitPrice: "", notes: "" });
      fetchProducts();
    } catch (error: any) {
      console.error("Error adjusting stock:", error);
      const errorMsg = error.message || "";
      
      if (errorMsg.includes("permission") || errorMsg.includes("row-level security")) {
        toast.error("You don't have permission to modify this product's stock.");
      } else if (errorMsg.includes("foreign key")) {
        toast.error("This product no longer exists. Please refresh the page.");
      } else {
        toast.error(`Unable to ${stockAction} stock. Please try again.`);
      }
    }
  };

  const getCategoryBadgeVariant = (category: string) => {
    switch (category) {
      case "fresh":
        return "default";
      case "frozen":
        return "secondary";
      case "canned":
        return "outline";
      default:
        return "outline";
    }
  };

  const isExpiringSoon = (expirationDate: string | null) => {
    if (!expirationDate) return false;
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    return new Date(expirationDate) <= threeDaysFromNow;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-muted rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Inventory Management</h1>
          <p className="text-muted-foreground">
            Manage all your tuna products and stock levels
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
              <DialogDescription>
                Enter the details of the new tuna product
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name</Label>
                  <Input
                    id="name"
                    value={newProduct.name}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, name: e.target.value })
                    }
                    placeholder="Fresh Tuna Loin"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    value={newProduct.sku}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, sku: e.target.value })
                    }
                    placeholder="TUN-001"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={newProduct.category}
                    onValueChange={(value: "fresh" | "frozen" | "canned" | "other") =>
                      setNewProduct({ ...newProduct, category: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fresh">Fresh</SelectItem>
                      <SelectItem value="frozen">Frozen</SelectItem>
                      <SelectItem value="canned">Canned</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit">Unit of Measure</Label>
                  <Input
                    id="unit"
                    value={newProduct.unit_of_measure}
                    onChange={(e) =>
                      setNewProduct({
                        ...newProduct,
                        unit_of_measure: e.target.value,
                      })
                    }
                    placeholder="kg"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={newProduct.description}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, description: e.target.value })
                  }
                  placeholder="Product description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cost-price">Cost Price</Label>
                  <Input
                    id="cost-price"
                    type="number"
                    step="0.01"
                    value={newProduct.cost_price}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, cost_price: e.target.value })
                    }
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="selling-price">Selling Price</Label>
                  <Input
                    id="selling-price"
                    type="number"
                    step="0.01"
                    value={newProduct.selling_price}
                    onChange={(e) =>
                      setNewProduct({
                        ...newProduct,
                        selling_price: e.target.value,
                      })
                    }
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stock">Current Stock</Label>
                  <Input
                    id="stock"
                    type="number"
                    step="0.01"
                    value={newProduct.current_stock}
                    onChange={(e) =>
                      setNewProduct({
                        ...newProduct,
                        current_stock: e.target.value,
                      })
                    }
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reorder">Reorder Level</Label>
                  <Input
                    id="reorder"
                    type="number"
                    step="0.01"
                    value={newProduct.reorder_level}
                    onChange={(e) =>
                      setNewProduct({
                        ...newProduct,
                        reorder_level: e.target.value,
                      })
                    }
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="supplier">Supplier</Label>
                  <Select
                    value={newProduct.supplier_id}
                    onValueChange={(value) =>
                      setNewProduct({ ...newProduct, supplier_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expiration">Expiration Date</Label>
                  <Input
                    id="expiration"
                    type="date"
                    value={newProduct.expiration_date}
                    onChange={(e) =>
                      setNewProduct({
                        ...newProduct,
                        expiration_date: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddProduct}>Add Product</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Cost Price</TableHead>
              <TableHead>Selling Price</TableHead>
              <TableHead>Expiration</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">
                    No products yet. Add your first product to get started.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.sku}</TableCell>
                  <TableCell>
                    <Badge variant={getCategoryBadgeVariant(product.category)}>
                      {product.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {product.current_stock} {product.unit_of_measure}
                  </TableCell>
                  <TableCell>₱{product.cost_price}</TableCell>
                  <TableCell>₱{product.selling_price}</TableCell>
                  <TableCell>
                    {product.expiration_date ? (
                      <span
                        className={
                          isExpiringSoon(product.expiration_date)
                            ? "text-destructive font-medium"
                            : ""
                        }
                      >
                        {new Date(product.expiration_date).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">N/A</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openStockDialog(product, "add")}
                      className="text-green-600 hover:text-green-700"
                    >
                      <ArrowUpCircle className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openStockDialog(product, "deduct")}
                      className="text-orange-600 hover:text-orange-700"
                    >
                      <Minus className="h-4 w-4 mr-1" />
                      Deduct
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openStockDialog(product, "sell")}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <ArrowDownCircle className="h-4 w-4 mr-1" />
                      Sell
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteProduct(product.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Stock Adjustment Dialog */}
      <Dialog open={isStockDialogOpen} onOpenChange={setIsStockDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {stockAction === "add" && "Add Stock"}
              {stockAction === "deduct" && "Deduct Stock"}
              {stockAction === "sell" && "Record Sale"}
            </DialogTitle>
            <DialogDescription>
              {selectedProduct && (
                <>
                  <div className="font-medium text-foreground mt-2">
                    {selectedProduct.name} ({selectedProduct.sku})
                  </div>
                  <div className="text-sm mt-1">
                    Current Stock: <span className="font-semibold">{selectedProduct.current_stock} {selectedProduct.unit_of_measure}</span>
                  </div>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">
                Quantity ({selectedProduct?.unit_of_measure})
                <span className="text-destructive"> *</span>
              </Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="Enter quantity"
                value={stockAdjustment.quantity}
                onChange={(e) =>
                  setStockAdjustment({ ...stockAdjustment, quantity: e.target.value })
                }
                required
              />
            </div>

            {stockAction === "sell" && (
              <div className="space-y-2">
                <Label htmlFor="unitPrice">
                  Selling Price per Unit (₱)
                  <span className="text-destructive"> *</span>
                </Label>
                <Input
                  id="unitPrice"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="Enter price"
                  value={stockAdjustment.unitPrice}
                  onChange={(e) =>
                    setStockAdjustment({ ...stockAdjustment, unitPrice: e.target.value })
                  }
                  required
                />
                {selectedProduct && stockAdjustment.quantity && stockAdjustment.unitPrice && (
                  <div className="text-sm space-y-1 mt-2 p-3 bg-muted rounded-md">
                    <div className="flex justify-between">
                      <span>Total Amount:</span>
                      <span className="font-semibold">
                        ₱{(parseFloat(stockAdjustment.quantity) * parseFloat(stockAdjustment.unitPrice)).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Profit:</span>
                      <span className={`font-semibold ${
                        (parseFloat(stockAdjustment.unitPrice) - selectedProduct.cost_price) >= 0 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        ₱{((parseFloat(stockAdjustment.unitPrice) - selectedProduct.cost_price) * parseFloat(stockAdjustment.quantity)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <Input
                id="reason"
                type="text"
                placeholder={
                  stockAction === "add" 
                    ? "e.g., New shipment" 
                    : stockAction === "sell"
                    ? "e.g., Customer name or order ID"
                    : "e.g., Damaged goods"
                }
                value={stockAdjustment.reason}
                onChange={(e) =>
                  setStockAdjustment({ ...stockAdjustment, reason: e.target.value })
                }
                maxLength={200}
              />
            </div>

            {stockAction === "sell" && (
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Additional transaction notes (optional)"
                  value={stockAdjustment.notes}
                  onChange={(e) =>
                    setStockAdjustment({ ...stockAdjustment, notes: e.target.value })
                  }
                  maxLength={500}
                  rows={3}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsStockDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleStockAdjustment}
              className={
                stockAction === "add"
                  ? "bg-green-600 hover:bg-green-700"
                  : stockAction === "sell"
                  ? "bg-blue-600 hover:bg-blue-700"
                  : ""
              }
            >
              {stockAction === "add" && "Add Stock"}
              {stockAction === "deduct" && "Deduct Stock"}
              {stockAction === "sell" && "Record Sale"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inventory;
