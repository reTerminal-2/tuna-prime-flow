import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, TrendingUp, CheckCircle } from "lucide-react";
import { aiService } from "@/services/aiService";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AIProductFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: {
    name?: string;
    price?: number;
    description?: string;
    category?: string;
    stock?: number;
  };
  onSuccess?: () => void;
}

export const AIProductForm: React.FC<AIProductFormProps> = ({ open, onOpenChange, initialData, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    stock: "",
    category: "fresh",
    description: "",
    sku: "",
    unit_of_measure: "kg",
    reorder_level: "10",
    min_order: "1"
  });
  
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
  const [isOptimizingPrice, setIsOptimizingPrice] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [priceReason, setPriceReason] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        name: initialData.name || prev.name,
        price: initialData.price?.toString() || prev.price,
        description: initialData.description || prev.description,
        category: initialData.category || prev.category,
        stock: initialData.stock?.toString() || prev.stock,
        // sku: `SKU-${Date.now()}`, // Removed automatic SKU generation on open to avoid overwriting if editing
        unit_of_measure: "kg",
        reorder_level: "10",
        min_order: "1"
      }));
    }
  }, [initialData, open]);

  const handleGenerateDescription = async () => {
    if (!formData.name) {
      toast.error("Please enter a product name first.");
      return;
    }
    setIsGeneratingDesc(true);
    try {
      const desc = await aiService.generateProductDescription(formData.name, formData.category);
      setFormData(prev => ({ ...prev, description: desc }));
      toast.success("Description generated!");
    } catch (error) {
      toast.error("Failed to generate description");
    } finally {
      setIsGeneratingDesc(false);
    }
  };

  const handleOptimizePrice = async () => {
    if (!formData.name || !formData.price) {
      toast.error("Please enter a name and initial price.");
      return;
    }
    setIsOptimizingPrice(true);
    try {
      const result = await aiService.optimizeProductPrice(formData.name, parseFloat(formData.price));
      setFormData(prev => ({ ...prev, price: result.price.toString() }));
      setPriceReason(result.reason);
      toast.success("Price optimized!");
    } catch (error) {
      toast.error("Failed to optimize price");
    } finally {
      setIsOptimizingPrice(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("No active session");

        const productData = {
            name: formData.name,
            sku: formData.sku || `SKU-${Date.now()}`,
            category: formData.category,
            selling_price: parseFloat(formData.price),
            cost_price: parseFloat(formData.price) * 0.7, // Mock cost
            current_stock: parseInt(formData.stock) || 0,
            description: formData.description,
            unit_of_measure: formData.unit_of_measure,
            reorder_level: parseInt(formData.reorder_level) || 10,
            user_id: session.user.id
        };

        const { error } = await supabase
          .from('products')
          .insert(productData);

        if (error) throw error;
        
        toast.success("Product created successfully!");
        onOpenChange(false);
        if (onSuccess) onSuccess();
        
        // Reset form
        setFormData({
            name: "",
            price: "",
            stock: "",
            category: "fresh",
            description: "",
            sku: "",
            unit_of_measure: "kg",
            reorder_level: "10",
            min_order: "1"
        });
        setPriceReason(null);

    } catch (error: any) {
        toast.error(`Error creating product: ${error.message}`);
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI-Enhanced Product Creator
          </DialogTitle>
          <DialogDescription>
            Use AI to generate descriptions and optimize prices before adding your product.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name</Label>
              <Input 
                id="name" 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="e.g. Yellowfin Tuna Loin"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select 
                value={formData.category} 
                onValueChange={val => setFormData({...formData, category: val})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fresh">Fresh Fish</SelectItem>
                  <SelectItem value="frozen">Frozen</SelectItem>
                  <SelectItem value="canned">Canned Goods</SelectItem>
                  <SelectItem value="dried">Dried</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Selling Price (₱)</Label>
              <div className="flex gap-2">
                <Input 
                  id="price" 
                  type="number" 
                  value={formData.price} 
                  onChange={e => setFormData({...formData, price: e.target.value})}
                  placeholder="0.00"
                  required
                />
                <Button 
                    type="button" 
                    variant="outline" 
                    size="icon"
                    className="shrink-0 text-blue-600 border-blue-200 hover:bg-blue-50"
                    onClick={handleOptimizePrice}
                    disabled={isOptimizingPrice}
                    title="Optimize Price with AI"
                >
                    {isOptimizingPrice ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
                </Button>
              </div>
              {priceReason && (
                  <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded flex items-start gap-1">
                      <Sparkles className="h-3 w-3 mt-0.5 shrink-0" />
                      {priceReason}
                  </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock">Initial Stock</Label>
              <div className="flex gap-2">
                <Input 
                    id="stock" 
                    type="number" 
                    value={formData.stock} 
                    onChange={e => setFormData({...formData, stock: e.target.value})}
                    placeholder="0"
                    required
                />
                <Select 
                    value={formData.unit_of_measure} 
                    onValueChange={val => setFormData({...formData, unit_of_measure: val})}
                >
                    <SelectTrigger className="w-[80px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="kg">kg</SelectItem>
                        <SelectItem value="pcs">pcs</SelectItem>
                        <SelectItem value="box">box</SelectItem>
                        <SelectItem value="pack">pack</SelectItem>
                    </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
                <Label htmlFor="min_order">Min Order Qty</Label>
                <Input 
                    id="min_order" 
                    type="number"
                    value={formData.min_order}
                    onChange={e => setFormData({...formData, min_order: e.target.value})}
                />
             </div>
             <div className="space-y-2">
                <Label htmlFor="reorder">Reorder Level</Label>
                <Input 
                    id="reorder" 
                    type="number"
                    value={formData.reorder_level}
                    onChange={e => setFormData({...formData, reorder_level: e.target.value})}
                    title="Stock level to trigger restock alert"
                />
             </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
                <Label htmlFor="description">Description</Label>
                <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm"
                    className="h-6 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                    onClick={handleGenerateDescription}
                    disabled={isGeneratingDesc}
                >
                    {isGeneratingDesc ? (
                        <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Generating...</>
                    ) : (
                        <><Sparkles className="h-3 w-3 mr-1" /> Auto-Generate</>
                    )}
                </Button>
            </div>
            <Textarea 
                id="description" 
                value={formData.description} 
                onChange={e => setFormData({...formData, description: e.target.value})}
                placeholder="Product details..."
                className="h-24"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Product
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
