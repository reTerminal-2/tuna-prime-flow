import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, Building2, ShieldCheck } from "lucide-react";
import { aiService } from "@/services/aiService";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { auditService } from "@/services/auditService";

interface AISupplierFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialData?: {
        name?: string;
    };
    onSuccess?: () => void;
}

export const AISupplierForm: React.FC<AISupplierFormProps> = ({ open, onOpenChange, initialData, onSuccess }) => {
    const [formData, setFormData] = useState({
        name: "",
        contact_person: "",
        email: "",
        phone: "",
        address: "",
        notes: ""
    });

    const [isVetting, setIsVetting] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (initialData && open) {
            setFormData(prev => ({
                ...prev,
                name: initialData.name || prev.name
            }));
        }
    }, [initialData, open]);

    const handleVetSupplier = async () => {
        if (!formData.name) {
            toast.error("Please enter a supplier name first.");
            return;
        }
        setIsVetting(true);
        try {
            const note = await aiService.vetSupplier(formData.name);
            setFormData(prev => ({ ...prev, notes: note }));
            toast.success("AI Vetting complete!");
        } catch (error) {
            toast.error("Vetting failed");
        } finally {
            setIsVetting(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("No active session");

            const { error } = await supabase
                .from('suppliers')
                .insert({
                    ...formData,
                    user_id: session.user.id
                });

            if (error) throw error;

            // 2. System Audit Log
            await auditService.log({
                action: 'CREATE',
                entityType: 'supplier',
                newValues: formData
            });

            toast.success("Supplier onboarded successfully!");
            onOpenChange(false);
            if (onSuccess) onSuccess();

            // Reset form
            setFormData({
                name: "",
                contact_person: "",
                email: "",
                phone: "",
                address: "",
                notes: ""
            });

        } catch (error: any) {
            toast.error(`Error: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-primary" />
                        AI Supplier Onboarding
                    </DialogTitle>
                    <DialogDescription>
                        Add a new supplier to your network. Use AI to generate a preliminary risk assessment.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="s-name">Company Name</Label>
                        <div className="flex gap-2">
                            <Input
                                id="s-name"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. GenSan Marine Solutions"
                                required
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="shrink-0 text-amber-600 border-amber-200 hover:bg-amber-50 gap-1"
                                onClick={handleVetSupplier}
                                disabled={isVetting}
                            >
                                {isVetting ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3 w-3" />}
                                AI Vet
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="contact">Contact Person</Label>
                            <Input
                                id="contact"
                                value={formData.contact_person}
                                onChange={e => setFormData({ ...formData, contact_person: e.target.value })}
                                placeholder="Name"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone</Label>
                            <Input
                                id="phone"
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="0912..."
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            placeholder="supplier@example.com"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notes">AI Vetting Notes & Assessment</Label>
                        <Textarea
                            id="notes"
                            value={formData.notes}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="AI-generated assessment will appear here..."
                            className="h-24 italic text-muted-foreground"
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Supplier
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
