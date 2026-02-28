import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, Box, History } from "lucide-react";
import { aiService } from "@/services/aiService";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { auditService } from "@/services/auditService";

interface AIStockAdjustmentFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialData?: {
        productId?: string;
        type?: string;
    };
    onSuccess?: () => void;
}

export const AIStockAdjustmentForm: React.FC<AIStockAdjustmentFormProps> = ({ open, onOpenChange, initialData, onSuccess }) => {
    const [formData, setFormData] = useState({
        productId: "",
        adjustment_type: "in",
        quantity: "0",
        reason: ""
    });

    const [products, setProducts] = useState<any[]>([]);
    const [isGeneratingReason, setIsGeneratingReason] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchProducts = async () => {
            const { data } = await supabase.from('products').select('id, name').order('name');
            if (data) setProducts(data);
        };
        fetchProducts();
    }, []);

    useEffect(() => {
        if (initialData && open) {
            setFormData(prev => ({
                ...prev,
                productId: initialData.productId || prev.productId,
                adjustment_type: (initialData.type as any) || prev.adjustment_type
            }));
        }
    }, [initialData, open]);

    const handleGenerateReason = async () => {
        const product = products.find(p => p.id === formData.productId);
        if (!product || !formData.quantity) {
            toast.error("Please select a product and quantity.");
            return;
        }
        setIsGeneratingReason(true);
        try {
            const reason = await aiService.generateStockAdjustmentReason(
                product.name,
                formData.adjustment_type,
                parseFloat(formData.quantity)
            );
            setFormData(prev => ({ ...prev, reason }));
            toast.success("Reason generated!");
        } catch (error) {
            toast.error("Failed to generate reason");
        } finally {
            setIsGeneratingReason(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("No active session");

            const qty = parseFloat(formData.quantity);

            // 1. Log adjustment
            const { error: adjError } = await supabase
                .from('stock_adjustments')
                .insert({
                    product_id: formData.productId,
                    adjustment_type: formData.adjustment_type,
                    quantity: qty,
                    reason: formData.reason,
                    adjusted_by: session.user.id
                });

            if (adjError) throw adjError;

            // 2. Update product stock
            const { data: product } = await supabase.from('products').select('current_stock').eq('id', formData.productId).single();
            if (product) {
                const newStock = formData.adjustment_type === 'in'
                    ? (product.current_stock || 0) + qty
                    : (product.current_stock || 0) - qty;

                await supabase.from('products').update({ current_stock: newStock }).eq('id', formData.productId);

                // 3. System Audit Log
                await auditService.log({
                    action: 'UPDATE',
                    entityType: 'stock_adjustment',
                    entityId: formData.productId,
                    newValues: {
                        productId: formData.productId,
                        type: formData.adjustment_type,
                        quantity: qty,
                        reason: formData.reason,
                        newStock
                    }
                });
            }

            toast.success("Stock adjusted and logged!");
            onOpenChange(false);
            if (onSuccess) onSuccess();

        } catch (error: any) {
            toast.error(`Error: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Box className="h-5 w-5 text-indigo-600" />
                        AI Stock Adjustment
                    </DialogTitle>
                    <DialogDescription>
                        Quickly correct stock levels. Use AI to auto-tag the adjustment with a professional reason.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="adj-product">Product</Label>
                        <Select
                            value={formData.productId}
                            onValueChange={val => setFormData({ ...formData, productId: val })}
                        >
                            <SelectTrigger id="adj-product">
                                <SelectValue placeholder="Select product" />
                            </SelectTrigger>
                            <SelectContent>
                                {products.map(p => (
                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="adj-type">Type</Label>
                            <Select
                                value={formData.adjustment_type}
                                onValueChange={(val: any) => setFormData({ ...formData, adjustment_type: val })}
                            >
                                <SelectTrigger id="adj-type">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="in">Stock In (+)</SelectItem>
                                    <SelectItem value="out">Stock Out (-)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="adj-qty">Quantity</Label>
                            <Input
                                id="adj-qty"
                                type="number"
                                value={formData.quantity}
                                onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label htmlFor="adj-reason">Log Reason</Label>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                                onClick={handleGenerateReason}
                                disabled={isGeneratingReason}
                            >
                                {isGeneratingReason ? (
                                    <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Thinking...</>
                                ) : (
                                    <><Sparkles className="h-3 w-3 mr-1" /> Suggest Reason</>
                                )}
                            </Button>
                        </div>
                        <Textarea
                            id="adj-reason"
                            value={formData.reason}
                            onChange={e => setFormData({ ...formData, reason: e.target.value })}
                            placeholder="Why is this stock being adjusted?"
                            className="h-20"
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700">
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirm Adjustment
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
